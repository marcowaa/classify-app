// ═══════════════════════════════════════════════════════════════
// Memory Match Pro — config.js
// Constants, i18n, Emoji Pools, Grid Tables
// ═══════════════════════════════════════════════════════════════

export const LANG = new URLSearchParams(location.search).get('lang') || 'ar';

// ===== MECHANIC TYPES =====
export const MECH = {
  CLASSIC: 'classic',
  TIMED:   'timed',
  MOVING:  'moving',
  MASKED:  'masked',
  FOG:     'fog',
  TRIPLE:  'triple',
  BOSS:    'boss',
  MIRROR:  'mirror',
  CHAIN:   'chain',
  BOMB:    'bomb',
  RAINBOW: 'rainbow',
};

// ===== STORAGE KEYS =====
export const KEYS = {
  PROGRESS: 'classify_memPro_progress',
  WALLET:   'classify_memPro_wallet',
  BADGES:   'classify_memPro_badges',
  DDA:      'classify_memPro_dda',
  MUTE:     'classify_memPro_muted',
  STREAK:   'classify_memPro_streak',
  POWERS:   'classify_memPro_powers',
  DDA_V2:   'classify_memPro_ddav2',
  XP:       'classify_memPro_xp',
  PRESTIGE: 'classify_memPro_prestige',
  STATS:    'classify_memPro_stats',
  // Migration from old format
  OLD_PROGRESS: 'classify_memory_progress',
  OLD_WALLET:   'classify_memory_wallet',
  OLD_BADGES:   'classify_memory_badges',
  OLD_DDA:      'classify_memory_dda',
  OLD_MUTE:     'classify_memory_muted',
};

// ===== GRID SIZE TABLE (11 difficulty steps) =====
export const GRID_TABLE = [
  { cols:3, rows:2, pairs:3  },  // d0  — 6 cards
  { cols:4, rows:2, pairs:4  },  // d1  — 8 cards
  { cols:4, rows:3, pairs:6  },  // d2  — 12 cards
  { cols:4, rows:4, pairs:8  },  // d3  — 16 cards
  { cols:5, rows:4, pairs:10 },  // d4  — 20 cards
  { cols:6, rows:4, pairs:12 },  // d5  — 24 cards
  { cols:6, rows:5, pairs:15 },  // d6  — 30 cards
  { cols:6, rows:6, pairs:18 },  // d7  — 36 cards
  { cols:7, rows:6, pairs:21 },  // d8  — 42 cards
  { cols:8, rows:6, pairs:24 },  // d9  — 48 cards
  { cols:8, rows:7, pairs:28 },  // d10 — 56 cards (prestige)
];

// Triple-mode grids (total must be divisible by 3)
export const GRID_TABLE_TRIPLE = [
  { cols:3, rows:2, sets:2  },  // 6 cards
  { cols:3, rows:3, sets:3  },  // 9 cards
  { cols:4, rows:3, sets:4  },  // 12 cards
  { cols:5, rows:3, sets:5  },  // 15 cards
  { cols:6, rows:3, sets:6  },  // 18 cards
  { cols:6, rows:4, sets:8  },  // 24 cards
  { cols:6, rows:5, sets:10 },  // 30 cards
  { cols:6, rows:6, sets:12 },  // 36 cards
];

