/**
 * Gem Kingdom — boss.js
 * 10 Mini-Bosses (level 4 each world) + 10 World Bosses (level 9 each world)
 * Each boss has unique emoji, name, HP, phases, and attack patterns
 *
 * Exports: createBoss(worldIdx, levelIdx) → boss object
 */

import { LANG, OBSTACLE } from './config.js';

// ===== I18N HELPER =====
function L(translations) {
  return translations[LANG] || translations.en || translations.ar || '';
}

// ===== BOSS NAMES (25 languages) =====
const BOSS_NAMES = {
  mini: [
    // World 0
    { ar: 'الدودة الجائعة', en: 'Hungry Worm', pt: 'Verme Faminto', es: 'Gusano Hambriento', fr: 'Ver Affamé', de: 'Hungriger Wurm', it: 'Verme Affamato', ru: 'Голодный Червь', zh: '饥饿蠕虫', ja: 'はらぺこワーム', ko: '배고픈 벌레', hi: 'भूखा कीड़ा', tr: 'Aç Solucan', nl: 'Hongerige Worm', sv: 'Hungrig Mask', pl: 'Głodny Robak', uk: 'Голодний Хробак', id: 'Cacing Lapar', ms: 'Cacing Lapar', th: 'หนอนจอมหิว', vi: 'Sâu Đói', fa: 'کرم گرسنه', ur: 'بھوکا کیڑا', bn: 'ক্ষুধার্ত কীট', sw: 'Mdudu Mwenye Njaa' },
    // World 1
    { ar: 'السلطعون الغاضب', en: 'Angry Crab', pt: 'Caranguejo Furioso', es: 'Cangrejo Furioso', fr: 'Crabe Furieux', de: 'Wütende Krabbe', it: 'Granchio Furioso', ru: 'Злой Краб', zh: '愤怒螃蟹', ja: '怒りガニ', ko: '화난 게', hi: 'गुस्सैल केकड़ा', tr: 'Kızgın Yengeç', nl: 'Boze Krab', sv: 'Arg Krabba', pl: 'Zły Krab', uk: 'Злий Краб', id: 'Kepiting Marah', ms: 'Ketam Marah', th: 'ปูโกรธ', vi: 'Cua Giận Dữ', fa: 'خرچنگ عصبانی', ur: 'غصے والا کیکڑا', bn: 'রাগী কাঁকড়া', sw: 'Kaa Mwenye Hasira' },
    // World 2
    { ar: 'الحرباء الماكرة', en: 'Sneaky Chameleon', pt: 'Camaleão Traiçoeiro', es: 'Camaleón Astuto', fr: 'Caméléon Rusé', de: 'Listiges Chamäleon', it: 'Camaleonte Furbo', ru: 'Хитрый Хамелеон', zh: '狡猾变色龙', ja: 'ずるいカメレオン', ko: '교활한 카멜레온', hi: 'चालाक गिरगिट', tr: 'Kurnaz Bukalemun', nl: 'Sluwe Kameleon', sv: 'Listig Kameleont', pl: 'Przebiegły Kameleon', uk: 'Хитрий Хамелеон', id: 'Bunglon Licik', ms: 'Sesumpah Licik', th: 'กิ้งก่าเจ้าเล่ห์', vi: 'Tắc Kè Xảo Quyệt', fa: 'آفتاب‌پرست حیله‌گر', ur: 'چالاک گرگٹ', bn: 'ধূর্ত গিরগিটি', sw: 'Kinyonga Mjanja' },
    // World 3
    { ar: 'الأفعى السريعة', en: 'Swift Serpent', pt: 'Serpente Veloz', es: 'Serpiente Veloz', fr: 'Serpent Rapide', de: 'Flinke Schlange', it: 'Serpente Veloce', ru: 'Быстрый Змей', zh: '敏捷之蛇', ja: '迅速な蛇', ko: '빠른 뱀', hi: 'तेज़ सांप', tr: 'Hızlı Yılan', nl: 'Snelle Slang', sv: 'Snabb Orm', pl: 'Szybki Wąż', uk: 'Швидкий Змій', id: 'Ular Cepat', ms: 'Ular Pantas', th: 'งูเร็ว', vi: 'Rắn Nhanh', fa: 'مار سریع', ur: 'تیز سانپ', bn: 'দ্রুত সাপ', sw: 'Nyoka Mwepesi' },
    // World 4
    { ar: 'الغازي الفضائي', en: 'Space Invader', pt: 'Invasor Espacial', es: 'Invasor Espacial', fr: 'Envahisseur Spatial', de: 'Weltraum-Eindringling', it: 'Invasore Spaziale', ru: 'Космический Захватчик', zh: '太空侵略者', ja: 'スペースインベーダー', ko: '우주 침략자', hi: 'अंतरिक्ष आक्रमणकारी', tr: 'Uzay İstilacısı', nl: 'Ruimte-indringer', sv: 'Rymdinkräktare', pl: 'Najeźdźca z Kosmosu', uk: 'Космічний Загарбник', id: 'Penyerbu Luar Angkasa', ms: 'Penceroboh Angkasa', th: 'ผู้รุกรานอวกาศ', vi: 'Kẻ Xâm Lược Không Gian', fa: 'مهاجم فضایی', ur: 'خلائی حملہ آور', bn: 'মহাকাশ আক্রমণকারী', sw: 'Mvamizi wa Anga' },
    // World 5
    { ar: 'الخفاش المزعج', en: 'Noisy Bat', pt: 'Morcego Barulhento', es: 'Murciélago Ruidoso', fr: 'Chauve-souris Bruyante', de: 'Laute Fledermaus', it: 'Pipistrello Rumoroso', ru: 'Шумная Летучая Мышь', zh: '吵闹的蝙蝠', ja: 'うるさいコウモリ', ko: '시끄러운 박쥐', hi: 'शोरगुल चमगादड़', tr: 'Gürültücü Yarasa', nl: 'Luidruchtige Vleermuis', sv: 'Högljudd Fladdermus', pl: 'Hałaśliwy Nietoperz', uk: 'Гучний Кажан', id: 'Kelelawar Berisik', ms: 'Kelawar Bising', th: 'ค้างคาวเสียงดัง', vi: 'Dơi Ồn Ào', fa: 'خفاش پرسروصدا', ur: 'شور مچانے والا چمگادڑ', bn: 'কোলাহলকারী বাদুড়', sw: 'Popo Mwenye Kelele' },
    // World 6
    { ar: 'المصاصة الشريرة', en: 'Evil Lollipop', pt: 'Pirulito Malvado', es: 'Paleta Malvada', fr: 'Sucette Maléfique', de: 'Böser Lutscher', it: 'Lecca-lecca Malvagio', ru: 'Злой Леденец', zh: '邪恶棒棒糖', ja: '悪のキャンディ', ko: '사악한 롤리팝', hi: 'दुष्ट लॉलीपॉप', tr: 'Kötü Lolipop', nl: 'Boze Lolly', sv: 'Ond Klubba', pl: 'Zły Lizak', uk: 'Злий Льодяник', id: 'Lolipop Jahat', ms: 'Lolipop Jahat', th: 'อมยิ้มชั่วร้าย', vi: 'Kẹo Mút Ác', fa: 'آبنبات شیطانی', ur: 'بری لالی پاپ', bn: 'খারাপ ললিপপ', sw: 'Peremende Mbaya' },
    // World 7
    { ar: 'الجرثومة المتحولة', en: 'Mutant Germ', pt: 'Germe Mutante', es: 'Germen Mutante', fr: 'Germe Mutant', de: 'Mutanten-Keim', it: 'Germe Mutante', ru: 'Мутант-Микроб', zh: '变异细菌', ja: '変異バクテリア', ko: '돌연변이 세균', hi: 'उत्परिवर्ती कीटाणु', tr: 'Mutant Mikrop', nl: 'Mutant Kiem', sv: 'Mutant Bakterie', pl: 'Zmutowany Zarazek', uk: 'Мутант-Мікроб', id: 'Kuman Mutan', ms: 'Kuman Mutan', th: 'เชื้อโรคกลายพันธุ์', vi: 'Vi Khuẩn Đột Biến', fa: 'میکروب جهش‌یافته', ur: 'تبدیل شدہ جرثومہ', bn: 'পরিবর্তিত জীবাণু', sw: 'Vijidudu vya Mutant' },
    // World 8
    { ar: 'الكتاب الملعون', en: 'Cursed Book', pt: 'Livro Amaldiçoado', es: 'Libro Maldito', fr: 'Livre Maudit', de: 'Verfluchtes Buch', it: 'Libro Maledetto', ru: 'Проклятая Книга', zh: '被诅咒的书', ja: '呪われた本', ko: '저주받은 책', hi: 'शापित किताब', tr: 'Lanetli Kitap', nl: 'Vervloekt Boek', sv: 'Förbannad Bok', pl: 'Przeklęta Książka', uk: 'Проклята Книга', id: 'Buku Terkutuk', ms: 'Buku Terkutuk', th: 'หนังสือสาปแช่ง', vi: 'Sách Bị Nguyền', fa: 'کتاب نفرین‌شده', ur: 'لعنتی کتاب', bn: 'অভিশপ্ত বই', sw: 'Kitabu Kilicholaaniwa' },
    // World 9
    { ar: 'الحارس الآلي', en: 'Robot Guard', pt: 'Guarda Robô', es: 'Guardia Robot', fr: 'Garde Robot', de: 'Roboter-Wache', it: 'Guardia Robot', ru: 'Робот-Страж', zh: '机器人卫兵', ja: 'ロボットガード', ko: '로봇 경비원', hi: 'रोबोट गार्ड', tr: 'Robot Muhafız', nl: 'Robot Bewaker', sv: 'Robot Vakt', pl: 'Robot Strażnik', uk: 'Робот-Вартовий', id: 'Penjaga Robot', ms: 'Pengawal Robot', th: 'หุ่นยนต์รักษาการณ์', vi: 'Vệ Binh Robot', fa: 'نگهبان ربات', ur: 'روبوٹ محافظ', bn: 'রোবট প্রহরী', sw: 'Mlinzi wa Roboti' },
  ],
  world: [
    // World 0
    { ar: 'تنين الفاكهة', en: 'Fruit Dragon', pt: 'Dragão das Frutas', es: 'Dragón Frutal', fr: 'Dragon des Fruits', de: 'Frucht-Drache', it: 'Drago della Frutta', ru: 'Фруктовый Дракон', zh: '水果龙', ja: 'フルーツドラゴン', ko: '과일 드래곤', hi: 'फल ड्रैगन', tr: 'Meyve Ejderhası', nl: 'Fruitdraak', sv: 'Fruktdrake', pl: 'Owocowy Smok', uk: 'Фруктовий Дракон', id: 'Naga Buah', ms: 'Naga Buah', th: 'มังกรผลไม้', vi: 'Rồng Trái Cây', fa: 'اژدهای میوه', ur: 'پھل کا ڈریگن', bn: 'ফল ড্রাগন', sw: 'Joka wa Matunda' },
    // World 1
    { ar: 'الأخطبوط العملاق', en: 'Giant Octopus', pt: 'Polvo Gigante', es: 'Pulpo Gigante', fr: 'Pieuvre Géante', de: 'Riesen-Krake', it: 'Polpo Gigante', ru: 'Гигантский Осьминог', zh: '巨型章鱼', ja: '巨大タコ', ko: '거대 문어', hi: 'विशाल ऑक्टोपस', tr: 'Dev Ahtapot', nl: 'Reuzinktvis', sv: 'Jättebläckfisk', pl: 'Gigantyczna Ośmiornica', uk: 'Гігантський Восьминіг', id: 'Gurita Raksasa', ms: 'Sotong Gergasi', th: 'ปลาหมึกยักษ์', vi: 'Bạch Tuộc Khổng Lồ', fa: 'اختاپوس غول‌پیکر', ur: 'دیو ہشت پا', bn: 'দৈত্য অক্টোপাস', sw: 'Pweza Mkubwa' },
    // World 2
    { ar: 'الطاووس الملون', en: 'Chromatic Peacock', pt: 'Pavão Cromático', es: 'Pavo Cromático', fr: 'Paon Chromatique', de: 'Chromatischer Pfau', it: 'Pavone Cromatico', ru: 'Хроматический Павлин', zh: '彩虹孔雀', ja: 'クロマティック孔雀', ko: '색채 공작', hi: 'रंगीन मोर', tr: 'Renkli Tavuskuşu', nl: 'Chromatische Pauw', sv: 'Kromatisk Påfågel', pl: 'Chromatyczny Paw', uk: 'Хроматичний Павич', id: 'Merak Kromatik', ms: 'Merak Kromatik', th: 'นกยูงสีรุ้ง', vi: 'Công Sắc Màu', fa: 'طاووس رنگارنگ', ur: 'رنگین مور', bn: 'রঙিন ময়ূর', sw: 'Tausi wa Rangi' },
    // World 3
    { ar: 'ملك الغابة', en: 'Jungle King', pt: 'Rei da Selva', es: 'Rey de la Selva', fr: 'Roi de la Jungle', de: 'Dschungelkönig', it: 'Re della Giungla', ru: 'Король Джунглей', zh: '丛林之王', ja: 'ジャングルの王', ko: '정글의 왕', hi: 'जंगल का राजा', tr: 'Orman Kralı', nl: 'Junglekoning', sv: 'Djungelkung', pl: 'Król Dżungli', uk: 'Король Джунглів', id: 'Raja Hutan', ms: 'Raja Hutan', th: 'ราชาแห่งป่า', vi: 'Vua Rừng', fa: 'پادشاه جنگل', ur: 'جنگل کا بادشاہ', bn: 'জঙ্গলের রাজা', sw: 'Mfalme wa Msitu' },
    // World 4
    { ar: 'سفينة الغزو', en: 'Invasion Ship', pt: 'Nave Invasora', es: 'Nave Invasora', fr: 'Vaisseau Envahisseur', de: 'Invasionsschiff', it: 'Nave Invasore', ru: 'Корабль Вторжения', zh: '入侵飞船', ja: '侵略船', ko: '침략선', hi: 'आक्रमण जहाज', tr: 'İstila Gemisi', nl: 'Invasieschip', sv: 'Invasionsskepp', pl: 'Statek Inwazyjny', uk: 'Корабель Вторгнення', id: 'Kapal Invasi', ms: 'Kapal Pencerobohan', th: 'ยานบุกรุก', vi: 'Tàu Xâm Lược', fa: 'کشتی مهاجم', ur: 'حملہ آور جہاز', bn: 'আক্রমণ জাহাজ', sw: 'Meli ya Uvamizi' },
    // World 5
    { ar: 'القناع المسكون', en: 'Haunted Mask', pt: 'Máscara Assombrada', es: 'Máscara Embrujada', fr: 'Masque Hanté', de: 'Spukmaske', it: 'Maschera Stregata', ru: 'Проклятая Маска', zh: '闹鬼面具', ja: '呪いの仮面', ko: '귀신 가면', hi: 'भूतिया मुखौटा', tr: 'Lanetli Maske', nl: 'Spookmasker', sv: 'Hemsökt Mask', pl: 'Nawiedziona Maska', uk: 'Прокляна Маска', id: 'Topeng Berhantu', ms: 'Topeng Berhantu', th: 'หน้ากากผีสิง', vi: 'Mặt Nạ Ma', fa: 'ماسک تسخیرشده', ur: 'بھوتیا نقاب', bn: 'ভূতুড়ে মুখোশ', sw: 'Mask ya Mzimu' },
    // World 6
    { ar: 'قرع الحلوى', en: 'Candy Pumpkin', pt: 'Abóbora de Doces', es: 'Calabaza de Dulces', fr: 'Citrouille Sucrée', de: 'Süßigkeiten-Kürbis', it: 'Zucca di Dolci', ru: 'Конфетная Тыква', zh: '糖果南瓜', ja: 'キャンディパンプキン', ko: '사탕 호박', hi: 'कैंडी कद्दू', tr: 'Şeker Balkabağı', nl: 'Snoeppompoen', sv: 'Godispumpa', pl: 'Cukierkowa Dynia', uk: 'Цукерковий Гарбуз', id: 'Labu Permen', ms: 'Labu Gula-gula', th: 'ฟักทองลูกกวาด', vi: 'Bí Ngô Kẹo', fa: 'کدوی آبنباتی', ur: 'کینڈی کدو', bn: 'ক্যান্ডি কুমড়া', sw: 'Boga la Pipi' },
    // World 7
    { ar: 'وحش المختبر', en: 'Lab Monster', pt: 'Monstro do Lab', es: 'Monstruo del Lab', fr: 'Monstre du Labo', de: 'Labormonster', it: 'Mostro del Lab', ru: 'Лабораторное Чудовище', zh: '实验室怪物', ja: 'ラボモンスター', ko: '실험실 괴물', hi: 'प्रयोगशाला राक्षस', tr: 'Laboratuvar Canavarı', nl: 'Labmonster', sv: 'Labbmonster', pl: 'Potwór z Laboratorium', uk: 'Лабораторне Чудовисько', id: 'Monster Lab', ms: 'Raksasa Makmal', th: 'สัตว์ประหลาดในห้องทดลอง', vi: 'Quái Vật Phòng Thí Nghiệm', fa: 'هیولای آزمایشگاه', ur: 'لیب کا عفریت', bn: 'ল্যাব দানব', sw: 'Jitu la Maabara' },
    // World 8
    { ar: 'شبح المكتبة', en: 'Library Ghost', pt: 'Fantasma da Biblioteca', es: 'Fantasma de Biblioteca', fr: 'Fantôme de Bibliothèque', de: 'Bibliotheksgeist', it: 'Fantasma della Biblioteca', ru: 'Библиотечное Привидение', zh: '图书馆幽灵', ja: '図書館の幽霊', ko: '도서관 유령', hi: 'पुस्तकालय भूत', tr: 'Kütüphane Hayaleti', nl: 'Bibliotheekgeest', sv: 'Biblioteksspöke', pl: 'Duch Biblioteczny', uk: 'Бібліотечний Привид', id: 'Hantu Perpustakaan', ms: 'Hantu Perpustakaan', th: 'ผีห้องสมุด', vi: 'Ma Thư Viện', fa: 'شبح کتابخانه', ur: 'لائبریری کا بھوت', bn: 'গ্রন্থাগার ভূত', sw: 'Mzimu wa Maktaba' },
    // World 9 — FINAL BOSS
    { ar: 'ملك الظلام', en: 'Shadow King', pt: 'Rei das Sombras', es: 'Rey de las Sombras', fr: 'Roi des Ombres', de: 'Schattenkönig', it: 'Re delle Ombre', ru: 'Король Теней', zh: '暗影之王', ja: 'シャドウキング', ko: '그림자 왕', hi: 'छाया सम्राट', tr: 'Gölge Kralı', nl: 'Schaduwkoning', sv: 'Skuggkung', pl: 'Król Cieni', uk: 'Тіньовий Король', id: 'Raja Bayangan', ms: 'Raja Bayang', th: 'ราชาเงา', vi: 'Vua Bóng Tối', fa: 'پادشاه سایه', ur: 'سائے کا بادشاہ', bn: 'ছায়া রাজা', sw: 'Mfalme wa Vivuli' },
  ],
};

