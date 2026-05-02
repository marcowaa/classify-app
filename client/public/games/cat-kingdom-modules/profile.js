/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Profile / Stats Module
   Renders player profile card with stats, skill, badges
   ═══════════════════════════════════════════════════════════════ */

import { LANG, t, L } from './i18n.js';
import { getAllBadgesDefs } from './engagement.js';
import { getCatLevel } from './cat.js';

/* ══════════════════════════════
   Render Profile HTML
   ══════════════════════════════ */
export function renderProfileHTML(progress, cat, dda, daily, challenge) {

  const totalStars  = progress.totalStars  || 0;
  const totalCoins  = progress.coins  || 0;
  const totalLevels = Object.values(progress.worlds || {}).reduce((s, w) => s + Object.values(w.levels || {}).filter(l => l.stars > 0).length, 0);
  const worldCount  = Object.keys(progress.worlds || {}).length;

  /* Skill label from DDA */
  const skillLabels = {
    easy:        L('مبتدئ',  'Beginner',     'Iniciante'),
    'medium-easy': L('متعلم',  'Learner',      'Aprendiz'),
    normal:      L('جيد',    'Good',         'Bom'),
    'medium-hard': L('ماهر',   'Skilled',      'Habilidoso'),
    hard:        L('خبير',   'Expert',       'Especialista'),
  };
  const skillLabel = skillLabels[dda?.difficultyLabel] || skillLabels.normal;

  const trendIcons = { improving: '📈', declining: '📉', stable: '➡️' };
  const trendIcon  = trendIcons[dda?.trend] || '➡️';

  /* Badge gallery */
  const badges = getAllBadgesDefs();
  const badgesHTML = badges.map(b => {
    const cls = b.earned ? '' : 'opacity:.35;filter:grayscale(1);';
    return `<span style="font-size:28px;${cls}" title="${b.label}">${b.icon}</span>`;
  }).join(' ');

  /* Cat info */
  const catName = cat?.name || '🐱';
  const catSkin = cat?.equippedSkin || '';
  const catLvl  = cat?.totalXP != null ? getCatLevel(cat.totalXP).level : 1;

  return `
    <div style="text-align:center;direction:${LANG==='ar'?'rtl':'ltr'}">
      <div style="font-size:64px;margin-bottom:8px">🐱</div>
      <h2 style="margin:4px 0;color:#fff">${catName}</h2>
      <p style="margin:2px 0;color:#ffd740;font-size:14px">${catSkin} · ${L('مستوى','Level','Nível')} ${catLvl}</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px auto;max-width:260px">
        <div style="background:rgba(255,255,255,.12);border-radius:12px;padding:10px">
          <div style="font-size:24px">⭐</div>
          <div style="color:#fff;font-size:18px;font-weight:700">${totalStars}</div>
          <div style="color:#ccc;font-size:11px">${L('نجوم','Stars','Estrelas')}</div>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:12px;padding:10px">
          <div style="font-size:24px">🪙</div>
          <div style="color:#fff;font-size:18px;font-weight:700">${totalCoins}</div>
          <div style="color:#ccc;font-size:11px">${L('عملات','Coins','Moedas')}</div>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:12px;padding:10px">
          <div style="font-size:24px">📚</div>
          <div style="color:#fff;font-size:18px;font-weight:700">${totalLevels}</div>
          <div style="color:#ccc;font-size:11px">${L('مراحل','Levels','Níveis')}</div>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:12px;padding:10px">
          <div style="font-size:24px">🌍</div>
          <div style="color:#fff;font-size:18px;font-weight:700">${worldCount}</div>
          <div style="color:#ccc;font-size:11px">${L('عوالم','Worlds','Mundos')}</div>
        </div>
      </div>

      <div style="background:rgba(255,215,64,.15);border-radius:12px;padding:12px;margin:12px auto;max-width:260px">
        <p style="margin:0;color:#ffd740;font-size:14px;font-weight:700">${L('المهارة','Skill','Habilidade')}: ${skillLabel} ${trendIcon}</p>
        <p style="margin:4px 0 0;color:#ccc;font-size:12px">${L('أفضل تحدي','Best Challenge','Melhor Desafio')}: ${challenge?.bestScore || 0}%</p>
        <p style="margin:2px 0 0;color:#ccc;font-size:12px">${L('أيام متتالية','Streak','Sequência')}: ${daily?.streak || 0} 🔥</p>
      </div>

      <div style="margin:16px auto;max-width:280px">
        <h3 style="color:#ffd740;font-size:14px;margin-bottom:8px">${L('الشارات','Badges','Medalhas')} (${badges.filter(b=>b.earned).length}/${badges.length})</h3>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px">
          ${badgesHTML}
        </div>
      </div>
    </div>`;
}