// ===== 2000+ EDUCATIONAL EMOJI POOL =====
export const POOL = {
  farm:     ['🐄','🐷','🐑','🐐','🐴','🐔','🐓','🦃','🐤','🐣','🦆','🐕','🐈','🐰','🐇','🐹','🐭','🐿','🦔','🐶','🐱','🐮','🐖','🐗','🐽','🐏','🐪','🐫','🦙','🐎','🐥','🕊','🐩','🐾','🦝','🦡','🦨','🦥','🦦','🐻','🐨','🐼','🦊','🐺','🦫','🐂','🐃','🦄','🐁','🐀'],
  fruit:    ['🍎','🍏','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍈','🍑','🍒','🥝','🥥','🍍','🥭','🍅','🥑','🫐','🫒','🥕','🍆','🌶','🌽','🥒','🥬','🧅','🧄','🥜','🌰','🍄','🍠','🥦','🥗','🥣','🫙','🥫','🥔','🫑','🧆','🥙','🫓','🥯','🍞','🥖','🥨','🧀','🥚','🧈','🍋‍🟩'],
  sea:      ['🐟','🐠','🐡','🦈','🐬','🐳','🐋','🦭','🐙','🦑','🦐','🦀','🦞','🐚','🪸','🪼','🐊','🐢','🐍','🦎','🐸','🐲','🐉','🦕','🦖','🐳','🐋','🦈','🐬','🐙','🦑','🐠','🐟','🐡','🦐','🦀','🦞','🐚','🐢','🐊','🐍','🐸','🦎','🪸','🪼','🦭','🐉','🐲','🦕','🦖'],
  bug:      ['🦋','🐛','🐝','🐞','🦗','🕷','🦂','🐜','🪲','🪳','🦟','🪰','🐌','🪱','🌿','🍀','🍁','🍂','🍃','🌱','🌲','🌳','🌴','🌵','🌾','🪴','🎋','🎍','🍄','🌻','🌸','🌹','🌺','🌼','🌷','💐','🪻','🪷','🐦','🕊','🦋','🐛','🐝','🐞','🦗','🐜','🪲','🐌','🪱','🕷'],
  weather:  ['☀️','🌤','⛅','🌥','☁️','🌦','🌧','⛈','🌩','🌨','❄️','☃️','⛄','🌬','💨','🌊','🌈','🌪','🌫','💧','💦','🌡','🔥','⭐','🌟','💫','✨','☄️','🌙','🌛','🌜','🌚','🌝','🌞','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌅','🌄','🌇','🌆','🏙','🌃','🌌','🌠'],
  flower:   ['🌸','🌹','🌺','🌻','🌼','🌷','💐','🪻','🪷','🌱','🌲','🌳','🌴','🌵','🌾','🍀','☘️','🍁','🍂','🍃','🪴','🎋','🎍','🪹','🪺','🍄','🌿','🎄','💮','🏵','🌸','🌹','🌺','🌻','🌼','🌷','💐','🪻','🪷','🌱','🌲','🌳','🌴','🌵','🍀','☘️','🍁','🍂','🍃','🪴'],
  veggie:   ['🥕','🥦','🌽','🥒','🥬','🧅','🧄','🥔','🍆','🌶','🫑','🥜','🌰','🍄','🍠','🫘','🫛','🥗','🧆','🥙','🌱','🥕','🥦','🌽','🥒','🥬','🧅','🧄','🥔','🍆','🌶','🫑','🥜','🌰','🍄','🍠','🫘','🫛','🥗','🧆','🌿','🍀','🌾','🌻','🌼','🪴','🧂','🫙','🥫','🧈'],
  food:     ['🍕','🍔','🌮','🌯','🥚','🍳','🥘','🍲','🍿','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍩','🍪','🍯','🥐','🥖','🧇','🥞','🧈','🫕','🫔','🥣','🫗','🍿','🍱','🧆','🥙','🫓'],
  vehicle:  ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵','🚲','🛴','🛹','🛼','🚁','🛸','🚀','🛩','✈️','🛫','🛬','🚢','⛵','🛶','🚤','🛥','🛳','⛴','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚠','🚡','🛰','🚏'],
  space:    ['🌍','🌎','🌏','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌙','🌚','🌛','🌜','🌝','🌞','☀️','⭐','🌟','💫','✨','☄️','🪐','🔭','🔬','🧲','🧪','🧫','🧬','💡','🔦','🕯','🪔','🔋','⚡','🛸','🚀','🛰','📡','🌌','🌠','🎆','🎇','💥','🔥','💧','🌊','🌀','🌈'],
  sport:    ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥍','🏏','🥅','⛳','🪁','🏹','🎯','🥊','🥋','🎿','⛷','🏂','🏋️','🤸','🤺','🤾','🏌️','🏇','🧘','🧗','🤿','🏄','🏊','🚣','🎽','🏅','🥇','🥈','🥉','🏆','🎖','🎪','🎠','🎡','🎢','🛝','⛺'],
  music:    ['🎵','🎶','🎼','🎹','🎸','🎺','🎻','🥁','🪘','🪗','🎷','🎤','🎧','📯','🪈','🎬','🎭','🎨','🖌','🖍','✏️','🖊','🖋','📝','🎪','🎠','🎲','🎯','🎳','🎰','🎮','🕹','📺','📻','📸','🎥','📹','📽','🎞','🎟','💿','📀','💽','📱','🖥','⌨️','🖱','🖨','📢','📣'],
  wild:     ['🦁','🐯','🐅','🐆','🦒','🦓','🐘','🦛','🦏','🐻','🦊','🐺','🦌','🦬','🦣','🦧','🦍','🐒','🐵','🙈','🙉','🙊','🦘','🦥','🦨','🦡','🦝','🦦','🐻‍❄️','🐼','🐨','🐾','🐊','🐢','🐍','🦎','🐸','🐲','🐉','🦕','🦖','🦋','🐝','🐞','🦅','🦉','🐧','🦜','🦚','🦩'],
  bird:     ['🦅','🦆','🦉','🦜','🐧','🦚','🦢','🦩','🦤','🪶','🐦','🕊','🦃','🐔','🐓','🐤','🐣','🐥','🦅','🦆','🦉','🦜','🐧','🦚','🦢','🦩','🪶','🐦','🕊','🦃','🐔','🐓','🐤','🐣','🐥','🦤','🪹','🪺','🥚','🐾','🌿','🍀','🌲','🌳','☁️','🌤','⛅','🌈','🌅','🏔'],
  tool:     ['🔨','🪓','⛏','🔧','🪛','🔩','⚙️','🗜','🪚','📏','📐','✂️','🖊','🖋','✒️','🔑','🗝','🔒','🔓','🪤','🧲','🪝','🧰','🪜','🪣','🧹','🧺','🧻','🪠','🧼','🧽','🪥','🪒','🔋','🔌','💡','🔦','🕯','🪔','🧯','🪤','📌','📍','🗂','📁','📂','🗃','📎','🖇','🗑'],
  fashion:  ['👕','👖','🧣','🧤','🧥','🧦','👗','👘','🥻','🩱','🩲','🩳','👙','👚','👛','👜','👝','🎒','🩴','👞','👟','🥾','🥿','👠','👡','🩰','👢','👑','👒','🎩','🪖','⛑️','💄','💍','💎','👓','🕶','🥽','📿','🧢','👕','👖','🧣','🧥','👗','👘','🎒','👟','🥾','👠'],
  building: ['🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','🕌','🕍','⛪','🕋','🛕','⛩','🏗','🏚','🗼','🗽','🗾','🎑','⛲','⛺','🏛','🏟','🗺','🏖','🏜','🏝','🏞','🏔','⛰','🌋','🌁','🌉','🌅','🌄','🌇','🌆','🏙','🌃','🗻','🎪','🎡'],
  school:   ['📚','📖','📝','📒','📓','📔','📕','📗','📘','📙','📄','📃','📋','📎','📏','📐','✂️','✏️','🖊','🖋','🖍','🔗','📌','📍','🗂','📁','📂','🗃','🗄','🗑','📰','🗞','📊','📈','📉','🗒','🗓','📆','📅','🔖','📮','📬','📭','📪','📫','✉️','📩','📨','📧','💌'],
  tech:     ['💻','🖥','🖨','⌨️','🖱','💽','💾','💿','📱','📲','📷','📸','📹','📺','📻','📡','🔌','🔋','💡','📟','📠','🕹','🎮','🎧','🔬','🔭','📡','🛰','💻','🖥','⌨️','🖱','📱','📲','📷','📹','📺','📻','🔌','🔋','💡','🕹','🎮','🎧','🔬','🔭','🛰','📡','⌚','🤖'],
  fantasy:  ['🧙','🧙‍♀️','🧝','🧝‍♀️','🧛','🧛‍♀️','🧜','🧜‍♀️','🧚','🧚‍♀️','🧞','🧞‍♀️','🦸','🦹','🧟','👸','🤴','👑','🏰','🗡️','🛡️','🏹','⚔️','🔮','💎','✨','🌟','💫','🌈','🦄','🐉','🐲','🧿','🪬','🎭','🎪','🎩','🪄','📜','🗝️','🔒','🔓','🏺','⚱️','🗿','🪨','💀','👻','🎃','🕯'],
  candy:    ['🍬','🍭','🍫','🍩','🍪','🧁','🍰','🎂','🍮','🍡','🍧','🍨','🍦','🥧','🍯','🥐','🥖','🧇','🥞','🍺','🧃','🥤','☕','🍵','🧋','🍹','🍸','🥂','🍷','🫖','🍼','🥛','🧊','🫧','🎈','🎉','🎊','🎀','🎁','🎗','🎇','🎆','🎏','🎐','🎑','🪅','🪆','🎄','🎃','🧸'],
  mix:      ['🐄','🍎','🐟','🦋','☀️','🌸','🥕','🍕','🚗','🌍','⚽','🎵','🦁','🦅','🔨','👕','🏠','📚','💻','🎉','🐷','🍊','🐬','🐝','🌈','🌹','🌽','🍔','🚌','🪐','🏀','🎸','🐯','🦉','🔧','👗','🏫','📖','📱','🎊','🐴','🍇','🐙','🐞','⭐','🌻','🍆','🍰','✈️','🚀'],
};

// ===== CARD FRONT ICONS PER GROUP =====
export const FRONT_ICONS = [
  ['❓','🌿','🍀','🌱','🌻','☘️'],       // Group 0: Nature
  ['❓','🌊','💧','🐚','🫧','🪸'],       // Group 1: Ocean
  ['❓','✨','🌟','🔥','⭐','💫'],       // Group 2: Kitchen/Food
  ['❓','🚀','🪐','⭐','☄️','💫'],       // Group 3: Space
  ['❓','🎵','🎶','🎼','🎤','🎸'],       // Group 4: Music
  ['❓','🗺️','⚔️','🏹','🛡️','🧭'],     // Group 5: Adventure
  ['❓','💠','🔮','⚡','🤖','💎'],       // Group 6: Tech
  ['❓','🎨','🖌','🌈','✨','💫'],       // Group 7: Colors
  ['❓','🏰','🗝️','🔮','🧙','📜'],     // Group 8: Castle
  ['❓','👑','🏆','⭐','💎','🌟'],       // Group 9: Championship
];

