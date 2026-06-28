/**
 * Calendar Module for EHV Ops Hub
 * Displays Outlook events, task deadlines, and training sessions
 * Supports AGENDA (chronological list) and WEEK (grid) views
 */

const CalendarModule = (() => {
  const VIEWS = {
    AGENDA: 'agenda',
    WEEK: 'week'
  };

  let currentView = VIEWS.AGENDA;
  let currentWeekOffset = 0;
  let container = null;

  /**
   * Initialize the calendar module
   * @param {HTMLElement} el - Container element
   */
  const init = (el) => {
    container = el || document.getElementById('content');
    render();
    attachEventListeners();
  };

  /**
   * Main render function - displays current view
   */
  const render = () => {
    if (!container) return;

    container.innerHTML = '';

    // Create main calendar card
    const calendarCard = document.createElement('div');
    calendarCard.className = 'card';

    // Header with navigation and view toggle
    const header = createHeader();
    calendarCard.appendChild(header);

    // Calendar content area
    const contentArea = document.createElement('div');
    contentArea.className = 'cal-content-area';

    if (currentView === VIEWS.AGENDA) {
      contentArea.appendChild(createAgendaView());
    } else {
      contentArea.appendChild(createWeekView());
    }

    calendarCard.appendChild(contentArea);

    // Reminders section
    const remindersSection = createRemindersSection();
    calendarCard.appendChild(remindersSection);

    container.appendChild(calendarCard);
  };

  /**
   * Create header with navigation and controls
   */
  const createHeader = () => {
    const header = document.createElement('div');
    header.className = 'card-header';

    // Left side: month/year and navigation
    const navContainer = document.createElement('div');
    navContainer.className = 'cal-nav-container';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary';
    prevBtn.textContent = '← Previous';
    prevBtn.dataset.action = 'prev-week';

    // Today button
    const todayBtn = document.createElement('button');
    todayBtn.className = 'btn btn-secondary';
    todayBtn.textContent = 'Today';
    todayBtn.dataset.action = 'today';

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-secondary';
    nextBtn.textContent = 'Next →';
    nextBtn.dataset.action = 'next-week';

    // Month/Year display
    const monthDisplay = document.createElement('div');
    monthDisplay.className = 'cal-month-display';
    const displayDate = getDisplayDate();
    monthDisplay.textContent = displayDate;

    navContainer.appendChild(prevBtn);
    navContainer.appendChild(monthDisplay);
    navContainer.appendChild(todayBtn);
    navContainer.appendChild(nextBtn);

    // Right side: View toggle and create event
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'cal-controls-container';

    // View toggle buttons
    const agendaToggle = document.createElement('button');
    agendaToggle.className = `btn btn-ghost cal-view-toggle ${currentView === VIEWS.AGENDA ? 'active' : ''}`;
    agendaToggle.textContent = 'Agenda';
    agendaToggle.dataset.view = VIEWS.AGENDA;

    const weekToggle = document.createElement('button');
    weekToggle.className = `btn btn-ghost cal-view-toggle ${currentView === VIEWS.WEEK ? 'active' : ''}`;
    weekToggle.textContent = 'Week';
    weekToggle.dataset.view = VIEWS.WEEK;

    // Create event button
    const createBtn = document.createElement('button');
    createBtn.className = 'btn btn-primary';
    createBtn.textContent = '+ Create Event';
    createBtn.dataset.action = 'create-event';

    // Sync button (if Outlook connected)
    if (typeof Outlook !== 'undefined' && Outlook.isConnected()) {
      const syncBtn = document.createElement('button');
      syncBtn.className = 'btn btn-secondary';
      syncBtn.textContent = '↻ Sync';
      syncBtn.dataset.action = 'sync';
      controlsContainer.appendChild(syncBtn);
    }

    controlsContainer.appendChild(agendaToggle);
    controlsContainer.appendChild(weekToggle);
    controlsContainer.appendChild(createBtn);

    header.appendChild(navContainer);
    header.appendChild(controlsContainer);

    return header;
  };

  /**
   * Create AGENDA view - chronological list grouped by day
   */
  const createAgendaView = () => {
    const container = document.createElement('div');
    container.className = 'cal-agenda-view';

    const startDate = getStartDate();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 14);

    const allEvents = mergeAllEvents(startDate, endDate);

    // Group events by date
    const eventsByDate = {};
    allEvents.forEach(event => {
      const dateKey = formatDateKey(event.date);
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });

    // Sort dates
    const sortedDates = Object.keys(eventsByDate).sort();

    // Render each day
    sortedDates.forEach(dateKey => {
      const dayContainer = document.createElement('div');
      dayContainer.className = 'cal-agenda-day';

      // Day heading
      const dayHeading = document.createElement('div');
      dayHeading.className = 'cal-agenda-heading';

      const date = new Date(dateKey);
      const isToday = isDateToday(date);
      if (isToday) {
        dayHeading.classList.add('today');
      }

      dayHeading.textContent = formatDateHeading(date);
      dayContainer.appendChild(dayHeading);

      // Events for this day
      eventsByDate[dateKey].forEach(event => {
        const eventEl = createAgendaEventItem(event, isToday);
        dayContainer.appendChild(eventEl);
      });

      container.appendChild(dayContainer);
    });

    return container;
  };

  /**
   * Create individual agenda event item
   */
  const createAgendaEventItem = (event, dayIsToday) => {
    const item = document.createElement('div');
    item.className = 'cal-agenda-item';

    // Check if event is in the past
    if (isPastEvent(event)) {
      item.classList.add('past');
    }

    // Time
    const timeEl = document.createElement('span');
    timeEl.className = 'cal-agenda-time';
    timeEl.textContent = event.time || 'All Day';

    // Title
    const titleEl = document.createElement('span');
    titleEl.className = 'cal-agenda-title';
    titleEl.textContent = event.title;

    // Source badge
    const sourceEl = document.createElement('span');
    sourceEl.className = `badge-${event.source.toLowerCase()}`;
    sourceEl.textContent = event.source;

    // Duration (if available)
    let durationText = '';
    if (event.duration) {
      durationText = ` (${event.duration})`;
    }
    const durationEl = document.createElement('span');
    durationEl.className = 'cal-agenda-duration';
    durationEl.textContent = durationText;

    item.appendChild(timeEl);
    item.appendChild(titleEl);
    item.appendChild(sourceEl);
    item.appendChild(durationEl);

    return item;
  };

  /**
   * Create WEEK view - 7-column grid
   */
  const createWeekView = () => {
    const container = document.createElement('div');
    container.className = 'cal-week-view';

    const weekDates = getWeekDates(currentWeekOffset);
    const startDate = weekDates[0];
    const endDate = weekDates[6];

    const allEvents = mergeAllEvents(startDate, endDate);

    // Grid container
    const grid = document.createElement('div');
    grid.className = 'cal-week-grid';

    // Column headers
    const headerRow = document.createElement('div');
    headerRow.className = 'cal-week-header-row';

    weekDates.forEach(date => {
      const header = document.createElement('div');
      header.className = 'cal-col-header';
      if (isDateToday(date)) {
        header.classList.add('today');
      }
      const dayName = date.toLocaleDateString('en-AU', { weekday: 'short' });
      const dayNum = date.getDate();
      header.textContent = `${dayName} ${dayNum}`;
      headerRow.appendChild(header);
    });

    grid.appendChild(headerRow);

    // Event grid rows
    const eventRow = document.createElement('div');
    eventRow.className = 'cal-week-events-row';

    weekDates.forEach(date => {
      const dayColumn = document.createElement('div');
      dayColumn.className = 'cal-week-column';

      // Get events for this day
      const dayEvents = allEvents.filter(e =>
        e.date.toDateString() === date.toDateString()
      );

      dayEvents.forEach(event => {
        const eventBlock = document.createElement('div');
        eventBlock.className = `cal-event-block cal-event-${event.source.toLowerCase()}`;

        if (isPastEvent(event)) {
          eventBlock.classList.add('past');
        }

        eventBlock.title = `${event.title} - ${event.time || 'All Day'}`;

        const titleSmall = document.createElement('div');
        titleSmall.className = 'event-block-title';
        titleSmall.textContent = event.title;

        const timeSmall = document.createElement('div');
        timeSmall.className = 'event-block-time';
        timeSmall.textContent = event.time || 'All Day';

        eventBlock.appendChild(titleSmall);
        eventBlock.appendChild(timeSmall);

        dayColumn.appendChild(eventBlock);
      });

      eventRow.appendChild(dayColumn);
    });

    grid.appendChild(eventRow);

    // Current time indicator
    const currentTime = document.createElement('div');
    currentTime.className = 'cal-current-time-line';
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timePercent = (hours * 60 + minutes) / (24 * 60) * 100;
    currentTime.style.top = `${timePercent}%`;
    grid.appendChild(currentTime);

    container.appendChild(grid);

    return container;
  };

  /**
   * Create reminders section
   */
  const createRemindersSection = () => {
    const section = document.createElement('div');
    section.className = 'section-gap';

    const title = document.createElement('h3');
    title.className = 'card-label';
    title.textContent = 'Active Reminders';
    section.appendChild(title);

    const reminders = typeof DataService !== 'undefined'
      ? DataService.getReminders() || []
      : [];

    if (reminders.length === 0) {
      const empty = document.createElement('p');
      empty.style.color = 'var(--color-text-muted)';
      empty.textContent = 'No active reminders';
      section.appendChild(empty);
      return section;
    }

    const table = document.createElement('table');
    table.className = 'reminders-table';

    const tbody = document.createElement('tbody');

    reminders.forEach(reminder => {
      const row = document.createElement('tr');

      // What
      const whatCell = document.createElement('td');
      whatCell.className = 'reminder-what';
      whatCell.textContent = reminder.title;

      // When fires
      const whenCell = document.createElement('td');
      whenCell.className = 'reminder-when';
      whenCell.textContent = formatReminderTime(reminder.fireTime);

      // Type
      const typeCell = document.createElement('td');
      typeCell.className = 'reminder-type';
      typeCell.textContent = reminder.type || 'Event';

      // Actions
      const actionsCell = document.createElement('td');
      actionsCell.className = 'reminder-actions';

      const snoozeBtn = document.createElement('button');
      snoozeBtn.className = 'btn btn-ghost btn-small';
      snoozeBtn.textContent = 'Snooze';
      snoozeBtn.dataset.reminderId = reminder.id;
      snoozeBtn.dataset.action = 'snooze-reminder';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-ghost btn-small';
      deleteBtn.textContent = 'Delete';
      deleteBtn.dataset.reminderId = reminder.id;
      deleteBtn.dataset.action = 'delete-reminder';

      actionsCell.appendChild(snoozeBtn);
      actionsCell.appendChild(deleteBtn);

      row.appendChild(whatCell);
      row.appendChild(whenCell);
      row.appendChild(typeCell);
      row.appendChild(actionsCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    section.appendChild(table);

    return section;
  };

  /**
   * Attach event listeners for user interactions
   */
  const attachEventListeners = () => {
    if (!container) return;

    // View toggle buttons
    container.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentView = e.target.dataset.view;
        render();
      });
    });

    // Navigation buttons
    container.querySelector('[data-action="prev-week"]')?.addEventListener('click', () => {
      currentWeekOffset--;
      render();
    });

    container.querySelector('[data-action="next-week"]')?.addEventListener('click', () => {
      currentWeekOffset++;
      render();
    });

    container.querySelector('[data-action="today"]')?.addEventListener('click', () => {
      currentWeekOffset = 0;
      render();
    });

    // Sync button
    container.querySelector('[data-action="sync"]')?.addEventListener('click', async () => {
      if (typeof Outlook !== 'undefined') {
        await Outlook.fetchEvents();
        render();
      }
    });

    // Create event button
    container.querySelector('[data-action="create-event"]')?.addEventListener('click', () => {
      showCreateEventModal();
    });

    // Reminder actions
    container.querySelectorAll('[data-action="snooze-reminder"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reminderId = e.target.dataset.reminderId;
        snoozeReminder(reminderId);
      });
    });

    container.querySelectorAll('[data-action="delete-reminder"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reminderId = e.target.dataset.reminderId;
        deleteReminder(reminderId);
      });
    });
  };

  /**
   * Show create event modal
   */
  const showCreateEventModal = () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal';

    const title = document.createElement('h2');
    title.textContent = 'Create Event';
    modalContent.appendChild(title);

    // Event type selector
    const typeGroup = document.createElement('div');
    typeGroup.className = 'form-group';

    const typeLabel = document.createElement('label');
    typeLabel.className = 'form-label';
    typeLabel.textContent = 'Type';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'select';
    typeSelect.innerHTML = `
      <option value="event">Calendar Event</option>
      <option value="task">Task Deadline</option>
    `;

    typeGroup.appendChild(typeLabel);
    typeGroup.appendChild(typeSelect);
    modalContent.appendChild(typeGroup);

    // Title
    const titleGroup = document.createElement('div');
    titleGroup.className = 'form-group';

    const titleLabel = document.createElement('label');
    titleLabel.className = 'form-label';
    titleLabel.textContent = 'Title';

    const titleInput = document.createElement('input');
    titleInput.className = 'input';
    titleInput.type = 'text';
    titleInput.placeholder = 'Event title';

    titleGroup.appendChild(titleLabel);
    titleGroup.appendChild(titleInput);
    modalContent.appendChild(titleGroup);

    // Date
    const dateGroup = document.createElement('div');
    dateGroup.className = 'form-group';

    const dateLabel = document.createElement('label');
    dateLabel.className = 'form-label';
    dateLabel.textContent = 'Date';

    const dateInput = document.createElement('input');
    dateInput.className = 'input';
    dateInput.type = 'date';

    dateGroup.appendChild(dateLabel);
    dateGroup.appendChild(dateInput);
    modalContent.appendChild(dateGroup);

    // Time
    const timeGroup = document.createElement('div');
    timeGroup.className = 'form-group';

    const timeLabel = document.createElement('label');
    timeLabel.className = 'form-label';
    timeLabel.textContent = 'Time (optional)';

    const timeInput = document.createElement('input');
    timeInput.className = 'input';
    timeInput.type = 'time';

    timeGroup.appendChild(timeLabel);
    timeGroup.appendChild(timeInput);
    modalContent.appendChild(timeGroup);

    // Description (optional)
    const descGroup = document.createElement('div');
    descGroup.className = 'form-group';

    const descLabel = document.createElement('label');
    descLabel.className = 'form-label';
    descLabel.textContent = 'Description (optional)';

    const descInput = document.createElement('textarea');
    descInput.className = 'input';
    descInput.placeholder = 'Event description';
    descInput.rows = 3;

    descGroup.appendChild(descLabel);
    descGroup.appendChild(descInput);
    modalContent.appendChild(descGroup);

    // Buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'modal-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';

    const createBtn = document.createElement('button');
    createBtn.className = 'btn btn-primary';
    createBtn.textContent = 'Create';

    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(createBtn);
    modalContent.appendChild(buttonGroup);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Event listeners
    cancelBtn.addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    createBtn.addEventListener('click', () => {
      const eventData = {
        type: typeSelect.value,
        title: titleInput.value,
        date: dateInput.value,
        time: timeInput.value,
        description: descInput.value
      };

      if (!eventData.title || !eventData.date) {
        alert('Please fill in title and date');
        return;
      }

      // Save event (would integrate with DataService/Outlook)
      if (typeof DataService !== 'undefined') {
        if (eventData.type === 'event') {
          // Save as calendar event
          console.log('Creating calendar event:', eventData);
        } else {
          // Save as task
          console.log('Creating task:', eventData);
        }
      }

      modal.remove();
      render();
    });
  };

  /**
   * Snooze a reminder
   */
  const snoozeReminder = (reminderId) => {
    // Would integrate with DataService
    console.log('Snoozing reminder:', reminderId);
    render();
  };

  /**
   * Delete a reminder
   */
  const deleteReminder = (reminderId) => {
    if (typeof DataService !== 'undefined') {
      DataService.deleteReminder(reminderId);
    }
    render();
  };

  /**
   * Helper: Get current display date (month/year)
   */
  const getDisplayDate = () => {
    const date = getStartDate();
    return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  };

  /**
   * Helper: Get start date for current view period
   */
  const getStartDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For agenda, start from today
    if (currentView === VIEWS.AGENDA) {
      return today;
    }

    // For week, start from beginning of current week (or offset)
    const weekDates = getWeekDates(currentWeekOffset);
    return weekDates[0];
  };

  /**
   * Helper: Get 7 dates for a week (Monday-Sunday)
   */
  const getWeekDates = (offsetWeeks = 0) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find Monday of current week
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));

    // Apply offset
    monday.setDate(monday.getDate() + offsetWeeks * 7);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }

    return dates;
  };

  /**
   * Helper: Merge events from all sources
   */
  const mergeAllEvents = (startDate, endDate) => {
    const events = [];

    // Outlook events (green-mid)
    if (typeof DataService !== 'undefined') {
      const outlookEvents = DataService.getCalendarCache() || [];
      outlookEvents.forEach(event => {
        if (new Date(event.date) >= startDate && new Date(event.date) <= endDate) {
          events.push({
            ...event,
            source: 'Outlook',
            color: 'green-mid'
          });
        }
      });

      // Task deadlines (amber)
      const tasks = DataService.getTasks() || [];
      tasks.forEach(task => {
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          if (dueDate >= startDate && dueDate <= endDate) {
            events.push({
              id: `task-${task.id}`,
              title: task.title,
              date: dueDate,
              time: '',
              source: 'Task',
              color: 'amber'
            });
          }
        }
      });

      // Training sessions (charcoal)
      const training = DataService.getTrainingPlan() || [];
      training.forEach(session => {
        if (new Date(session.date) >= startDate && new Date(session.date) <= endDate) {
          events.push({
            ...session,
            source: 'Training',
            color: 'charcoal'
          });
        }
      });
    }

    return events;
  };

  /**
   * Helper: Format time string
   */
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  /**
   * Helper: Check if date is today
   */
  const isDateToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  /**
   * Helper: Check if event is in the past
   */
  const isPastEvent = (event) => {
    const eventDate = new Date(event.date);
    const now = new Date();

    if (event.time) {
      const [hours, minutes] = event.time.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes));
    } else {
      eventDate.setHours(23, 59);
    }

    return eventDate < now;
  };

  /**
   * Helper: Format date for day heading
   */
  const formatDateHeading = (date) => {
    const dayName = date.toLocaleDateString('en-AU', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-AU', { month: 'long' });
    return `${dayName} ${day} ${month}`;
  };

  /**
   * Helper: Format date key for grouping
   */
  const formatDateKey = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  /**
   * Helper: Format reminder fire time
   */
  const formatReminderTime = (fireTime) => {
    if (!fireTime) return 'Soon';

    const fireDate = new Date(fireTime);
    const now = new Date();
    const diffMs = fireDate - now;

    if (diffMs < 0) return 'Overdue';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  return {
    init,
    render
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarModule;
}
