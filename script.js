/* ═══════════════════════════════════════════════
   WE-MAIL 😎 — SCRIPT.JS
   Full logic: tasks · XP · streaks · missions · rewards
═══════════════════════════════════════════════ */

'use strict';

/* ── CONSTANTS ──────────────────────────────── */
const XP_PER_TASK   = { low: 10, medium: 20, high: 35 };
const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1100, 1500, 2000, 2600, 3300];
const LEVEL_TITLES = [
  'Rookie Sender', 'Inbox Warrior', 'Mission Cadet',
  'Task Knight', 'XP Hunter', 'Priority Master',
  'Streak Phantom', 'Level 8 Agent', 'Elite Sender',
  'Grand Commander', '🔥 Legendary Agent'
];
const CAT_ICONS = { study: '📚', health: '💪', social: '💬', other: '⚡' };
const GREETINGS = [
  'Good morning, Agent.', 'Ready to grind?', 'Inbox awaits you.',
  'Missions active.', 'System online.', 'Good evening, Agent.',
  'Stay focused.', 'Level up today.', 'Zero tasks, zero regrets.'
];

/* ── STATE ──────────────────────────────────── */
let state = {
  tasks:         [],
  xp:            0,
  level:         1,
  streak:        0,
  lastActiveDay: null,  // ISO date string YYYY-MM-DD
  totalDone:     0,
  claimedMissions: []
};

/* ── MISSIONS ────────────────────────────────── */
const MISSIONS = [
  { id: 'm1', icon: '🚀', title: 'First Launch', desc: 'Complete your first mission', xp: 25,  type: 'done', threshold: 1 },
  { id: 'm2', icon: '📬', title: 'Mail Flood',   desc: 'Add 5 tasks to your inbox',  xp: 30,  type: 'added', threshold: 5 },
  { id: 'm3', icon: '🔥', title: 'On Fire',      desc: 'Reach a 3-day streak',        xp: 50,  type: 'streak', threshold: 3 },
  { id: 'm4', icon: '💪', title: 'Grind Mode',   desc: 'Complete 10 missions total',  xp: 75,  type: 'done', threshold: 10 },
  { id: 'm5', icon: '⚡', title: 'High Voltage', desc: 'Complete 3 high-priority tasks', xp: 60, type: 'highDone', threshold: 3 },
  { id: 'm6', icon: '🌟', title: 'Week Warrior', desc: 'Reach a 7-day streak',        xp: 120, type: 'streak', threshold: 7 },
  { id: 'm7', icon: '🏆', title: 'Century',      desc: 'Earn 200 XP total',           xp: 40,  type: 'xp', threshold: 200 },
  { id: 'm8', icon: '🎯', title: 'Precision',    desc: 'Complete 25 missions total',  xp: 100, type: 'done', threshold: 25 },
];

/* ── REWARDS ─────────────────────────────────── */
const REWARDS = [
  { id: 'r1', icon: '🎖️',  name: 'Bronze Badge', cost: 50  },
  { id: 'r2', icon: '🥈',  name: 'Silver Badge', cost: 150 },
  { id: 'r3', icon: '🥇',  name: 'Gold Badge',   cost: 300 },
  { id: 'r4', icon: '🌌',  name: 'Cyber Skin',   cost: 200 },
  { id: 'r5', icon: '🔮',  name: 'XP Booster',   cost: 100 },
  { id: 'r6', icon: '👑',  name: 'Crown Title',  cost: 500 },
  { id: 'r7', icon: '🚀',  name: 'Rocket Mode',  cost: 400 },
  { id: 'r8', icon: '⚡',  name: 'Surge Pack',   cost: 750 },
];

