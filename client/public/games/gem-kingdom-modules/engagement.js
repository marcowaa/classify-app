/**
 * Gem Kingdom — engagement.js
 * Micro-badges, streak messages, near-miss detection,
 * motivational feedback, session tracking
 *
 * Exports: checkMicroBadges, getNearMissMessage, getStreakMessage,
 *          getSessionSummary, getMilestoneMessage
 */

import { LANG } from './config.js';

function L(obj) { return obj[LANG] || obj.en || obj.ar || ''; }

// ===== MICRO-BADGES =====
// Earned during gameplay (per-level, not persistent achievements)
// These are momentary rewards shown as toast notifications

const MICRO_BADGES = [
  {
    id: 'first_special',
    condition: (stats) => stats.specialsCreated >= 1,
    icon: '⚡',
    text: { ar: 'أول جوهرة خاصة!', en: 'First Special Gem!', pt: 'Primeira Gema Especial!', es: '¡Primera Gema Especial!', fr: 'Première Gemme Spéciale !', de: 'Erster Spezialstein!', it: 'Prima Gemma Speciale!', ru: 'Первый спецкамень!', zh: '首个特殊宝石！', ja: '初の特殊ジェム！', ko: '첫 특수 보석!', hi: 'पहला विशेष रत्न!', tr: 'İlk Özel Taş!', nl: 'Eerste Speciale Steen!', sv: 'Första Specialsten!', pl: 'Pierwszy Specjalny Klejnot!', uk: 'Перший спецкамінь!', id: 'Permata Spesial Pertama!', ms: 'Permata Istimewa Pertama!', th: 'อัญมณีพิเศษแรก!', vi: 'Đá Quý Đặc Biệt Đầu Tiên!', fa: 'اولین سنگ ویژه!', ur: 'پہلا خصوصی جوہر!', bn: 'প্রথম বিশেষ রত্ন!', sw: 'Kito Maalum cha Kwanza!' },
  },
  {
    id: 'combo_3',
    condition: (stats) => stats.maxCombo >= 3,
    icon: '🔥',
    text: { ar: 'كومبو ثلاثي!', en: 'Triple Combo!', pt: 'Combo Triplo!', es: '¡Combo Triple!', fr: 'Combo Triple !', de: 'Dreifach-Kombo!', it: 'Combo Triplo!', ru: 'Тройной комбо!', zh: '三连击！', ja: 'トリプルコンボ！', ko: '트리플 콤보!', hi: 'ट्रिपल कॉम्बो!', tr: 'Üçlü Kombo!', nl: 'Drievoudige Combo!', sv: 'Trippelkombo!', pl: 'Potrójne Combo!', uk: 'Потрійний комбо!', id: 'Kombo Tiga!', ms: 'Kombo Tiga!', th: 'คอมโบสาม!', vi: 'Combo Ba!', fa: 'کمبو سه‌تایی!', ur: 'ٹرپل کومبو!', bn: 'ট্রিপল কম্বো!', sw: 'Kombo Tatu!' },
  },
  {
    id: 'combo_5',
    condition: (stats) => stats.maxCombo >= 5,
    icon: '💥',
    text: { ar: 'كومبو خماسي!', en: '5x Combo!', pt: 'Combo 5x!', es: '¡Combo 5x!', fr: 'Combo 5x !', de: '5x Kombo!', it: 'Combo 5x!', ru: 'Комбо 5x!', zh: '五连击！', ja: '5xコンボ！', ko: '5x 콤보!', hi: '5x कॉम्बो!', tr: '5x Kombo!', nl: '5x Combo!', sv: '5x Kombo!', pl: 'Combo 5x!', uk: 'Комбо 5x!', id: 'Kombo 5x!', ms: 'Kombo 5x!', th: 'คอมโบ 5 เท่า!', vi: 'Combo 5x!', fa: 'کمبو ۵ برابر!', ur: '5x کومبو!', bn: '5x কম্বো!', sw: 'Kombo 5x!' },
  },
  {
    id: 'combo_8',
    condition: (stats) => stats.maxCombo >= 8,
    icon: '🌟',
    text: { ar: 'كومبو أسطوري!', en: 'Legendary Combo!', pt: 'Combo Lendário!', es: '¡Combo Legendario!', fr: 'Combo Légendaire !', de: 'Legendäre Kombo!', it: 'Combo Leggendario!', ru: 'Легендарный комбо!', zh: '传奇连击！', ja: '伝説のコンボ！', ko: '전설의 콤보!', hi: 'पौराणिक कॉम्बो!', tr: 'Efsanevi Kombo!', nl: 'Legendarische Combo!', sv: 'Legendarisk Kombo!', pl: 'Legendarne Combo!', uk: 'Легендарний комбо!', id: 'Kombo Legendaris!', ms: 'Kombo Lagenda!', th: 'คอมโบระดับตำนาน!', vi: 'Combo Huyền Thoại!', fa: 'کمبو افسانه‌ای!', ur: 'لیجنڈری کومبو!', bn: 'কিংবদন্তী কম্বো!', sw: 'Kombo ya Hadithi!' },
  },
  {
    id: 'power_combo',
    condition: (stats) => stats.powerCombos >= 1,
    icon: '💫',
    text: { ar: 'دمج قوي!', en: 'Power Combo!', pt: 'Combo de Poder!', es: '¡Combo de Poder!', fr: 'Combo de Puissance !', de: 'Power-Kombo!', it: 'Combo di Potenza!', ru: 'Силовой комбо!', zh: '力量连击！', ja: 'パワーコンボ！', ko: '파워 콤보!', hi: 'पावर कॉम्बो!', tr: 'Güçlü Kombo!', nl: 'Krachtige Combo!', sv: 'Kraftkombo!', pl: 'Potężne Combo!', uk: 'Силовий комбо!', id: 'Kombo Kekuatan!', ms: 'Kombo Kuasa!', th: 'คอมโบพลัง!', vi: 'Combo Sức Mạnh!', fa: 'کمبو قدرتمند!', ur: 'پاور کومبو!', bn: 'পাওয়ার কম্বো!', sw: 'Kombo ya Nguvu!' },
  },
  {
    id: 'half_moves',
    condition: (stats) => stats.movesLeftPct >= 50,
    icon: '🎯',
    text: { ar: 'نصف الحركات باقية!', en: 'Half Moves Left!', pt: 'Metade dos Movimentos!', es: '¡Mitad de Movimientos!', fr: 'Moitié des Coups !', de: 'Hälfte der Züge übrig!', it: 'Metà Mosse Rimaste!', ru: 'Половина ходов!', zh: '还剩一半步数！', ja: '半分の手数！', ko: '절반 남음!', hi: 'आधी चालें बाकी!', tr: 'Yarı Hamle Kaldı!', nl: 'Helft Zetten Over!', sv: 'Halva Drag Kvar!', pl: 'Połowa Ruchów!', uk: 'Половина ходів!', id: 'Separuh Langkah!', ms: 'Separuh Langkah!', th: 'เหลือครึ่งหนึ่ง!', vi: 'Còn Nửa Nước Đi!', fa: 'نیمی از حرکات!', ur: 'آدھی چالیں باقی!', bn: 'অর্ধেক চাল বাকি!', sw: 'Nusu ya Hatua!' },
  },
  {
    id: 'speed_demon',
    condition: (stats) => stats.timeSec <= 30,
    icon: '⏱️',
    text: { ar: 'سريع كالبرق!', en: 'Speed Demon!', pt: 'Velocidade Relâmpago!', es: '¡Velocidad Relámpago!', fr: 'Rapide comme l\'éclair !', de: 'Blitzschnell!', it: 'Velocità Lampo!', ru: 'Молниеносный!', zh: '快如闪电！', ja: '電光石火！', ko: '번개 같은 속도!', hi: 'बिजली की गति!', tr: 'Şimşek Hızında!', nl: 'Bliksemsnelheid!', sv: 'Blixtsnabb!', pl: 'Błyskawiczny!', uk: 'Блискавичний!', id: 'Secepat Kilat!', ms: 'Sepantas Kilat!', th: 'เร็วดุจสายฟ้า!', vi: 'Nhanh Như Chớp!', fa: 'سریع مثل رعد!', ur: 'بجلی کی رفتار!', bn: 'বিদ্যুৎ গতি!', sw: 'Kasi ya Umeme!' },
  },
  {
    id: 'obstacle_clear',
    condition: (stats) => stats.obstaclesCleared >= 10,
    icon: '🧱',
    text: { ar: 'محطم العوائق!', en: 'Obstacle Smasher!', pt: 'Destruidor de Obstáculos!', es: '¡Destructor de Obstáculos!', fr: 'Briseur d\'obstacles !', de: 'Hindernisbrecher!', it: 'Distruttore di Ostacoli!', ru: 'Разрушитель преград!', zh: '障碍粉碎者！', ja: '障害物破壊者！', ko: '장애물 파괴자!', hi: 'बाधा तोड़ने वाला!', tr: 'Engel Yıkıcı!', nl: 'Obstakelverpletteraar!', sv: 'Hinderkrossare!', pl: 'Niszczyciel Przeszkód!', uk: 'Руйнівник перешкод!', id: 'Penghancur Rintangan!', ms: 'Penghancur Halangan!', th: 'ผู้ทำลายอุปสรรค!', vi: 'Kẻ Phá Chướng Ngại!', fa: 'شکننده موانع!', ur: 'رکاوٹ توڑنے والا!', bn: 'বাধা ভাঙার চ্যাম্পিয়ন!', sw: 'Mvunjaji wa Vikwazo!' },
  },
  {
    id: 'no_bad_swap',
    condition: (stats) => stats.badSwaps === 0 && stats.totalSwaps >= 5,
    icon: '🎯',
    text: { ar: 'دقة مطلقة!', en: 'Perfect Accuracy!', pt: 'Precisão Perfeita!', es: '¡Precisión Perfecta!', fr: 'Précision Parfaite !', de: 'Perfekte Genauigkeit!', it: 'Precisione Perfetta!', ru: 'Идеальная точность!', zh: '完美精准！', ja: '完璧な精度！', ko: '완벽한 정확도!', hi: 'सटीक निशाना!', tr: 'Mükemmel Doğruluk!', nl: 'Perfecte Nauwkeurigheid!', sv: 'Perfekt Precision!', pl: 'Idealna Dokładność!', uk: 'Ідеальна точність!', id: 'Akurasi Sempurna!', ms: 'Ketepatan Sempurna!', th: 'แม่นยำสมบูรณ์แบบ!', vi: 'Chính Xác Tuyệt Đối!', fa: 'دقت بی‌نقص!', ur: 'بالکل درست!', bn: 'নিখুঁত নির্ভুলতা!', sw: 'Usahihi Kamili!' },
  },
  {
    id: 'boss_slayer',
    condition: (stats) => stats.bossDefeated,
    icon: '⚔️',
    text: { ar: 'قاتل الوحوش!', en: 'Boss Slayer!', pt: 'Matador de Chefes!', es: '¡Cazador de Jefes!', fr: 'Tueur de Boss !', de: 'Bossvernichter!', it: 'Ammazza Boss!', ru: 'Победитель босса!', zh: '首领杀手！', ja: 'ボス討伐！', ko: '보스 처치!', hi: 'बॉस स्लेयर!', tr: 'Patron Avcısı!', nl: 'Baasvernietiger!', sv: 'Bossbesegrare!', pl: 'Pogromca Bossa!', uk: 'Переможець боса!', id: 'Pembunuh Bos!', ms: 'Pembunuh Ketua!', th: 'ผู้สังหารบอส!', vi: 'Kẻ Hạ Boss!', fa: 'نابودکننده رئیس!', ur: 'باس کا خاتمہ!', bn: 'বস নিধনকারী!', sw: 'Mshindi wa Bosi!' },
  },
  {
    id: 'rainbow_master',
    condition: (stats) => stats.rainbowsCreated >= 2,
    icon: '🌈',
    text: { ar: 'سيد قوس قزح!', en: 'Rainbow Master!', pt: 'Mestre do Arco-Íris!', es: '¡Maestro del Arcoíris!', fr: 'Maître Arc-en-ciel !', de: 'Regenbogenmeister!', it: 'Maestro Arcobaleno!', ru: 'Мастер радуги!', zh: '彩虹大师！', ja: 'レインボーマスター！', ko: '무지개 마스터!', hi: 'इंद्रधनुष मास्टर!', tr: 'Gökkuşağı Ustası!', nl: 'Regenboogmeester!', sv: 'Regnbågsmästare!', pl: 'Mistrz Tęczy!', uk: 'Майстер веселки!', id: 'Master Pelangi!', ms: 'Master Pelangi!', th: 'ปรมาจารย์สายรุ้ง!', vi: 'Bậc Thầy Cầu Vồng!', fa: 'استاد رنگین‌کمان!', ur: 'قوس قزح ماسٹر!', bn: 'রংধনু মাস্টার!', sw: 'Bwana wa Upinde wa Mvua!' },
  },
  {
    id: 'big_score',
    condition: (stats) => stats.score >= 5000,
    icon: '🏅',
    text: { ar: 'نتيجة هائلة!', en: 'Huge Score!', pt: 'Pontuação Enorme!', es: '¡Puntuación Enorme!', fr: 'Score Énorme !', de: 'Riesige Punktzahl!', it: 'Punteggio Enorme!', ru: 'Огромный счёт!', zh: '超高分！', ja: '超ハイスコア！', ko: '엄청난 점수!', hi: 'विशाल स्कोर!', tr: 'Devasa Puan!', nl: 'Enorme Score!', sv: 'Enormt Poäng!', pl: 'Ogromny Wynik!', uk: 'Величезний рахунок!', id: 'Skor Besar!', ms: 'Skor Besar!', th: 'คะแนนมหาศาล!', vi: 'Điểm Khổng Lồ!', fa: 'امتیاز عظیم!', ur: 'بہت بڑا سکور!', bn: 'বিশাল স্কোর!', sw: 'Alama Kubwa!' },
  },
];

