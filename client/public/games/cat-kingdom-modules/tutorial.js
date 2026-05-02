/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Tutorial / Onboarding Module
   First-play interactive guide (3-4 steps)
   ═══════════════════════════════════════════════════════════════ */

import { LANG, L } from './i18n.js';

const TUTORIAL_KEY = 'catk_tutorial';

/* ══════════════════════════════
   Tutorial Steps
   ══════════════════════════════ */
const STEPS = [
  {
    emoji: '🐱',
    title: () => L('مرحباً بك!', 'Welcome!', 'Bem-vindo!'),
    text: () => L(
      'هذه مملكة القطة التعليمية! ساعد القطة في مغامراتها عبر حل الألغاز التعليمية!',
      'This is Cat Kingdom! Help your cat on adventures by solving educational puzzles!',
      'Este é o Reino do Gato! Ajude seu gato em aventuras resolvendo quebra-cabeças educativos!'
    ),
    highlight: null,
  },
  {
    emoji: '🗺️',
    title: () => L('العوالم', 'Worlds', 'Mundos'),
    text: () => L(
      'استكشف 10 عوالم! كل عالم يعلمك مهارة جديدة: ألوان، أرقام، حروف، كلمات وأكثر!',
      'Explore 10 worlds! Each world teaches a new skill: colors, numbers, letters, words and more!',
      'Explore 10 mundos! Cada mundo ensina uma nova habilidade: cores, números, letras, palavras e mais!'
    ),
    highlight: 'worldMap',
  },
  {
    emoji: '⭐',
    title: () => L('النجوم والمكافآت', 'Stars & Rewards', 'Estrelas e Recompensas'),
    text: () => L(
      'أجب بسرعة ودقة لتحصل على 3 نجوم! اجمع العملات لشراء أشكال جديدة وقوى خاصة!',
      'Answer quickly and correctly to earn 3 stars! Collect coins to buy new skins and power-ups!',
      'Responda rápido e corretamente para ganhar 3 estrelas! Colete moedas para comprar aparências e poderes!'
    ),
    highlight: 'store',
  },
  {
    emoji: '🎯',
    title: () => L('التحدي اليومي', 'Daily Challenge', 'Desafio Diário'),
    text: () => L(
      'كل يوم هناك تحدٍّ جديد بـ 5 أسئلة! أجبها لتحصل على مكافآت إضافية! لا تنسَ مكافأتك اليومية!',
      'Every day there\'s a new challenge with 5 questions! Complete it for extra rewards! Don\'t forget your daily reward!',
      'Todo dia há um novo desafio com 5 perguntas! Complete para recompensas extras! Não esqueça sua recompensa diária!'
    ),
    highlight: 'challenge',
  },
];

/* ══════════════════════════════
   State
   ══════════════════════════════ */
export function shouldShowTutorial() {
  try {
    return !localStorage.getItem(TUTORIAL_KEY);
  } catch(e) { return false; }
}

export function markTutorialComplete() {
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch(e) {}
}

export function getTutorialSteps() {
  return STEPS.map(s => ({
    emoji: s.emoji,
    title: s.title(),
    text: s.text(),
    highlight: s.highlight,
  }));
}

/**
 * Render tutorial overlay HTML
 * Returns { html, onNext, onSkip } for one step
 */
export function renderTutorialStep(step, current, total) {
  const dots = Array.from({ length: total }, (_, i) =>
    `<span style="width:8px;height:8px;border-radius:50%;background:${i === current ? '#fbbf24' : 'rgba(255,255,255,.3)'};display:inline-block;margin:0 3px"></span>`
  ).join('');

  return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)">
      <div style="background:linear-gradient(135deg,#1a2a44,#0a0a1a);border:2px solid rgba(255,255,255,.15);border-radius:24px;padding:32px 24px;max-width:340px;text-align:center;animation:fadeIn .4s">
        <div style="font-size:64px;margin-bottom:12px">${step.emoji}</div>
        <div style="font-size:20px;font-weight:900;color:#fbbf24;margin-bottom:8px">${step.title}</div>
        <div style="font-size:15px;line-height:1.7;color:#ddd;margin-bottom:16px">${step.text}</div>
        <div style="margin-bottom:16px">${dots}</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-primary btn-tutorial-next" style="padding:10px 28px;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;color:#060e08;background:linear-gradient(135deg,#43e97b,#38f9d7)">
            ${current < total - 1 ? L('التالي ▶', 'Next ▶', 'Próximo ▶') : L('ابدأ! 🚀', 'Start! 🚀', 'Começar! 🚀')}
          </button>
          ${current === 0 ? `<button class="btn btn-tutorial-skip" style="padding:10px 18px;border:1px solid rgba(255,255,255,.2);border-radius:12px;font-size:14px;cursor:pointer;color:#aaa;background:transparent">${L('تخطي','Skip','Pular')}</button>` : ''}
        </div>
      </div>
    </div>
  `;
}