// ===== BOSS DEFINITIONS =====
const MINI_BOSSES = [
  { emoji: '🐛', hp: 80, maxPhase: 1, attackInterval: 4, attacks: ['ice'] },
  { emoji: '🦀', hp: 100, maxPhase: 1, attackInterval: 4, attacks: ['ice', 'chain'] },
  { emoji: '🦎', hp: 110, maxPhase: 1, attackInterval: 3, attacks: ['chain', 'shuffle'] },
  { emoji: '🐍', hp: 120, maxPhase: 1, attackInterval: 3, attacks: ['stone', 'ice'] },
  { emoji: '👾', hp: 130, maxPhase: 1, attackInterval: 3, attacks: ['dark', 'ice'] },
  { emoji: '🦇', hp: 130, maxPhase: 1, attackInterval: 3, attacks: ['bomb', 'dark'] },
  { emoji: '🍭', hp: 140, maxPhase: 1, attackInterval: 3, attacks: ['chain', 'portal'] },
  { emoji: '🧫', hp: 140, maxPhase: 1, attackInterval: 3, attacks: ['shadow', 'lock'] },
  { emoji: '📖', hp: 150, maxPhase: 1, attackInterval: 3, attacks: ['cage', 'shadow'] },
  { emoji: '🤖', hp: 150, maxPhase: 1, attackInterval: 3, attacks: ['stone', 'dark', 'bomb'] },
];

