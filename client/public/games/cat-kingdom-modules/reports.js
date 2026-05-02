/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Reports Module
   Parent Performance Reports & Analytics
   Pattern: matches gem-kingdom-modules/reports.js
   ═══════════════════════════════════════════════════════════════ */

import { LANG, L } from './i18n.js';
import { getSkillLabel as getSkillLabelFromDDA } from './intelligence.js';

/* ══════════════════════════════
   Subject display names
   ══════════════════════════════ */
const SUBJECT_NAMES = {
  colors_shapes: () => L('الألوان والأشكال', 'Colors & Shapes', 'Cores e Formas'),
  numbers:       () => L('الأرقام', 'Numbers', 'Números'),
  addition:      () => L('الجمع', 'Addition', 'Adição'),
  subtraction:   () => L('الطرح', 'Subtraction', 'Subtração'),
  arabic_letters:() => L('الحروف العربية', 'Arabic Letters', 'Letras Árabes'),
  english_letters:()=> L('الحروف الإنجليزية', 'English Letters', 'Letras em Inglês'),
  words:         () => L('الكلمات', 'Words', 'Palavras'),
  advanced_math: () => L('رياضيات متقدمة', 'Advanced Math', 'Matemática Avançada'),
  patterns:      () => L('الأنماط', 'Patterns', 'Padrões'),
  mixed:         () => L('مختلط', 'Mixed', 'Misto'),
};

/* ══════════════════════════════
   Rating helpers
   ══════════════════════════════ */
function getAccuracyRating(acc) {
  if (acc >= 0.9) return { emoji: '🌟', label: L('ممتاز', 'Excellent', 'Excelente') };
  if (acc >= 0.75) return { emoji: '✅', label: L('جيد جداً', 'Very Good', 'Muito Bom') };
  if (acc >= 0.55) return { emoji: '📊', label: L('جيد', 'Good', 'Bom') };
  if (acc >= 0.35) return { emoji: '📈', label: L('يتطور', 'Developing', 'Desenvolvendo') };
  return { emoji: '🌱', label: L('يحتاج تدريب', 'Needs Practice', 'Precisa Praticar') };
}

function getSpeedRating(avgTime) {
  if (avgTime <= 3) return { emoji: '⚡', label: L('سريع جداً', 'Very Fast', 'Muito Rápido') };
  if (avgTime <= 6) return { emoji: '🏃', label: L('سريع', 'Fast', 'Rápido') };
  if (avgTime <= 10) return { emoji: '🚶', label: L('متوسط', 'Average', 'Médio') };
  return { emoji: '🐢', label: L('بطيء', 'Slow', 'Lento') };
}

/* ══════════════════════════════
   Generate Full Report
   Input: dda object (from intelligence.js)
   Output: structured report object
   ══════════════════════════════ */