// ===== SHOP ITEMS =====
export const SHOP_ITEMS = [
  { id:'default',  icon:'❓',  price:0,   cf1:'#6366f1', cf2:'#4f46e5', frontIcon:'❓' },
  { id:'galaxy',   icon:'✨',  price:100, cf1:'#312e81', cf2:'#1e1b4b', frontIcon:'✨' },
  { id:'candy',    icon:'🍬',  price:150, cf1:'#ec4899', cf2:'#be185d', frontIcon:'🍬' },
  { id:'diamond',  icon:'💎',  price:200, cf1:'#0ea5e9', cf2:'#0369a1', frontIcon:'💎' },
  { id:'fire',     icon:'🔥',  price:250, cf1:'#ef4444', cf2:'#b91c1c', frontIcon:'🔥' },
  { id:'rainbow',  icon:'🌈',  price:300, cf1:'#a855f7', cf2:'#6d28d9', frontIcon:'🌈' },
  { id:'neon',     icon:'⚡',  price:400, cf1:'#06b6d4', cf2:'#0e7490', frontIcon:'⚡' },
  { id:'royal',    icon:'👑',  price:500, cf1:'#b45309', cf2:'#78350f', frontIcon:'👑' },
];

// ===== POWER-UPS =====
export const POWER_UPS = [
  { id:'peek',    icon:'👁️', price:30 },
  { id:'freeze',  icon:'🧊', price:40 },
  { id:'hint',    icon:'💡', price:25 },
  { id:'shield',  icon:'🛡️', price:35 },
  { id:'shuffle', icon:'🔄', price:20 },
];

// ===== BADGE DEFINITIONS (30 achievements) =====
export const BADGE_DEFS = [
  // — Progress —
  { id:'first',       emoji:'🐣', type:'levels',     goal:1    },
  { id:'levels25',    emoji:'📖', type:'levels',     goal:25   },
  { id:'levels50',    emoji:'📚', type:'levels',     goal:50   },
  { id:'levels100',   emoji:'🎓', type:'levels',     goal:100  },
  // — Stars —
  { id:'stars10',     emoji:'⭐', type:'stars',      goal:10   },
  { id:'stars30',     emoji:'🌟', type:'stars',      goal:30   },
  { id:'stars100',    emoji:'💫', type:'stars',      goal:100  },
  { id:'stars200',    emoji:'🌠', type:'stars',      goal:200  },
  { id:'stars300',    emoji:'☀️', type:'stars',      goal:300  },
  // — Perfection —
  { id:'perfect',     emoji:'🏆', type:'perfect',    goal:1    },
  { id:'perfect10',   emoji:'💎', type:'perfectN',   goal:10   },
  { id:'perfect50',   emoji:'👑', type:'perfectN',   goal:50   },
  // — Worlds —
  { id:'world1',      emoji:'🌿', type:'world',      goal:0    },
  { id:'world3',      emoji:'🍕', type:'world',      goal:2    },
  { id:'world5',      emoji:'🎵', type:'world',      goal:4    },
  { id:'world8',      emoji:'🎨', type:'world',      goal:7    },
  { id:'champion',    emoji:'🏅', type:'allWorlds',  goal:10   },
  // — Speed —
  { id:'speed30',     emoji:'⚡', type:'speed',      goal:30   },
  { id:'speed15',     emoji:'🚀', type:'speed',      goal:15   },
  // — Economy —
  { id:'rich',        emoji:'🪙', type:'totalCoins', goal:1000 },
  { id:'wealthy',     emoji:'💰', type:'totalCoins', goal:5000 },
  { id:'shopaholic',  emoji:'🛍️', type:'ownedThemes',goal:5   },
  { id:'collector',   emoji:'🎭', type:'ownedThemes',goal:8   },
  // — Streak —
  { id:'streak3',     emoji:'🔥', type:'streak',     goal:3    },
  { id:'streak7',     emoji:'🔥', type:'streak',     goal:7    },
  { id:'streak30',    emoji:'🔥', type:'streak',     goal:30   },
  // — Mastery —
  { id:'mechMaster',  emoji:'🧠', type:'mechMaster', goal:90   },
  { id:'allMechs',    emoji:'🌀', type:'allMechs',   goal:1    },
  // — Power-ups & Prestige —
  { id:'powerUser',   emoji:'⚡', type:'puUsed',     goal:50   },
  { id:'prestige1',   emoji:'♻️', type:'prestige',   goal:1    },
];

// ===== XP TABLE (level → cumulative XP needed) =====
export const XP_TABLE = [
  { level:1,  xp:0,     title:'🐣' },
  { level:2,  xp:50,    title:'🌱' },
  { level:3,  xp:150,   title:'🌿' },
  { level:4,  xp:300,   title:'🌳' },
  { level:5,  xp:500,   title:'⭐' },
  { level:6,  xp:800,   title:'🌟' },
  { level:7,  xp:1200,  title:'💫' },
  { level:8,  xp:1800,  title:'🔥' },
  { level:9,  xp:2600,  title:'💎' },
  { level:10, xp:3600,  title:'👑' },
];

// ===== STREAK CONFIG =====
export const STREAK_CONFIG = {
  coinBonus:   [0, 5, 10, 15, 20, 30, 40, 50],  // index = min(streakDays, 7)
  xpMultiplier:[1, 1, 1.1, 1.2, 1.3, 1.5, 1.7, 2.0],
};

// ===== PRESTIGE CONFIG =====
export const PRESTIGE_CONFIG = {
  coinMultiplier: 0.1,   // +10% coins per prestige level
  xpMultiplier:   0.05,  // +5% XP per prestige level
  requirement: 80,        // min levels completed (with ≥1 star) to prestige
};