const WORLD_BOSSES = [
  { emoji: '🐲', hp: 200, maxPhase: 2, attackInterval: 4, phaseThresholds: [0.5], attacks: { 1: ['ice', 'ice'], 2: ['ice', 'chain', 'dark'] } },
  { emoji: '🐙', hp: 250, maxPhase: 2, phaseThresholds: [0.5], attackInterval: 4, attacks: { 1: ['ice', 'chain'], 2: ['ice', 'chain', 'dark'] } },
  { emoji: '🦚', hp: 280, maxPhase: 2, phaseThresholds: [0.5], attackInterval: 4, attacks: { 1: ['chain', 'shuffle'], 2: ['chain', 'stone', 'dark'] } },
  { emoji: '🦁', hp: 300, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 4, attacks: { 1: ['stone'], 2: ['stone', 'ice'], 3: ['stone', 'chain', 'dark'] } },
  { emoji: '🛸', hp: 330, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3, attacks: { 1: ['dark', 'ice'], 2: ['dark', 'bomb'], 3: ['dark', 'bomb', 'stone'] } },
  { emoji: '🎭', hp: 350, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3, attacks: { 1: ['bomb', 'ice'], 2: ['bomb', 'dark'], 3: ['bomb', 'dark', 'shadow'] } },
  { emoji: '🎃', hp: 380, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3, attacks: { 1: ['chain', 'portal'], 2: ['chain', 'bomb'], 3: ['chain', 'bomb', 'shadow'] } },
  { emoji: '🧟', hp: 400, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3, attacks: { 1: ['shadow', 'ice'], 2: ['shadow', 'lock', 'stone'], 3: ['shadow', 'lock', 'bomb', 'dark'] } },
  { emoji: '👻', hp: 450, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3, attacks: { 1: ['cage', 'ice'], 2: ['cage', 'shadow', 'chain'], 3: ['cage', 'shadow', 'bomb', 'dark'] } },
  { emoji: '👑', hp: 500, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3, attacks: { 1: ['stone', 'dark', 'ice'], 2: ['shadow', 'bomb', 'chain'], 3: ['shadow', 'bomb', 'stone', 'dark', 'lock'] } },
];

