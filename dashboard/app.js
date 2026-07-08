// app.js
'use strict';

// ── State ────────────────────────────────────────────
let activeSubjectKey = null;
let activePanel = null; // 'topic' | 'session' | null

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const data = window.LEARN_DATA;
  const subjectKeys = Object.keys(data.subjects);
  activeSubjectKey = subjectKeys[0];

  // Populate subject selector
  const sel = document.getElementById('subject-select');
  subjectKeys.forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    sel.appendChild(opt);
  });
  sel.addEventListener('change', e => {
    activeSubjectKey = e.target.value;
    renderAll();
  });

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById('view-' + tab.dataset.tab).classList.remove('hidden');
    });
  });

  // Panel close on overlay background click
  document.getElementById('panel-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget || e.target.classList.contains('panel-overlay-bg')) closePanel();
  });

  // Topic search + filter
  let activeFilter = 'all';
  document.getElementById('topic-search').addEventListener('input', e => {
    const subject = window.LEARN_DATA.subjects[activeSubjectKey];
    renderTopics(subject, activeSubjectKey, e.target.value, activeFilter);
  });
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      const q = document.getElementById('topic-search').value;
      const subject = window.LEARN_DATA.subjects[activeSubjectKey];
      renderTopics(subject, activeSubjectKey, q, activeFilter);
    });
  });

  renderAll();
});

function renderAll() {
  const data = window.LEARN_DATA;
  const subject = data.subjects[activeSubjectKey];
  document.getElementById('streak-display').textContent = subject.streak + '🔥';
  renderProgress(subject, activeSubjectKey);
  renderTopics(subject, activeSubjectKey);
  renderMethods(data, activeSubjectKey);
  renderSessions(data.subjects);
  const streakEl = document.getElementById('streak-heatmap');
  if (streakEl) streakEl.textContent = subject.streak + '🔥 current streak';
}

function renderTopics(subject, subjectKey, query = '', levelFilter = 'all') {
  const today = new Date().toISOString().slice(0, 10);
  const q = query.toLowerCase().trim();
  const filtered = subject.topics.filter(t => {
    const matchesLevel = levelFilter === 'all' || t.level === levelFilter;
    const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.id.includes(q);
    return matchesLevel && matchesQuery;
  });

  const countEl = document.getElementById('topics-count');
  if (countEl) countEl.textContent = `${filtered.length} topic${filtered.length !== 1 ? 's' : ''}`;

  const list = document.getElementById('topics-list');
  if (!list) return;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="search-empty">No topics match your search.</div>';
    return;
  }

  list.innerHTML = filtered.map(topic => {
    const isDue = topic.nextReview && topic.nextReview <= today;
    const isNotStarted = topic.status === 'not-started';
    const scoreCol = scoreBorderColor(topic.score);
    const barGrad = scoreGradient(topic.score);
    const pct = (topic.score / 5) * 100;
    const levelBadgeClass = `level-tag level-tag--${topic.level}`;
    const dueBadge = isDue ? `<span class="due-badge">due</span>` : '';
    const scorePart = isNotStarted
      ? `<span class="tl-status">not started</span>`
      : `<span class="tl-score" style="color:${scoreCol}">${topic.score}/5</span>`;

    return `
      <div class="topic-list-row" style="border-left:3px solid ${scoreCol}"
           onclick="openTopicPanel('${topic.id}','${subjectKey}')">
        <div class="tl-main">
          <span class="tl-name">${topic.name}</span>
          <div class="tl-meta">
            <span class="${levelBadgeClass}">${topic.level}</span>
            ${dueBadge}
            ${scorePart}
          </div>
        </div>
        ${!isNotStarted ? `<div class="tl-bar"><div class="tl-bar-fill" style="width:${pct}%;background:${barGrad}"></div></div>` : ''}
      </div>`;
  }).join('');
}

// ── Panel ─────────────────────────────────────────────
function openPanel(html) {
  const overlay = document.getElementById('panel-overlay');
  document.getElementById('panel').innerHTML = html;
  overlay.classList.remove('hidden');
  overlay.offsetHeight; // force reflow so transition fires
  overlay.classList.add('visible');
  document.getElementById('app').style.opacity = '0.35';
  document.getElementById('app').style.pointerEvents = 'none';
}