// ===== i18n =====
const I18N = {
ar: {
  title:'🧠 مملكة الذاكرة',
  selectWorld:'اختر العالم لتبدأ المغامرة!',
  selectLevel:'اختر المستوى',
  moves:'المحاولات', pairs:'الأزواج', sets:'المجموعات', time:'الوقت',
  hint:'اضغط على أي بطاقة للبدء!', score:'النقاط',
  congrats:'مبروك!', excellent:'🌟 ممتاز!', great:'🎉 أحسنت!', good:'👍 جيد!', tryMore:'💪 حاول أكثر!',
  done:'أتممت المستوى!', next:'➡️ التالي', share:'📤 مشاركة', again:'🔄 إعادة',
  levels:'🏠 المستويات', worlds:'🗺️ العوالم', back:'🏠 رجوع', locked:'🔒',
  boss:'👑 معركة الزعيم!', bossDefeated:'🎉 هزمت الزعيم!',
  mech:{
    timed:'⏱️ تذكّر!', moving:'🔀 متحركة!', masked:'🎭 مُقنّعة!',
    fog:'🌫️ ضباب!', triple:'🔱 ثلاثي!', boss:'👑 الزعيم!',
    mirror:'🪞 مرآة!', chain:'🔗 سلسلة!', bomb:'💣 قنابل!', rainbow:'🌈 قوس قزح!'
  },
  mechHint:{
    timed:'تذكر مواقع البطاقات!', moving:'البطاقات تتبدل كل ٣ محاولات!',
    masked:'بعض البطاقات تخدعك!', fog:'اضغط الضباب أولاً!',
    triple:'طابق ٣ بطاقات متشابهة!', boss:'كل التحديات + مؤقت!',
    mirror:'البطاقات تنعكس!', chain:'طابق بالترتيب!', bomb:'طابق قبل الانفجار!', rainbow:'بطاقات سحرية تطابق أي شيء!'
  },
  powerUps:'⚡ القدرات',
  puNames:['👁️ كشف','🧊 تجميد','💡 تلميح','🛡️ درع','🔄 خلط'],
  chainNext:'🔗 التالي: {e}',
  bombWarn:'💣 {n}',
  frozenMsg:'🧊 مجمّد!',
  shieldMsg:'🛡️ محمي!',
  puUsed:'تم استخدام {p}!',
  noPower:'لا توجد قدرات!',
  puEarned:'+{n} قدرة!',
  rainbow:'🌈',
  chainWrong:'❌ الترتيب خاطئ!',
  mirrorFlip:'🪞 انعكاس!',
  timeUp:'⏰ انتهى الوقت!', remember:'👀 تذكّر!', shuffling:'🔀 تبديل...',
  shareText:'حققت {score} نقطة في المستوى {level} من مملكة الذاكرة! ⭐{stars}',
  dda:{ easy:'🟢 سهل', normal:'🔵 عادي', hard:'🔴 صعب' },
  ddaHintLvl:['💡 إضاءة خفيفة','💡💡 تلميح واضح','👀 كشف سريع'],
  ddaSession:{ hot:'🔥 ممتاز!', warm:'👍 جيد', cold:'❄️ بحاجة مساعدة' },
  ddaSkillUp:'📈 +{n} مهارة',
  ddaSkillDown:'📉 -{n} مهارة',
  hintMsg:'💡 تلميح!',
  shop:'🛒 المتجر', badges:'🏅 الإنجازات',
  coinsEarned:'+{n} عملة', buy:'شراء', equip:'تجهيز',
  equipped:'✅ مجهز', cantAfford:'لا يكفي', owned:'مملوك',
  newBadge:'🎉 إنجاز جديد!', badgeCount:'{n}/{total} إنجاز',
  starsCount:'⭐ {n}/{total}',
  worldProgress:'{n}/{total} مستوى',
  bossLabel:'زعيم',

  // World names
  worldNames:[
    '🌿 غابة الأحلام',
    '🌊 أعماق المحيط',
    '🍕 مطبخ سحري',
    '🚀 رحلة الفضاء',
    '🎵 مدينة الموسيقى',
    '⚔️ أرض المغامرات',
    '💻 عالم التقنية',
    '🎨 جزيرة الألوان',
    '🏰 قلعة الأسرار',
    '👑 بطولة الذاكرة'
  ],
  // World characters
  worldChars:['🦊 ثعلب الغابة','🐬 دولفي','👨‍🍳 الشيف','👨‍🚀 رائد','🎵 نغمة','🗡️ المحارب','🤖 روبوتي','🎨 فنّان','🧙 الساحر','👑 الملك'],
  // Boss names
  bossNames:['🦊 ثعلب الظل','🦑 الأخطبوط','👻 شبح المطبخ','👾 القائد الفضائي','🌪️ عاصفة DJ','🐉 التنين','🤖 الروبوت المعطل','❄️ ملكة الجليد','🎭 المخادع','👑 ملك الذاكرة'],

  // Level names per world (10 per world)
  lvNamesW0:['مرج الحيوانات','حديقة الفراشات','بستان الزهور','غابة العجائب','ممر الأشجار','نهر الأسماك','كهف الأسرار','قمة التل','وادي الألوان','🦊 وكر الثعلب'],
  lvNamesW1:['شاطئ المرجان','خليج الدلافين','أعماق الأسماك','كهف اللؤلؤ','حطام السفينة','حديقة المرجان','ممر القناديل','واحة الأصداف','خندق المحيط','🦑 عرين الأخطبوط'],
  lvNamesW2:['مطبخ الحلويات','سوق الخضار','فرن الخبز','مائدة الفواكه','ركن المشروبات','مطعم البيتزا','حانوت التوابل','مخبز الكعك','وليمة الطباخ','👻 مطبخ الأشباح'],
  lvNamesW3:['منصة الإطلاق','مدار القمر','حزام الكويكبات','محطة الفضاء','سديم الألوان','حلقات زحل','مجرة درب التبانة','ثقب أسود','نجم عملاق','👾 قاعدة القائد'],
  lvNamesW4:['استوديو الغناء','قاعة البيانو','حديقة الآلات','مسرح الأوركسترا','نادي الإيقاع','شارع الموسيقى','برج النغمات','ساحة الحفل','قمة الأداء','🌪️ حلبة DJ'],
  lvNamesW5:['بوابة المغامرة','غابة الأمازون','صحراء الرمال','جبال الثلج','معبد قديم','جسر المخاطر','نهر الحمم','قلعة محصنة','قمة التنين','🐉 عرين التنين'],
  lvNamesW6:['مختبر الذكاء','غرفة الخوادم','شبكة البيانات','روبوت المصنع','محطة الطاقة','مركز التحكم','فضاء سيبراني','قاعدة رقمية','نظام الدفاع','🤖 معركة الروبوت'],
  lvNamesW7:['لوحة الألوان','متحف الفن','حديقة النحت','ورشة الرسم','معرض الصور','مسرح الألوان','جسر قوس قزح','بحيرة البلورات','قصر الألوان','❄️ قصر الجليد'],
  lvNamesW8:['بوابة القلعة','قاعة العرش','مكتبة السحر','سرداب الأسرار','برج الساعة','حديقة التماثيل','جسر المعلق','غرفة المرايا','قمة البرج','🎭 قاعة المخادع'],
  lvNamesW9:['تصفيات أولى','ربع النهائي','نصف النهائي','الدور الذهبي','كأس الفضة','كأس الذهب','تحدي الأبطال','نهائي العالم','المواجهة الكبرى','👑 عرش الملك'],

  // Badge names & descriptions (30 badges)
  badgeNames:['🐣 أول خطوة','📖 مستكشف','📚 مثابر','🎓 خريج','⭐ جامع النجوم','🌟 سيد النجوم','💫 أسطورة النجوم','🌠 حصّاد النجوم','☀️ شمس النجوم','🏆 جولة مثالية','💎 عاشق الكمال','👑 ملك الكمال','🌿 حارس الغابة','🍕 شيف ماهر','🎵 عازف محترف','🎨 فنان مبدع','🏅 بطل العالم','⚡ سريع البرق','🚀 خاطف','🪙 ثري','💰 مليونير','🛍️ متسوّق','🎭 جامع الكل','🔥 حماس ×3','🔥 حماس ×7','🔥 حماس ×30','🧠 خبير آلية','🌀 متعدد المواهب','⚡ محترف القدرات','♻️ أسطورة متجدد'],
  badgeDescs:['أكمل أول مستوى','أكمل 25 مستوى','أكمل 50 مستوى','أكمل كل 100 مستوى','اجمع 10 نجوم','اجمع 30 نجمة','اجمع 100 نجمة','اجمع 200 نجمة','اجمع 300 نجمة','احصل على 3 نجوم','3 نجوم في 10 مستويات','3 نجوم في 50 مستوى','أكمل عالم الغابة','أكمل عالم المطبخ','أكمل عالم الموسيقى','أكمل عالم الألوان','أكمل كل العوالم','أنهِ مستوى في 30 ثانية','أنهِ مستوى في 15 ثانية','اجمع 1000 عملة','اجمع 5000 عملة','اشترِ 5 ثيمات','اشترِ كل الثيمات','العب 3 أيام متتالية','العب 7 أيام متتالية','العب 30 يوم متتالي','أتقن آلية (مهارة ≥90)','جرّب كل الآليات','استخدم 50 قدرة','حقق أول برستيج'],
  themeNames:['افتراضي','✨ مجرّة','🍬 حلوى','💎 ألماس','🔥 نار','🌈 قوس قزح','⚡ نيون','👑 ملكي'],
  // XP level titles
  xpTitles:['🐣 مبتدئ','🌱 ناشئ','🌿 متعلم','🌳 ماهر','⭐ نجم','🌟 متألق','💫 خبير','🔥 أسطوري','💎 ألماسي','👑 أسطورة'],
  // Streak & Prestige
  streak:'🔥 سلسلة: {n} يوم',
  streakBonus:'+{n} عملة سلسلة!',
  xpGained:'+{n} XP',
  xpLevel:'المستوى {n}',
  xpProgress:'{cur}/{next} XP',
  prestige:'♻️ البرستيج',
  prestigeLevel:'برستيج {n}',
  prestigeConfirm:'هل تريد البرستيج؟ سيُعاد تعيين تقدمك مع مضاعف دائم +{n}%!',
  prestigeYes:'نعم!',
  prestigeNo:'لا',
  profile:'👤 الملف',
  totalPlayed:'مستويات مكتملة',
  totalCoins:'عملات مكتملة',
  puUsedTotal:'قدرات مستخدمة',
  dailyBonus:'🎁 مكافأة يومية!',
  mechsPlayed:'آليات مُجربة',
  // Boss system
  bossAbilities:{ hideEdge:'🦊 إخفاء!', inkWrap:'🦑 حبر!', swapSymbols:'👻 تبديل!', fogZone:'👾 ضباب!', shuffleAll:'🌪️ خلط!', burnCard:'🐉 حرق!', reverseFlip:'🤖 عكس!', freezeCards:'❄️ تجميد!' },
  bossTaunts:['🦊 لن تجدني!','🦑 أغرقك بالحبر!','👻 بوو!','👾 خذوهم!','🌪️ اختلطت الأمور!','🐉 احترق!','🤖 خلل في النظام!','❄️ تجمّد!','🎭 من أنا حقاً؟','👑 اركع للملك!'],
  bossDefeatTaunts:['🦊 كيف وجدتني؟!','🦑 حبري نفد!','👻 أختفي...','👾 مستحيل!','🌪️ هدأت العاصفة!','🐉 نار!','🤖 أحتاج صيانة!','❄️ ذبت!','🎭 كشفتني!','👑 أنت الملك الجديد!'],
  bossPhaseChange:'⚠️ مرحلة جديدة!',
  // Parent Report
  report:'📊 التقرير', reportTitle:'📊 تقرير الأداء',
  reportCognitive:'🧠 المهارات الذهنية', reportStrengths:'💪 نقاط القوة', reportGrowth:'🌱 مجالات النمو',
  reportMechanics:'🎮 مهارات الآليات', reportSession:'📊 بيانات الجلسة',
  reportTotalLevels:'المستويات', reportTotalStars:'النجوم', reportWorlds:'العوالم', reportGames:'الألعاب',
  reportAvgResponse:'متوسط الاستجابة', reportFastestLevel:'أسرع مستوى', reportBestStreak:'أفضل سلسلة', reportDays:'يوم',
  reportPerfectLevels:'مستويات مثالية (3★)', reportPowerUps:'قدرات مستخدمة', reportXPLevel:'مستوى XP', reportPrestige:'البرستيج',
  reportRecommend:'💡 توصيات',
  reportRecFocus:'🎯 جرّب مستويات الضباب والقنابل لتحسين التركيز',
  reportRecSpatial:'🗺️ جرّب المتحركة والمرآة لتحسين الذاكرة المكانية',
  reportRecWorking:'🧠 جرّب السلسلة والثلاثي لتقوية الذاكرة العاملة',
  reportRecSpeed:'⚡ المستويات المؤقتة تساعد في سرعة المعالجة',
  reportRecPersist:'💪 العب يومياً لبناء الاستمرارية',
  reportRecAdapt:'🔄 جرّب آليات مختلفة لتحسين التكيّف',
  reportRecGreat:'🌟 أداء ممتاز! استمر في استكشاف عوالم جديدة!',
  reportDims:{ spatial:'الذاكرة المكانية', working:'الذاكرة العاملة', focus:'التركيز والانتباه', adaptability:'التكيّف', speed:'سرعة المعالجة', persistence:'المثابرة' },
  reportLevels:['🌱 مبتدئ','🌿 ناشئ','⭐ متمكن','🌟 متقدم','👑 خبير'],
},
en: {
  title:'🧠 Memory Kingdom',
  selectWorld:'Choose a world to begin!',
  selectLevel:'Choose a level',
  moves:'Moves', pairs:'Pairs', sets:'Sets', time:'Time',
  hint:'Tap any card to start!', score:'Score',
  congrats:'Congrats!', excellent:'🌟 Excellent!', great:'🎉 Great!', good:'👍 Good!', tryMore:'💪 Try More!',
  done:'Level complete!', next:'➡️ Next', share:'📤 Share', again:'🔄 Replay',
  levels:'🏠 Levels', worlds:'🗺️ Worlds', back:'🏠 Back', locked:'🔒',
  boss:'👑 Boss Battle!', bossDefeated:'🎉 Boss Defeated!',
  mech:{
    timed:'⏱️ Peek!', moving:'🔀 Moving!', masked:'🎭 Masked!',
    fog:'🌫️ Fog!', triple:'🔱 Triple!', boss:'👑 Boss!',
    mirror:'🪞 Mirror!', chain:'🔗 Chain!', bomb:'💣 Bombs!', rainbow:'🌈 Rainbow!'
  },
  mechHint:{
    timed:'Memorize the cards!', moving:'Cards shuffle every 3 moves!',
    masked:'Some cards trick you first!', fog:'Tap fog to reveal!',
    triple:'Match 3 cards!', boss:'All challenges + timer!',
    mirror:'Cards get mirrored!', chain:'Match in order!', bomb:'Match before explosion!', rainbow:'Wild cards match anything!'
  },
  powerUps:'⚡ Powers',
  puNames:['👁️ Peek','🧊 Freeze','💡 Hint','🛡️ Shield','🔄 Shuffle'],
  chainNext:'🔗 Next: {e}',
  bombWarn:'💣 {n}',
  frozenMsg:'🧊 Frozen!',
  shieldMsg:'🛡️ Shielded!',
  puUsed:'{p} used!',
  noPower:'No powers!',
  puEarned:'+{n} power!',
  rainbow:'🌈',
  chainWrong:'❌ Wrong order!',
  mirrorFlip:'🪞 Mirror!',
  timeUp:'⏰ Time\'s up!', remember:'👀 Remember!', shuffling:'🔀 Shuffling...',
  shareText:'I scored {score} on Level {level} in Memory Kingdom! ⭐{stars}',
  dda:{ easy:'🟢 Easy', normal:'🔵 Normal', hard:'🔴 Hard' },
  ddaHintLvl:['💡 Gentle glow','💡💡 Highlight pair','👀 Quick peek'],
  ddaSession:{ hot:'🔥 On fire!', warm:'👍 Good', cold:'❄️ Need help' },
  ddaSkillUp:'📈 +{n} skill',
  ddaSkillDown:'📉 -{n} skill',
  hintMsg:'💡 Hint!',
  shop:'🛒 Shop', badges:'🏅 Badges',
  coinsEarned:'+{n} coins', buy:'Buy', equip:'Equip',
  equipped:'✅ Equipped', cantAfford:'Not enough', owned:'Owned',
  newBadge:'🎉 New Badge!', badgeCount:'{n}/{total} badges',
  starsCount:'⭐ {n}/{total}',
  worldProgress:'{n}/{total} levels',
  bossLabel:'Boss',

  worldNames:['🌿 Dream Forest','🌊 Ocean Depths','🍕 Magic Kitchen','🚀 Space Journey','🎵 Music City','⚔️ Adventure Land','💻 Tech World','🎨 Color Island','🏰 Castle of Secrets','👑 Memory Championship'],
  worldChars:['🦊 Forest Fox','🐬 Dolphy','👨‍🍳 Chef','👨‍🚀 Astronaut','🎵 Melody','🗡️ Warrior','🤖 Roboti','🎨 Artist','🧙 Wizard','👑 King'],
  bossNames:['🦊 Shadow Fox','🦑 Kraken','👻 Chef Ghost','👾 Alien Commander','🌪️ DJ Storm','🐉 Dragon','🤖 Glitch Bot','❄️ Ice Queen','🎭 Trickster','👑 Memory King'],

  lvNamesW0:['Animal Meadow','Butterfly Garden','Flower Orchard','Wonder Forest','Tree Path','Fish River','Secret Cave','Hilltop','Color Valley','🦊 Fox Den'],
  lvNamesW1:['Coral Beach','Dolphin Bay','Fish Depths','Pearl Cave','Shipwreck','Coral Garden','Jellyfish Lane','Shell Oasis','Ocean Trench','🦑 Kraken Lair'],
  lvNamesW2:['Sweet Kitchen','Veggie Market','Bread Oven','Fruit Table','Drink Corner','Pizza Place','Spice Shop','Cake Bakery','Chef Feast','👻 Ghost Kitchen'],
  lvNamesW3:['Launch Pad','Moon Orbit','Asteroid Belt','Space Station','Color Nebula','Saturn Rings','Milky Way','Black Hole','Giant Star','👾 Commander Base'],
  lvNamesW4:['Singing Studio','Piano Hall','Music Garden','Orchestra Stage','Rhythm Club','Music Street','Melody Tower','Concert Square','Peak Show','🌪️ DJ Arena'],
  lvNamesW5:['Adventure Gate','Amazon Forest','Sand Desert','Snow Mountains','Ancient Temple','Danger Bridge','Lava River','Fortified Castle','Dragon Peak','🐉 Dragon Lair'],
  lvNamesW6:['AI Lab','Server Room','Data Network','Robot Factory','Power Station','Control Center','Cyberspace','Digital Base','Defense Grid','🤖 Robot Battle'],
  lvNamesW7:['Color Palette','Art Museum','Sculpture Garden','Drawing Workshop','Photo Gallery','Color Theater','Rainbow Bridge','Crystal Lake','Color Palace','❄️ Ice Palace'],
  lvNamesW8:['Castle Gate','Throne Room','Magic Library','Secret Dungeon','Clock Tower','Statue Garden','Hanging Bridge','Mirror Room','Tower Peak','🎭 Trickster Hall'],
  lvNamesW9:['Qualifiers','Quarter Final','Semi Final','Golden Round','Silver Cup','Gold Cup','Champion Trial','World Final','Grand Clash','👑 King\'s Throne'],

  badgeNames:['🐣 First Steps','📖 Explorer','📚 Persistent','🎓 Graduate','⭐ Star Collector','🌟 Star Master','💫 Star Legend','🌠 Star Harvester','☀️ Star Sun','🏆 Perfect Round','💎 Perfection Lover','👑 Perfection King','🌿 Forest Guardian','🍕 Master Chef','🎵 Pro Musician','🎨 Creative Artist','🏅 World Champion','⚡ Lightning Fast','🚀 Speed Demon','🪙 Rich','💰 Millionaire','🛍️ Shopaholic','🎭 Full Collector','🔥 Streak ×3','🔥 Streak ×7','🔥 Streak ×30','🧠 Mechanic Master','🌀 Multi-talented','⚡ Power User','♻️ Prestige Legend'],
  badgeDescs:['Complete first level','Complete 25 levels','Complete 50 levels','Complete all 100 levels','Earn 10 stars','Earn 30 stars','Earn 100 stars','Earn 200 stars','Earn 300 stars','Get 3 stars on any level','3 stars on 10 levels','3 stars on 50 levels','Complete Dream Forest','Complete Magic Kitchen','Complete Music City','Complete Color Island','Complete all worlds','Finish a level in 30s','Finish a level in 15s','Earn 1000 total coins','Earn 5000 total coins','Own 5 themes','Own all themes','Play 3 days in a row','Play 7 days in a row','Play 30 days in a row','Master a mechanic (skill ≥90)','Try all mechanics','Use 50 power-ups','Reach Prestige 1'],
  themeNames:['Default','✨ Galaxy','🍬 Candy','💎 Diamond','🔥 Fire','🌈 Rainbow','⚡ Neon','👑 Royal'],
  xpTitles:['🐣 Novice','🌱 Seedling','🌿 Learner','🌳 Skilled','⭐ Star','🌟 Brilliant','💫 Expert','🔥 Legendary','💎 Diamond','👑 Legend'],
  streak:'🔥 Streak: {n} days',
  streakBonus:'+{n} streak coins!',
  xpGained:'+{n} XP',
  xpLevel:'Level {n}',
  xpProgress:'{cur}/{next} XP',
  prestige:'♻️ Prestige',
  prestigeLevel:'Prestige {n}',
  prestigeConfirm:'Prestige? Your progress resets but you get a permanent +{n}% bonus!',
  prestigeYes:'Yes!',
  prestigeNo:'No',
  profile:'👤 Profile',
  totalPlayed:'Levels completed',
  totalCoins:'Total coins earned',
  puUsedTotal:'Powers used',
  dailyBonus:'🎁 Daily Bonus!',
  mechsPlayed:'Mechanics tried',
  bossAbilities:{ hideEdge:'🦊 Hide!', inkWrap:'🦑 Ink!', swapSymbols:'👻 Swap!', fogZone:'👾 Fog Zone!', shuffleAll:'🌪️ Shuffle!', burnCard:'🐉 Burn!', reverseFlip:'🤖 Glitch!', freezeCards:'❄️ Freeze!' },
  bossTaunts:['🦊 You can\'t find me!','🦑 Ink everywhere!','👻 Boo!','👾 Take them!','🌪️ All mixed up!','🐉 Burn!','🤖 System error!','❄️ Freeze!','🎭 Who am I really?','👑 Bow to the King!'],
  bossDefeatTaunts:['🦊 How?!','🦑 Out of ink!','👻 I vanish...','👾 Impossible!','🌪️ Storm over!','🐉 Ugh!','🤖 Need repair!','❄️ I melt!','🎭 Unmasked!','👑 You are the new King!'],
  bossPhaseChange:'⚠️ New phase!',
  report:'📊 Report', reportTitle:'📊 Performance Report',
  reportCognitive:'🧠 Cognitive Skills', reportStrengths:'💪 Strengths', reportGrowth:'🌱 Growth Areas',
  reportMechanics:'🎮 Mechanic Skills', reportSession:'📊 Session Data',
  reportTotalLevels:'Levels', reportTotalStars:'Stars', reportWorlds:'Worlds', reportGames:'Games',
  reportAvgResponse:'Avg Response', reportFastestLevel:'Fastest Level', reportBestStreak:'Best Streak', reportDays:'days',
  reportPerfectLevels:'Perfect (3★)', reportPowerUps:'Power-ups Used', reportXPLevel:'XP Level', reportPrestige:'Prestige',
  reportRecommend:'💡 Recommendations',
  reportRecFocus:'🎯 Practice fog & bomb levels to improve focus',
  reportRecSpatial:'🗺️ Try moving & mirror levels for spatial skills',
  reportRecWorking:'🧠 Chain & triple levels strengthen working memory',
  reportRecSpeed:'⚡ Timed levels help increase processing speed',
  reportRecPersist:'💪 Play daily to build consistency',
  reportRecAdapt:'🔄 Try different mechanics to improve adaptability',
  reportRecGreat:'🌟 Excellent performance! Keep exploring new worlds!',
  reportDims:{ spatial:'Spatial Memory', working:'Working Memory', focus:'Focus & Attention', adaptability:'Adaptability', speed:'Processing Speed', persistence:'Persistence' },
  reportLevels:['🌱 Beginner','🌿 Developing','⭐ Competent','🌟 Proficient','👑 Expert'],
},
pt: {
  title:'🧠 Reino da Memória',
  selectWorld:'Escolha um mundo para começar!',
  selectLevel:'Escolha um nível',
  moves:'Jogadas', pairs:'Pares', sets:'Conjuntos', time:'Tempo',
  hint:'Toque para começar!', score:'Pontos',
  congrats:'Parabéns!', excellent:'🌟 Excelente!', great:'🎉 Muito Bem!', good:'👍 Bom!', tryMore:'💪 Tente Mais!',
  done:'Nível completo!', next:'➡️ Próximo', share:'📤 Compartilhar', again:'🔄 Repetir',
  levels:'🏠 Níveis', worlds:'🗺️ Mundos', back:'🏠 Voltar', locked:'🔒',
  boss:'👑 Batalha do Chefe!', bossDefeated:'🎉 Chefe Derrotado!',
  mech:{
    timed:'⏱️ Memorize!', moving:'🔀 Mover!', masked:'🎭 Mascarado!',
    fog:'🌫️ Névoa!', triple:'🔱 Triplo!', boss:'👑 Chefe!',
    mirror:'🪞 Espelho!', chain:'🔗 Corrente!', bomb:'💣 Bombas!', rainbow:'🌈 Arco-íris!'
  },
  mechHint:{
    timed:'Memorize as cartas!', moving:'Cartas mudam a cada 3!',
    masked:'Algumas enganam primeiro!', fog:'Toque a névoa primeiro!',
    triple:'Combine 3 cartas!', boss:'Todos desafios + tempo!',
    mirror:'Cartas espelham!', chain:'Combine na ordem!', bomb:'Combine antes de explodir!', rainbow:'Cartas mágicas combinam tudo!'
  },
  powerUps:'⚡ Poderes',
  puNames:['👁️ Espiar','🧊 Congelar','💡 Dica','🛡️ Escudo','🔄 Embaralhar'],
  chainNext:'🔗 Próximo: {e}',
  bombWarn:'💣 {n}',
  frozenMsg:'🧊 Congelado!',
  shieldMsg:'🛡️ Protegido!',
  puUsed:'{p} usado!',
  noPower:'Sem poderes!',
  puEarned:'+{n} poder!',
  rainbow:'🌈',
  chainWrong:'❌ Ordem errada!',
  mirrorFlip:'🪞 Espelho!',
  timeUp:'⏰ Tempo esgotado!', remember:'👀 Lembre-se!', shuffling:'🔀 Movendo...',
  shareText:'Fiz {score} pontos no Nível {level} do Reino da Memória! ⭐{stars}',
  dda:{ easy:'🟢 Fácil', normal:'🔵 Normal', hard:'🔴 Difícil' },
  ddaHintLvl:['💡 Brilho leve','💡💡 Destaque par','👀 Espiada rápida'],
  ddaSession:{ hot:'🔥 Em chamas!', warm:'👍 Bom', cold:'❄️ Precisa ajuda' },
  ddaSkillUp:'📈 +{n} habilidade',
  ddaSkillDown:'📉 -{n} habilidade',
  hintMsg:'💡 Dica!',
  shop:'🛒 Loja', badges:'🏅 Conquistas',
  coinsEarned:'+{n} moedas', buy:'Comprar', equip:'Equipar',
  equipped:'✅ Equipado', cantAfford:'Sem moedas', owned:'Comprado',
  newBadge:'🎉 Nova Conquista!', badgeCount:'{n}/{total} conquistas',
  starsCount:'⭐ {n}/{total}',
  worldProgress:'{n}/{total} níveis',
  bossLabel:'Chefe',

  worldNames:['🌿 Floresta dos Sonhos','🌊 Profundezas do Oceano','🍕 Cozinha Mágica','🚀 Jornada Espacial','🎵 Cidade da Música','⚔️ Terra da Aventura','💻 Mundo Tech','🎨 Ilha das Cores','🏰 Castelo dos Segredos','👑 Campeonato da Memória'],
  worldChars:['🦊 Raposa','🐬 Golfinho','👨‍🍳 Chef','👨‍🚀 Astronauta','🎵 Melodia','🗡️ Guerreiro','🤖 Robô','🎨 Artista','🧙 Mago','👑 Rei'],
  bossNames:['🦊 Raposa Sombra','🦑 Kraken','👻 Chef Fantasma','👾 Comandante Alien','🌪️ DJ Tempestade','🐉 Dragão','🤖 Robô Defeituoso','❄️ Rainha do Gelo','🎭 Trapaceiro','👑 Rei da Memória'],

  lvNamesW0:['Prado Animal','Jardim Borboleta','Pomar de Flores','Floresta Mágica','Caminho das Árvores','Rio dos Peixes','Caverna Secreta','Topo da Colina','Vale das Cores','🦊 Toca da Raposa'],
  lvNamesW1:['Praia de Coral','Baía dos Golfinhos','Profundezas','Caverna de Pérolas','Naufrágio','Jardim de Coral','Corredor de Águas-vivas','Oásis de Conchas','Fossa Oceânica','🦑 Covil do Kraken'],
  lvNamesW2:['Cozinha Doce','Mercado de Vegetais','Forno de Pão','Mesa de Frutas','Cantinho das Bebidas','Pizzaria','Loja de Especiarias','Padaria de Bolos','Banquete do Chef','👻 Cozinha Fantasma'],
  lvNamesW3:['Plataforma de Lançamento','Órbita Lunar','Cinturão de Asteroides','Estação Espacial','Nebulosa Colorida','Anéis de Saturno','Via Láctea','Buraco Negro','Estrela Gigante','👾 Base do Comandante'],
  lvNamesW4:['Estúdio de Canto','Salão do Piano','Jardim Musical','Palco da Orquestra','Clube de Ritmo','Rua da Música','Torre da Melodia','Praça do Concerto','Show Principal','🌪️ Arena DJ'],
  lvNamesW5:['Portão da Aventura','Floresta Amazônica','Deserto de Areia','Montanhas de Neve','Templo Antigo','Ponte Perigosa','Rio de Lava','Castelo Fortificado','Pico do Dragão','🐉 Covil do Dragão'],
  lvNamesW6:['Laboratório IA','Sala de Servidores','Rede de Dados','Fábrica de Robôs','Usina de Energia','Centro de Controle','Ciberespaço','Base Digital','Grade de Defesa','🤖 Batalha Robô'],
  lvNamesW7:['Paleta de Cores','Museu de Arte','Jardim de Esculturas','Oficina de Desenho','Galeria de Fotos','Teatro de Cores','Ponte Arco-íris','Lago de Cristal','Palácio de Cores','❄️ Palácio de Gelo'],
  lvNamesW8:['Portão do Castelo','Sala do Trono','Biblioteca Mágica','Masmorra Secreta','Torre do Relógio','Jardim de Estátuas','Ponte Suspensa','Sala dos Espelhos','Topo da Torre','🎭 Salão do Trapaceiro'],
  lvNamesW9:['Classificatórias','Quartas de Final','Semifinal','Rodada Dourada','Taça de Prata','Taça de Ouro','Desafio dos Campeões','Final Mundial','Grande Confronto','👑 Trono do Rei'],

  badgeNames:['🐣 Primeiros Passos','📖 Explorador','📚 Persistente','🎓 Graduado','⭐ Coletor de Estrelas','🌟 Mestre Estelar','💫 Lenda Estelar','🌠 Ceifador de Estrelas','☀️ Sol de Estrelas','🏆 Rodada Perfeita','💎 Amante da Perfeição','👑 Rei da Perfeição','🌿 Guardião da Floresta','🍕 Chef Mestre','🎵 Músico Profissional','🎨 Artista Criativo','🏅 Campeão Mundial','⚡ Relâmpago','🚀 Demônio da Velocidade','🪙 Rico','💰 Milionário','🛍️ Comprador','🎭 Colecionador Total','🔥 Sequência ×3','🔥 Sequência ×7','🔥 Sequência ×30','🧠 Mestre Mecânico','🌀 Multi-talento','⚡ Usuário de Poderes','♻️ Lenda Prestígio'],
  badgeDescs:['Complete o primeiro nível','Complete 25 níveis','Complete 50 níveis','Complete todos 100 níveis','Ganhe 10 estrelas','Ganhe 30 estrelas','Ganhe 100 estrelas','Ganhe 200 estrelas','Ganhe 300 estrelas','3 estrelas em um nível','3 estrelas em 10 níveis','3 estrelas em 50 níveis','Complete Floresta dos Sonhos','Complete Cozinha Mágica','Complete Cidade da Música','Complete Ilha das Cores','Complete todos os mundos','Termine em 30 segundos','Termine em 15 segundos','Ganhe 1000 moedas','Ganhe 5000 moedas','Compre 5 temas','Compre todos os temas','Jogue 3 dias seguidos','Jogue 7 dias seguidos','Jogue 30 dias seguidos','Domine mecânica (≥90)','Tente todas as mecânicas','Use 50 poderes','Alcance Prestígio 1'],
  themeNames:['Padrão','✨ Galáxia','🍬 Doce','💎 Diamante','🔥 Fogo','🌈 Arco-íris','⚡ Neon','👑 Real'],
  xpTitles:['🐣 Novato','🌱 Broto','🌿 Aprendiz','🌳 Habilidoso','⭐ Estrela','🌟 Brilhante','💫 Especialista','🔥 Lendário','💎 Diamante','👑 Lenda'],
  streak:'🔥 Sequência: {n} dias',
  streakBonus:'+{n} moedas de sequência!',
  xpGained:'+{n} XP',
  xpLevel:'Nível {n}',
  xpProgress:'{cur}/{next} XP',
  prestige:'♻️ Prestígio',
  prestigeLevel:'Prestígio {n}',
  prestigeConfirm:'Prestígio? Progresso reseta mas ganha +{n}% permanente!',
  prestigeYes:'Sim!',
  prestigeNo:'Não',
  profile:'👤 Perfil',
  totalPlayed:'Níveis completados',
  totalCoins:'Total moedas',
  puUsedTotal:'Poderes usados',
  dailyBonus:'🎁 Bônus Diário!',
  mechsPlayed:'Mecânicas tentadas',
  bossAbilities:{ hideEdge:'🦊 Esconder!', inkWrap:'🦑 Tinta!', swapSymbols:'👻 Trocar!', fogZone:'👾 Zona de Névoa!', shuffleAll:'🌪️ Misturar!', burnCard:'🐉 Queimar!', reverseFlip:'🤖 Falha!', freezeCards:'❄️ Congelar!' },
  bossTaunts:['🦊 Não me acha!','🦑 Tinta por toda parte!','👻 Buuu!','👾 Peguem!','🌪️ Tudo misturado!','🐉 Queime!','🤖 Erro no sistema!','❄️ Congele!','🎭 Quem sou eu?','👑 Curvem-se ao Rei!'],
  bossDefeatTaunts:['🦊 Como?!','🦑 Sem tinta!','👻 Sumir...','👾 Impossível!','🌪️ Tempestade acabou!','🐉 Arg!','🤖 Preciso de reparo!','❄️ Derretendo!','🎭 Desmascarado!','👑 Você é o novo Rei!'],
  bossPhaseChange:'⚠️ Nova fase!',
  report:'📊 Relatório', reportTitle:'📊 Relatório de Desempenho',
  reportCognitive:'🧠 Habilidades Cognitivas', reportStrengths:'💪 Pontos Fortes', reportGrowth:'🌱 Áreas de Crescimento',
  reportMechanics:'🎮 Habilidades Mecânicas', reportSession:'📊 Dados da Sessão',
  reportTotalLevels:'Níveis', reportTotalStars:'Estrelas', reportWorlds:'Mundos', reportGames:'Jogos',
  reportAvgResponse:'Resp. Média', reportFastestLevel:'Nível Mais Rápido', reportBestStreak:'Melhor Sequência', reportDays:'dias',
  reportPerfectLevels:'Perfeitos (3★)', reportPowerUps:'Poderes Usados', reportXPLevel:'Nível XP', reportPrestige:'Prestígio',
  reportRecommend:'💡 Recomendações',
  reportRecFocus:'🎯 Pratique níveis de névoa e bomba para melhorar o foco',
  reportRecSpatial:'🗺️ Tente níveis móveis e espelho para habilidades espaciais',
  reportRecWorking:'🧠 Níveis de corrente e triplo fortalecem a memória de trabalho',
  reportRecSpeed:'⚡ Níveis cronometrados ajudam a aumentar a velocidade',
  reportRecPersist:'💪 Jogue diariamente para construir consistência',
  reportRecAdapt:'🔄 Tente mecânicas diferentes para melhorar adaptabilidade',
  reportRecGreat:'🌟 Excelente desempenho! Continue explorando novos mundos!',
  reportDims:{ spatial:'Memória Espacial', working:'Memória de Trabalho', focus:'Foco e Atenção', adaptability:'Adaptabilidade', speed:'Velocidade de Processamento', persistence:'Persistência' },
  reportLevels:['🌱 Iniciante','🌿 Desenvolvendo','⭐ Competente','🌟 Proficiente','👑 Especialista'],
}
};

export const t = I18N[LANG] || I18N.en;

// Apply HTML dir/lang
document.documentElement.lang = LANG;
document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