/* ── PERSISTENCE ─────────────────────────────── */
function saveState() {
  localStorage.setItem('wemail_state', JSON.stringify(state));
}
function loadState() {
  try {
    const raw = localStorage.getItem('wemail_state');
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch (_) {}
  updateStreak();
}

/* ── STREAK LOGIC ────────────────────────────── */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function updateStreak() {
  const today = todayISO();
  if (!state.lastActiveDay) return;
  const last = new Date(state.lastActiveDay);
  const now  = new Date(today);
  const diff = Math.round((now - last) / 86400000);
  if (diff === 0) return;         // same day – streak intact
  if (diff === 1) return;         // yesterday – keep streak (bumped on task complete)
  if (diff > 1) {                 // missed a day
    state.streak = 0;
    saveState();
  }
}
function bumpStreak() {
  const today = todayISO();
  if (state.lastActiveDay === today) return; // already bumped today
  const last = state.lastActiveDay;
  state.lastActiveDay = today;
  if (last) {
    const diff = Math.round((new Date(today) - new Date(last)) / 86400000);
    if (diff <= 1) {
      state.streak += 1;
    } else {
      state.streak = 1; // broken streak, restart
    }
  } else {
    state.streak = 1;
  }
  saveState();
}

/* ── XP & LEVEL ──────────────────────────────── */
function addXP(amount) {
  state.xp += amount;
  const newLevel = calcLevel(state.xp);
  if (newLevel > state.level) {
    state.level = newLevel;
    showToast(`🎉 LEVEL UP! You're now Level ${newLevel} — ${LEVEL_TITLES[Math.min(newLevel - 1, LEVEL_TITLES.length - 1)]}`, 'ok', 3500);
    spawnXpPop('+LVL!');
  }
  saveState();
  renderHeader();
  renderProfile();
  renderRewards();
  checkMissions();
}
function calcLevel(xp) {
  let lvl = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
    else break;
  }
  return Math.min(lvl, LEVEL_THRESHOLDS.length);
}
function xpToNextLevel(xp) {
  const lvl = calcLevel(xp);
  const curr = LEVEL_THRESHOLDS[lvl - 1] ?? 0;
  const next  = LEVEL_THRESHOLDS[lvl] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = ((xp - curr) / (next - curr)) * 100;
  return Math.min(progress, 100);
}

/* ── TASK CRUD ───────────────────────────────── */
function addTask(title, priority, category, due) {
  const task = {
    id:       'task_' + Date.now(),
    title:    title.trim(),
    priority: priority || 'low',
    category: category || 'other',
    due:      due || null,
    done:     false,
    createdAt: new Date().toISOString()
  };
  state.tasks.unshift(task);
  saveState();
  renderTasks();
  renderMissions();
  showToast(`📬 Mission added — ${XP_PER_TASK[task.priority]} XP on completion`, 'ok');
}

function completeTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task || task.done) return;
  task.done = true;
  const xpGain = XP_PER_TASK[task.priority];
  state.totalDone += 1;
  if (task.priority === 'high') {
    state.highDone = (state.highDone || 0) + 1;
  }
  bumpStreak();
  saveState();
  addXP(xpGain);
  spawnXpPop(`+${xpGain} XP`);
  showToast(`✅ Mission complete! +${xpGain} XP 🔥`, 'xp');
  renderTasks();
  renderStreak();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  renderTasks();
}

