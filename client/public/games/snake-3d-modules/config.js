// ═══════════════════════════════════════════════════════
// 🐍 Snake 3D — Configuration (V3 Fruit Adventure)
// ═══════════════════════════════════════════════════════

export const LANG = new URLSearchParams(location.search).get('lang') || 'ar';

// ─── Grid & Rendering ───────────────────────────────
export const GRID_COLS = 14;
export const GRID_ROWS = 14;
export const TILE_W = 40;
export const TILE_H = 24;
export const BLOCK_HEIGHT = 18;

// ─── Fruit Types ────────────────────────────────────
export const FRUIT_TYPES = [
  { id: 'apple',  emoji: '🍎', points: 10,  weight: 10, color: '#ff4444', temp: false },
  { id: 'orange', emoji: '🍊', points: 20,  weight: 7,  color: '#ff8c00', temp: false },
  { id: 'grape',  emoji: '🍇', points: 30,  weight: 5,  color: '#8b5cf6', temp: false },
  { id: 'straw',  emoji: '🍓', points: 50,  weight: 3,  color: '#ef4444', temp: false },
  { id: 'star',   emoji: '⭐', points: 100, weight: 1,  color: '#fbbf24', temp: true, lifetime: 7000 },
  { id: 'gem',    emoji: '💎', points: 150, weight: 0.5,color: '#3b82f6', temp: true, lifetime: 6000 },
];

// ─── Power-Up Types ─────────────────────────────────
export const POWER_UP_TYPES = [
  { id: 'shield', emoji: '🛡️', color: '#4facfe', duration: 15000, desc: 'shield' },
  { id: 'speed',  emoji: '⚡',  color: '#ffd200', duration: 5000,  desc: 'speedBoost' },
  { id: 'multi',  emoji: '✕2', color: '#c471f5', duration: 10000, desc: 'scoreMulti' },
  { id: 'dash',   emoji: '💨', color: '#ff9a76', duration: 0,     desc: 'dash' },
  { id: 'shrink', emoji: '🔻', color: '#ff6b6b', duration: 0,     desc: 'shrink' },
  { id: 'magnet', emoji: '🧲', color: '#e94560', duration: 10000, desc: 'magnet' },
  { id: 'freeze', emoji: '❄️', color: '#a0e9ff', duration: 8000,  desc: 'freeze' },
  { id: 'ghost',  emoji: '👻', color: '#b0b0ff', duration: 6000,  desc: 'ghost' },
];
export const POWER_UP_SPAWN_INTERVAL = 18000;
export const POWER_UP_LIFETIME = 9000;

// ─── Environments ───────────────────────────────────
export const ENVIRONMENTS = [
  { id: 'forest',    bg: '#071e0e', grid: '#133a22', accent: '#43e97b', glow: '#38f9d7', wallColor: '#3d2817', emoji: '🌲', weather: 'none' },
  { id: 'forest2',   bg: '#092612', grid: '#1a4a2d', accent: '#56f08e', glow: '#45fde0', wallColor: '#4a3320', emoji: '🌳', weather: 'rain' },
  { id: 'desert',    bg: '#28250a', grid: '#4a461a', accent: '#f7971e', glow: '#ffd200', wallColor: '#6b4423', emoji: '🏜️', weather: 'sand' },
  { id: 'city',      bg: '#121228', grid: '#1a1a3e', accent: '#e94560', glow: '#ff6b6b', wallColor: '#4a4a5a', emoji: '🌃', weather: 'rain' },
  { id: 'ocean',     bg: '#061a28', grid: '#143448', accent: '#00c9ff', glow: '#92fe9d', wallColor: '#2d5a6b', emoji: '🌊', weather: 'rain' },
  { id: 'space',     bg: '#06061e', grid: '#14143a', accent: '#c471f5', glow: '#fa71cd', wallColor: '#3d3d5a', emoji: '🚀', weather: 'none' },
  { id: 'neon',      bg: '#1a0828', grid: '#36144a', accent: '#ff00ff', glow: '#00ffff', wallColor: '#4a1a5a', emoji: '💜', weather: 'none' },
  { id: 'neonspace', bg: '#08081e', grid: '#18183a', accent: '#ff4488', glow: '#44ff88', wallColor: '#3a1a4a', emoji: '✨', weather: 'snow' },
  { id: 'neonspace2',bg: '#06061a', grid: '#141432', accent: '#ff6644', glow: '#44ffcc', wallColor: '#3a2a4a', emoji: '🌌', weather: 'none' },
];