function closePanel() {
  const overlay = document.getElementById('panel-overlay');
  overlay.classList.remove('visible');
  document.getElementById('app').style.opacity = '';
  document.getElementById('app').style.pointerEvents = '';
  activePanel = null;
  setTimeout(() => overlay.classList.add('hidden'), 300);
}

// Placeholder renderers — implemented in later tasks
function renderProgress(subject, subjectKey) {
  const today = new Date().toISOString().slice(0, 10);
  const overallPct = computeOverallProgress(subject);
  const masteredCount = subject.topics.filter(t => t.score >= 4).length;
  const dueToday = getTopicsDueToday(subject, today);
  const levelOrder = ['beginner', 'junior', 'middle', 'senior', 'principal'];
  const currentLevel = levelOrder.find(l => {
    const lvl = subject.levels[l];
    return lvl && lvl.mastered < lvl.total;
  }) || levelOrder[levelOrder.length - 1];

  let html = `
    <div class="stats-row">
      <div class="stat-card highlight">
        <div class="stat-value">${overallPct}%</div>
        <div class="stat-label">overall progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${masteredCount}<span style="color:var(--text-faint);font-size:14px">/${subject.totalTopics}</span></div>
        <div class="stat-label">topics mastered</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#f97316">${dueToday.length}${dueToday.length > 0 ? '⚡' : ''}</div>
        <div class="stat-label">due today</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${subject.totalSessions}</div>
        <div class="stat-label">total sessions</div>
      </div>
    </div>
    <div class="level-accordion">`;

  levelOrder.forEach((levelKey, i) => {
    const lvl = subject.levels[levelKey];
    if (!lvl) return;
    const isCurrent = levelKey === currentLevel;
    const pct = lvl.total > 0 ? (lvl.mastered / lvl.total) * 100 : 0;
    const dimStyle = !isCurrent && lvl.mastered === 0 ? `opacity:${0.4 - i * 0.05};` : (lvl.mastered === lvl.total ? 'opacity:0.65;' : '');
    const countColor = pct === 100 ? '#10b981' : pct > 0 ? '#eab308' : 'var(--text-faint)';
    const barGrad = pct === 100 ? 'linear-gradient(90deg,#10b981,#06b6d4)' : 'linear-gradient(90deg,#eab308,#f97316)';
    const topicsForLevel = subject.topics.filter(t => t.level === levelKey);

    html += `
      <div class="level-row${isCurrent ? ' current' : ''}" style="${dimStyle}" data-level="${levelKey}" onclick="toggleLevel('${levelKey}')">
        <div class="level-header">
          <div style="display:flex;align-items:center">
            <span class="level-name${isCurrent ? ' current' : ''}">${levelKey.charAt(0).toUpperCase() + levelKey.slice(1)}</span>
            ${isCurrent ? '<span class="level-badge">current</span>' : ''}
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <span class="level-count" style="color:${countColor}">${lvl.mastered}/${lvl.total}</span>
            <span class="level-expand-icon" id="icon-${levelKey}">${isCurrent ? '▼' : '▶'}</span>
          </div>
        </div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%;background:${barGrad}"></div></div>
      </div>
      <div class="level-topics${isCurrent ? ' open' : ''}" id="topics-${levelKey}">`;

    topicsForLevel.forEach(topic => {
      const isNotStarted = topic.status === 'not-started';
      const dueStr = topic.nextReview
        ? (topic.nextReview <= today ? `${formatDate(topic.nextReview)} ⚡` : formatDate(topic.nextReview))
        : 'not started';
      const scoreColor_ = scoreBorderColor(topic.score);
      const barGrad_ = scoreGradient(topic.score);
      const pct_ = (topic.score / 5) * 100;
      html += `
        <div class="topic-row${isNotStarted ? ' not-started' : ''}" style="border-left:3px solid ${scoreColor_}"
             onclick="openTopicPanel('${topic.id}','${subjectKey}')">
          <div class="topic-row-header">
            <span class="topic-name">${topic.name}</span>
            <span class="topic-meta" style="color:${scoreColor_}">${isNotStarted ? 'not started' : `${topic.score}/5 · ${dueStr}`}</span>
          </div>
          ${!isNotStarted ? `<div class="topic-bar"><div class="topic-bar-fill" style="width:${pct_}%;background:${barGrad_}"></div></div>` : ''}
        </div>`;
    });

    html += `</div>`;
  });

  html += `</div>`;
  document.getElementById('view-progress').innerHTML = html;
}