// ===== ATTACK EFFECT MAPPING =====
// Each attack type converts to an obstacle type on random empty cells
const ATTACK_MAP = {
  ice:     { obstacle: OBSTACLE.ICE_1,      count: 3, hp: 1 },
  chain:   { obstacle: OBSTACLE.CHAIN,      count: 2, hp: 1 },
  stone:   { obstacle: OBSTACLE.STONE,      count: 2, hp: 2 },
  dark:    { obstacle: OBSTACLE.DARK,       count: 3, hp: 1 },
  lock:    { obstacle: OBSTACLE.LOCK,       count: 2, hp: 1 },
  bomb:    { obstacle: OBSTACLE.BOMB_TIMER, count: 2, hp: 1 },
  shadow:  { obstacle: OBSTACLE.SHADOW,     count: 3, hp: 1 },
  cage:    { obstacle: OBSTACLE.CAGE,       count: 2, hp: 1 },
  portal:  { obstacle: OBSTACLE.PORTAL,     count: 2, hp: 1 },
  shuffle: { obstacle: -1,                  count: 0, hp: 0 },
};

// ===== BOSS CREATION =====
export function createBoss(worldIdx, levelIdx) {
  const isMiniBoss = levelIdx === 4;
  const isBoss = levelIdx === 9;

  if (!isMiniBoss && !isBoss) return null;

  const def = isMiniBoss ? MINI_BOSSES[worldIdx] : WORLD_BOSSES[worldIdx];
  if (!def) return null;

  const names = isMiniBoss ? BOSS_NAMES.mini[worldIdx] : BOSS_NAMES.world[worldIdx];
  const bossName = L(names);

  return {
    active: true,
    defeated: false,
    emoji: def.emoji,
    name: bossName,
    hp: def.hp,
    maxHP: def.hp,
    phase: 1,
    maxPhase: def.maxPhase,
    phaseThresholds: def.phaseThresholds || [],
    attackInterval: def.attackInterval,
    attackTimer: def.attackInterval,
    isAttacking: false,
    attacks: def.attacks,
    worldIdx,
    isFinal: worldIdx === 9 && isBoss,
  };
}

