/* ═══════════════════════════════════════════════════
   EHV OPS HUB — Health Command Module
   Performance tracking: weight, training plan, training log.
   ═══════════════════════════════════════════════════ */

const HealthCommand = (() => {
  let weightChartInstance = null;

  function init() {
    render();
  }

  function render() {
    const content = document.getElementById('content');
    if (!content) return;

    const settings = DataService.getSettings();
    const healthLog = DataService.getHealthLog();
    const latest = DataService.getLatestWeight();
    const plan = DataService.getTrainingPlan();
    const trainingLog = DataService.getTrainingLog();
    const streak = DataService.getTrainingStreak();

    content.innerHTML = `
      <div class="health-command">
        ${renderPersonalStats(settings)}
        ${renderBodyStats(settings, healthLog, latest)}
        ${renderTrainingPlan(plan)}
        ${renderTrainingLog(trainingLog, streak)}
      </div>
    `;

    setTimeout(() => initWeightChart(healthLog, settings.targetWeight), 50);
  }

  function renderPersonalStats(s) {
    const age = s.dob ? calcAge(s.dob) : '—';
    return `
      <div class="card section-gap">
        <div class="card-header"><span class="card-label">Personal Stats</span></div>
        <div class="stat-grid">
          <div class="stat-block"><div class="stat-value">${s.fullName || s.name || 'Operator'}</div><div class="stat-label">Name</div></div>
          <div class="stat-block"><div class="stat-value">${s.height || '—'} cm</div><div class="stat-label">Height</div></div>
          <div class="stat-block"><div class="stat-value">${age}</div><div class="stat-label">Age</div></div>
          <div class="stat-block"><div class="stat-value">${s.goalType || 'General Fitness'}</div><div class="stat-label">Goal</div></div>
        </div>
      </div>`;
  }

  function renderBodyStats(settings, healthLog, latest) {
    const cw = latest ? latest.weight : null;
    const tw = settings.targetWeight || null;
    let toGoal = '—', indicator = '';
    if (cw !== null && tw !== null) {
      const diff = cw - tw;
      toGoal = Math.abs(diff).toFixed(1) + ' kg';
      indicator = diff <= 0
        ? '<span style="color:#2D6A4F">On track</span>'
        : '<span style="color:#F5A623">' + diff.toFixed(1) + ' kg over</span>';
    }

    return `
      <div class="card section-gap">
        <div class="card-header">
          <span class="card-label">Body Stats</span>
          <button class="btn btn-primary btn-sm" onclick="HealthCommand.openLogWeight()">Log Weight</button>
        </div>
        <div class="stat-grid">
          <div class="stat-block">
            <div class="stat-value">${cw !== null ? cw.toFixed(1) : '—'}</div>
            <div class="stat-label">Current (kg)</div>
            ${latest ? '<div class="stat-sub">' + fmtDate(latest.date) + '</div>' : ''}
          </div>
          <div class="stat-block">
            <div class="stat-value">${tw !== null ? tw.toFixed(1) : '—'}</div>
            <div class="stat-label">Target (kg)</div>
          </div>
          <div class="stat-block">
            <div class="stat-value">${toGoal}</div>
            <div class="stat-label">To Goal</div>
            ${indicator}
          </div>
        </div>
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #E5E7EB">
          <div style="position:relative;height:280px"><canvas id="weightCanvas"></canvas></div>
          <div style="font-size:.8rem;color:#6B7280;text-align:center;margin-top:.5rem">${healthLog.length} entries tracked</div>
        </div>
      </div>`;
  }

  function renderTrainingPlan(plan) {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIdx = (new Date().getDay() + 6) % 7;

    const rows = plan.map((p, i) => {
      const isToday = i === todayIdx;
      const isRest = p.type === 'REST';
      return `
        <div class="training-day${isToday ? ' today' : ''}${isRest ? ' rest' : ''}">
          <div class="training-day-name">${dayNames[i]}</div>
          <div class="training-day-session">${p.name || 'Rest'}</div>
          ${!isRest ? '<span class="badge">' + p.type + '</span>' : ''}
          ${p.duration ? '<div class="training-day-meta">' + p.duration + ' min</div>' : ''}
        </div>`;
    }).join('');

    return `
      <div class="card section-gap">
        <div class="card-header"><span class="card-label">Training Plan</span></div>
        <div class="training-week">${rows}</div>
      </div>`;
  }

  function renderTrainingLog(log, streak) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completed = log.filter(s => s.status === 'COMPLETED');
    const thisWeek = completed.filter(s => new Date(s.date) >= weekStart).length;
    const thisMonth = completed.filter(s => new Date(s.date) >= monthStart).length;
    const avgDur = completed.length ? Math.round(completed.reduce((s,l) => s + (l.duration||0), 0) / completed.length) : 0;

    const rows = log.slice(0, 20).map(l => `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:.5rem .25rem">${fmtDate(l.date)}</td>
        <td style="padding:.5rem .25rem">${l.name || '—'}</td>
        <td style="padding:.5rem .25rem"><span class="badge">${l.type}</span></td>
        <td style="padding:.5rem .25rem">${l.duration || 0}m</td>
        <td style="padding:.5rem .25rem">${l.status}</td>
      </tr>`).join('');

    return `
      <div class="card section-gap">
        <div class="card-header">
          <span class="card-label">Training Log</span>
          <button class="btn btn-primary btn-sm" onclick="HealthCommand.openLogSession()">Log Session</button>
        </div>
        <div class="stat-grid" style="margin-bottom:1rem">
          <div class="stat-block"><div class="stat-value">${thisWeek}</div><div class="stat-label">This Week</div></div>
          <div class="stat-block"><div class="stat-value">${thisMonth}</div><div class="stat-label">This Month</div></div>
          <div class="stat-block"><div class="stat-value">${streak}d</div><div class="stat-label">Streak</div></div>
          <div class="stat-block"><div class="stat-value">${avgDur}m</div><div class="stat-label">Avg Duration</div></div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;font-size:.85rem">
            <thead><tr>
              <th style="text-align:left;padding:.5rem .25rem">Date</th>
              <th style="text-align:left;padding:.5rem .25rem">Session</th>
              <th style="text-align:left;padding:.5rem .25rem">Type</th>
              <th style="text-align:left;padding:.5rem .25rem">Duration</th>
              <th style="text-align:left;padding:.5rem .25rem">Status</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="5" style="padding:1rem;text-align:center;color:#6B7280">No sessions logged yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  function initWeightChart(healthLog, targetWeight) {
    if (weightChartInstance) { weightChartInstance.destroy(); weightChartInstance = null; }
    if (!healthLog.length) return;
    if (typeof ChartConfig !== 'undefined') {
      ChartConfig.applyDefaults();
      weightChartInstance = ChartConfig.weightChart('weightCanvas', healthLog, targetWeight);
    }
  }

  function openLogWeight() {
    const today = DataService.today();
    document.getElementById('modal-root').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)HealthCommand.closeModal()">
        <div class="modal">
          <div class="modal-title">Log Weight</div>
          <div class="form-group"><label class="form-label">Weight (kg)</label>
            <input type="number" class="input" id="hw-weight" step="0.1" placeholder="85.0" required></div>
          <div class="form-group"><label class="form-label">Date</label>
            <input type="date" class="input" id="hw-date" value="${today}"></div>
          <div class="form-group"><label class="form-label">Note (optional)</label>
            <input type="text" class="input" id="hw-note" placeholder="Morning fasted etc."></div>
          <div class="modal-actions">
            <button class="btn btn-secondary" onclick="HealthCommand.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="HealthCommand.saveWeight()">Save</button>
          </div>
        </div>
      </div>`;
  }

  function saveWeight() {
    const w = parseFloat(document.getElementById('hw-weight').value);
    const d = document.getElementById('hw-date').value;
    const n = document.getElementById('hw-note').value;
    if (isNaN(w) || !d) { alert('Please enter weight and date'); return; }
    DataService.logWeight(w, d, n);
    closeModal();
    render();
  }

  function openLogSession() {
    const today = DataService.today();
    const plan = DataService.getTrainingPlan();
    const todayIdx = (new Date().getDay() + 6) % 7;
    const todayPlan = plan[todayIdx] || {};

    document.getElementById('modal-root').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)HealthCommand.closeModal()">
        <div class="modal">
          <div class="modal-title">Log Training Session</div>
          <div class="form-group"><label class="form-label">Session Name</label>
            <input type="text" class="input" id="hs-name" value="${todayPlan.name || ''}" placeholder="Upper Body"></div>
          <div class="form-group"><label class="form-label">Type</label>
            <select class="input" id="hs-type">
              <option value="STRENGTH" ${todayPlan.type==='STRENGTH'?'selected':''}>Strength</option>
              <option value="BOXING" ${todayPlan.type==='BOXING'?'selected':''}>Boxing</option>
              <option value="CARDIO" ${todayPlan.type==='CARDIO'?'selected':''}>Cardio</option>
              <option value="MOBILITY">Mobility</option>
            </select></div>
          <div class="form-group"><label class="form-label">Duration (min)</label>
            <input type="number" class="input" id="hs-duration" value="${todayPlan.duration || 45}"></div>
          <div class="form-group"><label class="form-label">Date</label>
            <input type="date" class="input" id="hs-date" value="${today}"></div>
          <div class="form-group"><label class="form-label">Note (optional)</label>
            <input type="text" class="input" id="hs-note" placeholder="How did it go?"></div>
          <div class="modal-actions">
            <button class="btn btn-secondary" onclick="HealthCommand.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="HealthCommand.saveSession()">Save</button>
          </div>
        </div>
      </div>`;
  }

  function saveSession() {
    const name = document.getElementById('hs-name').value;
    const type = document.getElementById('hs-type').value;
    const dur = parseInt(document.getElementById('hs-duration').value) || 0;
    const date = document.getElementById('hs-date').value;
    const note = document.getElementById('hs-note').value;
    if (!name || !date) { alert('Please fill name and date'); return; }
    DataService.logSession({ name, type, duration: dur, date, note });
    closeModal();
    render();
  }

  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
  }

  function calcAge(dob) {
    const today = new Date();
    const b = new Date(dob);
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
    return age;
  }

  function fmtDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }

  return { init, render, openLogWeight, saveWeight, openLogSession, saveSession, closeModal };
})();