export function generateReport(dda) {
  const report = {
    title: L('📋 تقرير أداء القط', '📋 Cat Kingdom Report', '📋 Relatório do Reino dos Gatos'),
    generated: new Date().toLocaleDateString(LANG === 'ar' ? 'ar-SA' : LANG === 'pt' ? 'pt-BR' : 'en-US'),
    overview: {},
    subjects: [],
    strengths: [],
    weaknesses: [],
    recommendations: [],
    badges: [],
  };

  // ── Overview ──
  report.overview = {
    totalGames: dda.totalGames,
    totalQuestions: dda.totalQuestions,
    totalCorrect: dda.totalCorrect,
    overallAccuracy: dda.totalQuestions > 0 ? dda.totalCorrect / dda.totalQuestions : 0,
    overallAccuracyPct: dda.totalQuestions > 0 ? Math.round((dda.totalCorrect / dda.totalQuestions) * 100) : 0,
    winRate: dda.totalGames > 0 ? Math.round((dda.wins / dda.totalGames) * 100) : 0,
    maxStreak: dda.maxWinStreak,
    avgTimePerQ: dda.totalQuestions > 0 ? Math.round(dda.totalTimeSec / dda.totalQuestions * 10) / 10 : 0,
    skillLevel: getSkillName(dda.smoothedSkill),
    accuracyRating: getAccuracyRating(dda.totalQuestions > 0 ? dda.totalCorrect / dda.totalQuestions : 0),
    speedRating: getSpeedRating(dda.totalQuestions > 0 ? dda.totalTimeSec / dda.totalQuestions : 10),
    daysPlaying: dda.firstPlayDate ? Math.ceil((Date.now() - dda.firstPlayDate) / 86400000) : 0,
  };

  // ── Per-Subject Analysis ──
  for (const [subject, ss] of Object.entries(dda.subjectStats)) {
    if (ss.total === 0) continue;
    const accuracy = ss.correct / ss.total;
    const avgTime = ss.totalTime / ss.total;
    const winRate = ss.attempts > 0 ? ss.wins / ss.attempts : 0;
    const nameFn = SUBJECT_NAMES[subject];
    const name = nameFn ? nameFn() : subject;

    const entry = {
      subject,
      name,
      accuracy: Math.round(accuracy * 100),
      avgTime: Math.round(avgTime * 10) / 10,
      attempts: ss.attempts,
      winRate: Math.round(winRate * 100),
      rating: getAccuracyRating(accuracy),
      speedRating: getSpeedRating(avgTime),
      barWidth: Math.round(accuracy * 100),
    };
    report.subjects.push(entry);

    if (accuracy >= 0.8) {
      report.strengths.push({ name, accuracy: entry.accuracy, emoji: '💪' });
    }
    if (accuracy < 0.55 && ss.attempts >= 2) {
      report.weaknesses.push({ name, accuracy: entry.accuracy, emoji: '📚' });
    }
  }

  // Sort: strengths desc, weaknesses asc
  report.subjects.sort((a, b) => b.accuracy - a.accuracy);
  report.strengths.sort((a, b) => b.accuracy - a.accuracy);
  report.weaknesses.sort((a, b) => a.accuracy - b.accuracy);

  // ── Recommendations ──
  if (report.weaknesses.length > 0) {
    const weak = report.weaknesses[0];
    report.recommendations.push(
      L(
        `📚 يُنصح بالتدرب أكثر على "${weak.name}" (الدقة: ${weak.accuracy}%)`,
        `📚 Practice more on "${weak.name}" (accuracy: ${weak.accuracy}%)`,
        `📚 Pratique mais em "${weak.name}" (precisão: ${weak.accuracy}%)`
      )
    );
  }

  if (report.overview.avgTimePerQ > 12) {
    report.recommendations.push(
      L(
        '⏱️ حاول الإجابة أسرع قليلاً',
        '⏱️ Try to answer a bit faster',
        '⏱️ Tente responder um pouco mais rápido'
      )
    );
  }

  if (report.overview.overallAccuracy < 0.6) {
    report.recommendations.push(
      L(
        '🔄 أعد المستويات السابقة لتقوية المهارات',
        '🔄 Replay previous levels to strengthen skills',
        '🔄 Repita níveis anteriores para fortalecer habilidades'
      )
    );
  }

  if (report.overview.totalGames < 5) {
    report.recommendations.push(
      L(
        '🎮 العب أكثر لنتمكن من تقييم أدائك بشكل أفضل',
        '🎮 Play more so we can better evaluate performance',
        '🎮 Jogue mais para podermos avaliar melhor o desempenho'
      )
    );
  }

  if (report.overview.overallAccuracy >= 0.85 && report.overview.totalGames >= 10) {
    report.recommendations.push(
      L(
        '🌟 أداء رائع! جرّب العوالم الأصعب!',
        '🌟 Amazing performance! Try harder worlds!',
        '🌟 Desempenho incrível! Tente mundos mais difíceis!'
      )
    );
  }

  if (report.recommendations.length === 0) {
    report.recommendations.push(
      L('👍 استمر في التعلم واللعب!', '👍 Keep learning and playing!', '👍 Continue aprendendo e jogando!')
    );
  }

  // ── Achievement Badges ──
  if (dda.totalGames >= 50) report.badges.push('🏅 ' + L('لاعب متمرس', 'Experienced Player', 'Jogador Experiente'));
  if (dda.maxWinStreak >= 10) report.badges.push('🔥 ' + L('سلسلة ملتهبة', 'Blazing Streak', 'Sequência Ardente'));
  if (report.overview.overallAccuracyPct >= 90) report.badges.push('🎯 ' + L('دقة عالية', 'Sharp Aim', 'Mira Certeira'));
  if (report.overview.avgTimePerQ <= 4) report.badges.push('⚡ ' + L('البرق', 'Lightning', 'Relâmpago'));
  if (Object.keys(dda.subjectStats).length >= 8) report.badges.push('🌍 ' + L('مستكشف', 'Explorer', 'Explorador'));
  if (dda.totalCorrect >= 500) report.badges.push('💎 ' + L('خبير', 'Expert', 'Especialista'));

  return report;
}