/**
 * Get the attack pattern for a boss's current phase
 * Returns an array of obstacle-adding instructions
 */
export function getBossAttack(boss) {
  if (!boss || boss.defeated) return [];

  // Determine current phase based on HP thresholds
  const hpPct = boss.hp / boss.maxHP;
  let phase = 1;
  if (boss.phaseThresholds) {
    for (let i = 0; i < boss.phaseThresholds.length; i++) {
      if (hpPct <= boss.phaseThresholds[i]) phase = i + 2;
    }
  }

  // Update phase
  if (phase > boss.phase) {
    boss.phase = phase;
  }

  // Get attacks for current phase
  let attackList;
  if (Array.isArray(boss.attacks)) {
    // Mini-boss: simple array
    attackList = boss.attacks;
  } else {
    // World boss: phase-based
    attackList = boss.attacks[boss.phase] || boss.attacks[1] || [];
  }

  // Convert attack names to obstacle instructions
  const result = [];
  for (const atk of attackList) {
    const mapping = ATTACK_MAP[atk];
    if (!mapping) continue;

    if (atk === 'shuffle') {
      result.push({ type: 'shuffle' });
    } else {
      // Scale count with phase
      const extraCount = boss.phase > 1 ? Math.ceil((boss.phase - 1) * 0.5) : 0;
      result.push({
        type: 'obstacle',
        obstacle: mapping.obstacle,
        count: mapping.count + extraCount,
        hp: mapping.hp,
      });
    }
  }

  return result;
}