function toggleLevel(levelKey) {
  const topics = document.getElementById('topics-' + levelKey);
  const icon = document.getElementById('icon-' + levelKey);
  const isOpen = topics.classList.contains('open');

  // Close all open levels first
  document.querySelectorAll('.level-topics.open').forEach(el => {
    el.classList.remove('open');
    const key = el.id.replace('topics-', '');
    const ic = document.getElementById('icon-' + key);
    if (ic) ic.textContent = '▶';
  });

  // Open clicked level only if it was closed
  if (!isOpen) {
    topics.classList.add('open');
    icon.textContent = '▼';
  }
}
function renderMethods(data, subjectKey) {
  const subject = data.subjects[subjectKey];
  const globalMethods = sortMethodsByDelta(data.globalMethodEffectiveness);
  const subjectMethods = sortMethodsByDelta(subject.methodEffectiveness);
  const maxDelta = globalMethods[0][1].avgScoreDelta;

  function methodsHtml(sortedMethods, maxDelta) {
    return sortedMethods.map(([name, m]) => {
      const pct = maxDelta > 0 ? (m.avgScoreDelta / maxDelta) * 100 : 0;
      const delta = m.avgScoreDelta;
      const barColor = delta >= 1.5 ? 'linear-gradient(90deg,#10b981,#06b6d4)'
                     : delta >= 1.0 ? 'linear-gradient(90deg,#6366f1,#8b5cf6)'
                     : delta >= 0.5 ? 'linear-gradient(90deg,#eab308,#f97316)'
                     : 'linear-gradient(90deg,#ef4444,#f97316)';
      const isBest = sortedMethods[0][0] === name;
      const isStall = m.avgScoreDelta < 0.5 && m.touches >= 5;
      return `
        <div class="method-row">
          <div class="method-header">
            <div class="method-badges">
              <span class="method-name">${name.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
              ${isBest ? '<span class="badge-best">best</span>' : ''}
              ${isStall ? '<span class="badge-stall">stalls often</span>' : ''}
            </div>
            <span class="method-stats" style="color:${delta>=1?'#10b981':delta>=0.5?'#eab308':'#ef4444'}">+${delta.toFixed(1)} avg · ${m.touches} touch${m.touches !== 1 ? 'es' : ''}</span>
          </div>
          <div class="method-bar"><div class="method-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
        </div>`;
    }).join('');
  }

  document.getElementById('view-methods').innerHTML = `
    <div class="card">
      <div class="card-title">Global — across all subjects</div>
      ${methodsHtml(globalMethods, maxDelta)}
    </div>
    <div class="card">
      <div class="card-title">${subjectKey.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} — per-subject breakdown</div>
      ${methodsHtml(subjectMethods, maxDelta)}
    </div>`;
}
function renderSessions(subjects) {
  const heatmapHtml = buildHeatmapHtml(subjects);
  const sessionGroups = groupSessionsByDate(subjects);
  const listHtml = sessionGroups.map(group => {
    const topicNames = [...new Set(group.items.map(i => i.topicName))].join(', ');
    const totalDelta = group.items.reduce((sum, i) => sum + (i.scoreAfter - i.scoreBefore), 0);
    const borderColor = totalDelta > 0 ? '#22c55e' : totalDelta < 0 ? '#ef4444' : '#475569';
    return `
      <div class="session-row" style="border-left:3px solid ${borderColor}"
           data-date="${group.date}" onclick="openSessionPanel('${group.date}')">
        <div class="session-row-header">
          <span class="session-date">${formatDate(group.date)}</span>
          <span class="session-count" style="color:var(--accent)">${group.items.length} touch${group.items.length > 1 ? 'es' : ''}</span>
        </div>
        <div class="session-topics-preview">${topicNames}</div>
      </div>`;
  }).join('');

  document.getElementById('view-sessions').innerHTML = `
    ${heatmapHtml}
    <div class="card-title" style="margin-bottom:10px">Recent Sessions</div>
    ${listHtml}`;
}

