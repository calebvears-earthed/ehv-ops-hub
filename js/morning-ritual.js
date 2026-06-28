/**
 * Morning Ritual Module - EHV Ops Hub
 * Main dashboard view with greeting, priorities, calendar, health, weather, mindset, and quick actions
 */

const MorningRitual = {
  clockInterval: null,

  init() {
    this.render();
    this.setupEventListeners();
    this.startClockUpdates();
  },

  render() {
    const html = `
      <div class="morning-ritual-container">
        ${this.renderCommandHeader()}
        ${this.renderTop3Priorities()}
        ${this.renderCalendarSnapshot()}
        ${this.renderHealthSnapshot()}
        ${this.renderWeather()}
        ${this.renderMindsetPrompt()}
        ${this.renderQuickActions()}
      </div>
    `;

    document.getElementById('content').innerHTML = html;
  },

  renderCommandHeader() {
    const settings = DataService.getSettings();
    const name = settings.name || 'Belac';
    const greeting = this.getGreeting();
    const now = new Date();
    const formattedDate = this.formatDate(now);
    const weekNumber = this.getWeekNumber(now);
    const dayOfYear = this.getDayOfYear(now);
    const time = this.formatTime(now);

    return `
      <div class="card command-header section-gap">
        <div class="command-header-content">
          <div class="command-greeting">
            ${greeting} ${name}
          </div>
          <div class="command-date">
            ${formattedDate}
          </div>
        </div>
        <div class="command-meta">
          <div class="command-clock" id="commandClock">
            ${time}
          </div>
          <div class="command-info">
            <span class="command-week">Week ${weekNumber} of 52</span>
            <span class="command-day">Day ${dayOfYear} of 365</span>
          </div>
        </div>
      </div>
    `;
  },

  renderTop3Priorities() {
    const top3 = DataService.getTop3();

    let itemsHTML = '';
    for (let i = 0; i < 3; i++) {
      if (top3 && top3[i]) {
        const item = top3[i];
        const completedClass = item.completed ? 'completed' : '';
        const dueDateStr = item.dueDate ? this.formatShortDate(item.dueDate) : 'No due date';

        itemsHTML += `
          <div class="top3-item ${completedClass}">
            <span class="top3-num">${String(i + 1).padStart(2, '0')}</span>
            <div class="top3-content">
              <div class="top3-title">${item.title}</div>
              <div class="top3-footer">
                <span class="top3-due">${dueDateStr}</span>
                ${item.project ? `<span class="badge badge-${this.sanitizeClass(item.project)}">${item.project}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      } else {
        itemsHTML += `
          <div class="top3-item empty">
            <span class="top3-num">${String(i + 1).padStart(2, '0')}</span>
            <div class="top3-content">
              <div class="top3-title">Set your top 3 →</div>
            </div>
          </div>
        `;
      }
    }

    return `
      <div class="card top3-card section-gap">
        <div class="card-header">
          <span class="card-label">Top 3 Priorities</span>
        </div>
        <div class="top3-list">
          ${itemsHTML}
        </div>
      </div>
    `;
  },

  renderCalendarSnapshot() {
    let events = [];
    let syncButtonHTML = '';

    // Try to get Outlook events first
    if (typeof Outlook !== 'undefined' && Outlook.getTodayEvents) {
      try {
        events = Outlook.getTodayEvents();
      } catch (e) {
        console.log('Outlook not configured, using local calendar');
        events = DataService.getTodayEvents ? DataService.getTodayEvents() : [];
      }
    } else {
      events = DataService.getTodayEvents ? DataService.getTodayEvents() : [];
    }

    let eventsHTML = '';
    if (events && events.length > 0) {
      eventsHTML = events.map(event => {
        const timeStr = event.time ? `<span class="event-time">${event.time}</span>` : '';
        const durationStr = event.duration ? `<span class="event-duration">${event.duration}</span>` : '';
        return `
          <div class="calendar-event">
            ${timeStr}
            <div class="event-details">
              <div class="event-title">${event.title}</div>
              ${durationStr}
            </div>
          </div>
        `;
      }).join('');
    } else {
      eventsHTML = `<div class="no-events">No events today</div>`;
    }

    if (typeof Outlook !== 'undefined' && Outlook.sync) {
      syncButtonHTML = `<button class="sync-btn" id="syncOutlookBtn" aria-label="Sync calendar">↻</button>`;
    }

    return `
      <div class="card calendar-card section-gap">
        <div class="card-header">
          <span class="card-label">Calendar</span>
          ${syncButtonHTML}
        </div>
        <div class="calendar-events">
          ${eventsHTML}
        </div>
      </div>
    `;
  },

  renderHealthSnapshot() {
    const latest = DataService.getLatestWeight();
    const settings = DataService.getSettings();
    const currentWeight = latest ? latest.weight : null;
    const targetWeight = settings.targetWeight || null;
    const weightDelta = (currentWeight && targetWeight) ? (currentWeight - targetWeight).toFixed(1) : '--';
    const weightDeltaSign = (currentWeight && targetWeight) ? (currentWeight > targetWeight ? '+' : '') : '';

    const plan = DataService.getTrainingPlan();
    const todayIdx = (new Date().getDay() + 6) % 7;
    const todayPlan = plan[todayIdx] || {};
    const trainingName = todayPlan.type === 'REST' ? 'Rest Day' : (todayPlan.name || 'No session');
    const trainingStatus = todayPlan.type === 'REST' ? 'rest' : 'scheduled';

    const streakDays = DataService.getTrainingStreak();
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1); weekStart.setHours(0,0,0,0);
    const trainingLog = DataService.getTrainingLog();
    const weeklySessions = trainingLog.filter(s => s.status === 'COMPLETED' && new Date(s.date) >= weekStart).length;
    const weeklyTarget = 6;
    const streakPercent = Math.min((weeklySessions / weeklyTarget) * 100, 100);

    return `
      <div class="stat-grid section-gap">
        <div class="card stat-block">
          <div class="stat-label">Weight</div>
          <div class="stat-value">${currentWeight !== null ? currentWeight.toFixed(1) : '--'} kg</div>
          <div class="stat-meta">
            Target: ${targetWeight !== null ? targetWeight : '--'} kg
            <span class="stat-delta ${weightDelta > 0 ? 'increase' : 'decrease'}">${weightDeltaSign}${weightDelta}</span>
          </div>
        </div>

        <div class="card stat-block">
          <div class="stat-label">Today's Training</div>
          <div class="stat-value">${trainingName}</div>
          <div class="stat-meta status-${trainingStatus}">${trainingStatus}</div>
        </div>

        <div class="card stat-block">
          <div class="stat-label">Streak</div>
          <div class="stat-value">${streakDays}d</div>
          <div class="stat-meta">
            <div class="streak-progress">${weeklySessions}/${weeklyTarget} sessions</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${streakPercent}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderWeather() {
    let weatherHTML = '<div class="card weather-card section-gap"><div class="weather-loading">Loading weather...</div></div>';

    if (typeof Weather !== 'undefined' && Weather.fetch && Weather.renderCard) {
      Weather.fetch().then(data => {
        const weatherCard = Weather.renderCard(data);
        const weatherContainer = document.querySelector('.weather-card');
        if (weatherContainer) {
          weatherContainer.innerHTML = weatherCard;
        }
      }).catch(error => {
        console.log('Weather fetch error:', error);
      });
    }

    return weatherHTML;
  },

  renderMindsetPrompt() {
    let prompt = '';
    let promptText = 'Take a moment to center yourself.';

    if (typeof Prompts !== 'undefined' && Prompts.getToday) {
      try {
        const p = Prompts.getToday();
        if (p) promptText = p;
      } catch (e) {
        console.log('Prompts service unavailable');
      }
    }

    return `
      <div class="card mindset-card section-gap">
        <div class="mindset-text">
          ${promptText}
        </div>
      </div>
    `;
  },

  renderQuickActions() {
    return `
      <div class="quick-actions section-gap">
        <button class="btn btn-primary" id="addTaskBtn">
          <span class="btn-icon">+</span> Add Task
        </button>
        <button class="btn btn-primary" id="logWeightBtn">
          <span class="btn-icon">⚖</span> Log Weight
        </button>
        <button class="btn btn-primary" id="logTrainingBtn">
          <span class="btn-icon">💪</span> Log Training
        </button>
        <button class="btn btn-primary" id="newSWMSBtn">
          <span class="btn-icon">📋</span> New SWMS
        </button>
      </div>
    `;
  },

  setupEventListeners() {
    // Top 3 Priorities - navigate to tasks if empty
    const top3Items = document.querySelectorAll('.top3-item.empty');
    top3Items.forEach(item => {
      item.addEventListener('click', () => {
        window.location.href = 'tasks.html';
      });
    });

    // Outlook sync
    const syncBtn = document.getElementById('syncOutlookBtn');
    if (syncBtn && typeof Outlook !== 'undefined' && Outlook.sync) {
      syncBtn.addEventListener('click', () => {
        Outlook.sync().then(() => {
          this.render();
        });
      });
    }

    // Quick action buttons
    document.getElementById('addTaskBtn').addEventListener('click', () => {
      window.location.href = 'tasks.html';
    });

    document.getElementById('logWeightBtn').addEventListener('click', () => {
      this.openLogWeightModal();
    });

    document.getElementById('logTrainingBtn').addEventListener('click', () => {
      this.openLogTrainingModal();
    });

    document.getElementById('newSWMSBtn').addEventListener('click', () => {
      window.location.href = 'swms.html';
    });
  },

  startClockUpdates() {
    // Clear any existing interval
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    // Update every second
    this.clockInterval = setInterval(() => {
      const clockEl = document.getElementById('commandClock');
      if (clockEl) {
        clockEl.textContent = this.formatTime(new Date());
      }
    }, 1000);
  },

  openLogWeightModal() {
    const currentWeight = DataService.getWeight().current || '';
    const input = prompt('Log your weight (kg):', currentWeight);
    if (input !== null && input !== '') {
      const weight = parseFloat(input);
      if (!isNaN(weight)) {
        DataService.logWeight(weight);
        this.render();
      }
    }
  },

  openLogTrainingModal() {
    const trainingName = prompt('Log training session name:');
    if (trainingName) {
      DataService.logTraining(trainingName);
      this.render();
    }
  },

  getGreeting() {
    const hour = new Date().getHours();
    if (hour < 5) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  },

  formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-AU', options);
  },

  formatShortDate(dateStr) {
    try {
      const date = new Date(dateStr);
      const options = { month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-AU', options);
    } catch (e) {
      return dateStr;
    }
  },

  formatTime(date) {
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  },

  getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  },

  sanitizeClass(str) {
    return str.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  },

  destroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }
};