/**
 * Get boss taunt text for current phase
 */
export function getBossTaunt(boss) {
  if (!boss) return '';
  const phase = boss.phase || 1;
  const taunts = {
    1: {
      ar: ['لن تهزمني! 💪', 'حان دوري! ⚡', 'خذ هذا! 💥'],
      en: ["You can't beat me! 💪", "My turn! ⚡", "Take this! 💥"],
      pt: ['Você não pode me vencer! 💪', 'Minha vez! ⚡', 'Tome isso! 💥'],
      es: ['¡No puedes vencerme! 💪', '¡Mi turno! ⚡', '¡Toma esto! 💥'],
      fr: ['Tu ne peux pas me battre ! 💪', 'À mon tour ! ⚡', 'Prends ça ! 💥'],
      de: ['Du kannst mich nicht besiegen! 💪', 'Ich bin dran! ⚡', 'Nimm das! 💥'],
      it: ['Non puoi battermi! 💪', 'Tocca a me! ⚡', 'Prendi questo! 💥'],
      ru: ['Тебе меня не победить! 💪', 'Мой ход! ⚡', 'Получай! 💥'],
      zh: ['你打不过我！💪', '轮到我了！⚡', '接招！💥'],
      ja: ['僕には勝てないよ！💪', '僕の番だ！⚡', 'これでも食らえ！💥'],
      ko: ['날 이길 수 없어! 💪', '내 차례다! ⚡', '받아라! 💥'],
      hi: ['तुम मुझे नहीं हरा सकते! 💪', 'मेरी बारी! ⚡', 'ये लो! 💥'],
      tr: ['Beni yenemezsin! 💪', 'Sıra bende! ⚡', 'Al bunu! 💥'],
      nl: ['Je kunt me niet verslaan! 💪', 'Mijn beurt! ⚡', 'Neem dit! 💥'],
      sv: ['Du kan inte slå mig! 💪', 'Min tur! ⚡', 'Ta det här! 💥'],
      pl: ['Nie pokonasz mnie! 💪', 'Moja kolej! ⚡', 'Masz to! 💥'],
      uk: ['Тобі мене не перемогти! 💪', 'Мій хід! ⚡', 'Отримай! 💥'],
      id: ['Kamu tak bisa mengalahkanku! 💪', 'Giliranku! ⚡', 'Terima ini! 💥'],
      ms: ['Kamu tak boleh kalahkan aku! 💪', 'Giliran aku! ⚡', 'Ambil ini! 💥'],
      th: ['เจ้าชนะข้าไม่ได้! 💪', 'ตาข้า! ⚡', 'รับนี่ไป! 💥'],
      vi: ['Ngươi không thể thắng ta! 💪', 'Lượt của ta! ⚡', 'Hứng này! 💥'],
      fa: ['نمی‌توانی مرا شکست بدهی! 💪', 'نوبت من است! ⚡', 'بگیر! 💥'],
      ur: ['تم مجھے نہیں ہرا سکتے! 💪', 'میری باری! ⚡', 'یہ لو! 💥'],
      bn: ['তুমি আমাকে হারাতে পারবে না! 💪', 'আমার পালা! ⚡', 'এটা নাও! 💥'],
      sw: ['Huwezi kunishinda! 💪', 'Zamu yangu! ⚡', 'Chukua hii! 💥'],
    },
    2: {
      ar: ['أنت قوي... لكنني أقوى! 🔥', 'لا تظن أنك فزت! 😤', 'هذا ليس شكلي النهائي! 👿'],
      en: ["You're strong... but I'm stronger! 🔥", "Don't think you've won! 😤", "This isn't my final form! 👿"],
      pt: ['Você é forte... mas eu sou mais! 🔥', 'Não pense que venceu! 😤', 'Esta não é minha forma final! 👿'],
      es: ['Eres fuerte... ¡pero yo más! 🔥', '¡No creas que ganaste! 😤', '¡Esta no es mi forma final! 👿'],
      fr: ['Tu es fort... mais je suis plus fort ! 🔥', 'Ne crois pas avoir gagné ! 😤', "Ce n'est pas ma forme finale ! 👿"],
      de: ['Du bist stark... aber ich stärker! 🔥', 'Glaub nicht, du hast gewonnen! 😤', 'Das ist nicht meine finale Form! 👿'],
      it: ['Sei forte... ma io di più! 🔥', 'Non pensare di aver vinto! 😤', 'Questa non è la mia forma finale! 👿'],
      ru: ['Ты силён... но я сильнее! 🔥', 'Не думай, что победил! 😤', 'Это не моя финальная форма! 👿'],
      zh: ['你很强…但我更强！🔥', '别以为你赢了！😤', '这不是我的最终形态！👿'],
      ja: ['強いな…でも僕の方が強い！🔥', '勝ったと思うな！😤', 'これは最終形態じゃない！👿'],
      ko: ['강하군... 하지만 나는 더 강해! 🔥', '이겼다고 생각하지 마! 😤', '이건 내 최종 형태가 아니야! 👿'],
      hi: ['तुम मज़बूत हो... पर मैं और मज़बूत! 🔥', 'जीत गए समझ मत लेना! 😤', 'यह मेरा अंतिम रूप नहीं! 👿'],
      tr: ['Güçlüsün... ama ben daha güçlüyüm! 🔥', 'Kazandığını sanma! 😤', 'Bu benim son halim değil! 👿'],
      nl: ['Je bent sterk... maar ik sterker! 🔥', 'Denk niet dat je gewonnen hebt! 😤', 'Dit is niet mijn finale vorm! 👿'],
      sv: ['Du är stark... men jag starkare! 🔥', 'Tro inte att du vunnit! 😤', 'Det här är inte min slutgiltiga form! 👿'],
      pl: ['Jesteś silny... ale ja silniejszy! 🔥', 'Nie myśl, że wygrałeś! 😤', 'To nie moja ostateczna forma! 👿'],
      uk: ['Ти сильний... але я сильніший! 🔥', 'Не думай, що переміг! 😤', 'Це не моя фінальна форма! 👿'],
      id: ['Kamu kuat... tapi aku lebih kuat! 🔥', 'Jangan pikir kamu menang! 😤', 'Ini bukan bentuk terakhirku! 👿'],
      ms: ['Kamu kuat... tapi aku lebih kuat! 🔥', 'Jangan ingat kamu menang! 😤', 'Ini bukan bentuk akhir aku! 👿'],
      th: ['แกแข็งแกร่ง... แต่ข้าแกร่งกว่า! 🔥', 'อย่าคิดว่าชนะแล้ว! 😤', 'นี่ไม่ใช่ร่างสุดท้ายของข้า! 👿'],
      vi: ['Ngươi mạnh... nhưng ta mạnh hơn! 🔥', 'Đừng tưởng đã thắng! 😤', 'Đây chưa phải dạng cuối của ta! 👿'],
      fa: ['قوی هستی... اما من قوی‌ترم! 🔥', 'فکر نکن بردی! 😤', 'این شکل نهایی من نیست! 👿'],
      ur: ['تم مضبوط ہو... لیکن میں زیادہ! 🔥', 'یہ نہ سمجھو کہ جیت گئے! 😤', 'یہ میری آخری شکل نہیں! 👿'],
      bn: ['তুমি শক্তিশালী... কিন্তু আমি আরও! 🔥', 'জিতেছ ভেবো না! 😤', 'এটা আমার চূড়ান্ত রূপ নয়! 👿'],
      sw: ['Wewe ni hodari... lakini mimi zaidi! 🔥', 'Usidhani umeshinda! 😤', 'Hii si sura yangu ya mwisho! 👿'],
    },
    3: {
      ar: ['كفى! سأدمر كل شيء! 💀', 'لن أسامحك! ⚡⚡', 'اشعر بقوتي الحقيقية! 🌋'],
      en: ["Enough! I'll destroy everything! 💀", "I won't forgive you! ⚡⚡", "Feel my true power! 🌋"],
      pt: ['Chega! Vou destruir tudo! 💀', 'Não vou perdoar! ⚡⚡', 'Sinta meu verdadeiro poder! 🌋'],
      es: ['¡Basta! ¡Lo destruiré todo! 💀', '¡No te perdonaré! ⚡⚡', '¡Siente mi verdadero poder! 🌋'],
      fr: ['Assez ! Je vais tout détruire ! 💀', 'Je ne te pardonnerai pas ! ⚡⚡', 'Ressens mon vrai pouvoir ! 🌋'],
      de: ['Genug! Ich zerstöre alles! 💀', 'Ich verzeihe dir nicht! ⚡⚡', 'Spüre meine wahre Kraft! 🌋'],
      it: ['Basta! Distruggerò tutto! 💀', 'Non ti perdonerò! ⚡⚡', 'Senti il mio vero potere! 🌋'],
      ru: ['Хватит! Я уничтожу всё! 💀', 'Я не прощу тебя! ⚡⚡', 'Почувствуй мою истинную силу! 🌋'],
      zh: ['够了！我要毁灭一切！💀', '我不会原谅你！⚡⚡', '感受我真正的力量！🌋'],
      ja: ['もう許さない！全てを壊す！💀', '絶対に許さない！⚡⚡', '真の力を見せてやる！🌋'],
      ko: ['그만! 다 부숴버리겠어! 💀', '용서하지 않겠다! ⚡⚡', '진정한 힘을 느껴라! 🌋'],
      hi: ['बस! सब कुछ मिटा दूंगा! 💀', 'तुम्हें माफ़ नहीं करूंगा! ⚡⚡', 'मेरी असली ताकत महसूस करो! 🌋'],
      tr: ['Yeter! Her şeyi yok edeceğim! 💀', 'Seni affetmeyeceğim! ⚡⚡', 'Gerçek gücümü hisset! 🌋'],
      nl: ['Genoeg! Ik vernietig alles! 💀', 'Ik vergeef je niet! ⚡⚡', 'Voel mijn ware kracht! 🌋'],
      sv: ['Nog! Jag förstör allt! 💀', 'Jag förlåter dig inte! ⚡⚡', 'Känn min sanna kraft! 🌋'],
      pl: ['Dość! Zniszczę wszystko! 💀', 'Nie wybaczę ci! ⚡⚡', 'Poczuj moją prawdziwą moc! 🌋'],
      uk: ['Досить! Я знищу все! 💀', 'Я не пробачу тобі! ⚡⚡', 'Відчуй мою справжню силу! 🌋'],
      id: ['Cukup! Aku akan hancurkan semuanya! 💀', 'Takkan kumaafkan! ⚡⚡', 'Rasakan kekuatan sejatiku! 🌋'],
      ms: ['Cukup! Aku hancurkan semuanya! 💀', 'Aku tak akan maafkan! ⚡⚡', 'Rasai kuasa sebenar aku! 🌋'],
      th: ['พอแล้ว! ข้าจะทำลายทุกอย่าง! 💀', 'ข้าจะไม่ให้อภัย! ⚡⚡', 'จงรับรู้พลังที่แท้จริงของข้า! 🌋'],
      vi: ['Đủ rồi! Ta sẽ hủy diệt tất cả! 💀', 'Ta sẽ không tha! ⚡⚡', 'Hãy cảm nhận sức mạnh thật sự! 🌋'],
      fa: ['بس است! همه چیز را نابود می‌کنم! 💀', 'تو را نمی‌بخشم! ⚡⚡', 'قدرت واقعی مرا حس کن! 🌋'],
      ur: ['بس! میں سب کچھ تباہ کر دوں گا! 💀', 'تمہیں معاف نہیں کروں گا! ⚡⚡', 'میری اصل طاقت محسوس کرو! 🌋'],
      bn: ['যথেষ্ট! সব ধ্বংস করব! 💀', 'তোমাকে ক্ষমা করব না! ⚡⚡', 'আমার আসল শক্তি অনুভব কর! 🌋'],
      sw: ['Basi! Nitaharibu kila kitu! 💀', 'Sitakusamehe! ⚡⚡', 'Jisikie nguvu yangu halisi! 🌋'],
    },
  };

  const phaseTaunts = taunts[phase] || taunts[1];
  const langTaunts = phaseTaunts[LANG] || phaseTaunts.en;
  return langTaunts[Math.floor(Math.random() * langTaunts.length)];
}