/**
 * Check which micro-badges were earned in this level
 * @param {Object} stats - Level stats: {specialsCreated, maxCombo, powerCombos, movesLeftPct, timeSec, obstaclesCleared, badSwaps, totalSwaps, bossDefeated, rainbowsCreated, score}
 * @returns {Array} [{id, icon, text}]
 */
export function checkMicroBadges(stats) {
  const earned = [];

  for (const badge of MICRO_BADGES) {
    try {
      if (badge.condition(stats)) {
        earned.push({
          id: badge.id,
          icon: badge.icon,
          text: L(badge.text),
        });
      }
    } catch (e) {
      // Skip broken conditions
    }
  }

  return earned;
}

// ===== NEAR-MISS DETECTION =====
// "Almost had it!" — show encouraging message when player barely fails

const NEAR_MISS_MESSAGES = {
  ar: ['كاد ينجح! حاول مرة أخرى! 💪', 'كنت قريباً جداً! 🔥', 'لقد كدت تفوز! جرب مرة أخرى! ✨', 'تقريباً! حركة واحدة كانت تكفي! 🎯', 'رائع رغم كل شيء! أنت تتحسن! 📈'],
  en: ['So close! Try again! 💪', 'You were SO close! 🔥', 'Almost had it! One more try! ✨', 'Nearly there! Just one more move would have done it! 🎯', 'Amazing effort! You are improving! 📈'],
  pt: ['Quase! Tente de novo! 💪', 'Você estava TÃO perto! 🔥', 'Quase conseguiu! Mais uma tentativa! ✨', 'Quase lá! Só mais um movimento! 🎯', 'Esforço incrível! Você está melhorando! 📈'],
  es: ['¡Casi! ¡Inténtalo de nuevo! 💪', '¡Estuviste MUY cerca! 🔥', '¡Casi lo logras! ¡Un intento más! ✨', '¡Casi! ¡Solo un movimiento más! 🎯', '¡Esfuerzo increíble! ¡Estás mejorando! 📈'],
  fr: ['Si proche ! Réessaie ! 💪', 'Tu étais SI proche ! 🔥', 'Presque ! Encore un essai ! ✨', 'Presque ! Un coup de plus ! 🎯', 'Effort incroyable ! Tu progresses ! 📈'],
  de: ['So nah! Versuch es nochmal! 💪', 'Du warst SO nah! 🔥', 'Fast geschafft! Noch ein Versuch! ✨', 'Fast! Nur ein Zug fehlte! 🎯', 'Toller Einsatz! Du wirst besser! 📈'],
  it: ['Così vicino! Riprova! 💪', 'Eri COSÌ vicino! 🔥', 'Quasi! Ancora un tentativo! ✨', 'Quasi! Solo una mossa in più! 🎯', 'Sforzo incredibile! Stai migliorando! 📈'],
  ru: ['Так близко! Попробуй ещё! 💪', 'Ты был ТАК близко! 🔥', 'Почти! Ещё попытка! ✨', 'Почти! Один ход! 🎯', 'Отличное усилие! Ты улучшаешься! 📈'],
  zh: ['好接近！再试一次！💪', '你太接近了！🔥', '差一点！再来！✨', '就差一步！🎯', '太棒了！你在进步！📈'],
  ja: ['惜しい！もう一度！💪', 'すごく惜しかった！🔥', 'もう少し！もう一回！✨', 'あと一歩！🎯', 'すごい努力！上達してる！📈'],
  ko: ['아깝다! 다시 도전! 💪', '정말 아까웠어! 🔥', '거의 다 했어! 한 번 더! ✨', '거의! 한 수만 더! 🎯', '대단한 노력! 실력이 늘고 있어! 📈'],
  hi: ['बहुत करीब! फिर से कोशिश करो! 💪', 'तुम बहुत करीब थे! 🔥', 'लगभग हो गया! एक और बार! ✨', 'बस एक कदम और! 🎯', 'शानदार प्रयास! तुम सुधर रहे हो! 📈'],
  tr: ['Çok yaklaştın! Tekrar dene! 💪', 'ÇOK yakındın! 🔥', 'Neredeyse! Bir kez daha! ✨', 'Az kaldı! Bir hamle daha! 🎯', 'Harika çaba! Gelişiyorsun! 📈'],
  nl: ['Zo dichtbij! Probeer opnieuw! 💪', 'Je was ZO dichtbij! 🔥', 'Bijna! Nog een poging! ✨', 'Bijna! Nog één zet! 🎯', 'Geweldige inzet! Je wordt beter! 📈'],
  sv: ['Så nära! Försök igen! 💪', 'Du var SÅ nära! 🔥', 'Nästan! Ett försök till! ✨', 'Nästan! Bara ett drag till! 🎯', 'Fantastisk insats! Du förbättras! 📈'],
  pl: ['Tak blisko! Spróbuj ponownie! 💪', 'Byłeś TAK blisko! 🔥', 'Prawie! Jeszcze raz! ✨', 'Prawie! Jeden ruch więcej! 🎯', 'Świetny wysiłek! Robisz postępy! 📈'],
  uk: ['Так близько! Спробуй ще! 💪', 'Ти був ТАК близько! 🔥', 'Майже! Ще спроба! ✨', 'Майже! Один хід! 🎯', 'Чудова робота! Ти покращуєшся! 📈'],
  id: ['Hampir! Coba lagi! 💪', 'Kamu SANGAT dekat! 🔥', 'Hampir berhasil! Sekali lagi! ✨', 'Sedikit lagi! Satu langkah lagi! 🎯', 'Usaha luar biasa! Kamu semakin baik! 📈'],
  ms: ['Hampir! Cuba lagi! 💪', 'Kamu SANGAT dekat! 🔥', 'Hampir berjaya! Sekali lagi! ✨', 'Sedikit lagi! Satu langkah lagi! 🎯', 'Usaha hebat! Kamu semakin baik! 📈'],
  th: ['ใกล้แล้ว! ลองอีกครั้ง! 💪', 'เกือบได้แล้ว! 🔥', 'อีกนิดเดียว! ลองอีก! ✨', 'เกือบแล้ว! อีกแค่ท่าเดียว! 🎯', 'ความพยายามที่ยอดเยี่ยม! เก่งขึ้นเรื่อยๆ! 📈'],
  vi: ['Gần lắm! Thử lại! 💪', 'Suýt nữa rồi! 🔥', 'Gần được rồi! Thêm lần nữa! ✨', 'Chỉ thiếu một nước! 🎯', 'Nỗ lực tuyệt vời! Đang tiến bộ! 📈'],
  fa: ['خیلی نزدیک بود! دوباره امتحان کن! 💪', 'خیلی نزدیک بودی! 🔥', 'تقریباً! یه بار دیگه! ✨', 'یه قدم مونده! 🎯', 'تلاش عالی! داری پیشرفت می‌کنی! 📈'],
  ur: ['بہت قریب! دوبارہ کوشش کرو! 💪', 'تم بہت قریب تھے! 🔥', 'تقریباً! ایک اور بار! ✨', 'بس ایک قدم اور! 🎯', 'شاندار کوشش! تم بہتر ہو رہے ہو! 📈'],
  bn: ['এত কাছে! আবার চেষ্টা কর! 💪', 'তুমি অনেক কাছে ছিলে! 🔥', 'প্রায় হয়ে গিয়েছিল! আরেকবার! ✨', 'আর একটু! একটা চাল আর! 🎯', 'দারুণ প্রচেষ্টা! তুমি উন্নতি করছ! 📈'],
  sw: ['Karibu sana! Jaribu tena! 💪', 'Ulikuwa KARIBU sana! 🔥', 'Karibu! Jaribio moja zaidi! ✨', 'Karibu! Hatua moja tu! 🎯', 'Juhudi nzuri! Unaendelea vizuri! 📈'],
};

