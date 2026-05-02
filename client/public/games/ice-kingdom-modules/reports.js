/* ═══════════════════════════════════════════════════════════════
   Ice Kingdom Academy — Reports Module 📊
   Parent performance reports with HTML rendering
   Subject bars, strengths/weaknesses, badges, recommendations
   ═══════════════════════════════════════════════════════════════ */

import { LANG } from './i18n.js';

function L(ar, en, pt) {
  if (LANG === 'en') return en;
  if (LANG === 'pt') return pt;
  return ar;
}

/* ─── Subject Labels ─── */
const SUBJECT_LABELS = {
  colors_shapes:   () => L('ألوان وأشكال', 'Colors & Shapes', 'Cores e Formas'),
  animals_nature:  () => L('حيوانات وطبيعة', 'Animals & Nature', 'Animais e Natureza'),
  weather_seasons: () => L('طقس وفصول', 'Weather & Seasons', 'Clima e Estações'),
  numbers:         () => L('أرقام وعد', 'Numbers & Counting', 'Números e Contagem'),
  addition:        () => L('جمع', 'Addition', 'Adição'),
  subtraction:     () => L('طرح', 'Subtraction', 'Subtração'),
  geography:       () => L('جغرافيا', 'Geography', 'Geografia'),
  science:         () => L('علوم', 'Science', 'Ciências'),
  dinosaurs:       () => L('ديناصورات', 'Dinosaurs', 'Dinossauros'),
  mixed:           () => L('تحديات مختلطة', 'Mixed', 'Misto'),
};

const SUBJECT_EMOJIS = {
  colors_shapes: '🎨', animals_nature: '🐧', weather_seasons: '🌨️',
  numbers: '🔢', addition: '➕', subtraction: '➖',
  geography: '🌍', science: '🔬', dinosaurs: '🦕', mixed: '🌌',
};

/* ─── Badge Definitions ─── */
const REPORT_BADGES = [
  { id: 'ice_explorer',  emoji: '🧊', condition: (dda) => dda.totalGames >= 5,  label: () => L('مستكشف الجليد', 'Ice Explorer', 'Explorador de Gelo') },
  { id: 'snow_scholar',  emoji: '📚', condition: (dda) => dda.overallPerformance >= 0.7, label: () => L('عالم الثلج', 'Snow Scholar', 'Estudioso da Neve') },
  { id: 'polar_master',  emoji: '🏆', condition: (dda) => dda.overallPerformance >= 0.85, label: () => L('سيد القطب', 'Polar Master', 'Mestre Polar') },
  { id: 'all_rounder',   emoji: '⭐', condition: (dda) => {
    const played = Object.values(dda.subjectStats).filter(s => s.gamesPlayed > 0);
    return played.length >= 5;
  }, label: () => L('متعدد المواهب', 'All-Rounder', 'Versátil') },
  { id: 'persistent',    emoji: '💪', condition: (dda) => dda.totalGames >= 20, label: () => L('مثابر', 'Persistent', 'Persistente') },
  { id: 'speed_demon',   emoji: '⚡', condition: (dda) => {
    const fast = Object.values(dda.subjectStats).some(s => s.avgTimeSec > 0 && s.avgTimeSec < 5 && s.gamesPlayed >= 3);
    return fast;
  }, label: () => L('سريع البرق', 'Speed Demon', 'Velocista') },
];

/* ─── Generate Report ─── */
export function generateReport(dda) {
  const subjects = [];
  const strengths = [];
  const weaknesses = [];

  Object.entries(dda.subjectStats).forEach(([key, stats]) => {
    if (stats.gamesPlayed === 0) return;
    const label = SUBJECT_LABELS[key]?.() || key;
    const emoji = SUBJECT_EMOJIS[key] || '📋';
    const pct = Math.round(stats.performance * 100);
    const accuracy = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;

    subjects.push({ key, label, emoji, performance: pct, accuracy, games: stats.gamesPlayed, avgTime: Math.round(stats.avgTimeSec) });

    if (stats.performance >= 0.7) strengths.push({ label, emoji, pct });
    else if (stats.performance < 0.5) weaknesses.push({ label, emoji, pct });
  });

  subjects.sort((a, b) => b.performance - a.performance);

  // Badges
  const earnedBadges = REPORT_BADGES
    .filter(b => b.condition(dda))
    .map(b => ({ id: b.id, emoji: b.emoji, label: b.label() }));

  // Recommendations
  const recommendations = [];
  if (weaknesses.length > 0) {
    recommendations.push(L(
      `💡 ركّز على: ${weaknesses.map(w => w.label).join('، ')}`,
      `💡 Focus on: ${weaknesses.map(w => w.label).join(', ')}`,
      `💡 Foque em: ${weaknesses.map(w => w.label).join(', ')}`
    ));
  }
  if (dda.totalGames < 10) {
    recommendations.push(L('📅 العب أكثر لتحسين المستوى!', '📅 Play more to improve your level!', '📅 Jogue mais para melhorar!'));
  }
  const unplayed = Object.entries(dda.subjectStats).filter(([_, s]) => s.gamesPlayed === 0).length;
  if (unplayed > 3) {
    recommendations.push(L('🌍 جرّب عوالم جديدة لم تزرها بعد!', '🌍 Try new worlds you haven\'t visited yet!', '🌍 Tente mundos novos que ainda não visitou!'));
  }
  if (strengths.length > 0 && weaknesses.length > 0) {
    recommendations.push(L(
      `⭐ أنت ممتاز في ${strengths[0].label}! استمر`,
      `⭐ You\'re excellent at ${strengths[0].label}! Keep it up`,
      `⭐ Você é excelente em ${strengths[0].label}! Continue`
    ));
  }

  return {
    overview: {
      totalGames: dda.totalGames,
      overallPerformance: Math.round(dda.overallPerformance * 100),
      subjectsPlayed: subjects.length,
      totalSubjects: 10,
    },
    subjects,
    strengths,
    weaknesses,
    recommendations,
    badges: earnedBadges,
  };
}

