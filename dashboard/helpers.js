// helpers.js

const SCORE_COLORS   = ['#374151','#7f1d1d','#7c2d12','#713f12','#14532d','#134e4a'];
const SCORE_BORDERS  = ['#374151','#ef4444','#f97316','#eab308','#22c55e','#10b981'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function scoreColor(score)       { return SCORE_COLORS[Math.max(0, Math.min(5, score))]; }
function scoreBorderColor(score) { return SCORE_BORDERS[Math.max(0, Math.min(5, score))]; }
function scoreGradient(score) {
  const s = Math.max(0, Math.min(5, score));
  if (s === 0) return SCORE_BORDERS[0];
  if (s === 1) return SCORE_BORDERS[1];
  const stops = Array.from({length: s}, (_, i) =>
    `${SCORE_BORDERS[i + 1]} ${(i / (s - 1) * 100).toFixed(1)}%`
  );
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

function formatDate(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}`;
}

function computeOverallProgress(subject) {
  const totalMastered = Object.values(subject.levels).reduce((sum, l) => sum + l.mastered, 0);
  return Math.round((totalMastered / subject.totalTopics) * 100);
}

function getTopicsDueToday(subject, today) {
  return subject.topics.filter(t =>
    t.status !== 'not-started' && t.nextReview && t.nextReview <= today
  );
}

function groupSessionsByDate(subjects) {
  const map = new Map();
  for (const [subjectKey, subject] of Object.entries(subjects)) {
    for (const topic of subject.topics) {
      for (const entry of topic.history) {
        if (!map.has(entry.date)) map.set(entry.date, []);
        map.get(entry.date).push({ subjectKey, topicId: topic.id, topicName: topic.name, topicLevel: topic.level, ...entry });
      }
    }
  }
  return Array.from(map.entries())
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function sortMethodsByDelta(methods) {
  return Object.entries(methods).sort((a, b) => b[1].avgScoreDelta - a[1].avgScoreDelta);
}

function buildHeatmapData(subjects) {
  const map = new Map();
  for (const subject of Object.values(subjects)) {
    for (const topic of subject.topics) {
      for (const entry of topic.history) {
        map.set(entry.date, (map.get(entry.date) || 0) + 1);
      }
    }
  }
  return map;
}

function heatmapColor(count) {
  if (!count) return '#21262d';   // empty (GitHub dark)
  if (count <= 2)  return '#4a044e'; // fuchsia-950
  if (count <= 4)  return '#86198f'; // fuchsia-800
  if (count <= 6)  return '#c026d3'; // fuchsia-600
  if (count <= 9)  return '#d946ef'; // fuchsia-500
  return '#e879f9';                  // fuchsia-400 (max)
}

function getMonthName(monthIndex) { return MONTH_NAMES[monthIndex]; }

if (typeof module !== 'undefined') {
  module.exports = {
    scoreColor, scoreBorderColor, scoreGradient,
    formatDate,
    computeOverallProgress,
    getTopicsDueToday,
    groupSessionsByDate,
    sortMethodsByDelta,
    buildHeatmapData,
    heatmapColor,
    getMonthName,
  };
}
