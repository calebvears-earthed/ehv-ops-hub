/* ═══════════════════════════════════════════════════
   EHV OPS HUB — Push Notification & Reminder Engine
   Web Push API + Service Worker
   ═══════════════════════════════════════════════════ */

const Notifications = (() => {
  function isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  function getPermission() {
    return Notification.permission; // 'granted', 'denied', 'default'
  }

  async function requestPermission() {
    if (!isSupported()) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      return reg;
    } catch (e) {
      console.error('SW registration failed:', e);
      return null;
    }
  }

  function scheduleReminder(reminder) {
    if (!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_REMINDER',
      payload: {
        id: reminder.id,
        title: reminder.title,
        body: reminder.body || '',
        time: reminder.time,  // Unix timestamp
        url: reminder.url || '/',
        action: reminder.action || null
      }
    });
  }

  // Fire a local notification immediately (for testing / instant reminders)
  function fireNow(title, body, tag) {
    if (getPermission() !== 'granted') return;
    new Notification(title, {
      body,
      icon: '/assets/icon-192.png',
      tag: tag || 'ehv-instant',
      badge: '/assets/icon-192.png'
    });
  }

  // Process all pending reminders from DataService
  function processReminders() {
    const reminders = DataService.getReminders();
    const now = Date.now();
    const upcoming = reminders.filter(r => r.fireAt > now && r.fireAt < now + 86400000);

    upcoming.forEach(r => {
      scheduleReminder({
        id: r.id,
        title: r.title,
        body: r.body || '',
        time: r.fireAt,
        url: r.url || '/',
        action: r.action || null
      });
    });
  }

  // Check for overdue tasks and fire deadline alerts
  function checkDeadlines() {
    const tasks = DataService.getTasks();
    const today = DataService.today();
    const settings = DataService.getSettings();

    // Overdue tasks
    const overdue = tasks.filter(t => !t.done && t.dueDate && t.dueDate < today);
    overdue.forEach(t => {
      fireNow('⚠ Overdue Task', t.title, `overdue-${t.id}`);
    });

    // Due today (Top 3 only)
    const dueToday = tasks.filter(t => !t.done && t.top3 && t.dueDate === today);
    dueToday.forEach(t => {
      fireNow('📋 Due Today', t.title, `today-${t.id}`);
    });
  }

  // Health reminders
  function scheduleHealthReminders() {
    const settings = DataService.getSettings();
    const defaults = settings.defaultReminders || {};

    if (defaults.weighIn) {
      const [h, m] = defaults.weighIn.split(':').map(Number);
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      if (target > now) {
        scheduleReminder({
          id: 'weigh-in-daily',
          title: '⚖ Morning weigh-in',
          body: 'Log your weight in Health Command',
          time: target.getTime(),
          url: '/health.html'
        });
      }
    }
  }

  // Listen for service worker messages
  function listenForActions() {
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data.type === 'complete' && e.data.payload) {
        DataService.completeTask(e.data.payload);
      }
      if (e.data.type === 'snooze' && e.data.payload) {
        const { id, title, time } = e.data.payload;
        const reminder = DataService.getReminders().find(r => r.id === id);
        if (reminder) {
          DataService.saveReminders(
            DataService.getReminders().map(r =>
              r.id === id ? { ...r, fireAt: time } : r
            )
          );
        }
      }
    });
  }

  async function init() {
    if (!isSupported()) return;
    await registerServiceWorker();
    if (getPermission() === 'granted') {
      processReminders();
      scheduleHealthReminders();
      listenForActions();
    }
  }

  return {
    isSupported, getPermission, requestPermission,
    registerServiceWorker, scheduleReminder, fireNow,
    processReminders, checkDeadlines, scheduleHealthReminders,
    init
  };
})();
