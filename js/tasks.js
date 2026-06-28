/**
 * Task Engine Module
 * Manages task display, filtering, and interaction
 * Exports TaskEngine object with init() and render() methods
 */

const TaskEngine = (() => {
  // Private state
  let state = {
    filterType: 'all', // all, today, week
    filterProject: null,
    filterStatus: null,
    searchQuery: '',
    expandedTaskId: null,
    top3Tasks: []
  };

  // Initialize the Task Engine
  const init = () => {
    state.top3Tasks = DataService.getTop3();
    setupEventListeners();
    render();
  };

  // Setup all event listeners
  const setupEventListeners = () => {
    // Quick Add input
    const quickAddInput = document.querySelector('.task-quick-add input');
    if (quickAddInput) {
      quickAddInput.addEventListener('keypress', handleQuickAdd);
    }

    // Filter buttons
    document.querySelectorAll('[data-filter-type]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        state.filterType = e.target.dataset.filterType;
        render();
      });
    });

    // Project filter
    const projectFilter = document.querySelector('[data-filter-project]');
    if (projectFilter) {
      projectFilter.addEventListener('change', (e) => {
        state.filterProject = e.target.value || null;
        render();
      });
    }

    // Status filter
    const statusFilter = document.querySelector('[data-filter-status]');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        state.filterStatus = e.target.value || null;
        render();
      });
    }
  };

  // Handle quick add task
  const handleQuickAdd = (e) => {
    if (e.key !== 'Enter') return;

    const input = e.target;
    const title = input.value.trim();

    if (!title) return;

    DataService.addTask({
      title,
      completed: false,
      priority: 'med'
    });

    input.value = '';
    render();
  };

  // Filter tasks based on current state
  const filterTasks = (tasks) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return tasks.filter(task => {
      // Filter by completion status
      if (task.completed) return false;

      // Filter by type (all, today, week)
      if (state.filterType === 'today' && task.dueDate) {
        const taskDate = new Date(task.dueDate);
        if (taskDate.toDateString() !== today.toDateString()) return false;
      } else if (state.filterType === 'week' && task.dueDate) {
        const taskDate = new Date(task.dueDate);
        if (taskDate < today || taskDate >= weekEnd) return false;
      }

      // Filter by project
      if (state.filterProject && task.project !== state.filterProject) return false;

      // Filter by status
      if (state.filterStatus && task.status !== state.filterStatus) return false;

      // Filter by search query
      if (state.searchQuery && !task.title.toLowerCase().includes(state.searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    });
  };

  // Get completed tasks from last 7 days
  const getCompletedTasks = () => {
    const allTasks = DataService.getTasks();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return allTasks.filter(task => {
      return task.completed && task.completedDate && new Date(task.completedDate) >= sevenDaysAgo;
    });
  };

  // Check if date is overdue, today, or future
  const getDateClass = (dueDate) => {
    if (!dueDate) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate < today) return 'overdue';
    if (taskDate.getTime() === today.getTime()) return 'today';
    return 'future';
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  };

  // Build Top 3 Priorities section
  const buildTop3Section = () => {
    const section = document.createElement('div');
    section.className = 'top3-container card card-accent-top';

    const heading = document.createElement('h3');
    heading.className = 'top3-heading';
    heading.textContent = "TODAY'S TOP 3";
    section.appendChild(heading);

    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'top3-slots';

    // Create 3 drag-and-drop slots
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div');
      slot.className = 'top3-slot';
      slot.dataset.position = i;
      slot.draggable = true;

      const position = i + 1;
      const task = state.top3Tasks[i];

      if (task) {
        const taskElement = document.createElement('div');
        taskElement.className = 'top3-task';
        taskElement.draggable = true;

        const handle = document.createElement('span');
        handle.className = 'top3-handle';
        handle.textContent = '≡';

        const posNum = document.createElement('span');
        posNum.className = 'top3-position';
        posNum.textContent = String(position).padStart(2, '0');

        const title = document.createElement('span');
        title.className = 'top3-title';
        title.textContent = task.title.substring(0, 50);

        const meta = document.createElement('div');
        meta.className = 'top3-meta';

        if (task.project) {
          const projectBadge = document.createElement('span');
          projectBadge.className = 'badge-project';
          projectBadge.textContent = task.project;
          meta.appendChild(projectBadge);
        }

        if (task.dueDate) {
          const dueDateSpan = document.createElement('span');
          const dateClass = getDateClass(task.dueDate);
          dueDateSpan.className = `task-due-date ${dateClass}`;
          dueDateSpan.textContent = formatDate(task.dueDate);
          meta.appendChild(dueDateSpan);
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox top3-checkbox';
        checkbox.addEventListener('change', () => {
          DataService.completeTask(task.id);
          DataService.removeTop3(task.id);
          render();
        });

        taskElement.appendChild(handle);
        taskElement.appendChild(posNum);
        taskElement.appendChild(title);
        taskElement.appendChild(meta);
        taskElement.appendChild(checkbox);

        setupDragListeners(taskElement);
        slot.appendChild(taskElement);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'top3-placeholder';
        placeholder.textContent = 'Drop task here';
        slot.appendChild(placeholder);
      }

      slotsContainer.appendChild(slot);
    }

    section.appendChild(slotsContainer);
    return section;
  };

  // Setup drag listeners for Top 3
  const setupDragListeners = (element) => {
    element.addEventListener('dragstart', (e) => {
      const taskId = element.closest('[data-task-id]')?.dataset.taskId;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', taskId);
    });
  };

  // Build Quick Add section
  const buildQuickAddSection = () => {
    const section = document.createElement('div');
    section.className = 'task-quick-add';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '+ Add task...';
    input.className = 'quick-add-input';

    section.appendChild(input);
    return section;
  };

  // Build Filter Bar
  const buildFilterBar = () => {
    const bar = document.createElement('div');
    bar.className = 'filter-bar';

    const filterTypes = [
      { label: 'All', value: 'all' },
      { label: 'Today', value: 'today' },
      { label: 'This Week', value: 'week' }
    ];

    filterTypes.forEach(ft => {
      const btn = document.createElement('button');
      btn.className = `filter-btn ${state.filterType === ft.value ? 'active' : ''}`;
      btn.dataset.filterType = ft.value;
      btn.textContent = ft.label;
      btn.addEventListener('click', () => {
        state.filterType = ft.value;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
      bar.appendChild(btn);
    });

    // Project dropdown
    const projects = DataService.getSettings().projects || [];
    const projectSelect = document.createElement('select');
    projectSelect.className = 'filter-dropdown filter-project';
    projectSelect.dataset.filterProject = true;

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'All Projects';
    projectSelect.appendChild(defaultOption);

    projects.forEach(proj => {
      const option = document.createElement('option');
      option.value = proj;
      option.textContent = proj;
      projectSelect.appendChild(option);
    });

    projectSelect.addEventListener('change', (e) => {
      state.filterProject = e.target.value || null;
      render();
    });

    bar.appendChild(projectSelect);

    // Status dropdown
    const statusSelect = document.createElement('select');
    statusSelect.className = 'filter-dropdown filter-status';
    statusSelect.dataset.filterStatus = true;

    const statusDefault = document.createElement('option');
    statusDefault.value = '';
    statusDefault.textContent = 'All Status';
    statusSelect.appendChild(statusDefault);

    const statuses = ['open', 'in-progress', 'blocked'];
    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      statusSelect.appendChild(option);
    });

    statusSelect.addEventListener('change', (e) => {
      state.filterStatus = e.target.value || null;
      render();
    });

    bar.appendChild(statusSelect);

    return bar;
  };

  // Build a single task row
  const buildTaskRow = (task) => {
    const row = document.createElement('div');
    row.className = `task-row ${task.completed ? 'completed' : ''}`;
    row.dataset.taskId = task.id;

    // Star
    const star = document.createElement('button');
    star.className = 'task-star';
    star.textContent = state.top3Tasks.includes(task.id) ? '★' : '☆';
    star.addEventListener('click', () => {
      if (state.top3Tasks.includes(task.id)) {
        DataService.removeTop3(task.id);
        state.top3Tasks = state.top3Tasks.filter(id => id !== task.id);
      } else if (state.top3Tasks.length < 3) {
        DataService.setTop3(task.id);
        state.top3Tasks.push(task.id);
      }
      render();
    });
    row.appendChild(star);

    // Title (clickable to expand)
    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title.substring(0, 60);
    titleSpan.style.cursor = 'pointer';
    titleSpan.addEventListener('click', () => {
      state.expandedTaskId = state.expandedTaskId === task.id ? null : task.id;
      render();
    });
    row.appendChild(titleSpan);

    // Meta (project, due date, priority)
    const meta = document.createElement('div');
    meta.className = 'task-meta';

    if (task.project) {
      const projectBadge = document.createElement('span');
      projectBadge.className = 'badge-project';
      projectBadge.textContent = task.project;
      meta.appendChild(projectBadge);
    }

    if (task.dueDate) {
      const dateClass = getDateClass(task.dueDate);
      const dueDateSpan = document.createElement('span');
      dueDateSpan.className = `task-due-date ${dateClass}`;
      dueDateSpan.textContent = formatDate(task.dueDate);
      meta.appendChild(dueDateSpan);
    }

    if (task.priority) {
      const priorityBadge = document.createElement('span');
      priorityBadge.className = `badge-priority badge-priority-${task.priority}`;
      priorityBadge.textContent = task.priority.toUpperCase();
      meta.appendChild(priorityBadge);
    }

    row.appendChild(meta);

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
      DataService.completeTask(task.id);
      if (state.top3Tasks.includes(task.id)) {
        DataService.removeTop3(task.id);
        state.top3Tasks = state.top3Tasks.filter(id => id !== task.id);
      }
      render();
    });
    row.appendChild(checkbox);

    // Expanded details
    if (state.expandedTaskId === task.id) {
      const details = document.createElement('div');
      details.className = 'task-details-expanded';

      if (task.description) {
        const desc = document.createElement('div');
        desc.className = 'task-description';
        desc.innerHTML = `<strong>Description:</strong> ${task.description}`;
        details.appendChild(desc);
      }

      if (task.subtasks && task.subtasks.length > 0) {
        const subtasksDiv = document.createElement('div');
        subtasksDiv.className = 'task-subtasks';
        const subtaskHeading = document.createElement('strong');
        subtaskHeading.textContent = 'Subtasks:';
        subtasksDiv.appendChild(subtaskHeading);

        const subtaskList = document.createElement('ul');
        task.subtasks.forEach(sub => {
          const li = document.createElement('li');
          li.textContent = sub;
          subtaskList.appendChild(li);
        });
        subtasksDiv.appendChild(subtaskList);
        details.appendChild(subtasksDiv);
      }

      if (task.notes) {
        const notes = document.createElement('div');
        notes.className = 'task-notes';
        notes.innerHTML = `<strong>Notes:</strong> ${task.notes}`;
        details.appendChild(notes);
      }

      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-action btn-edit';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => showModal(task));
      buttonsDiv.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-action btn-delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (confirm('Delete this task?')) {
          DataService.deleteTask(task.id);
          if (state.top3Tasks.includes(task.id)) {
            DataService.removeTop3(task.id);
            state.top3Tasks = state.top3Tasks.filter(id => id !== task.id);
          }
          render();
        }
      });
      buttonsDiv.appendChild(deleteBtn);

      const deadlineBtn = document.createElement('button');
      deadlineBtn.className = 'btn-action btn-deadline';
      deadlineBtn.textContent = 'Set Deadline';
      deadlineBtn.addEventListener('click', () => {
        const date = prompt('Enter due date (YYYY-MM-DD):', task.dueDate || '');
        if (date) {
          DataService.updateTask(task.id, { dueDate: date });
          render();
        }
      });
      buttonsDiv.appendChild(deadlineBtn);

      details.appendChild(buttonsDiv);
      row.appendChild(details);
    }

    return row;
  };

  // Show task edit modal
  const showModal = (task) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });

    const modal = document.createElement('div');
    modal.className = 'modal';

    const heading = document.createElement('h2');
    heading.textContent = task ? 'Edit Task' : 'New Task';
    modal.appendChild(heading);

    const form = document.createElement('form');

    // Title
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = task?.title || '';
    titleInput.className = 'modal-input';
    form.appendChild(titleLabel);
    form.appendChild(titleInput);

    // Description
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description';
    const descInput = document.createElement('textarea');
    descInput.value = task?.description || '';
    descInput.className = 'modal-textarea';
    form.appendChild(descLabel);
    form.appendChild(descInput);

    // Project
    const projectLabel = document.createElement('label');
    projectLabel.textContent = 'Project';
    const projectSelect = document.createElement('select');
    projectSelect.className = 'modal-select';
    const projects = DataService.getSettings().projects || [];
    projects.forEach(proj => {
      const option = document.createElement('option');
      option.value = proj;
      option.textContent = proj;
      if (task?.project === proj) option.selected = true;
      projectSelect.appendChild(option);
    });
    form.appendChild(projectLabel);
    form.appendChild(projectSelect);

    // Priority
    const priorityLabel = document.createElement('label');
    priorityLabel.textContent = 'Priority';
    const prioritySelect = document.createElement('select');
    prioritySelect.className = 'modal-select';
    ['low', 'med', 'high'].forEach(p => {
      const option = document.createElement('option');
      option.value = p;
      option.textContent = p.toUpperCase();
      if (task?.priority === p) option.selected = true;
      prioritySelect.appendChild(option);
    });
    form.appendChild(priorityLabel);
    form.appendChild(prioritySelect);

    // Due Date
    const dueDateLabel = document.createElement('label');
    dueDateLabel.textContent = 'Due Date';
    const dueDateInput = document.createElement('input');
    dueDateInput.type = 'date';
    dueDateInput.value = task?.dueDate || '';
    dueDateInput.className = 'modal-input';
    form.appendChild(dueDateLabel);
    form.appendChild(dueDateInput);

    // Notes
    const notesLabel = document.createElement('label');
    notesLabel.textContent = 'Notes';
    const notesInput = document.createElement('textarea');
    notesInput.value = task?.notes || '';
    notesInput.className = 'modal-textarea';
    form.appendChild(notesLabel);
    form.appendChild(notesInput);

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'modal-buttons';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn-save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      const updated = {
        title: titleInput.value,
        description: descInput.value,
        project: projectSelect.value,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value,
        notes: notesInput.value
      };

      if (task) {
        DataService.updateTask(task.id, updated);
      } else {
        DataService.addTask(updated);
      }

      document.body.removeChild(overlay);
      render();
    });
    buttonsDiv.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    buttonsDiv.appendChild(cancelBtn);

    form.appendChild(buttonsDiv);
    modal.appendChild(form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  };

  // Main render function
  const render = () => {
    const container = document.getElementById('content');
    if (!container) return;

    container.innerHTML = '';

    // Top 3 Priorities
    container.appendChild(buildTop3Section());

    // Quick Add
    container.appendChild(buildQuickAddSection());

    // Filter Bar
    container.appendChild(buildFilterBar());

    // Get and filter tasks
    const allTasks = DataService.getTasks();
    const activeTasks = filterTasks(allTasks);

    // Task Backlog
    const backlogSection = document.createElement('div');
    backlogSection.className = 'task-backlog';

    if (activeTasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'task-empty';
      empty.textContent = 'No tasks match your filters';
      backlogSection.appendChild(empty);
    } else {
      activeTasks.forEach(task => {
        backlogSection.appendChild(buildTaskRow(task));
      });
    }

    container.appendChild(backlogSection);

    // Completed Section
    const completedTasks = getCompletedTasks();
    if (completedTasks.length > 0) {
      const completedSection = document.createElement('div');
      completedSection.className = 'task-completed-section';

      const heading = document.createElement('h3');
      heading.className = 'task-completed-heading';
      heading.textContent = `Completed (${completedTasks.length})`;
      heading.style.cursor = 'pointer';
      let expanded = false;
      heading.addEventListener('click', () => {
        expanded = !expanded;
        completedList.style.display = expanded ? 'block' : 'none';
        heading.textContent = `Completed (${completedTasks.length}) ${expanded ? '▼' : '▶'}`;
      });
      completedSection.appendChild(heading);

      const completedList = document.createElement('div');
      completedList.className = 'task-completed-list';
      completedList.style.display = 'none';

      completedTasks.forEach(task => {
        const row = document.createElement('div');
        row.className = 'task-row task-completed';

        const title = document.createElement('span');
        title.className = 'task-title';
        title.textContent = task.title;
        row.appendChild(title);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = true;
        checkbox.addEventListener('change', () => {
          DataService.completeTask(task.id);
          render();
        });
        row.appendChild(checkbox);

        completedList.appendChild(row);
      });

      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn-clear-completed';
      clearBtn.textContent = 'Clear completed';
      clearBtn.addEventListener('click', () => {
        completedTasks.forEach(task => {
          DataService.deleteTask(task.id);
        });
        render();
      });
      completedList.appendChild(clearBtn);

      completedSection.appendChild(completedList);
      container.appendChild(completedSection);
    }

    // Re-attach event listeners
    setupEventListeners();
  };

  return {
    init,
    render
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaskEngine;
}
