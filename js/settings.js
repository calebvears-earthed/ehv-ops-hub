/**
 * Settings Module for EHV Ops Hub
 * Manages user profile, company info, integrations, notifications, training plans, projects, prompts, and admin functions
 */

const SettingsModule = (() => {
  let currentSettings = {};
  let openPanel = null;

  const init = (isSetup) => {
    loadSettings();
    render();
    if (isSetup) {
      // Auto-open profile panel on first run
      const profileTrigger = document.querySelector('[data-panel="profile"]');
      if (profileTrigger) profileTrigger.click();
    }
  };

  const loadSettings = () => {
    currentSettings = DataService.getSettings();
  };

  const attachEventListeners = () => {
    // Accordion toggle functionality
    document.querySelectorAll('.accordion-trigger').forEach(trigger => {
      trigger.addEventListener('click', togglePanel);
    });

    // Profile panel
    document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);

    // Company panel
    document.getElementById('save-company-btn')?.addEventListener('click', saveCompany);

    // Microsoft Integration
    document.getElementById('connect-outlook-btn')?.addEventListener('click', connectOutlook);
    document.getElementById('disconnect-outlook-btn')?.addEventListener('click', disconnectOutlook);

    // Notifications
    document.getElementById('enable-notifications-btn')?.addEventListener('click', enableNotifications);
    document.getElementById('test-notification-btn')?.addEventListener('click', testNotification);
    document.getElementById('save-notification-settings-btn')?.addEventListener('click', saveNotificationSettings);

    // Training Plan Builder
    document.getElementById('save-training-plan-btn')?.addEventListener('click', saveTrainingPlan);

    // Projects
    document.getElementById('add-project-btn')?.addEventListener('click', addProjectField);
    document.getElementById('save-projects-btn')?.addEventListener('click', saveProjects);

    // Mindset Prompts
    document.getElementById('add-prompt-btn')?.addEventListener('click', addPromptField);
    document.getElementById('save-prompts-btn')?.addEventListener('click', savePrompts);

    // Admin
    document.getElementById('export-data-btn')?.addEventListener('click', exportData);
    document.getElementById('import-data-btn')?.addEventListener('click', importData);
    document.getElementById('clear-data-btn')?.addEventListener('click', clearData);
  };

  const togglePanel = (e) => {
    const trigger = e.currentTarget;
    const panelId = trigger.getAttribute('data-panel');
    const content = document.getElementById(`${panelId}-content`);

    // Close previously open panel
    if (openPanel && openPanel !== trigger) {
      openPanel.classList.remove('open');
      document.getElementById(`${openPanel.getAttribute('data-panel')}-content`).classList.remove('open');
    }

    // Toggle current panel
    trigger.classList.toggle('open');
    content.classList.toggle('open');
    openPanel = trigger.classList.contains('open') ? trigger : null;
  };

  // === PROFILE PANEL ===
  const saveProfile = async () => {
    const profileData = {
      name: document.getElementById('profile-name')?.value,
      fullName: document.getElementById('profile-full-name')?.value,
      height: parseInt(document.getElementById('profile-height')?.value) || 0,
      dob: document.getElementById('profile-dob')?.value,
      location: document.getElementById('profile-location')?.value,
      goalType: document.getElementById('profile-goal-type')?.value,
      targetWeight: parseFloat(document.getElementById('profile-target-weight')?.value) || 0
    };

    await DataService.updateSettings({ profile: profileData });
    currentSettings.profile = profileData;
    showNotification('Profile updated successfully');
  };

  // === COMPANY PANEL ===
  const saveCompany = async () => {
    const companyData = {
      name: document.getElementById('company-name')?.value,
      abn: document.getElementById('company-abn')?.value,
      licenceNumber: document.getElementById('company-licence')?.value,
      cecNumber: document.getElementById('company-cec')?.value
    };

    await DataService.updateSettings({ company: companyData });
    currentSettings.company = companyData;
    showNotification('Company information updated');
  };

  // === MICROSOFT INTEGRATION ===
  const connectOutlook = async () => {
    const clientId = document.getElementById('ms-client-id')?.value;
    const tenantId = document.getElementById('ms-tenant-id')?.value;

    if (!clientId || !tenantId) {
      showNotification('Please provide both Client ID and Tenant ID', 'error');
      return;
    }

    try {
      await Outlook.login();
      updateOutlookStatus(true);
      showNotification('Outlook connected successfully');
    } catch (error) {
      showNotification('Failed to connect Outlook: ' + error.message, 'error');
    }
  };

  const disconnectOutlook = async () => {
    try {
      await Outlook.logout();
      updateOutlookStatus(false);
      showNotification('Outlook disconnected');
    } catch (error) {
      showNotification('Failed to disconnect Outlook', 'error');
    }
  };

  const updateOutlookStatus = (isConnected) => {
    const statusIndicator = document.getElementById('outlook-status-indicator');
    const statusText = document.getElementById('outlook-status-text');
    const connectBtn = document.getElementById('connect-outlook-btn');
    const disconnectBtn = document.getElementById('disconnect-outlook-btn');

    if (isConnected) {
      statusIndicator.className = 'badge-green';
      statusText.textContent = 'Connected';
      connectBtn.style.display = 'none';
      disconnectBtn.style.display = 'inline-block';
    } else {
      statusIndicator.className = 'badge-red';
      statusText.textContent = 'Disconnected';
      connectBtn.style.display = 'inline-block';
      disconnectBtn.style.display = 'none';
    }
  };

  // === NOTIFICATIONS ===
  const enableNotifications = async () => {
    try {
      const permission = await Notifications.requestPermission();
      if (permission === 'granted') {
        updateNotificationStatus(true);
        showNotification('Notifications enabled');
      }
    } catch (error) {
      showNotification('Failed to enable notifications: ' + error.message, 'error');
    }
  };

  const testNotification = async () => {
    try {
      await Notifications.fireNow();
      showNotification('Test notification sent');
    } catch (error) {
      showNotification('Failed to send test notification', 'error');
    }
  };

  const saveNotificationSettings = async () => {
    const notificationSettings = {
      weighInTime: document.getElementById('weigh-in-time')?.value,
      trainingBefore: parseInt(document.getElementById('training-before')?.value) || 15,
      deadlineAlertTime: document.getElementById('deadline-alert-time')?.value
    };

    await DataService.updateSettings({ notifications: notificationSettings });
    currentSettings.notifications = notificationSettings;
    showNotification('Notification settings updated');
  };

  const updateNotificationStatus = (isEnabled) => {
    const statusIndicator = document.getElementById('notification-status-indicator');
    const enableBtn = document.getElementById('enable-notifications-btn');

    if (isEnabled) {
      statusIndicator.className = 'badge-green';
      enableBtn.disabled = true;
    } else {
      statusIndicator.className = 'badge-red';
      enableBtn.disabled = false;
    }
  };

  // === TRAINING PLAN BUILDER ===
  const saveTrainingPlan = async () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const trainingPlan = {};

    days.forEach(day => {
      trainingPlan[day] = {
        sessionName: document.getElementById(`training-${day}-name`)?.value || '',
        type: document.getElementById(`training-${day}-type`)?.value || 'REST',
        duration: parseInt(document.getElementById(`training-${day}-duration`)?.value) || 0,
        notes: document.getElementById(`training-${day}-notes`)?.value || ''
      };
    });

    await DataService.saveTrainingPlan(trainingPlan);
    currentSettings.trainingPlan = trainingPlan;
    showNotification('Training plan saved');
  };

  // === PROJECTS ===
  const addProjectField = () => {
    const container = document.getElementById('projects-list');
    const projectRow = createProjectRow('', '#000000');
    container.appendChild(projectRow);
  };

  const createProjectRow = (name, color) => {
    const row = document.createElement('div');
    row.className = 'form-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'input';
    nameInput.placeholder = 'Project name';
    nameInput.value = name;

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-picker';
    colorInput.value = color;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => row.remove());

    row.appendChild(nameInput);
    row.appendChild(colorInput);
    row.appendChild(removeBtn);

    return row;
  };

  const saveProjects = async () => {
    const projectRows = document.querySelectorAll('#projects-list .form-row');
    const projects = [];

    projectRows.forEach(row => {
      const name = row.querySelector('input[type="text"]').value;
      const color = row.querySelector('input[type="color"]').value;
      if (name.trim()) {
        projects.push({ name, color });
      }
    });

    await DataService.updateSettings({ projects });
    currentSettings.projects = projects;
    showNotification('Projects updated');
  };

  // === MINDSET PROMPTS ===
  const addPromptField = () => {
    const container = document.getElementById('prompts-list');
    const promptRow = createPromptRow('');
    container.appendChild(promptRow);
  };

  const createPromptRow = (prompt) => {
    const row = document.createElement('div');
    row.className = 'form-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.placeholder = 'Enter mindset prompt';
    input.value = prompt;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => row.remove());

    row.appendChild(input);
    row.appendChild(deleteBtn);

    return row;
  };

  const savePrompts = async () => {
    const promptRows = document.querySelectorAll('#prompts-list .form-row');
    const prompts = [];

    promptRows.forEach(row => {
      const prompt = row.querySelector('input').value;
      if (prompt.trim()) {
        prompts.push(prompt);
      }
    });

    if (Prompts) {
      await Prompts.update(prompts);
    }
    currentSettings.prompts = prompts;
    showNotification('Mindset prompts updated');
  };

  // === ADMIN ===
  const exportData = async () => {
    try {
      await DataService.exportAll();
      showNotification('Data exported successfully');
    } catch (error) {
      showNotification('Failed to export data: ' + error.message, 'error');
    }
  };

  const importData = () => {
    const input = document.getElementById('import-file-input');
    if (input) {
      input.click();
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            await DataService.importAll(file);
            loadSettings();
            render();
            showNotification('Data imported successfully');
          } catch (error) {
            showNotification('Failed to import data: ' + error.message, 'error');
          }
        }
      });
    }
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      DataService.clearAll();
      currentSettings = {};
      showNotification('All data cleared');
      render();
    }
  };

  // === UTILITY FUNCTIONS ===
  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  };

  const render = () => {
    const container = document.getElementById('content');
    if (!container) return;

    container.innerHTML = `
      <div class="accordion">
        ${renderProfilePanel()}
        ${renderCompanyPanel()}
        ${renderMicrosoftIntegrationPanel()}
        ${renderNotificationsPanel()}
        ${renderTrainingPlanPanel()}
        ${renderProjectsPanel()}
        ${renderMindsetPromptsPanel()}
        ${renderAdminPanel()}
      </div>
    `;

    attachEventListeners();
  };

  const renderProfilePanel = () => `
    <div class="accordion-item card">
      <button class="accordion-trigger" data-panel="profile">
        <span>PROFILE</span>
        <span class="arrow">▼</span>
      </button>
      <div class="accordion-content" id="profile-content">
        <div class="section-gap">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input type="text" id="profile-name" class="input" value="${currentSettings.profile?.name || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="profile-full-name" class="input" value="${currentSettings.profile?.fullName || ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Height (cm)</label>
              <input type="number" id="profile-height" class="input" value="${currentSettings.profile?.height || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Target Weight (kg)</label>
              <input type="number" id="profile-target-weight" class="input" step="0.1" value="${currentSettings.profile?.targetWeight || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Date of Birth</label>
            <input type="date" id="profile-dob" class="input" value="${currentSettings.profile?.dob || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Location</label>
            <input type="text" id="profile-location" class="input" value="${currentSettings.profile?.location || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Goal Type</label>
            <select id="profile-goal-type" class="select">
              <option value="Lean muscle" ${currentSettings.profile?.goalType === 'Lean muscle' ? 'selected' : ''}>Lean Muscle</option>
              <option value="Fat loss" ${currentSettings.profile?.goalType === 'Fat loss' ? 'selected' : ''}>Fat Loss</option>
              <option value="Maintenance" ${currentSettings.profile?.goalType === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
              <option value="Performance" ${currentSettings.profile?.goalType === 'Performance' ? 'selected' : ''}>Performance</option>
            </select>
          </div>
          <button id="save-profile-btn" class="btn btn-primary">Save Profile</button>
        </div>
      </div>
    </div>
  `;

  const renderCompanyPanel = () => `
    <div class="accordion-item card">
      <button class="accordion-trigger" data-panel="company">
        <span>COMPANY</span>
        <span class="arrow">▼</span>
      </button>
      <div class="accordion-content" id="company-content">
        <div class="section-gap">
          <div class="form-group">
            <label class="form-label">Company Name</label>
            <input type="text" id="company-name" class="input" value="${currentSettings.company?.name || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">ABN</label>
            <input type="text" id="company-abn" class="input" value="${currentSettings.company?.abn || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Licence Number</label>
            <input type="text" id="company-licence" class="input" value="${currentSettings.company?.licenceNumber || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">CEC Number</label>
            <input type="text" id="company-cec" class="input" value="${currentSettings.company?.cecNumber || ''}">
          </div>
          <button id="save-company-btn" class="btn btn-primary">Save Company Info</button>
        </div>
      </div>
    </div>
  `;

  const renderMicrosoftIntegrationPanel = () => `
    <div class="accordion-item card">
      <button class="accordion-trigger" data-panel="microsoft">
        <span>MICROSOFT INTEGRATION</span>
        <span class="arrow">▼</span>
      </button>
      <div class="accordion-content" id="microsoft-content">
        <div class="section-gap">
          <div class="form-group">
            <label class="form-label">Client ID</label>
            <input type="text" id="ms-client-id" class="input" value="${currentSettings.microsoft?.clientId || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Tenant ID</label>
            <input type="text" id="ms-tenant-id" class="input" value="${currentSettings.microsoft?.tenantId || ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Connection Status</label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="outlook-status-indicator" class="badge-red" style="width: 12px; height: 12px; border-radius: 50%;"></span>
                <span id="outlook-status-text">Disconnected</span>
              </div>
            </div>
          </div>
          <div class="form-row">
            <button id="connect-outlook-btn" class="btn btn-primary">Connect Outlook</button>
            <button id="disconnect-outlook-btn" class="btn btn-secondary" style="display: none;">Disconnect</button>
          </div>
          <details class="collapsible-note">
            <summary>Setup Instructions</summary>
            <div class="note-content">
              <ol>
                <li>Go to Azure Portal and register your application</li>
                <li>Copy your Client ID and Tenant ID</li>
                <li>Paste them in the fields above</li>
                <li>Click "Connect Outlook" to authenticate</li>
              </ol>
            </div>
          </details>
        </div>
      </div>
    </div>
  `;

  const renderNotificationsPanel = () => `
    <div class="accordion-item card">
      <button class="accordion-trigger" data-panel="notifications">
        <span>NOTIFICATIONS</span>
        <span class="arrow">▼</span>
      </button>
      <div class="accordion-content" id="notifications-content">
        <div class="section-gap">
          <div class="form-group">
            <label class="form-label">Permission Status</label>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span id="notification-status-indicator" class="badge-red" style="width: 12px; height: 12px; border-radius: 50%;"></span>
              <span>Notifications ${Notification?.permission === 'granted' ? 'Enabled' : 'Disabled'}</span>
            </div>
            <button id="enable-notifications-btn" class="btn btn-primary" ${Notification?.permission === 'granted' ? 'disabled' : ''}>Enable Notifications</button>
          </div>
          <hr>
          <div class="form-group">
            <label class="form-label">Weigh-in Reminder Time</label>
            <input type="time" id="weigh-in-time" class="input" value="${currentSettings.notifications?.weighInTime || '09:00'}">
          </div>
          <div class="form-group">
            <label class="form-label">Training Reminder (minutes before)</label>
            <input type="number" id="training-before" class="input" value="${currentSettings.notifications?.trainingBefore || 15}">
          </div>
          <div class="form-group">
            <label class="form-label">Deadline Alert Time</label>
            <input type="time" id="deadline-alert-time" class="input" value="${currentSettings.notifications?.deadlineAlertTime || '17:00'}">
          </div>
          <div class="form-row">
            <button id="save-notification-settings-btn" class="btn btn-primary">Save Settings</button>
            <button id="test-notification-btn" class="btn btn-ghost">Test Notification</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const renderTrainingPlanPanel = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const trainingDaysHtml = days.map(day => `
      <div class="card" style="padding: 12px; margin-bottom: 12px;">
        <h4 style="margin: 0 0 12px 0; text-transform: capitalize;">${day}</h4>
        <div class="form-group">
          <label class="form-label">Session Name</label>
          <input type="text" id="training-${day}-name" class="input" placeholder="e.g., Upper Body" value="${currentSettings.trainingPlan?.[day]?.sessionName || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select id="training-${day}-type" class="select">
            <option value="STRENGTH" ${currentSettings.trainingPlan?.[day]?.type === 'STRENGTH' ? 'selected' : ''}>Strength</option>
            <option value="BOXING" ${currentSettings.trainingPlan?.[day]?.type === 'BOXING' ? 'selected' : ''}>Boxing</option>
            <option value="CARDIO" ${currentSettings.trainingPlan?.[day]?.type === 'CARDIO' ? 'selected' : ''}>Cardio</option>
            <option value="MOBILITY" ${currentSettings.trainingPlan?.[day]?.type === 'MOBILITY' ? 'selected' : ''}>Mobility</option>
            <option value="REST" ${currentSettings.trainingPlan?.[day]?.type === 'REST' ? 'selected' : ''}>Rest</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Duration (minutes)</label>
          <input type="number" id="training-${day}-duration" class="input" value="${currentSettings.trainingPlan?.[day]?.duration || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="training-${day}-notes" class="textarea" placeholder="Session notes...">${currentSettings.trainingPlan?.[day]?.notes || ''}</textarea>
        </div>
      </div>
    `).join('');

    return `
      <div class="accordion-item card">
        <button class="accordion-trigger" data-panel="training">
          <span>TRAINING PLAN BUILDER</span>
          <span class="arrow">▼</span>
        </button>
        <div class="accordion-content" id="training-content">
          <div class="section-gap">
            <p style="margin: 0 0 16px 0; color: #666;">Create your 7-day weekly training template</p>
            ${trainingDaysHtml}
            <button id="save-training-plan-btn" class="btn btn-primary">Save Training Plan</button>
          </div>
        </div>
      </div>
    `;
  };

  const renderProjectsPanel = () => {
    const projectsHtml = (currentSettings.projects || []).map(project =>
      createProjectRow(project.name, project.color).outerHTML
    ).join('');

    return `
      <div class="accordion-item card">
        <button class="accordion-trigger" data-panel="projects">
          <span>PROJECTS</span>
          <span class="arrow">▼</span>
        </button>
        <div class="accordion-content" id="projects-content">
          <div class="section-gap">
            <div id="projects-list">
              ${projectsHtml}
            </div>
            <div class="form-row">
              <button id="add-project-btn" class="btn btn-ghost">+ Add Project</button>
              <button id="save-projects-btn" class="btn btn-primary">Save Projects</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderMindsetPromptsPanel = () => {
    const promptsHtml = (currentSettings.prompts || []).map(prompt =>
      createPromptRow(prompt).outerHTML
    ).join('');

    return `
      <div class="accordion-item card">
        <button class="accordion-trigger" data-panel="prompts">
          <span>MINDSET PROMPTS</span>
          <span class="arrow">▼</span>
        </button>
        <div class="accordion-content" id="prompts-content">
          <div class="section-gap">
            <div id="prompts-list">
              ${promptsHtml}
            </div>
            <div class="form-row">
              <button id="add-prompt-btn" class="btn btn-ghost">+ Add Prompt</button>
              <button id="save-prompts-btn" class="btn btn-primary">Save Prompts</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderAdminPanel = () => {
    const appVersion = 'v1.0.0';
    const lastSyncTime = new Date(currentSettings.lastSync || Date.now()).toLocaleString();
    const storageUsage = (currentSettings.storageUsage || 0).toFixed(2) + ' MB';

    return `
      <div class="accordion-item card">
        <button class="accordion-trigger" data-panel="admin">
          <span>ADMIN</span>
          <span class="arrow">▼</span>
        </button>
        <div class="accordion-content" id="admin-content">
          <div class="section-gap">
            <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                <strong>App Version:</strong> ${appVersion}
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                <strong>Last Sync:</strong> ${lastSyncTime}
              </div>
              <div style="font-size: 12px; color: #666;">
                <strong>Storage Usage:</strong> ${storageUsage}
              </div>
            </div>
            <div class="form-row">
              <button id="export-data-btn" class="btn btn-primary">Export Data</button>
              <button id="import-data-btn" class="btn btn-secondary">Import Data</button>
              <input type="file" id="import-file-input" style="display: none;" accept=".json">
            </div>
            <button id="clear-data-btn" class="btn btn-danger" style="width: 100%; margin-top: 8px;">Clear All Data</button>
          </div>
        </div>
      </div>
    `;
  };

  return {
    init,
    render
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsModule;
}