// ─── Snake Shapes per Level Tier ────────────────────
// Maps level index to snake shape type
export const SNAKE_SHAPES = [
  'worm',     // L1: Tutorial
  'worm',     // L2: Beginner
  'croc',     // L3: Intermediate
  'croc',     // L4: Advanced
  'dragon',   // L5: Expert
  'dragon',   // L6: Strategic
  'electric', // L7: Intense
  'electric', // L8: Master
  'royal',    // L9: Endless
];

// ─── Level Configurations ───────────────────────────
export const LEVEL_CONFIG = [
  { // 1: Tutorial
    speed: 300, fruits: ['apple'], powerUps: [],
    hasWalls: false, movingWalls: false, hasThorns: false,
    comboMax: 1, comboWindow: 0, fruitGoal: 5,
    lives: 5, maxFruits: 2, speedUp: 0, envIdx: 0,
  },
  { // 2: Beginner
    speed: 250, fruits: ['apple','orange'], powerUps: ['shield'],
    hasWalls: false, movingWalls: false, hasThorns: false,
    comboMax: 2, comboWindow: 4000, fruitGoal: 8,
    lives: 3, maxFruits: 3, speedUp: 3, envIdx: 1,
  },
  { // 3: Intermediate
    speed: 220, fruits: ['apple','orange','grape'], powerUps: ['shield','speed'],
    hasWalls: true, movingWalls: false, hasThorns: false,
    comboMax: 3, comboWindow: 3000, fruitGoal: 12,
    lives: 3, maxFruits: 3, speedUp: 5, envIdx: 2,
  },
  { // 4: Advanced
    speed: 200, fruits: ['apple','orange','grape','straw'], powerUps: ['shield','speed','multi'],
    hasWalls: true, movingWalls: true, hasThorns: false,
    comboMax: 4, comboWindow: 2500, fruitGoal: 16,
    lives: 3, maxFruits: 4, speedUp: 6, envIdx: 3,
  },
  { // 5: Expert
    speed: 180, fruits: ['apple','orange','grape','straw','star'], powerUps: ['shield','speed','multi','dash'],
    hasWalls: true, movingWalls: true, hasThorns: false,
    comboMax: 5, comboWindow: 2500, fruitGoal: 20,
    lives: 3, maxFruits: 4, speedUp: 7, envIdx: 4,
  },
  { // 6: Strategic
    speed: 160, fruits: ['apple','orange','grape','straw','star','gem'], powerUps: ['shield','speed','multi','dash','shrink','magnet'],
    hasWalls: true, movingWalls: true, hasThorns: false,
    comboMax: 6, comboWindow: 2000, fruitGoal: 25,
    lives: 3, maxFruits: 5, speedUp: 8, envIdx: 5,
  },
  { // 7: Intense
    speed: 145, fruits: ['apple','orange','grape','straw','star','gem'], powerUps: ['shield','speed','multi','dash','shrink','magnet','freeze'],
    hasWalls: true, movingWalls: true, hasThorns: true,
    comboMax: 7, comboWindow: 1500, fruitGoal: 30,
    lives: 3, maxFruits: 5, speedUp: 8, envIdx: 6,
  },
  { // 8: Master
    speed: 130, fruits: ['apple','orange','grape','straw','star','gem'], powerUps: ['shield','speed','multi','dash','shrink','magnet','freeze','ghost'],
    hasWalls: true, movingWalls: true, hasThorns: true,
    comboMax: 8, comboWindow: 1500, fruitGoal: 35,
    lives: 3, maxFruits: 5, speedUp: 9, envIdx: 7,
  },
  { // 9: Endless
    speed: 150, fruits: ['apple','orange','grape','straw','star','gem'], powerUps: ['shield','speed','multi','dash','shrink','magnet','freeze','ghost'],
    hasWalls: true, movingWalls: true, hasThorns: true,
    comboMax: 99, comboWindow: 2000, fruitGoal: 0,
    lives: 3, maxFruits: 5, speedUp: 5, envIdx: 8,
  },
];
export const TOTAL_LEVELS = LEVEL_CONFIG.length;