/* ── RENDER: HEADER ──────────────────────────── */
function renderHeader() {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${prefix}, Agent.`;

  document.getElementById('xpValue').textContent = state.xp;
  document.getElementById('levelNumHeader').textContent = state.level;

  // ring fill
  const pct = xpToNextLevel(state.xp);
  const circumference = 2 * Math.PI * 18; // r=18 → ≈113.1
  const offset = circumference - (pct / 100) * circumference;
  document.getElementById('ringFillHeader').style.strokeDashoffset = offset;
}

/* ── RENDER: STREAK ──────────────────────────── */
function renderStreak() {
  const s = state.streak;
  document.getElementById('streakCount').textContent = s;
  const sub = document.getElementById('streakSub');
  const badge = document.getElementById('streakBadge');
  const flame = document.getElementById('streakFlame');
  if (s === 0) {
    sub.textContent = 'Start your streak today!';
    badge.textContent = 'NEW';
    flame.textContent = '🔥';
  } else if (s < 3) {
    sub.textContent = 'Keep it going!';
    badge.textContent = `DAY ${s}`;
  } else if (s < 7) {
    sub.textContent = '🔥 You\'re on fire!';
    badge.textContent = `DAY ${s}`;
    flame.textContent = '🔥';
  } else {
    sub.textContent = '🌟 Legendary streak!';
    badge.textContent = `🌟 DAY ${s}`;
    flame.textContent = '⚡';
  }
}

/* ── RENDER: TASKS ───────────────────────────── */
let currentFilter = 'all';

function renderTasks() {
  const list = document.getElementById('taskList');
  const empty = document.getElementById('emptyState');
  const counter = document.getElementById('taskCounter');

  let filtered = state.tasks;
  if (currentFilter === 'pending')   filtered = state.tasks.filter(t => !t.done);
  if (currentFilter === 'done')      filtered = state.tasks.filter(t => t.done);

  const pending = state.tasks.filter(t => !t.done).length;
  counter.textContent = pending === 0 ? 'Inbox zero 🎉' : `${pending} mission${pending !== 1 ? 's' : ''} pending`;

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = filtered.map(taskCard).join('');
}

function taskCard(t) {
  const xpVal = XP_PER_TASK[t.priority];
  const catIcon = CAT_ICONS[t.category] || '⚡';
  let dueStr = '';
  let overdueClass = '';
  if (t.due) {
    const due = new Date(t.due + 'T23:59:59');
    const now = new Date();
    const diff = Math.ceil((due - now) / 86400000);
    if (diff < 0) {
      dueStr = 'Overdue';
      overdueClass = 'overdue';
    } else if (diff === 0) {
      dueStr = 'Due today';
    } else if (diff === 1) {
      dueStr = 'Due tomorrow';
    } else {
      dueStr = `Due in ${diff}d`;
    }
  }

  return `
  <div class="task-card ${t.done ? 'done' : ''}" data-id="${t.id}" data-p="${t.priority}">
    <button class="task-check-btn" data-action="check" data-id="${t.id}" aria-label="${t.done ? 'Completed' : 'Complete mission'}">
      ${t.done ? '✓' : ''}
    </button>
    <div class="task-body">
      <div class="task-title">${escHtml(t.title)}</div>
      <div class="task-meta">
        <span class="task-tag tag-priority-${t.priority}">${t.priority.toUpperCase()}</span>
        <span class="task-tag">${catIcon} ${t.category}</span>
        <span class="task-tag tag-xp">+${xpVal} XP</span>
        ${dueStr ? `<span class="task-due ${overdueClass}">${dueStr}</span>` : ''}
      </div>
    </div>
    <button class="task-delete-btn" data-action="delete" data-id="${t.id}" aria-label="Delete mission">🗑</button>
  </div>`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── RENDER: MISSIONS ────────────────────────── */
function checkMissions() {
  const highDone = state.highDone || 0;
  MISSIONS.forEach(m => {
    if (state.claimedMissions.includes(m.id)) return;
    let prog = 0;
    switch (m.type) {
      case 'done':     prog = state.totalDone;       break;
      case 'added':    prog = state.tasks.length;    break;
      case 'streak':   prog = state.streak;           break;
      case 'highDone': prog = highDone;              break;
      case 'xp':       prog = state.xp;              break;
    }
    if (prog >= m.threshold && !state.claimedMissions.includes(m.id)) {
      state.claimedMissions.push(m.id);
      addXP(m.xp);
      showToast(`🎯 Mission unlocked: "${m.title}" +${m.xp} XP!`, 'xp', 3000);
    }
  });
  renderMissions();
}

function renderMissions() {
  const grid = document.getElementById('missionsGrid');
  const highDone = state.highDone || 0;
  grid.innerHTML = MISSIONS.map(m => {
    const claimed = state.claimedMissions.includes(m.id);
    let prog = 0;
    switch (m.type) {
      case 'done':     prog = state.totalDone;    break;
      case 'added':    prog = state.tasks.length; break;
      case 'streak':   prog = state.streak;        break;
      case 'highDone': prog = highDone;           break;
      case 'xp':       prog = state.xp;           break;
    }
    const pct = Math.min((prog / m.threshold) * 100, 100);
    const cls = claimed ? 'claimed' : pct > 0 ? 'unlocked' : '';
    return `
    <div class="mission-card ${cls}">
      <div class="mission-icon">${m.icon}</div>
      <div class="mission-body">
        <div class="mission-title">${m.title} ${claimed ? '✅' : ''}</div>
        <div class="mission-desc">${m.desc}</div>
        <div class="mission-progress">
          <div class="mission-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="mission-xp">+${m.xp} XP</div>
    </div>`;
  }).join('');
}

/* ── RENDER: REWARDS ─────────────────────────── */
function renderRewards() {
  const grid = document.getElementById('rewardsGrid');
  grid.innerHTML = REWARDS.map(r => {
    const unlocked = state.xp >= r.cost;
    return `
    <div class="reward-card ${unlocked ? 'unlocked' : 'locked'}">
      <div class="reward-icon">${r.icon}</div>
      <div class="reward-name">${r.name}</div>
      <div class="reward-cost">${unlocked ? '✅ Unlocked' : r.cost + ' XP'}</div>
    </div>`;
  }).join('');
}

/* ── RENDER: PROFILE ─────────────────────────── */
function renderProfile() {
  document.getElementById('statXP').textContent     = state.xp;
  document.getElementById('statDone').textContent   = state.totalDone;
  document.getElementById('statStreak').textContent = state.streak;
  document.getElementById('statLevel').textContent  = state.level;
  const title = LEVEL_TITLES[Math.min(state.level - 1, LEVEL_TITLES.length - 1)];
  document.getElementById('profileTitle').textContent = title;
}

/* ── TOAST ───────────────────────────────────── */
let toastTimer = null;
function showToast(msg, type = 'ok', duration = 2400) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ── XP POP ──────────────────────────────────── */
function spawnXpPop(label) {
  const el = document.createElement('div');
  el.className = 'xp-pop';
  el.textContent = label;
  const xpEl = document.getElementById('xpValue');
  const rect = xpEl.getBoundingClientRect();
  el.style.left = rect.left + 'px';
  el.style.top  = rect.top  + 'px';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ── MODAL ───────────────────────────────────── */
let selectedPriority = 'low';
let selectedCat      = 'study';

function openModal() {
  document.getElementById('modalBackdrop').classList.add('open');
  document.getElementById('modalBackdrop').setAttribute('aria-hidden', 'false');
  document.getElementById('fabBtn').classList.add('open');
  document.getElementById('taskTitle').focus();
}
function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  document.getElementById('modalBackdrop').setAttribute('aria-hidden', 'true');
  document.getElementById('fabBtn').classList.remove('open');
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDue').value = '';
}

/* ── NAV ─────────────────────────────────────── */
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`.nav-item[data-page="${name}"]`).classList.add('active');
}

/* ── EMAIL ───────────────────────────────────── */
async function sendEmailReminder() {
  const name  = document.getElementById('emailName').value.trim();
  const email = document.getElementById('emailAddr').value.trim();
  const msg   = document.getElementById('emailMsg').value.trim();

  if (!name || !email || !msg) {
    showToast('⚠️ Fill all fields first.', 'warn'); return;
  }
  if (!email.includes('@')) {
    showToast('⚠️ Invalid email address.', 'warn'); return;
  }

  const btn = document.getElementById('sendEmailBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>📡 Transmitting...</span>';

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message: msg })
    });
    if (res.ok) {
      showToast('📬 Mission brief transmitted!', 'ok', 3000);
      document.getElementById('emailMsg').value = '';
    } else {
      showToast('❌ Transmission failed. Try again.', 'warn');
    }
  } catch (_) {
    showToast('📡 Server offline – deploy /api first.', 'warn', 3500);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>📨 Send Mission Brief</span>';
  }
}

/* ── EVENT WIRING ────────────────────────────── */
function wireEvents() {

  // FAB
  document.getElementById('fabBtn').addEventListener('click', openModal);

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) closeModal();
  });

  // Priority buttons
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPriority = btn.dataset.p;
    });
  });

  // Category buttons
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCat = btn.dataset.c;
    });
  });

  // Launch mission
  document.getElementById('launchMission').addEventListener('click', () => {
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) { showToast('⚠️ Give your mission a subject!', 'warn'); return; }
    const due = document.getElementById('taskDue').value;
    addTask(title, selectedPriority, selectedCat, due);
    closeModal();
  });

  // Enter key in task input
  document.getElementById('taskTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('launchMission').click();
  });

  // Task list delegation
  document.getElementById('taskList').addEventListener('click', e => {
    const checkBtn  = e.target.closest('[data-action="check"]');
    const deleteBtn = e.target.closest('[data-action="delete"]');
    if (checkBtn)  completeTask(checkBtn.dataset.id);
    if (deleteBtn) {
      deleteTask(deleteBtn.dataset.id);
      showToast('🗑 Mission deleted.', 'warn', 1600);
    }
  });

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderTasks();
    });
  });

  // Bottom nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });

  // Email send
  document.getElementById('sendEmailBtn').addEventListener('click', sendEmailReminder);

  // Reset
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('⚠️ This will erase ALL your missions, XP, and streak. Continue?')) return;
    localStorage.removeItem('wemail_state');
    state = {
      tasks: [], xp: 0, level: 1, streak: 0,
      lastActiveDay: null, totalDone: 0, claimedMissions: [], highDone: 0
    };
    renderAll();
    showToast('🔄 Agent data wiped. Fresh start!', 'warn', 2500);
  });

  // Escape key closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ── RENDER ALL ──────────────────────────────── */
function renderAll() {
  renderHeader();
  renderStreak();
  renderTasks();
  renderMissions();
  renderRewards();
  renderProfile();
}

/* ── INIT ────────────────────────────────────── */
function init() {
  loadState();
  wireEvents();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