/* ══════════════════════════════
   Render report as HTML string
   (for embedding in game)
   ══════════════════════════════ */
export function renderReportHTML(report) {
  const dir = LANG === 'ar' ? 'rtl' : 'ltr';
  let html = `<div style="direction:${dir};text-align:${LANG === 'ar' ? 'right' : 'left'};padding:16px;font-family:inherit;">`;

  // Title
  html += `<h2 style="text-align:center;margin:0 0 12px;">${report.title}</h2>`;
  html += `<p style="text-align:center;opacity:.7;font-size:13px;">${report.generated}</p>`;

  // Overview cards
  const ov = report.overview;
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;">`;
  html += overviewCard('🎮', L('الألعاب', 'Games', 'Jogos'), ov.totalGames);
  html += overviewCard('🎯', L('الدقة', 'Accuracy', 'Precisão'), ov.overallAccuracyPct + '%');
  html += overviewCard('⏱️', L('متوسط الوقت', 'Avg Time', 'Tempo Médio'), ov.avgTimePerQ + 's');
  html += overviewCard('🔥', L('أطول سلسلة', 'Max Streak', 'Maior Sequência'), ov.maxStreak);
  html += overviewCard('📊', L('المستوى', 'Level', 'Nível'), ov.skillLevel);
  html += overviewCard('📅', L('أيام اللعب', 'Days Playing', 'Dias Jogando'), ov.daysPlaying);
  html += `</div>`;

  // Subject bars
  if (report.subjects.length > 0) {
    html += `<h3 style="margin:16px 0 8px;">📊 ${L('أداء المواد', 'Subject Performance', 'Desempenho por Matéria')}</h3>`;
    for (const s of report.subjects) {
      const color = s.accuracy >= 80 ? '#4CAF50' : s.accuracy >= 55 ? '#FF9800' : '#f44336';
      html += `<div style="margin:6px 0;">
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span>${s.name}</span>
          <span>${s.rating.emoji} ${s.accuracy}%</span>
        </div>
        <div style="background:#333;border-radius:4px;height:10px;overflow:hidden;">
          <div style="width:${s.barWidth}%;height:100%;background:${color};border-radius:4px;transition:width .5s;"></div>
        </div>
      </div>`;
    }
  }

  // Strengths
  if (report.strengths.length > 0) {
    html += `<h3 style="margin:16px 0 8px;">💪 ${L('نقاط القوة', 'Strengths', 'Pontos Fortes')}</h3>`;
    html += `<ul style="padding:0 16px;margin:0;">`;
    for (const s of report.strengths) {
      html += `<li>${s.emoji} ${s.name} — ${s.accuracy}%</li>`;
    }
    html += `</ul>`;
  }

  // Weaknesses
  if (report.weaknesses.length > 0) {
    html += `<h3 style="margin:16px 0 8px;">📚 ${L('يحتاج تدريب', 'Needs Practice', 'Precisa Praticar')}</h3>`;
    html += `<ul style="padding:0 16px;margin:0;">`;
    for (const s of report.weaknesses) {
      html += `<li>${s.emoji} ${s.name} — ${s.accuracy}%</li>`;
    }
    html += `</ul>`;
  }

  // Recommendations
  html += `<h3 style="margin:16px 0 8px;">💡 ${L('توصيات', 'Recommendations', 'Recomendações')}</h3>`;
  html += `<ul style="padding:0 16px;margin:0;">`;
  for (const r of report.recommendations) {
    html += `<li style="margin:4px 0;">${r}</li>`;
  }
  html += `</ul>`;

  // Badges
  if (report.badges.length > 0) {
    html += `<h3 style="margin:16px 0 8px;">🏅 ${L('الإنجازات', 'Achievements', 'Conquistas')}</h3>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;">`;
    for (const b of report.badges) {
      html += `<span style="background:#333;padding:4px 10px;border-radius:12px;font-size:13px;">${b}</span>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function overviewCard(emoji, label, value) {
  return `<div style="background:#222;border-radius:10px;padding:10px;text-align:center;">
    <div style="font-size:20px;">${emoji}</div>
    <div style="font-size:11px;opacity:.7;margin:2px 0;">${label}</div>
    <div style="font-size:18px;font-weight:bold;">${value}</div>
  </div>`;
}

/* helper */
function getSkillName(skill) {
  // B3: Delegate to intelligence.js for consistency
  const fakeDDA = { smoothedSkill: skill };
  return getSkillLabelFromDDA(fakeDDA);
}
