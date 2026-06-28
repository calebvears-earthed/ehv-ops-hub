/* ═══════════════════════════════════════════════════
   EHV OPS HUB — Microsoft Outlook Integration
   MSAL.js + Microsoft Graph API
   ═══════════════════════════════════════════════════ */

const Outlook = (() => {
  let msalInstance = null;
  let account = null;

  const SCOPES = ['Calendars.Read', 'Calendars.ReadWrite'];
  const GRAPH_URL = 'https://graph.microsoft.com/v1.0';

  function isConfigured() {
    const s = DataService.getSettings();
    return !!(s.outlook && s.outlook.clientId && s.outlook.tenantId);
  }

  function isConnected() {
    const s = DataService.getSettings();
    return !!(s.outlook && s.outlook.connected);
  }

  async function init() {
    if (!isConfigured()) return false;

    const settings = DataService.getSettings();
    const config = {
      auth: {
        clientId: settings.outlook.clientId,
        authority: `https://login.microsoftonline.com/${settings.outlook.tenantId}`,
        redirectUri: window.location.origin + '/auth-callback.html'
      },
      cache: { cacheLocation: 'localStorage' }
    };

    try {
      // MSAL loaded via CDN
      if (typeof msal === 'undefined') {
        console.warn('MSAL.js not loaded — add CDN script tag');
        return false;
      }
      msalInstance = new msal.PublicClientApplication(config);
      await msalInstance.initialize();

      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        account = accounts[0];
        DataService.updateSettings({ outlook: { ...settings.outlook, connected: true } });
        return true;
      }
      return false;
    } catch (e) {
      console.error('MSAL init failed:', e);
      return false;
    }
  }

  async function login() {
    if (!msalInstance) await init();
    if (!msalInstance) return false;

    try {
      const result = await msalInstance.loginPopup({ scopes: SCOPES });
      account = result.account;
      const settings = DataService.getSettings();
      DataService.updateSettings({ outlook: { ...settings.outlook, connected: true } });
      return true;
    } catch (e) {
      console.error('Login failed:', e);
      return false;
    }
  }

  async function logout() {
    if (msalInstance && account) {
      await msalInstance.logoutPopup({ account });
    }
    account = null;
    const settings = DataService.getSettings();
    DataService.updateSettings({ outlook: { ...settings.outlook, connected: false } });
  }

  async function getToken() {
    if (!msalInstance || !account) return null;
    try {
      const result = await msalInstance.acquireTokenSilent({ scopes: SCOPES, account });
      return result.accessToken;
    } catch (e) {
      // Fallback to popup
      try {
        const result = await msalInstance.acquireTokenPopup({ scopes: SCOPES });
        return result.accessToken;
      } catch (e2) {
        console.error('Token acquisition failed:', e2);
        return null;
      }
    }
  }

  async function fetchEvents(days = 14) {
    const token = await getToken();
    if (!token) return [];

    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);

    const startStr = now.toISOString();
    const endStr = end.toISOString();

    try {
      const res = await fetch(
        `${GRAPH_URL}/me/calendarView?startDateTime=${startStr}&endDateTime=${endStr}&$select=subject,start,end,location,bodyPreview&$orderby=start/dateTime&$top=50`,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (!res.ok) throw new Error(`Graph API: ${res.status}`);
      const data = await res.json();

      const events = (data.value || []).map(e => ({
        id: e.id,
        title: e.subject || 'Untitled',
        start: e.start.dateTime,
        end: e.end.dateTime,
        date: e.start.dateTime.split('T')[0],
        time: e.start.dateTime.split('T')[1].slice(0, 5),
        location: e.location?.displayName || '',
        preview: (e.bodyPreview || '').slice(0, 200),
        isAllDay: e.start.dateTime.includes('00:00:00') && e.end.dateTime.includes('00:00:00'),
        duration: _calcDuration(e.start.dateTime, e.end.dateTime),
        source: 'outlook'
      }));

      DataService.setCalendarCache(events);
      return events;
    } catch (e) {
      console.error('Fetch events failed:', e);
      return DataService.getCalendarCache();
    }
  }

  async function createEvent(title, startDateTime, endDateTime, body) {
    const token = await getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${GRAPH_URL}/me/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: title,
          start: { dateTime: startDateTime, timeZone: 'Australia/Adelaide' },
          end: { dateTime: endDateTime, timeZone: 'Australia/Adelaide' },
          body: body ? { contentType: 'text', content: body } : undefined,
          isReminderOn: true,
          reminderMinutesBeforeStart: 15
        })
      });

      if (!res.ok) throw new Error(`Create event: ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('Create event failed:', e);
      return null;
    }
  }

  function _calcDuration(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const mins = Math.round((e - s) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function getTodayEvents() {
    const today = DataService.today();
    return DataService.getCalendarCache().filter(e => e.date === today);
  }

  return {
    isConfigured, isConnected, init, login, logout,
    fetchEvents, createEvent, getTodayEvents
  };
})();
