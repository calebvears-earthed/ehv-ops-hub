/* ═══════════════════════════════════════════════════
   EHV OPS HUB — Data Service
   Single source of truth for all localStorage operations.
   Every module reads/writes through this layer.
   ═══════════════════════════════════════════════════ */

const DataService = (() => {
  const PREFIX = 'ehv_';

  // ── Core CRUD ──
  function _get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`DataService: failed to parse ${key}`, e);
      return null;
    }
  }

  function _set(key, data) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data));
      _emit(key, data);
    } catch (e) {
      console.error(`DataService: failed to write ${key}`, e);
    }
  }

  function _remove(key) {
    localStorage.removeItem(PREFIX + key);
    _emit(key, null);
  }

  // ── Event system for cross-module reactivity ──
  const _listeners = {};

  function _emit(key, data) {
    if (_listeners[key]) {
      _listeners[key].forEach(fn => fn(data));
    }
  }

  function on(key, callback) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(callback);
    return () => { _listeners[key] = _listeners[key].filter(fn => fn !== callback); };
  }

  // ── Settings ──
  const DEFAULT_SETTINGS = {
    name: 'Belac',
    fullName: 'Belac Sraev',
    height: 180,
    dob: '1993-01-01',
    location: 'Adelaide, SA',
    lat: -34.9285,
    lng: 138.6007,
    goalType: 'Lean muscle',
    targetWeight: 85,
    company: {
      name: 'Earthed High Voltage Pty Ltd',
      abn: '99 679 180 879',
      licence: 'PGE336477',
      cec: ''
    },
    outlook: { clientId: '', tenantId: '', connected: false },
    notifications: { enabled: false, vapidPublic: '', vapidPrivate: '' },
    defaultReminders: {
      weighIn: '06:30',
      trainingBefore: 30,
      deadlineAlert: '08:00'
    },
    projects: [
      { id: 'p1', name: 'EHV Operations', color: '#1B4332' },
      { id: 'p2', name: 'Solar Projects', color: '#F5A623' },
      { id: 'p3', name: 'Admin & Compliance', color: '#1E40AF' },
      { id: 'p4', name: 'Personal', color: '#7C3AED' },
      { id: 'p5', name: 'Finance', color: '#0D9488' }
    ],
    setupComplete: false
  };

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...(_get('settings') || {}) };
  }

  function updateSettings(partial) {
    const current = getSettings();
    const updated = { ...current, ...partial };
    _set('settings', updated);
    return updated;
  }

  // ── Tasks ──
  function getTasks() { return _get('tasks') || []; }
  function saveTasks(tasks) { _set('tasks', tasks); }

  function addTask(task) {
    const tasks = getTasks();
    const newTask = {
      id: _uid(),
      title: task.title || '',
      description: task.description || '',
      project: task.project || '',
      priority: task.priority || 'med',
      dueDate: task.dueDate || '',
      calendarEventId: task.calendarEventId || '',
      top3: task.top3 || false,
      top3Order: task.top3Order || 0,
      done: false,
      doneAt: null,
      createdAt: new Date().toISOString(),
      subtasks: task.subtasks || [],
      notes: task.notes || '',
      reminder: task.reminder || null
    };
    tasks.push(newTask);
    saveTasks(tasks);
    return newTask;
  }

  function updateTask(id, updates) {
    const tasks = getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    tasks[idx] = { ...tasks[idx], ...updates };
    saveTasks(tasks);
    return tasks[idx];
  }

  function deleteTask(id) {
    saveTasks(getTasks().filter(t => t.id !== id));
  }

  function completeTask(id) {
    return updateTask(id, { done: true, doneAt: new Date().toISOString() });
  }

  function getTop3() {
    return getTasks()
      .filter(t => t.top3 && !t.done)
      .sort((a, b) => a.top3Order - b.top3Order)
      .slice(0, 3);
  }

  function setTop3(id, order) {
    const tasks = getTasks();
    // If already 3 top3 tasks (not including this one), reject
    const currentTop3 = tasks.filter(t => t.top3 && !t.done && t.id !== id);
    if (currentTop3.length >= 3) return false;
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    tasks[idx].top3 = true;
    tasks[idx].top3Order = order || currentTop3.length + 1;
    saveTasks(tasks);
    return true;
  }

  function removeTop3(id) {
    return updateTask(id, { top3: false, top3Order: 0 });
  }

  // ── Health Profile ──
  function getHealthProfile() {
    return _get('health_profile') || {
      targetWeight: getSettings().targetWeight || 85,
      goalType: getSettings().goalType || 'Lean muscle',
      metrics: { bodyFat: false, waist: false, chest: false, arms: false }
    };
  }

  function updateHealthProfile(partial) {
    const current = getHealthProfile();
    _set('health_profile', { ...current, ...partial });
  }

  // ── Health Log (weight + metrics) ──
  function getHealthLog() { return _get('health_log') || []; }

  function logWeight(weight, date, note) {
    const log = getHealthLog();
    log.push({
      id: _uid(),
      weight: parseFloat(weight),
      date: date || _today(),
      note: note || '',
      timestamp: new Date().toISOString()
    });
    log.sort((a, b) => a.date.localeCompare(b.date));
    _set('health_log', log);
    return log;
  }

  function getLatestWeight() {
    const log = getHealthLog();
    return log.length ? log[log.length - 1] : null;
  }

  // ── Training Plan (weekly template) ──
  const DEFAULT_PLAN = [
    { day: 'Mon', name: 'Upper Body — Kettlebells + Machines', type: 'STRENGTH', duration: 60 },
    { day: 'Tue', name: 'Boxing', type: 'BOXING', duration: 45 },
    { day: 'Wed', name: 'Lower Body — Dumbbells + Machines', type: 'STRENGTH', duration: 60 },
    { day: 'Thu', name: 'Cardio + Core', type: 'CARDIO', duration: 40 },
    { day: 'Fri', name: 'Full Body — Kettlebells', type: 'STRENGTH', duration: 50 },
    { day: 'Sat', name: 'Boxing + Conditioning', type: 'BOXING', duration: 45 },
    { day: 'Sun', name: 'Rest & recover', type: 'REST', duration: 0 }
  ];

  function getTrainingPlan() { return _get('training_plan') || DEFAULT_PLAN; }
  function saveTrainingPlan(plan) { _set('training_plan', plan); }

  // ── Training Log ──
  function getTrainingLog() { return _get('training_log') || []; }

  function logSession(session) {
    const log = getTrainingLog();
    log.push({
      id: _uid(),
      name: session.name || '',
      type: session.type || 'STRENGTH',
      duration: session.duration || 0,
      date: session.date || _today(),
      note: session.note || '',
      status: session.status || 'COMPLETED',
      timestamp: new Date().toISOString()
    });
    log.sort((a, b) => b.date.localeCompare(a.date));
    _set('training_log', log);
    return log;
  }

  function getTrainingStreak() {
    const log = getTrainingLog().filter(s => s.status === 'COMPLETED');
    if (!log.length) return 0;
    let streak = 0;
    const today = new Date(_today());
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      // Check if rest day in plan
      const dayIdx = (d.getDay() + 6) % 7;
      const plan = getTrainingPlan();
      if (plan[dayIdx] && plan[dayIdx].type === 'REST') { streak++; continue; }
      if (log.some(s => s.date === ds)) { streak++; } else { break; }
    }
    return streak;
  }

  // ── Reminders ──
  function getReminders() { return _get('reminders') || []; }
  function saveReminders(reminders) { _set('reminders', reminders); }

  function addReminder(reminder) {
    const list = getReminders();
    list.push({ id: _uid(), ...reminder, createdAt: new Date().toISOString() });
    saveReminders(list);
    return list;
  }

  function deleteReminder(id) {
    saveReminders(getReminders().filter(r => r.id !== id));
  }

  // ── Calendar Cache (Outlook events) ──
  function getCalendarCache() { return _get('calendar_cache') || []; }
  function setCalendarCache(events) { _set('calendar_cache', events); }

  // ── Prompts ──
  function getPrompts() { return _get('prompts') || null; }
  function savePrompts(prompts) { _set('prompts', prompts); }

  // ── Data Export / Import ──
  function exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(PREFIX)) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehv-ops-hub-backup-${_today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importAll(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith(PREFIX)) localStorage.setItem(key, value);
      });
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  function clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }

  // ── Helpers ──
  function _uid() { return '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36); }
  function _today() { return new Date().toISOString().split('T')[0]; }

  function isFirstRun() {
    return !getSettings().setupComplete;
  }

  // ── Public API ──
  return {
    on,
    getSettings, updateSettings, isFirstRun,
    getTasks, saveTasks, addTask, updateTask, deleteTask, completeTask,
    getTop3, setTop3, removeTop3,
    getHealthProfile, updateHealthProfile,
    getHealthLog, logWeight, getLatestWeight,
    getTrainingPlan, saveTrainingPlan,
    getTrainingLog, logSession, getTrainingStreak,
    getReminders, saveReminders, addReminder, deleteReminder,
    getCalendarCache, setCalendarCache,
    getPrompts, savePrompts,
    exportAll, importAll, clearAll,
    today: _today, uid: _uid
  };
})();