/**
 * Get a near-miss message if the player barely failed
 * @param {Object} stats - {objectivesPct, movesLeft, score, starThresholds}
 * @returns {string|null} Message or null if not a near-miss
 */
export function getNearMissMessage(stats) {
  const {
    objectivesPct = 0,  // 0-100, how close to completing objectives
    score = 0,
    starThresholds = [0, 0, 0],
  } = stats;

  // Near miss if objectives were 70-99% complete
  const isNearMiss = objectivesPct >= 70 && objectivesPct < 100;

  // Also near miss if score was close to 1-star threshold
  const closeToStar = starThresholds[0] > 0 && score >= starThresholds[0] * 0.8;

  if (!isNearMiss && !closeToStar) return null;

  const pool = NEAR_MISS_MESSAGES[LANG] || NEAR_MISS_MESSAGES.en;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ===== STREAK MESSAGES =====

const STREAK_MESSAGES = {
  ar: { 2: 'فوز مزدوج! 🔥', 3: 'ثلاثية رائعة! ⚡', 5: 'خمس انتصارات متتالية! 🏆', 7: 'سبعة! أنت لا يُوقف! 💫', 10: 'عشرة! أنت أسطورة! 👑' },
  en: { 2: 'Double Win! 🔥', 3: 'Triple Streak! ⚡', 5: 'Five-Win Streak! 🏆', 7: 'Seven! Unstoppable! 💫', 10: 'TEN! You are a legend! 👑' },
  pt: { 2: 'Vitória Dupla! 🔥', 3: 'Sequência Tripla! ⚡', 5: 'Cinco Vitórias Seguidas! 🏆', 7: 'Sete! Imparável! 💫', 10: 'DEZ! Você é lendário! 👑' },
  es: { 2: '¡Victoria Doble! 🔥', 3: '¡Racha Triple! ⚡', 5: '¡Cinco Victorias! 🏆', 7: '¡Siete! ¡Imparable! 💫', 10: '¡DIEZ! ¡Eres una leyenda! 👑' },
  fr: { 2: 'Double Victoire ! 🔥', 3: 'Série Triple ! ⚡', 5: 'Cinq Victoires ! 🏆', 7: 'Sept ! Inarrêtable ! 💫', 10: 'DIX ! Tu es une légende ! 👑' },
  de: { 2: 'Doppelsieg! 🔥', 3: 'Dreifache Serie! ⚡', 5: 'Fünf Siege! 🏆', 7: 'Sieben! Unaufhaltbar! 💫', 10: 'ZEHN! Du bist eine Legende! 👑' },
  it: { 2: 'Doppia Vittoria! 🔥', 3: 'Serie Tripla! ⚡', 5: 'Cinque Vittorie! 🏆', 7: 'Sette! Inarrestabile! 💫', 10: 'DIECI! Sei una leggenda! 👑' },
  ru: { 2: 'Двойная победа! 🔥', 3: 'Тройная серия! ⚡', 5: 'Пять побед! 🏆', 7: 'Семь! Не остановить! 💫', 10: 'ДЕСЯТЬ! Ты легенда! 👑' },
  zh: { 2: '连胜两场！🔥', 3: '三连胜！⚡', 5: '五连胜！🏆', 7: '七连胜！势不可挡！💫', 10: '十连胜！你是传奇！👑' },
  ja: { 2: 'ダブル勝利！🔥', 3: 'トリプル連勝！⚡', 5: '5連勝！🏆', 7: '7連勝！止められない！💫', 10: '10連勝！伝説だ！👑' },
  ko: { 2: '2연승! 🔥', 3: '3연승! ⚡', 5: '5연승! 🏆', 7: '7연승! 멈출 수 없어! 💫', 10: '10연승! 전설이야! 👑' },
  hi: { 2: 'डबल जीत! 🔥', 3: 'ट्रिपल स्ट्रीक! ⚡', 5: 'पांच जीतें! 🏆', 7: 'सात! अजेय! 💫', 10: 'दस! तुम एक किंवदंती हो! 👑' },
  tr: { 2: 'Çifte Galibiyet! 🔥', 3: 'Üçlü Seri! ⚡', 5: 'Beş Galibiyet! 🏆', 7: 'Yedi! Durdurulamaz! 💫', 10: 'ON! Sen bir efsanesin! 👑' },
  nl: { 2: 'Dubbele Winst! 🔥', 3: 'Drievoudige Reeks! ⚡', 5: 'Vijf Overwinningen! 🏆', 7: 'Zeven! Onstopbaar! 💫', 10: 'TIEN! Je bent een legende! 👑' },
  sv: { 2: 'Dubbelvinst! 🔥', 3: 'Trippelsvit! ⚡', 5: 'Fem Vinster! 🏆', 7: 'Sju! Ostoppbar! 💫', 10: 'TIO! Du är en legend! 👑' },
  pl: { 2: 'Podwójna Wygrana! 🔥', 3: 'Potrójna Seria! ⚡', 5: 'Pięć Zwycięstw! 🏆', 7: 'Siedem! Nie do zatrzymania! 💫', 10: 'DZIESIĘĆ! Jesteś legendą! 👑' },
  uk: { 2: 'Подвійна перемога! 🔥', 3: 'Потрійна серія! ⚡', 5: "П'ять перемог! 🏆", 7: 'Сім! Не зупинити! 💫', 10: 'ДЕСЯТЬ! Ти легенда! 👑' },
  id: { 2: 'Kemenangan Ganda! 🔥', 3: 'Tiga Beruntun! ⚡', 5: 'Lima Kemenangan! 🏆', 7: 'Tujuh! Tak Terhentikan! 💫', 10: 'SEPULUH! Kamu legenda! 👑' },
  ms: { 2: 'Kemenangan Berganda! 🔥', 3: 'Tiga Berturut! ⚡', 5: 'Lima Kemenangan! 🏆', 7: 'Tujuh! Tak Boleh Dihentikan! 💫', 10: 'SEPULUH! Kamu lagenda! 👑' },
  th: { 2: 'ชนะสองครั้ง! 🔥', 3: 'ชนะสามต่อ! ⚡', 5: 'ชนะห้าต่อ! 🏆', 7: 'เจ็ด! หยุดไม่ได้! 💫', 10: 'สิบ! เจ้าคือตำนาน! 👑' },
  vi: { 2: 'Thắng Đôi! 🔥', 3: 'Ba Trận Liên Tiếp! ⚡', 5: 'Năm Chiến Thắng! 🏆', 7: 'Bảy! Không Thể Cản! 💫', 10: 'MƯỜI! Bạn là huyền thoại! 👑' },
  fa: { 2: 'برد دوتایی! 🔥', 3: 'سه‌گانه! ⚡', 5: 'پنج برد پیاپی! 🏆', 7: 'هفت! متوقف‌نشدنی! 💫', 10: 'ده! تو افسانه‌ای! 👑' },
  ur: { 2: 'دوہری جیت! 🔥', 3: 'تین جیتیں! ⚡', 5: 'پانچ جیتیں! 🏆', 7: 'سات! روک نہیں سکتے! 💫', 10: 'دس! تم لیجنڈ ہو! 👑' },
  bn: { 2: 'ডাবল জয়! 🔥', 3: 'ট্রিপল স্ট্রিক! ⚡', 5: 'পাঁচ জয়! 🏆', 7: 'সাত! থামানো যায় না! 💫', 10: 'দশ! তুমি কিংবদন্তী! 👑' },
  sw: { 2: 'Ushindi Maradufu! 🔥', 3: 'Mfululizo wa Tatu! ⚡', 5: 'Ushindi Tano! 🏆', 7: 'Saba! Hauzuiliki! 💫', 10: 'KUMI! Wewe ni hadithi! 👑' },
};

/**
 * Get streak message for current win streak
 * @param {number} streak - Current consecutive wins
 * @returns {string|null}
 */
export function getStreakMessage(streak) {
  if (streak < 2) return null;
  const msgs = STREAK_MESSAGES[LANG] || STREAK_MESSAGES.en;

  // Find the highest matching threshold
  const thresholds = [10, 7, 5, 3, 2];
  for (const t of thresholds) {
    if (streak >= t && msgs[t]) return msgs[t];
  }
  return null;
}

// ===== SESSION SUMMARY =====

/**
 * Generate end-of-session summary
 * @param {Object} session - {levelsPlayed, levelsWon, totalScore, totalCoins, totalStars, timeMinutes, badgesEarned}
 * @returns {Object} {title, stats: [{label, value, icon}], message}
 */
export function getSessionSummary(session) {
  const {
    levelsPlayed = 0,
    levelsWon = 0,
    totalScore = 0,
    totalCoins = 0,
    totalStars = 0,
    timeMinutes = 0,
    badgesEarned = 0,
  } = session;

  const winRate = levelsPlayed > 0 ? Math.round((levelsWon / levelsPlayed) * 100) : 0;

  const labels = {
    ar: { title: 'ملخص الجلسة 📊', played: 'مراحل لعبتها', won: 'انتصارات', winRate: 'نسبة الفوز', score: 'مجموع النقاط', coins: 'عملات جمعتها', stars: 'نجوم حصلت عليها', time: 'وقت اللعب', badges: 'شارات حصلت عليها', great: 'أداء رائع! استمر! 🌟', good: 'أحسنت! تعال غداً! 😊', ok: 'جهد جيد! تحسن كل يوم! 💪' },
    en: { title: 'Session Summary 📊', played: 'Levels Played', won: 'Victories', winRate: 'Win Rate', score: 'Total Score', coins: 'Coins Earned', stars: 'Stars Earned', time: 'Play Time', badges: 'Badges Earned', great: 'Amazing performance! Keep it up! 🌟', good: 'Well done! Come back tomorrow! 😊', ok: 'Good effort! Getting better every day! 💪' },
    pt: { title: 'Resumo da Sessão 📊', played: 'Fases Jogadas', won: 'Vitórias', winRate: 'Taxa de Vitória', score: 'Pontuação Total', coins: 'Moedas Ganhas', stars: 'Estrelas Ganhas', time: 'Tempo de Jogo', badges: 'Medalhas Ganhas', great: 'Performance incrível! Continue! 🌟', good: 'Muito bem! Volte amanhã! 😊', ok: 'Bom esforço! Melhorando a cada dia! 💪' },
    es: { title: 'Resumen de Sesión 📊', played: 'Niveles Jugados', won: 'Victorias', winRate: 'Tasa de Victoria', score: 'Puntuación Total', coins: 'Monedas Ganadas', stars: 'Estrellas Ganadas', time: 'Tiempo de Juego', badges: 'Insignias Ganadas', great: '¡Rendimiento increíble! ¡Sigue así! 🌟', good: '¡Bien hecho! ¡Vuelve mañana! 😊', ok: '¡Buen esfuerzo! ¡Mejorando cada día! 💪' },
    fr: { title: 'Résumé de Session 📊', played: 'Niveaux Joués', won: 'Victoires', winRate: 'Taux de Victoire', score: 'Score Total', coins: 'Pièces Gagnées', stars: 'Étoiles Gagnées', time: 'Temps de Jeu', badges: 'Badges Gagnés', great: 'Performance incroyable ! Continue ! 🌟', good: 'Bien joué ! Reviens demain ! 😊', ok: 'Bon effort ! Tu progresses ! 💪' },
    de: { title: 'Sitzungszusammenfassung 📊', played: 'Gespielte Level', won: 'Siege', winRate: 'Siegquote', score: 'Gesamtpunktzahl', coins: 'Verdiente Münzen', stars: 'Verdiente Sterne', time: 'Spielzeit', badges: 'Verdiente Abzeichen', great: 'Tolle Leistung! Weiter so! 🌟', good: 'Gut gemacht! Komm morgen wieder! 😊', ok: 'Guter Einsatz! Jeden Tag besser! 💪' },
    it: { title: 'Riepilogo Sessione 📊', played: 'Livelli Giocati', won: 'Vittorie', winRate: 'Tasso di Vittoria', score: 'Punteggio Totale', coins: 'Monete Guadagnate', stars: 'Stelle Guadagnate', time: 'Tempo di Gioco', badges: 'Medaglie Guadagnate', great: 'Prestazione incredibile! Continua! 🌟', good: 'Ben fatto! Torna domani! 😊', ok: 'Buon impegno! Migliori ogni giorno! 💪' },
    ru: { title: 'Итоги сессии 📊', played: 'Уровней пройдено', won: 'Побед', winRate: 'Процент побед', score: 'Общий счёт', coins: 'Монет собрано', stars: 'Звёзд получено', time: 'Время игры', badges: 'Значков получено', great: 'Потрясающе! Так держать! 🌟', good: 'Молодец! Приходи завтра! 😊', ok: 'Хорошая работа! С каждым днём лучше! 💪' },
    zh: { title: '会话总结 📊', played: '已玩关卡', won: '胜利次数', winRate: '胜率', score: '总分', coins: '获得金币', stars: '获得星星', time: '游戏时间', badges: '获得徽章', great: '表现太棒了！继续加油！🌟', good: '干得好！明天再来！😊', ok: '不错的努力！每天都在进步！💪' },
    ja: { title: 'セッションまとめ 📊', played: 'プレイしたレベル', won: '勝利', winRate: '勝率', score: '合計スコア', coins: '獲得コイン', stars: '獲得スター', time: 'プレイ時間', badges: '獲得バッジ', great: '素晴らしい！この調子！🌟', good: 'よくやった！明日また来てね！😊', ok: 'いい努力！毎日上達してる！💪' },
    ko: { title: '세션 요약 📊', played: '플레이한 레벨', won: '승리', winRate: '승률', score: '총 점수', coins: '획득 코인', stars: '획득 별', time: '플레이 시간', badges: '획득 뱃지', great: '놀라운 성과! 계속 해! 🌟', good: '잘했어! 내일 또 와! 😊', ok: '좋은 노력! 매일 나아지고 있어! 💪' },
    hi: { title: 'सत्र सारांश 📊', played: 'खेले गए स्तर', won: 'जीत', winRate: 'जीत दर', score: 'कुल स्कोर', coins: 'प्राप्त सिक्के', stars: 'प्राप्त तारे', time: 'खेल समय', badges: 'प्राप्त बैज', great: 'शानदार प्रदर्शन! जारी रखो! 🌟', good: 'बहुत अच्छा! कल फिर आओ! 😊', ok: 'अच्छा प्रयास! हर दिन बेहतर! 💪' },
    tr: { title: 'Oturum Özeti 📊', played: 'Oynanan Seviye', won: 'Galibiyetler', winRate: 'Kazanma Oranı', score: 'Toplam Puan', coins: 'Kazanılan Jeton', stars: 'Kazanılan Yıldız', time: 'Oyun Süresi', badges: 'Kazanılan Rozet', great: 'Harika performans! Devam et! 🌟', good: 'Aferin! Yarın yine gel! 😊', ok: 'İyi çaba! Her gün daha iyi! 💪' },
    nl: { title: 'Sessieoverzicht 📊', played: 'Gespeelde Levels', won: 'Overwinningen', winRate: 'Winstpercentage', score: 'Totaalscore', coins: 'Verdiende Munten', stars: 'Verdiende Sterren', time: 'Speeltijd', badges: 'Verdiende Badges', great: 'Geweldige prestatie! Ga zo door! 🌟', good: 'Goed gedaan! Kom morgen terug! 😊', ok: 'Goed geprobeerd! Elke dag beter! 💪' },
    sv: { title: 'Sessionssammanfattning 📊', played: 'Spelade Nivåer', won: 'Vinster', winRate: 'Vinstkvot', score: 'Totalpoäng', coins: 'Intjänade Mynt', stars: 'Intjänade Stjärnor', time: 'Speltid', badges: 'Intjänade Märken', great: 'Fantastisk prestation! Fortsätt! 🌟', good: 'Bra gjort! Kom tillbaka imorgon! 😊', ok: 'Bra insats! Bättre varje dag! 💪' },
    pl: { title: 'Podsumowanie Sesji 📊', played: 'Zagrane Poziomy', won: 'Zwycięstwa', winRate: 'Wskaźnik Zwycięstw', score: 'Łączny Wynik', coins: 'Zdobyte Monety', stars: 'Zdobyte Gwiazdki', time: 'Czas Gry', badges: 'Zdobyte Odznaki', great: 'Niesamowita gra! Tak trzymaj! 🌟', good: 'Dobra robota! Wróć jutro! 😊', ok: 'Dobry wysiłek! Coraz lepiej! 💪' },
    uk: { title: 'Підсумки сесії 📊', played: 'Зіграні рівні', won: 'Перемоги', winRate: 'Відсоток перемог', score: 'Загальний рахунок', coins: 'Зібрані монети', stars: 'Отримані зірки', time: 'Час гри', badges: 'Отримані значки', great: 'Чудовий результат! Продовжуй! 🌟', good: 'Молодець! Приходь завтра! 😊', ok: 'Гарна робота! Щодня краще! 💪' },
    id: { title: 'Ringkasan Sesi 📊', played: 'Level Dimainkan', won: 'Kemenangan', winRate: 'Tingkat Kemenangan', score: 'Total Skor', coins: 'Koin Didapat', stars: 'Bintang Didapat', time: 'Waktu Main', badges: 'Lencana Didapat', great: 'Luar biasa! Terus semangat! 🌟', good: 'Bagus! Datang lagi besok! 😊', ok: 'Usaha bagus! Semakin baik! 💪' },
    ms: { title: 'Ringkasan Sesi 📊', played: 'Tahap Dimainkan', won: 'Kemenangan', winRate: 'Kadar Kemenangan', score: 'Jumlah Skor', coins: 'Syiling Diperoleh', stars: 'Bintang Diperoleh', time: 'Masa Main', badges: 'Lencana Diperoleh', great: 'Prestasi hebat! Teruskan! 🌟', good: 'Bagus! Datang lagi esok! 😊', ok: 'Usaha bagus! Makin baik! 💪' },
    th: { title: 'สรุปเซสชัน 📊', played: 'ด่านที่เล่น', won: 'ชัยชนะ', winRate: 'อัตราชนะ', score: 'คะแนนรวม', coins: 'เหรียญที่ได้', stars: 'ดาวที่ได้', time: 'เวลาเล่น', badges: 'เหรียญตราที่ได้', great: 'เยี่ยมมาก! ทำต่อไป! 🌟', good: 'ดีมาก! มาใหม่พรุ่งนี้! 😊', ok: 'พยายามดี! ดีขึ้นทุกวัน! 💪' },
    vi: { title: 'Tổng Kết Phiên 📊', played: 'Màn Đã Chơi', won: 'Chiến Thắng', winRate: 'Tỉ Lệ Thắng', score: 'Tổng Điểm', coins: 'Xu Kiếm Được', stars: 'Sao Kiếm Được', time: 'Thời Gian Chơi', badges: 'Huy Hiệu', great: 'Tuyệt vời! Tiếp tục nhé! 🌟', good: 'Giỏi lắm! Mai quay lại! 😊', ok: 'Cố gắng tốt! Mỗi ngày tiến bộ! 💪' },
    fa: { title: 'خلاصه جلسه 📊', played: 'مراحل بازی شده', won: 'پیروزی‌ها', winRate: 'نرخ برد', score: 'امتیاز کل', coins: 'سکه‌های کسب شده', stars: 'ستاره‌های کسب شده', time: 'زمان بازی', badges: 'مدال‌های کسب شده', great: 'عملکرد عالی! ادامه بده! 🌟', good: 'آفرین! فردا برگرد! 😊', ok: 'تلاش خوبی بود! هر روز بهتر! 💪' },
    ur: { title: 'سیشن خلاصہ 📊', played: 'کھیلے گئے مراحل', won: 'فتوحات', winRate: 'جیت کی شرح', score: 'کل سکور', coins: 'حاصل کیے گئے سکے', stars: 'حاصل کیے گئے ستارے', time: 'کھیل کا وقت', badges: 'حاصل کیے گئے بیج', great: 'شاندار کارکردگی! جاری رکھو! 🌟', good: 'بہت اچھا! کل پھر آنا! 😊', ok: 'اچھی کوشش! ہر دن بہتر! 💪' },
    bn: { title: 'সেশন সারসংক্ষেপ 📊', played: 'খেলা লেভেল', won: 'জয়', winRate: 'জয়ের হার', score: 'মোট স্কোর', coins: 'অর্জিত কয়েন', stars: 'অর্জিত তারা', time: 'খেলার সময়', badges: 'অর্জিত ব্যাজ', great: 'অসাধারণ! চালিয়ে যাও! 🌟', good: 'চমৎকার! আগামীকাল আবার এসো! 😊', ok: 'ভালো চেষ্টা! প্রতিদিন ভালো হচ্ছ! 💪' },
    sw: { title: 'Muhtasari wa Kipindi 📊', played: 'Viwango Vilivyochezwa', won: 'Ushindi', winRate: 'Kiwango cha Ushindi', score: 'Alama Jumla', coins: 'Sarafu Zilizopatikana', stars: 'Nyota Zilizopatikana', time: 'Muda wa Kucheza', badges: 'Beji Zilizopatikana', great: 'Utendaji wa ajabu! Endelea! 🌟', good: 'Umefanya vizuri! Rudi kesho! 😊', ok: 'Juhudi nzuri! Unaboreshwa kila siku! 💪' },
  };

  const t = labels[LANG] || labels.en;
  const message = winRate >= 80 ? t.great : winRate >= 50 ? t.good : t.ok;

  return {
    title: t.title,
    stats: [
      { label: t.played, value: levelsPlayed, icon: '🎮' },
      { label: t.won, value: levelsWon, icon: '✅' },
      { label: t.winRate, value: winRate + '%', icon: '📈' },
      { label: t.score, value: totalScore.toLocaleString(), icon: '🏅' },
      { label: t.coins, value: totalCoins, icon: '🪙' },
      { label: t.stars, value: totalStars, icon: '⭐' },
      { label: t.time, value: timeMinutes + 'min', icon: '⏱️' },
      { label: t.badges, value: badgesEarned, icon: '🎖️' },
    ],
    message,
  };
}

// ===== MILESTONE MESSAGES =====

const MILESTONES = [
  { threshold: 10,   type: 'stars',  icon: '⭐', key: 'milestone_10_stars' },
  { threshold: 50,   type: 'stars',  icon: '🌟', key: 'milestone_50_stars' },
  { threshold: 100,  type: 'stars',  icon: '💫', key: 'milestone_100_stars' },
  { threshold: 200,  type: 'stars',  icon: '✨', key: 'milestone_200_stars' },
  { threshold: 300,  type: 'stars',  icon: '👑', key: 'milestone_300_stars' },
  { threshold: 10,   type: 'levels', icon: '🎮', key: 'milestone_10_levels' },
  { threshold: 25,   type: 'levels', icon: '🏅', key: 'milestone_25_levels' },
  { threshold: 50,   type: 'levels', icon: '🏆', key: 'milestone_50_levels' },
  { threshold: 100,  type: 'levels', icon: '🎊', key: 'milestone_100_levels' },
  { threshold: 1000, type: 'coins',  icon: '🪙', key: 'milestone_1000_coins' },
  { threshold: 5000, type: 'coins',  icon: '💰', key: 'milestone_5000_coins' },
];

const MILESTONE_TEXT = {
  ar: { milestone_10_stars: 'حصلت على 10 نجوم! ⭐', milestone_50_stars: 'حصلت على 50 نجمة! 🌟', milestone_100_stars: '100 نجمة! أنت نجم حقيقي! 💫', milestone_200_stars: '200 نجمة! مذهل! ✨', milestone_300_stars: '300 نجمة! ملك النجوم! 👑', milestone_10_levels: 'أنهيت 10 مراحل! 🎮', milestone_25_levels: '25 مرحلة! ممتاز! 🏅', milestone_50_levels: '50 مرحلة! نصف الطريق! 🏆', milestone_100_levels: 'أنهيت كل المراحل! 🎊', milestone_1000_coins: 'جمعت 1000 عملة! 🪙', milestone_5000_coins: '5000 عملة! ثروة! 💰' },
  en: { milestone_10_stars: 'Earned 10 Stars! ⭐', milestone_50_stars: 'Earned 50 Stars! 🌟', milestone_100_stars: '100 Stars! You are a star! 💫', milestone_200_stars: '200 Stars! Amazing! ✨', milestone_300_stars: '300 Stars! Star King! 👑', milestone_10_levels: 'Completed 10 Levels! 🎮', milestone_25_levels: '25 Levels! Excellent! 🏅', milestone_50_levels: '50 Levels! Halfway there! 🏆', milestone_100_levels: 'All Levels Complete! 🎊', milestone_1000_coins: 'Earned 1000 Coins! 🪙', milestone_5000_coins: '5000 Coins! Rich! 💰' },
  pt: { milestone_10_stars: 'Ganhou 10 Estrelas! ⭐', milestone_50_stars: 'Ganhou 50 Estrelas! 🌟', milestone_100_stars: '100 Estrelas! Você é uma estrela! 💫', milestone_200_stars: '200 Estrelas! Incrível! ✨', milestone_300_stars: '300 Estrelas! Rei das Estrelas! 👑', milestone_10_levels: 'Completou 10 Fases! 🎮', milestone_25_levels: '25 Fases! Excelente! 🏅', milestone_50_levels: '50 Fases! Metade do caminho! 🏆', milestone_100_levels: 'Todas as Fases Completas! 🎊', milestone_1000_coins: 'Ganhou 1000 Moedas! 🪙', milestone_5000_coins: '5000 Moedas! Rico! 💰' },
  es: { milestone_10_stars: '¡10 Estrellas! ⭐', milestone_50_stars: '¡50 Estrellas! 🌟', milestone_100_stars: '¡100 Estrellas! ¡Eres una estrella! 💫', milestone_200_stars: '¡200 Estrellas! ¡Increíble! ✨', milestone_300_stars: '¡300 Estrellas! ¡Rey de las Estrellas! 👑', milestone_10_levels: '¡10 Niveles Completados! 🎮', milestone_25_levels: '¡25 Niveles! ¡Excelente! 🏅', milestone_50_levels: '¡50 Niveles! ¡A la mitad! 🏆', milestone_100_levels: '¡Todos los Niveles! 🎊', milestone_1000_coins: '¡1000 Monedas! 🪙', milestone_5000_coins: '¡5000 Monedas! ¡Rico! 💰' },
  fr: { milestone_10_stars: '10 Étoiles ! ⭐', milestone_50_stars: '50 Étoiles ! 🌟', milestone_100_stars: '100 Étoiles ! Tu es une star ! 💫', milestone_200_stars: '200 Étoiles ! Incroyable ! ✨', milestone_300_stars: '300 Étoiles ! Roi des étoiles ! 👑', milestone_10_levels: '10 Niveaux Complétés ! 🎮', milestone_25_levels: '25 Niveaux ! Excellent ! 🏅', milestone_50_levels: '50 Niveaux ! À mi-chemin ! 🏆', milestone_100_levels: 'Tous les Niveaux ! 🎊', milestone_1000_coins: '1000 Pièces ! 🪙', milestone_5000_coins: '5000 Pièces ! Riche ! 💰' },
  de: { milestone_10_stars: '10 Sterne! ⭐', milestone_50_stars: '50 Sterne! 🌟', milestone_100_stars: '100 Sterne! Du bist ein Star! 💫', milestone_200_stars: '200 Sterne! Erstaunlich! ✨', milestone_300_stars: '300 Sterne! Sternenkönig! 👑', milestone_10_levels: '10 Level geschafft! 🎮', milestone_25_levels: '25 Level! Exzellent! 🏅', milestone_50_levels: '50 Level! Halbzeit! 🏆', milestone_100_levels: 'Alle Level geschafft! 🎊', milestone_1000_coins: '1000 Münzen! 🪙', milestone_5000_coins: '5000 Münzen! Reich! 💰' },
  it: { milestone_10_stars: '10 Stelle! ⭐', milestone_50_stars: '50 Stelle! 🌟', milestone_100_stars: '100 Stelle! Sei una stella! 💫', milestone_200_stars: '200 Stelle! Incredibile! ✨', milestone_300_stars: '300 Stelle! Re delle stelle! 👑', milestone_10_levels: '10 Livelli Completati! 🎮', milestone_25_levels: '25 Livelli! Eccellente! 🏅', milestone_50_levels: '50 Livelli! A metà strada! 🏆', milestone_100_levels: 'Tutti i Livelli! 🎊', milestone_1000_coins: '1000 Monete! 🪙', milestone_5000_coins: '5000 Monete! Ricco! 💰' },
  ru: { milestone_10_stars: '10 Звёзд! ⭐', milestone_50_stars: '50 Звёзд! 🌟', milestone_100_stars: '100 Звёзд! Ты звезда! 💫', milestone_200_stars: '200 Звёзд! Невероятно! ✨', milestone_300_stars: '300 Звёзд! Король звёзд! 👑', milestone_10_levels: '10 Уровней пройдено! 🎮', milestone_25_levels: '25 Уровней! Отлично! 🏅', milestone_50_levels: '50 Уровней! Полпути! 🏆', milestone_100_levels: 'Все уровни пройдены! 🎊', milestone_1000_coins: '1000 Монет! 🪙', milestone_5000_coins: '5000 Монет! Богач! 💰' },
  zh: { milestone_10_stars: '获得10颗星！⭐', milestone_50_stars: '获得50颗星！🌟', milestone_100_stars: '100颗星！你是明星！💫', milestone_200_stars: '200颗星！太厉害了！✨', milestone_300_stars: '300颗星！星星之王！👑', milestone_10_levels: '完成10关！🎮', milestone_25_levels: '25关！太棒了！🏅', milestone_50_levels: '50关！已过半！🏆', milestone_100_levels: '全部通关！🎊', milestone_1000_coins: '获得1000金币！🪙', milestone_5000_coins: '5000金币！大富翁！💰' },
  ja: { milestone_10_stars: '10スター達成！⭐', milestone_50_stars: '50スター達成！🌟', milestone_100_stars: '100スター！君はスター！💫', milestone_200_stars: '200スター！すごい！✨', milestone_300_stars: '300スター！スターキング！👑', milestone_10_levels: '10レベルクリア！🎮', milestone_25_levels: '25レベル！素晴らしい！🏅', milestone_50_levels: '50レベル！半分達成！🏆', milestone_100_levels: '全レベルクリア！🎊', milestone_1000_coins: '1000コイン！🪙', milestone_5000_coins: '5000コイン！大金持ち！💰' },
  ko: { milestone_10_stars: '별 10개 달성! ⭐', milestone_50_stars: '별 50개! 🌟', milestone_100_stars: '별 100개! 스타야! 💫', milestone_200_stars: '별 200개! 놀라워! ✨', milestone_300_stars: '별 300개! 별의 왕! 👑', milestone_10_levels: '10레벨 클리어! 🎮', milestone_25_levels: '25레벨! 훌륭해! 🏅', milestone_50_levels: '50레벨! 절반! 🏆', milestone_100_levels: '전체 클리어! 🎊', milestone_1000_coins: '1000코인! 🪙', milestone_5000_coins: '5000코인! 부자! 💰' },
  hi: { milestone_10_stars: '10 तारे! ⭐', milestone_50_stars: '50 तारे! 🌟', milestone_100_stars: '100 तारे! तुम स्टार हो! 💫', milestone_200_stars: '200 तारे! अद्भुत! ✨', milestone_300_stars: '300 तारे! तारों के राजा! 👑', milestone_10_levels: '10 स्तर पूरे! 🎮', milestone_25_levels: '25 स्तर! उत्कृष्ट! 🏅', milestone_50_levels: '50 स्तर! आधा रास्ता! 🏆', milestone_100_levels: 'सब पूरे! 🎊', milestone_1000_coins: '1000 सिक्के! 🪙', milestone_5000_coins: '5000 सिक्के! अमीर! 💰' },
  tr: { milestone_10_stars: '10 Yıldız! ⭐', milestone_50_stars: '50 Yıldız! 🌟', milestone_100_stars: '100 Yıldız! Sen bir yıldızsın! 💫', milestone_200_stars: '200 Yıldız! İnanılmaz! ✨', milestone_300_stars: '300 Yıldız! Yıldızların Kralı! 👑', milestone_10_levels: '10 Seviye Tamamlandı! 🎮', milestone_25_levels: '25 Seviye! Mükemmel! 🏅', milestone_50_levels: '50 Seviye! Yarı yolda! 🏆', milestone_100_levels: 'Tüm Seviyeler! 🎊', milestone_1000_coins: '1000 Jeton! 🪙', milestone_5000_coins: '5000 Jeton! Zengin! 💰' },
  nl: { milestone_10_stars: '10 Sterren! ⭐', milestone_50_stars: '50 Sterren! 🌟', milestone_100_stars: '100 Sterren! Je bent een ster! 💫', milestone_200_stars: '200 Sterren! Geweldig! ✨', milestone_300_stars: '300 Sterren! Sterrenkoning! 👑', milestone_10_levels: '10 Levels Voltooid! 🎮', milestone_25_levels: '25 Levels! Uitstekend! 🏅', milestone_50_levels: '50 Levels! Halverwege! 🏆', milestone_100_levels: 'Alle Levels Voltooid! 🎊', milestone_1000_coins: '1000 Munten! 🪙', milestone_5000_coins: '5000 Munten! Rijk! 💰' },
  sv: { milestone_10_stars: '10 Stjärnor! ⭐', milestone_50_stars: '50 Stjärnor! 🌟', milestone_100_stars: '100 Stjärnor! Du är en stjärna! 💫', milestone_200_stars: '200 Stjärnor! Fantastiskt! ✨', milestone_300_stars: '300 Stjärnor! Stjärnkung! 👑', milestone_10_levels: '10 Nivåer Klara! 🎮', milestone_25_levels: '25 Nivåer! Utmärkt! 🏅', milestone_50_levels: '50 Nivåer! Halvvägs! 🏆', milestone_100_levels: 'Alla Nivåer Klara! 🎊', milestone_1000_coins: '1000 Mynt! 🪙', milestone_5000_coins: '5000 Mynt! Rik! 💰' },
  pl: { milestone_10_stars: '10 Gwiazdek! ⭐', milestone_50_stars: '50 Gwiazdek! 🌟', milestone_100_stars: '100 Gwiazdek! Jesteś gwiazdą! 💫', milestone_200_stars: '200 Gwiazdek! Niesamowite! ✨', milestone_300_stars: '300 Gwiazdek! Król Gwiazd! 👑', milestone_10_levels: '10 Poziomów! 🎮', milestone_25_levels: '25 Poziomów! Doskonale! 🏅', milestone_50_levels: '50 Poziomów! Połowa! 🏆', milestone_100_levels: 'Wszystkie Poziomy! 🎊', milestone_1000_coins: '1000 Monet! 🪙', milestone_5000_coins: '5000 Monet! Bogacz! 💰' },
  uk: { milestone_10_stars: '10 Зірок! ⭐', milestone_50_stars: '50 Зірок! 🌟', milestone_100_stars: '100 Зірок! Ти зірка! 💫', milestone_200_stars: '200 Зірок! Неймовірно! ✨', milestone_300_stars: '300 Зірок! Король зірок! 👑', milestone_10_levels: '10 Рівнів пройдено! 🎮', milestone_25_levels: '25 Рівнів! Чудово! 🏅', milestone_50_levels: '50 Рівнів! Половина! 🏆', milestone_100_levels: 'Усі рівні пройдено! 🎊', milestone_1000_coins: '1000 Монет! 🪙', milestone_5000_coins: '5000 Монет! Багатій! 💰' },
  id: { milestone_10_stars: '10 Bintang! ⭐', milestone_50_stars: '50 Bintang! 🌟', milestone_100_stars: '100 Bintang! Kamu bintang! 💫', milestone_200_stars: '200 Bintang! Luar biasa! ✨', milestone_300_stars: '300 Bintang! Raja Bintang! 👑', milestone_10_levels: '10 Level Selesai! 🎮', milestone_25_levels: '25 Level! Hebat! 🏅', milestone_50_levels: '50 Level! Setengah jalan! 🏆', milestone_100_levels: 'Semua Level Selesai! 🎊', milestone_1000_coins: '1000 Koin! 🪙', milestone_5000_coins: '5000 Koin! Kaya! 💰' },
  ms: { milestone_10_stars: '10 Bintang! ⭐', milestone_50_stars: '50 Bintang! 🌟', milestone_100_stars: '100 Bintang! Kamu bintang! 💫', milestone_200_stars: '200 Bintang! Luar biasa! ✨', milestone_300_stars: '300 Bintang! Raja Bintang! 👑', milestone_10_levels: '10 Tahap Selesai! 🎮', milestone_25_levels: '25 Tahap! Cemerlang! 🏅', milestone_50_levels: '50 Tahap! Separuh jalan! 🏆', milestone_100_levels: 'Semua Tahap Selesai! 🎊', milestone_1000_coins: '1000 Syiling! 🪙', milestone_5000_coins: '5000 Syiling! Kaya! 💰' },
  th: { milestone_10_stars: '10 ดาว! ⭐', milestone_50_stars: '50 ดาว! 🌟', milestone_100_stars: '100 ดาว! เจ้าคือดารา! 💫', milestone_200_stars: '200 ดาว! เหลือเชื่อ! ✨', milestone_300_stars: '300 ดาว! ราชาแห่งดวงดาว! 👑', milestone_10_levels: '10 ด่านสำเร็จ! 🎮', milestone_25_levels: '25 ด่าน! ยอดเยี่ยม! 🏅', milestone_50_levels: '50 ด่าน! ครึ่งทาง! 🏆', milestone_100_levels: 'ผ่านทุกด่าน! 🎊', milestone_1000_coins: '1000 เหรียญ! 🪙', milestone_5000_coins: '5000 เหรียญ! รวย! 💰' },
  vi: { milestone_10_stars: '10 Sao! ⭐', milestone_50_stars: '50 Sao! 🌟', milestone_100_stars: '100 Sao! Bạn là ngôi sao! 💫', milestone_200_stars: '200 Sao! Tuyệt vời! ✨', milestone_300_stars: '300 Sao! Vua Ngôi Sao! 👑', milestone_10_levels: 'Hoàn thành 10 Màn! 🎮', milestone_25_levels: '25 Màn! Xuất sắc! 🏅', milestone_50_levels: '50 Màn! Nửa đường! 🏆', milestone_100_levels: 'Hoàn tất tất cả! 🎊', milestone_1000_coins: '1000 Xu! 🪙', milestone_5000_coins: '5000 Xu! Giàu rồi! 💰' },
  fa: { milestone_10_stars: '۱۰ ستاره! ⭐', milestone_50_stars: '۵۰ ستاره! 🌟', milestone_100_stars: '۱۰۰ ستاره! تو ستاره‌ای! 💫', milestone_200_stars: '۲۰۰ ستاره! شگفت‌انگیز! ✨', milestone_300_stars: '۳۰۰ ستاره! پادشاه ستاره‌ها! 👑', milestone_10_levels: '۱۰ مرحله تمام! 🎮', milestone_25_levels: '۲۵ مرحله! عالی! 🏅', milestone_50_levels: '۵۰ مرحله! نیمه راه! 🏆', milestone_100_levels: 'همه مراحل تمام! 🎊', milestone_1000_coins: '۱۰۰۰ سکه! 🪙', milestone_5000_coins: '۵۰۰۰ سکه! ثروتمند! 💰' },
  ur: { milestone_10_stars: '10 ستارے! ⭐', milestone_50_stars: '50 ستارے! 🌟', milestone_100_stars: '100 ستارے! تم ستارے ہو! 💫', milestone_200_stars: '200 ستارے! حیرت انگیز! ✨', milestone_300_stars: '300 ستارے! ستاروں کے بادشاہ! 👑', milestone_10_levels: '10 مراحل مکمل! 🎮', milestone_25_levels: '25 مراحل! بہترین! 🏅', milestone_50_levels: '50 مراحل! آدھا راستہ! 🏆', milestone_100_levels: 'سارے مراحل مکمل! 🎊', milestone_1000_coins: '1000 سکے! 🪙', milestone_5000_coins: '5000 سکے! امیر! 💰' },
  bn: { milestone_10_stars: '10 তারা! ⭐', milestone_50_stars: '50 তারা! 🌟', milestone_100_stars: '100 তারা! তুমি একটি তারা! 💫', milestone_200_stars: '200 তারা! অবিশ্বাস্য! ✨', milestone_300_stars: '300 তারা! তারার রাজা! 👑', milestone_10_levels: '10 লেভেল সম্পন্ন! 🎮', milestone_25_levels: '25 লেভেল! চমৎকার! 🏅', milestone_50_levels: '50 লেভেল! অর্ধেক পথ! 🏆', milestone_100_levels: 'সব লেভেল সম্পন্ন! 🎊', milestone_1000_coins: '1000 কয়েন! 🪙', milestone_5000_coins: '5000 কয়েন! ধনী! 💰' },
  sw: { milestone_10_stars: 'Nyota 10! ⭐', milestone_50_stars: 'Nyota 50! 🌟', milestone_100_stars: 'Nyota 100! Wewe ni nyota! 💫', milestone_200_stars: 'Nyota 200! Ajabu! ✨', milestone_300_stars: 'Nyota 300! Mfalme wa Nyota! 👑', milestone_10_levels: 'Viwango 10 Vimekamilika! 🎮', milestone_25_levels: 'Viwango 25! Bora! 🏅', milestone_50_levels: 'Viwango 50! Nusu njia! 🏆', milestone_100_levels: 'Viwango Vyote! 🎊', milestone_1000_coins: 'Sarafu 1000! 🪙', milestone_5000_coins: 'Sarafu 5000! Tajiri! 💰' },
};

/**
 * Check if a new milestone was reached
 * @param {Object} current - {totalStars, levelsCompleted, totalCoins}
 * @param {Object} previous - Same shape, previous values
 * @returns {Array} [{icon, text}] New milestones
 */
export function getMilestoneMessage(current, previous) {
  const texts = MILESTONE_TEXT[LANG] || MILESTONE_TEXT.en;
  const results = [];

  for (const m of MILESTONES) {
    const curVal = m.type === 'stars' ? current.totalStars
      : m.type === 'levels' ? current.levelsCompleted
      : current.totalCoins;
    const prevVal = m.type === 'stars' ? previous.totalStars
      : m.type === 'levels' ? previous.levelsCompleted
      : previous.totalCoins;

    if (curVal >= m.threshold && (prevVal || 0) < m.threshold) {
      results.push({ icon: m.icon, text: texts[m.key] || m.key });
    }
  }

  return results;
}

// ===== COMEBACK MESSAGES =====

/**
 * Get message when player returns after absence
 * @param {number} hoursSinceLastPlay
 * @returns {string|null}
 */
export function getComebackMessage(hoursSinceLastPlay) {
  if (hoursSinceLastPlay < 24) return null;

  const msgs = {
    ar: { short: 'مرحباً بعودتك! جاهز للعب؟ 🎮', medium: 'اشتقنا لك! هيا نلعب! 🤗', long: 'أهلاً! مغامرات جديدة بانتظارك! 🌟' },
    en: { short: 'Welcome back! Ready to play? 🎮', medium: 'We missed you! Let us play! 🤗', long: 'Hello! New adventures await you! 🌟' },
    pt: { short: 'Bem-vindo de volta! Pronto para jogar? 🎮', medium: 'Sentimos sua falta! Vamos jogar! 🤗', long: 'Olá! Novas aventuras esperam por você! 🌟' },
    es: { short: '¡Bienvenido de nuevo! ¿Listo para jugar? 🎮', medium: '¡Te extrañamos! ¡Vamos a jugar! 🤗', long: '¡Hola! ¡Nuevas aventuras te esperan! 🌟' },
    fr: { short: 'Bon retour ! Prêt à jouer ? 🎮', medium: 'Tu nous as manqué ! Jouons ! 🤗', long: 'Bonjour ! De nouvelles aventures t\'attendent ! 🌟' },
    de: { short: 'Willkommen zurück! Bereit zum Spielen? 🎮', medium: 'Du hast uns gefehlt! Lass uns spielen! 🤗', long: 'Hallo! Neue Abenteuer warten! 🌟' },
    it: { short: 'Bentornato! Pronto a giocare? 🎮', medium: 'Ci sei mancato! Giochiamo! 🤗', long: 'Ciao! Nuove avventure ti aspettano! 🌟' },
    ru: { short: 'С возвращением! Готов играть? 🎮', medium: 'Мы скучали! Давай играть! 🤗', long: 'Привет! Новые приключения ждут! 🌟' },
    zh: { short: '欢迎回来！准备好了吗？🎮', medium: '我们想你了！来玩吧！🤗', long: '你好！新冒险等着你！🌟' },
    ja: { short: 'おかえり！遊ぶ準備はいい？🎮', medium: '待ってたよ！遊ぼう！🤗', long: 'やあ！新しい冒険が待ってるよ！🌟' },
    ko: { short: '돌아왔구나! 게임할 준비됐어? 🎮', medium: '보고 싶었어! 같이 놀자! 🤗', long: '안녕! 새로운 모험이 기다려! 🌟' },
    hi: { short: 'वापसी पर स्वागत! खेलने के लिए तैयार? 🎮', medium: 'हम तुम्हें याद कर रहे थे! खेलते हैं! 🤗', long: 'नमस्ते! नए रोमांच इंतज़ार कर रहे हैं! 🌟' },
    tr: { short: 'Tekrar hoş geldin! Oynamaya hazır mısın? 🎮', medium: 'Seni özledik! Hadi oynayalım! 🤗', long: 'Merhaba! Yeni maceralar seni bekliyor! 🌟' },
    nl: { short: 'Welkom terug! Klaar om te spelen? 🎮', medium: 'We hebben je gemist! Laten we spelen! 🤗', long: 'Hallo! Nieuwe avonturen wachten! 🌟' },
    sv: { short: 'Välkommen tillbaka! Redo att spela? 🎮', medium: 'Vi saknade dig! Låt oss spela! 🤗', long: 'Hej! Nya äventyr väntar! 🌟' },
    pl: { short: 'Witaj z powrotem! Gotowy do gry? 🎮', medium: 'Tęskniliśmy! Zagrajmy! 🤗', long: 'Cześć! Nowe przygody czekają! 🌟' },
    uk: { short: 'З поверненням! Готовий грати? 🎮', medium: 'Ми сумували! Грайм! 🤗', long: 'Привіт! Нові пригоди чекають! 🌟' },
    id: { short: 'Selamat datang kembali! Siap bermain? 🎮', medium: 'Kami merindukanmu! Ayo main! 🤗', long: 'Halo! Petualangan baru menunggu! 🌟' },
    ms: { short: 'Selamat kembali! Sedia bermain? 🎮', medium: 'Kami rindu kamu! Jom main! 🤗', long: 'Hai! Pengembaraan baru menanti! 🌟' },
    th: { short: 'ยินดีต้อนรับกลับ! พร้อมเล่นหรือยัง? 🎮', medium: 'คิดถึงนะ! มาเล่นกัน! 🤗', long: 'สวัสดี! การผจญภัยใหม่รอคุณอยู่! 🌟' },
    vi: { short: 'Chào mừng trở lại! Sẵn sàng chơi chưa? 🎮', medium: 'Nhớ bạn lắm! Chơi nào! 🤗', long: 'Xin chào! Cuộc phiêu lưu mới đang chờ! 🌟' },
    fa: { short: 'خوش آمدی! آماده بازی هستی؟ 🎮', medium: 'دلمان برایت تنگ شده بود! بازی کنیم! 🤗', long: 'سلام! ماجراهای جدید منتظرت هستند! 🌟' },
    ur: { short: 'واپسی پر خوش آمدید! کھیلنے کو تیار؟ 🎮', medium: 'ہم نے آپ کو یاد کیا! چلو کھیلتے ہیں! 🤗', long: 'ہیلو! نئے مہم جوئی آپ کا انتظار کر رہے ہیں! 🌟' },
    bn: { short: 'ফিরে এসো! খেলতে তৈরি? 🎮', medium: 'তোমাকে মিস করেছি! চলো খেলি! 🤗', long: 'হ্যালো! নতুন অ্যাডভেঞ্চার অপেক্ষা করছে! 🌟' },
    sw: { short: 'Karibu tena! Tayari kucheza? 🎮', medium: 'Tulikukosa! Tucheze! 🤗', long: 'Habari! Matukio mapya yanakungoja! 🌟' },
  };

  const m = msgs[LANG] || msgs.en;
  if (hoursSinceLastPlay >= 168) return m.long;     // 7+ days
  if (hoursSinceLastPlay >= 48) return m.medium;     // 2+ days
  return m.short;
}