/* ─── Render Report HTML ─── */
export function renderReportHTML(report) {
  const dir = LANG === 'ar' ? 'rtl' : 'ltr';
  const align = LANG === 'ar' ? 'right' : 'left';

  let html = `<div style="direction:${dir};text-align:${align};font-family:'Segoe UI',Tahoma,sans-serif;color:#e8f0ff;max-width:500px;margin:0 auto;">`;

  // Overview
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
    <div style="background:rgba(255,255,255,0.08);padding:12px;border-radius:12px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#00d4ff;">${report.overview.overallPerformance}%</div>
      <div style="font-size:11px;opacity:0.7;">${L('الأداء العام', 'Overall', 'Geral')}</div>
    </div>
    <div style="background:rgba(255,255,255,0.08);padding:12px;border-radius:12px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#ffd700;">${report.overview.totalGames}</div>
      <div style="font-size:11px;opacity:0.7;">${L('مستوى مكتمل', 'Levels Done', 'Níveis Feitos')}</div>
    </div>
    <div style="background:rgba(255,255,255,0.08);padding:12px;border-radius:12px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#44ff88;">${report.overview.subjectsPlayed}</div>
      <div style="font-size:11px;opacity:0.7;">${L('مواضيع', 'Subjects', 'Matérias')}</div>
    </div>
    <div style="background:rgba(255,255,255,0.08);padding:12px;border-radius:12px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#ff88aa;">${report.badges.length}</div>
      <div style="font-size:11px;opacity:0.7;">${L('شارات', 'Badges', 'Medalhas')}</div>
    </div>
  </div>`;

  // Subject bars
  if (report.subjects.length > 0) {
    html += `<h3 style="font-size:15px;margin-bottom:8px;">${L('📊 أداء المواضيع', '📊 Subject Performance', '📊 Desempenho por Matéria')}</h3>`;
    report.subjects.forEach(s => {
      const barColor = s.performance >= 70 ? '#44ff88' : s.performance >= 50 ? '#ffaa00' : '#ff4466';
      html += `<div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
          <span>${s.emoji} ${s.label}</span>
          <span style="color:${barColor};font-weight:700;">${s.performance}%</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${s.performance}%;background:${barColor};border-radius:4px;transition:width 0.5s;"></div>
        </div>
        <div style="font-size:10px;opacity:0.5;margin-top:2px;">${L('دقة', 'Accuracy', 'Precisão')}: ${s.accuracy}% | ${s.games} ${L('مستويات', 'levels', 'níveis')}</div>
      </div>`;
    });
  }

  // Strengths
  if (report.strengths.length > 0) {
    html += `<div style="background:rgba(68,255,136,0.1);border:1px solid rgba(68,255,136,0.3);border-radius:12px;padding:10px;margin:12px 0;">
      <strong style="color:#44ff88;">💪 ${L('نقاط القوة', 'Strengths', 'Pontos Fortes')}:</strong>
      <span style="font-size:13px;"> ${report.strengths.map(s => `${s.emoji} ${s.label}`).join(' • ')}</span>
    </div>`;
  }

  // Weaknesses
  if (report.weaknesses.length > 0) {
    html += `<div style="background:rgba(255,68,102,0.1);border:1px solid rgba(255,68,102,0.3);border-radius:12px;padding:10px;margin:12px 0;">
      <strong style="color:#ff4466;">📝 ${L('يحتاج تحسين', 'Needs Practice', 'Precisa Praticar')}:</strong>
      <span style="font-size:13px;"> ${report.weaknesses.map(w => `${w.emoji} ${w.label}`).join(' • ')}</span>
    </div>`;
  }

  // Badges
  if (report.badges.length > 0) {
    html += `<div style="margin:12px 0;">
      <strong>🏅 ${L('الشارات', 'Badges', 'Medalhas')}:</strong>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
        ${report.badges.map(b => `<span style="background:rgba(255,255,255,0.08);padding:4px 10px;border-radius:16px;font-size:12px;">${b.emoji} ${b.label}</span>`).join('')}
      </div>
    </div>`;
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    html += `<div style="margin-top:12px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:10px;">
      <strong style="color:#00d4ff;">📋 ${L('توصيات', 'Recommendations', 'Recomendações')}:</strong>
      <ul style="margin:6px 0 0;padding-inline-start:18px;font-size:12px;">
        ${report.recommendations.map(r => `<li style="margin-bottom:4px;">${r}</li>`).join('')}
      </ul>
    </div>`;
  }

  html += `</div>`;
  return html;
}