function buildHeatmapHtml(subjects) {
  const activityMap = buildHeatmapData(subjects);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // Range: exactly Aug 1 (current-11 months) through last day of current month
  // Leading/trailing transparent cells pad to complete the weeks, so the grid
  // never displays July 2025 — the first real date in column 0 is Aug 1.
  let sm = today.getMonth() - 11, sy = today.getFullYear();
  if (sm < 0) { sm += 12; sy -= 1; }

  const rangeStart = new Date(sy, sm, 1);
  const rangeEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const startOffset = (rangeStart.getDay() + 6) % 7; // empty cells before Aug 1 (Mon=0)
  const endDow      = (rangeEnd.getDay() + 6) % 7;
  const endPad      = 6 - endDow;                    // empty cells after Jul 31

  const totalRangeDays = Math.round((rangeEnd - rangeStart) / (24 * 60 * 60 * 1000)) + 1;
  const WEEKS = Math.ceil((startOffset + totalRangeDays + endPad) / 7);

  const weekCols = [];
  const labelSpans = [];
  let curColMonth = -1, curSpan = 0;

  for (let w = 0; w < WEEKS; w++) {
    // Attribute this column to the month of its first real (non-padding) date
    let colMonth = curColMonth;
    for (let r = 0; r < 7; r++) {
      const dayOff = w * 7 + r - startOffset;
      if (dayOff >= 0 && dayOff < totalRangeDays) {
        const d = new Date(rangeStart);
        d.setDate(d.getDate() + dayOff);
        colMonth = d.getMonth();
        break;
      }
    }
    if (colMonth !== curColMonth) {
      if (curSpan > 0) labelSpans.push({ text: MONTH_FULL[curColMonth], span: curSpan });
      curColMonth = colMonth;
      curSpan = 1;
    } else {
      curSpan++;
    }

    const cells = Array.from({length: 7}, (_, r) => {
      const dayOff = w * 7 + r - startOffset;
      if (dayOff < 0 || dayOff >= totalRangeDays) {
        return `<div class="heatmap-cell" style="background:transparent"></div>`;
      }
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + dayOff);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const count = activityMap.get(dateStr) || 0;
      const color = heatmapColor(count);
      const isToday = dateStr === todayStr;
      const isEmpty = count === 0;
      const label = d.toLocaleDateString('en-US', {month:'short', day:'numeric'}) + (count ? ` — ${count} touch${count>1?'es':''}` : '');
      return `<div class="heatmap-cell${isToday?' today':''}${isEmpty?' empty':''}" style="background:${color}" data-tip="${label}"></div>`;
    }).join('');
    weekCols.push(`<div class="heatmap-col">${cells}</div>`);
  }
  if (curSpan > 0) labelSpans.push({ text: MONTH_FULL[curColMonth], span: curSpan });

  const labelCells = labelSpans.map(({ text, span }) =>
    `<div class="heatmap-month-label" style="flex:${span}">${text}</div>`
  ).join('');

  const dayLabels = DAY_LABELS.map(l =>
    `<div class="heatmap-day-label">${l}</div>`
  ).join('');

  return `
    <div class="heatmap-wrap">
      <div class="heatmap-header">
        <span class="card-title" style="margin-bottom:0">Topic Touches — Last 12 Months</span>
        <span style="color:#f97316;font-size:14px;font-weight:700" id="streak-heatmap"></span>
      </div>
      <div class="heatmap-month-row">
        <div class="heatmap-month-spacer"></div>
        <div class="heatmap-month-labels">${labelCells}</div>
      </div>
      <div class="heatmap-grid-row">
        <div class="heatmap-day-labels">${dayLabels}</div>
        <div class="heatmap-grid">${weekCols.join('')}</div>
      </div>
      <div class="heatmap-legend">
        <span>Less</span>
        <div class="heatmap-legend-cell" style="background:#21262d"></div>
        <div class="heatmap-legend-cell" style="background:#4a044e"></div>
        <div class="heatmap-legend-cell" style="background:#86198f"></div>
        <div class="heatmap-legend-cell" style="background:#c026d3"></div>
        <div class="heatmap-legend-cell" style="background:#d946ef"></div>
        <div class="heatmap-legend-cell" style="background:#e879f9"></div>
        <span>More</span>
      </div>
    </div>`;
}