// ─── Snake Skins ────────────────────────────────────
export const SNAKE_SKINS = [
  { head: '#4facfe', body: '#3a8fd4', eye: '#fff', name: 'blue',   emoji: '💙' },
  { head: '#43e97b', body: '#2bc062', eye: '#fff', name: 'green',  emoji: '💚' },
  { head: '#f5576c', body: '#d44058', eye: '#fff', name: 'red',    emoji: '❤️' },
  { head: '#c471f5', body: '#a050d0', eye: '#fff', name: 'purple', emoji: '💜' },
  { head: '#f7971e', body: '#d07a10', eye: '#fff', name: 'orange', emoji: '🧡' },
  { head: '#00c9ff', body: '#00a0d0', eye: '#fff', name: 'cyan',   emoji: '🩵' },
  { head: '#ffd200', body: '#d4aa00', eye: '#333', name: 'gold',   emoji: '💛' },
  { head: '#ff6b6b', body: '#d45050', eye: '#fff', name: 'coral',  emoji: '🩷' },
  { head: '#ff00ff', body: '#cc00cc', eye: '#fff', name: 'neon',   emoji: '💟' },
];

// ─── Milestone ──────────────────────────────────────
export const MILESTONE_INTERVAL = 8; // celebration every N fruits

// ─── Control Modes ──────────────────────────────────
export const CONTROL_MODES = ['swipe', 'dpad', 'both'];

// ─── i18n Strings ───────────────────────────────────
const STRINGS = {
  ar: {
    title: 'ثعبان المعرفة',
    subtitle: 'مغامرة الفواكه! 🍎',
    play: 'ابدأ المغامرة',
    stage: 'المرحلة',
    level: 'المستوى',
    score: 'النقاط',
    time: 'الوقت',
    best: 'الأفضل',
    next: 'التالي',
    replay: 'إعادة',
    back: 'رجوع',
    menu: 'القائمة',
    pause: 'إيقاف',
    resume: 'متابعة',
    gameOver: 'انتهت اللعبة!',
    great: 'ممتاز!',
    good: 'أحسنت!',
    tryAgain: 'حاول مرة أخرى!',
    lives: 'الحياة',
    combo: 'كومبو',
    target: 'الهدف',
    fruits: 'فواكه',
    endless: 'لانهائي',
    levelNames: [
      'التدريب', 'البداية', 'المتوسطة',
      'المتقدمة', 'الخبير', 'الاستراتيجية',
      'التحدي المكثف', 'المايسترو', 'اللانهاية'
    ],
    levelDesc: [
      'تعلم التحكم بالثعبان 🎓', 'أول تحدي مع الدرع 🛡️',
      'ظهور الجدران! احذر 🧱', 'جدران متحركة ونقاط مضاعفة 💎',
      'سريع وصعب! ⚡', 'خطط مسارك بعناية 🧠',
      'سرعة مكثفة وأشواك! 🌵', 'اتقن كل المهارات 🏆',
      'وضع لانهائي — سجل أعلى نقاط! ♾️'
    ],
    locked: 'مقفل',
    unlocked: 'مفتوح',
    controlSelect: 'اختر طريقة التحكم',
    swipeMode: 'السحب',
    dpadMode: 'أزرار',
    bothMode: 'الاثنان',
    swipeDesc: 'اسحب الشاشة',
    dpadDesc: 'أزرار الاتجاهات',
    bothDesc: 'السحب + الأزرار',
    confirm: 'تأكيد',
    selectLevel: 'اختر المرحلة',
    shield: 'درع!',
    speedBoost: 'سرعة!',
    scoreMulti: 'نقاط مضاعفة!',
    dash: 'اندفاع!',
    shrink: 'تقلص!',
    magnet: 'مغناطيس!',
    freeze: 'تجميد!',
    ghost: 'شبح!',
    skinSelect: 'شكل الثعبان',
    accuracy: 'الدقة',
    totalScore: 'المجموع',
    deaths: 'السقطات',
    bestCombo: 'أعلى كومبو',
    milestone: 'رائع!',
    newSkin: 'شكل جديد!',
    complete: 'مكتمل!',
    fruitsEaten: 'الفواكه',
    levelTips: [
      'حرك الثعبان بالسحب أو الأزرار — كل الفواكه!',
      'الدرع يحميك مرة واحدة — التقطه!',
      'الجدران تقتل! خطط قبل أن تتحرك',
      'الجدران تتحرك! راقبها جيداً',
      'السرعة تزيد — ركز وابقَ هادئاً',
      'فكر قبل كل حركة — الأشواك قادمة!',
      'كل شيء أسرع — حافظ على الكومبو!',
      'استخدم كل المهارات — أنت قادر!',
      'لا نهاية هنا — كم تستطيع أن تصمد؟'
    ],
    tipLabel: 'نصيحة',
    badgeFirstFruit: 'أول فاكهة! 🍎',
    badgeCombo5: 'كومبو ×5! 🔥',
    badgeCombo10: 'كومبو ×10! 🌟',
    badge100pts: '100 نقطة! 💯',
    badge500pts: '500 نقطة! 🏅',
    badge1000pts: '1000 نقطة! 🏆',
    badgeNoDeaths: 'بدون سقطات! 👑',
    badge3Stars: '3 نجوم! ⭐⭐⭐',
    badgeAllLevels: 'كل المراحل! 🎓',
    badgeEndless50: '50 فاكهة لانهائي! ♾️',
    badges: 'الشارات',
  },
  en: {
    title: 'Knowledge Snake',
    subtitle: 'Fruit Adventure! 🍎',
    play: 'Start Adventure',
    stage: 'Stage',
    level: 'Level',
    score: 'Score',
    time: 'Time',
    best: 'Best',
    next: 'Next',
    replay: 'Replay',
    back: 'Back',
    menu: 'Menu',
    pause: 'Pause',
    resume: 'Resume',
    gameOver: 'Game Over!',
    great: 'Excellent!',
    good: 'Well done!',
    tryAgain: 'Try again!',
    lives: 'Lives',
    combo: 'Combo',
    target: 'Goal',
    fruits: 'Fruits',
    endless: 'Endless',
    levelNames: [
      'Tutorial', 'Beginner', 'Intermediate',
      'Advanced', 'Expert', 'Strategic',
      'Intense', 'Master', 'Endless'
    ],
    levelDesc: [
      'Learn to control the snake 🎓', 'First challenge with Shield 🛡️',
      'Walls appear! Watch out 🧱', 'Moving walls & Score Multiplier 💎',
      'Fast & tough! ⚡', 'Plan your route carefully 🧠',
      'Intense speed & thorns! 🌵', 'Master all skills 🏆',
      'Endless mode — set the highest score! ♾️'
    ],
    locked: 'Locked',
    unlocked: 'Unlocked',
    controlSelect: 'Choose Controls',
    swipeMode: 'Swipe',
    dpadMode: 'D-Pad',
    bothMode: 'Both',
    swipeDesc: 'Swipe the screen',
    dpadDesc: 'Direction buttons',
    bothDesc: 'Swipe + Buttons',
    confirm: 'Confirm',
    selectLevel: 'Select Level',
    shield: 'Shield!',
    speedBoost: 'Speed Boost!',
    scoreMulti: 'Double Points!',
    dash: 'Dash!',
    shrink: 'Shrink!',
    magnet: 'Magnet!',
    freeze: 'Freeze!',
    ghost: 'Ghost!',
    skinSelect: 'Snake Skin',
    accuracy: 'Accuracy',
    totalScore: 'Total',
    deaths: 'Deaths',
    bestCombo: 'Best Combo',
    milestone: 'Amazing!',
    newSkin: 'New Skin!',
    complete: 'Complete!',
    fruitsEaten: 'Fruits',
    levelTips: [
      'Move the snake with swipe or buttons — get all fruits!',
      'The shield protects you once — grab it!',
      'Walls kill! Plan before you move',
      'Walls move! Watch them carefully',
      'Speed increases — stay calm and focused',
      'Think before each move — thorns are coming!',
      'Everything is faster — keep that combo going!',
      'Use all your skills — you can do it!',
      'No end here — how long can you survive?'
    ],
    tipLabel: 'Tip',
    badgeFirstFruit: 'First Fruit! 🍎',
    badgeCombo5: 'Combo ×5! 🔥',
    badgeCombo10: 'Combo ×10! 🌟',
    badge100pts: '100 Points! 💯',
    badge500pts: '500 Points! 🏅',
    badge1000pts: '1000 Points! 🏆',
    badgeNoDeaths: 'No Deaths! 👑',
    badge3Stars: '3 Stars! ⭐⭐⭐',
    badgeAllLevels: 'All Levels! 🎓',
    badgeEndless50: '50 Fruits Endless! ♾️',
    badges: 'Badges',
  },
  pt: {
    title: 'Cobra do Conhecimento',
    subtitle: 'Aventura das Frutas! 🍎',
    play: 'Iniciar Aventura',
    stage: 'Etapa',
    level: 'Nível',
    score: 'Pontos',
    time: 'Tempo',
    best: 'Melhor',
    next: 'Próximo',
    replay: 'Repetir',
    back: 'Voltar',
    menu: 'Menu',
    pause: 'Pausar',
    resume: 'Continuar',
    gameOver: 'Fim de jogo!',
    great: 'Excelente!',
    good: 'Muito bem!',
    tryAgain: 'Tente novamente!',
    lives: 'Vidas',
    combo: 'Combo',
    target: 'Meta',
    fruits: 'Frutas',
    endless: 'Infinito',
    levelNames: [
      'Tutorial', 'Iniciante', 'Intermediário',
      'Avançado', 'Especialista', 'Estratégico',
      'Intenso', 'Mestre', 'Infinito'
    ],
    levelDesc: [
      'Aprenda a controlar a cobra 🎓', 'Primeiro desafio com Escudo 🛡️',
      'Paredes aparecem! Cuidado 🧱', 'Paredes móveis & Multiplicador 💎',
      'Rápido e difícil! ⚡', 'Planeje sua rota com cuidado 🧠',
      'Velocidade intensa e espinhos! 🌵', 'Domine todas as habilidades 🏆',
      'Modo infinito — maior pontuação! ♾️'
    ],
    locked: 'Bloqueado',
    unlocked: 'Desbloqueado',
    controlSelect: 'Escolha o Controle',
    swipeMode: 'Deslizar',
    dpadMode: 'Botões',
    bothMode: 'Ambos',
    swipeDesc: 'Deslize a tela',
    dpadDesc: 'Botões direcionais',
    bothDesc: 'Deslizar + Botões',
    confirm: 'Confirmar',
    selectLevel: 'Selecione o Nível',
    shield: 'Escudo!',
    speedBoost: 'Velocidade!',
    scoreMulti: 'Pontos Duplos!',
    dash: 'Arrancada!',
    shrink: 'Encolher!',
    magnet: 'Ímã!',
    freeze: 'Congelar!',
    ghost: 'Fantasma!',
    skinSelect: 'Aparência da Cobra',
    accuracy: 'Precisão',
    totalScore: 'Total',
    deaths: 'Mortes',
    bestCombo: 'Melhor Combo',
    milestone: 'Incrível!',
    newSkin: 'Nova Aparência!',
    complete: 'Completo!',
    fruitsEaten: 'Frutas',
    levelTips: [
      'Mova a cobra deslizando ou com botões — pegue todas as frutas!',
      'O escudo protege uma vez — pegue-o!',
      'Paredes matam! Planeje antes de se mover',
      'Paredes se movem! Observe com cuidado',
      'Velocidade aumenta — fique calmo e focado',
      'Pense antes de cada movimento — espinhos chegando!',
      'Tudo mais rápido — mantenha o combo!',
      'Use todas as habilidades — você consegue!',
      'Sem fim aqui — quanto tempo você aguenta?'
    ],
    tipLabel: 'Dica',
    badgeFirstFruit: 'Primeira Fruta! 🍎',
    badgeCombo5: 'Combo ×5! 🔥',
    badgeCombo10: 'Combo ×10! 🌟',
    badge100pts: '100 Pontos! 💯',
    badge500pts: '500 Pontos! 🏅',
    badge1000pts: '1000 Pontos! 🏆',
    badgeNoDeaths: 'Sem Mortes! 👑',
    badge3Stars: '3 Estrelas! ⭐⭐⭐',
    badgeAllLevels: 'Todos os Níveis! 🎓',
    badgeEndless50: '50 Frutas Infinito! ♾️',
    badges: 'Medalhas',
  }
};

export const t = STRINGS[LANG] || STRINGS.ar;
export const DIR = (LANG === 'ar') ? 'rtl' : 'ltr';