function openSessionPanel(dateStr) {
  // Highlight selected row
  document.querySelectorAll('.session-row').forEach(r => r.classList.remove('selected'));
  const selectedRow = document.querySelector(`.session-row[data-date="${dateStr}"]`);
  if (selectedRow) selectedRow.classList.add('selected');

  const subjects = window.LEARN_DATA.subjects;
  const groups = groupSessionsByDate(subjects);
  const group = groups.find(g => g.date === dateStr);
  if (!group) return;

  const topicCardsHtml = group.items.map(item => {
    const delta = item.scoreAfter - item.scoreBefore;
    const deltaStr = delta > 0 ? `${item.scoreBefore} → ${item.scoreAfter} ${'↑'.repeat(delta)}`
                   : delta < 0 ? `${item.scoreBefore} → ${item.scoreAfter} ↓`
                   : `${item.scoreBefore} → ${item.scoreAfter} ⚠`;
    const effectivenessColor = item.effectiveness === 'high' ? '#10b981'
                             : item.effectiveness === 'medium' ? '#eab308' : '#ef4444';
    const borderColor = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#475569';
    const solidWorkHtml = (item.solid || item.workOn) ? `
      <div class="solid-work-row">
        ${item.solid ? `<div class="solid-box"><div class="solid-label">✓ SOLID</div><div class="solid-text">${item.solid}</div></div>` : ''}
        ${item.workOn ? `<div class="work-box"><div class="work-label">⚠ WORK ON</div><div class="work-text">${item.workOn}</div></div>` : ''}
      </div>` : '';
    return `
      <div class="session-topic-card" style="border-left:3px solid ${borderColor}">
        <div class="session-topic-header">
          <div class="session-row-header">
            <span class="session-topic-name">${item.topicName}</span>
            <span class="history-score" style="color:${borderColor}">${deltaStr}</span>
          </div>
          <div class="session-topic-meta">
            <span class="method-badge">${item.method.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
            <span style="font-size:10px;color:${effectivenessColor}">${item.effectiveness} effectiveness</span>
          </div>
        </div>
        ${item.userSignals ? `<div class="session-notes">"${item.userSignals}"</div>` : ''}
        ${solidWorkHtml}
        <div class="topic-link" onclick="openTopicPanel('${item.topicId}','${item.subjectKey}')">View topic history →</div>
      </div>`;
  }).join('');

  const subjectLabel = group.items[0]?.subjectKey?.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) || '';
  const touchCount = group.items.length;
  const topicCount = new Set(group.items.map(i => i.topicId)).size;
  openPanel(`
    <div class="panel-header">
      <div>
        <div class="panel-label">Session</div>
        <div class="panel-title">${formatDate(dateStr)}, ${dateStr.slice(0,4)}</div>
        <div class="panel-subtitle">${subjectLabel} · ${touchCount} touch${touchCount>1?'es':''} · ${topicCount} topic${topicCount>1?'s':''}</div>
      </div>
      <span class="panel-close" onclick="closePanel()">✕</span>
    </div>
    <div class="panel-body">${topicCardsHtml}</div>`);
}

function openTopicPanel(topicId, subjectKey) {
  const subject = window.LEARN_DATA.subjects[subjectKey];
  const topic = subject.topics.find(t => t.id === topicId);
  if (!topic) return;

  const today = new Date().toISOString().slice(0, 10);
  const isDue = topic.nextReview && topic.nextReview <= today;
  const scoreVal = topic.score;
  const scorePct = (scoreVal / 5) * 100;
  const barGrad = scoreGradient(scoreVal);
  const scoreCol = scoreBorderColor(scoreVal);

  // History entries (newest first — history array is chronological, reverse for display)
  const historyHtml = [...topic.history].reverse().map(entry => {
    const delta = entry.scoreAfter - entry.scoreBefore;
    const deltaStr = delta > 0 ? `${entry.scoreBefore} → ${entry.scoreAfter} ${'↑'.repeat(Math.min(delta,3))}`
                   : delta < 0 ? `${entry.scoreBefore} → ${entry.scoreAfter} ↓`
                   : `${entry.scoreBefore} → ${entry.scoreAfter} ⚠`;
    const borderColor = scoreBorderColor(entry.scoreAfter);
    return `
      <div class="history-entry" style="border-left:2px solid ${borderColor}">
        <div class="history-entry-header">
          <div>
            <span class="history-date">${formatDate(entry.date)} · </span>
            <span class="method-badge">${entry.method.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
          </div>
          <span class="history-score" style="color:${borderColor}">${deltaStr}</span>
        </div>
        ${entry.userSignals ? `<div class="history-notes">"${entry.userSignals}"</div>` : ''}
      </div>`;
  }).join('');

  // Prerequisites
  const prereqHtml = topic.prerequisites.length > 0
    ? `<div class="card-title">Prerequisites</div>
       <div class="prereq-chips">
         ${topic.prerequisites.map(pid => {
           const pre = subject.topics.find(t => t.id === pid);
           const mastered = pre && pre.score >= 4;
           return `<div class="prereq-chip ${mastered?'mastered':'not-mastered'}">${mastered?'✓ ':''} ${pre ? pre.name : pid}</div>`;
         }).join('')}
       </div>`
    : '';

  // Resources
  const typeIcon = t => ({ video: '▶', article: '📄', opensource: '⭐', course: '🎓', feed: '📡' }[t] || '📄');
  const resourcesHtml = topic.resources.length > 0
    ? `<div class="card-title">Resources</div>
       ${topic.resources.map(r => r.url
         ? `<a class="resource-item" href="${r.url}" target="_blank" rel="noopener">${typeIcon(r.type)} ${r.title}${r.section ? ' — ' + r.section : ''}</a>`
         : `<div class="resource-item">${typeIcon(r.type)} ${r.title}${r.section ? ' — ' + r.section : ''}</div>`
       ).join('')}`
    : '';

  const bestMethod = topic.bestMethod
    ? topic.bestMethod.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
    : '—';

  openPanel(`
    <div class="panel-header">
      <div>
        <div class="panel-label">${topic.level.charAt(0).toUpperCase()+topic.level.slice(1)} Topic</div>
        <div class="panel-title">${topic.name}</div>
      </div>
      <span class="panel-close" onclick="closePanel()">✕</span>
    </div>
    <div class="panel-body">
      <div class="topic-stats-row">
        <div class="topic-stat">
          <div class="topic-stat-value" style="color:${scoreCol}">${scoreVal}<span style="color:var(--text-faint);font-size:14px">/5</span></div>
          <div class="topic-stat-label">current score</div>
          <div class="progress-bar" style="margin-top:8px"><div class="progress-bar-fill" style="width:${scorePct}%;background:${barGrad}"></div></div>
        </div>
        <div class="topic-stat">
          <div class="topic-stat-value" style="font-size:14px;color:${isDue?'#f97316':'var(--text)'}">${topic.nextReview ? formatDate(topic.nextReview) + (isDue ? ' ⚡' : '') : '—'}</div>
          <div class="topic-stat-label">next review</div>
          <div class="topic-stat-sub">${topic.reviewCount} touch${topic.reviewCount !== 1 ? 'es' : ''}</div>
        </div>
        <div class="topic-stat">
          <div class="topic-stat-value" style="font-size:13px;color:#c4b5fd;line-height:1.3">${bestMethod}</div>
          <div class="topic-stat-label">best method</div>
        </div>
      </div>

      <div class="card-title">Learning History</div>
      <div style="margin-bottom:16px">${historyHtml || '<p style="color:var(--text-dim);font-size:12px">No touches yet.</p>'}</div>

      ${prereqHtml}
      ${resourcesHtml}
    </div>`);
}

// Heatmap tooltip — 150ms delay, anchored above cell with centered arrow
(function () {
  const tip = document.getElementById('heatmap-tip');
  let timer = null;

  function position(cell) {
    const r = cell.getBoundingClientRect();
    tip.style.left = (r.left + r.width / 2) + 'px';
    tip.style.top  = (r.top - tip.offsetHeight - 10) + 'px';
  }

  document.addEventListener('mouseover', e => {
    const cell = e.target.closest('[data-tip]');
    if (!cell) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      tip.textContent = cell.dataset.tip;
      tip.classList.add('visible');
      position(cell);
    }, 150);
  });

  document.addEventListener('mouseout', e => {
    if (!e.target.closest('[data-tip]')) return;
    clearTimeout(timer);
    timer = null;
    tip.classList.remove('visible');
  });
}());
