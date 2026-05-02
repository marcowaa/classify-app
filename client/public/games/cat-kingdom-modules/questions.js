/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Questions Bank
   500+ questions across 10 subjects
   Each question: { q, options, answer, hint?, emoji? }
   ═══════════════════════════════════════════════════════════════ */

import { LANG, L } from './i18n.js';

/* ═══════════════════════════
   WORLD 1 — Colors & Shapes
   ═══════════════════════════ */
const COLORS_SHAPES = [
  { q: () => L('ما لون الشمس؟ ☀️', 'What color is the sun? ☀️', 'Qual é a cor do sol? ☀️'), options: () => [L('أصفر','Yellow','Amarelo'), L('أزرق','Blue','Azul'), L('أحمر','Red','Vermelho'), L('أخضر','Green','Verde')], answer: 0, emoji: '☀️' },
  { q: () => L('ما لون السماء؟ 🌤️', 'What color is the sky? 🌤️', 'Qual é a cor do céu? 🌤️'), options: () => [L('أزرق','Blue','Azul'), L('أخضر','Green','Verde'), L('برتقالي','Orange','Laranja'), L('بنفسجي','Purple','Roxo')], answer: 0, emoji: '🌤️' },
  { q: () => L('ما لون العشب؟ 🌿', 'What color is grass? 🌿', 'Qual é a cor da grama? 🌿'), options: () => [L('أخضر','Green','Verde'), L('أصفر','Yellow','Amarelo'), L('أزرق','Blue','Azul'), L('أحمر','Red','Vermelho')], answer: 0, emoji: '🌿' },
  { q: () => L('ما لون الفراولة؟ 🍓', 'What color is a strawberry? 🍓', 'Qual é a cor do morango? 🍓'), options: () => [L('أحمر','Red','Vermelho'), L('أزرق','Blue','Azul'), L('أخضر','Green','Verde'), L('أصفر','Yellow','Amarelo')], answer: 0, emoji: '🍓' },
  { q: () => L('ما لون البرتقالة؟ 🍊', 'What color is an orange? 🍊', 'Qual a cor da laranja? 🍊'), options: () => [L('برتقالي','Orange','Laranja'), L('أصفر','Yellow','Amarelo'), L('أحمر','Red','Vermelho'), L('أخضر','Green','Verde')], answer: 0, emoji: '🍊' },
  { q: () => L('ما لون الباذنجان؟ 🍆', 'What color is an eggplant? 🍆', 'Qual a cor da berinjela? 🍆'), options: () => [L('بنفسجي','Purple','Roxo'), L('أحمر','Red','Vermelho'), L('أخضر','Green','Verde'), L('أصفر','Yellow','Amarelo')], answer: 0, emoji: '🍆' },
  { q: () => L('ما لون الثلج؟ ❄️', 'What color is snow? ❄️', 'Qual é a cor da neve? ❄️'), options: () => [L('أبيض','White','Branco'), L('أزرق','Blue','Azul'), L('رمادي','Gray','Cinza'), L('أصفر','Yellow','Amarelo')], answer: 0, emoji: '❄️' },
  { q: () => L('ما لون الموز؟ 🍌', 'What color is a banana? 🍌', 'Qual é a cor da banana? 🍌'), options: () => [L('أصفر','Yellow','Amarelo'), L('أخضر','Green','Verde'), L('أحمر','Red','Vermelho'), L('برتقالي','Orange','Laranja')], answer: 0, emoji: '🍌' },
  { q: () => L('ما هذا الشكل؟ ⬜', 'What shape is this? ⬜', 'Qual é esta forma? ⬜'), options: () => [L('مربع','Square','Quadrado'), L('دائرة','Circle','Círculo'), L('مثلث','Triangle','Triângulo'), L('مستطيل','Rectangle','Retângulo')], answer: 0, emoji: '⬜' },
  { q: () => L('ما هذا الشكل؟ 🔴', 'What shape is this? 🔴', 'Qual é esta forma? 🔴'), options: () => [L('دائرة','Circle','Círculo'), L('مربع','Square','Quadrado'), L('مثلث','Triangle','Triângulo'), L('نجمة','Star','Estrela')], answer: 0, emoji: '🔴' },
  { q: () => L('ما هذا الشكل؟ 🔺', 'What shape is this? 🔺', 'Qual é esta forma? 🔺'), options: () => [L('مثلث','Triangle','Triângulo'), L('مربع','Square','Quadrado'), L('دائرة','Circle','Círculo'), L('معين','Diamond','Diamante')], answer: 0, emoji: '🔺' },
  { q: () => L('كم ضلع للمثلث؟', 'How many sides does a triangle have?', 'Quantos lados tem um triângulo?'), options: () => ['3', '4', '5', '6'], answer: 0, emoji: '🔺' },
  { q: () => L('كم ضلع للمربع؟', 'How many sides does a square have?', 'Quantos lados tem um quadrado?'), options: () => ['4','3','5','6'], answer: 0, emoji: '⬜' },
  { q: () => L('ما لون الشوكولاتة؟ 🍫', 'What color is chocolate? 🍫', 'Qual é a cor do chocolate? 🍫'), options: () => [L('بني','Brown','Marrom'), L('أسود','Black','Preto'), L('أحمر','Red','Vermelho'), L('أصفر','Yellow','Amarelo')], answer: 0, emoji: '🍫' },
  { q: () => L('ما لون الليمون؟ 🍋', 'What color is a lemon? 🍋', 'Qual é a cor do limão? 🍋'), options: () => [L('أصفر','Yellow','Amarelo'), L('أخضر','Green','Verde'), L('برتقالي','Orange','Laranja'), L('أحمر','Red','Vermelho')], answer: 0, emoji: '🍋' },
  { q: () => L('ما الشكل الذي ليس له زوايا؟', 'Which shape has no corners?', 'Qual forma não tem cantos?'), options: () => [L('دائرة','Circle','Círculo'), L('مربع','Square','Quadrado'), L('مثلث','Triangle','Triângulo'), L('معين','Diamond','Diamante')], answer: 0, emoji: '⭕' },
  { q: () => L('ما لون الورد؟ 🌹', 'What color is a rose? 🌹', 'Qual é a cor da rosa? 🌹'), options: () => [L('أحمر','Red','Vermelho'), L('أزرق','Blue','Azul'), L('أصفر','Yellow','Amarelo'), L('أخضر','Green','Verde')], answer: 0, emoji: '🌹' },
  { q: () => L('ما هذا الشكل؟ ⭐', 'What shape is this? ⭐', 'Qual é esta forma? ⭐'), options: () => [L('نجمة','Star','Estrela'), L('دائرة','Circle','Círculo'), L('مربع','Square','Quadrado'), L('قلب','Heart','Coração')], answer: 0, emoji: '⭐' },
  { q: () => L('ما لون البحر؟ 🌊', 'What color is the sea? 🌊', 'Qual é a cor do mar? 🌊'), options: () => [L('أزرق','Blue','Azul'), L('أخضر','Green','Verde'), L('أبيض','White','Branco'), L('رمادي','Gray','Cinza')], answer: 0, emoji: '🌊' },
  { q: () => L('كم ضلع للمستطيل؟', 'How many sides does a rectangle have?', 'Quantos lados tem um retângulo?'), options: () => ['4','3','5','6'], answer: 0, emoji: '🟦' },
];

/* ═══════════════════════════
   WORLD 2 — Numbers & Counting
   ═══════════════════════════ */
const NUMBERS = [
  { q: () => L('كم عدد أصابع اليد الواحدة؟ ✋', 'How many fingers on one hand? ✋', 'Quantos dedos tem uma mão? ✋'), options: () => ['5','4','6','3'], answer: 0, emoji: '✋' },
  { q: () => L('ما الرقم الذي يلي ٣؟', 'What number comes after 3?', 'Qual número vem depois do 3?'), options: () => ['4','5','2','6'], answer: 0, emoji: '🔢' },
  { q: () => L('ما الرقم الذي قبل ٧؟', 'What number comes before 7?', 'Qual número vem antes do 7?'), options: () => ['6','5','8','7'], answer: 0, emoji: '🔢' },
  { q: () => L('كم 🍎🍎🍎؟', 'How many 🍎🍎🍎?', 'Quantos 🍎🍎🍎?'), options: () => ['3','2','4','5'], answer: 0, emoji: '🍎' },
  { q: () => L('كم 🐟🐟🐟🐟🐟؟', 'How many 🐟🐟🐟🐟🐟?', 'Quantos 🐟🐟🐟🐟🐟?'), options: () => ['5','4','6','3'], answer: 0, emoji: '🐟' },
  { q: () => L('ما الرقم الذي يلي ٩؟', 'What comes after 9?', 'O que vem depois do 9?'), options: () => ['10','8','11','7'], answer: 0, emoji: '🔟' },
  { q: () => L('أيهما أكبر: ٥ أم ٣؟', 'Which is bigger: 5 or 3?', 'Qual é maior: 5 ou 3?'), options: () => ['5','3'], answer: 0, emoji: '⚖️' },
  { q: () => L('أيهما أصغر: ٢ أم ٨؟', 'Which is smaller: 2 or 8?', 'Qual é menor: 2 ou 8?'), options: () => ['2','8'], answer: 0, emoji: '⚖️' },
  { q: () => L('كم 🌟🌟🌟🌟؟', 'How many 🌟🌟🌟🌟?', 'Quantos 🌟🌟🌟🌟?'), options: () => ['4','3','5','6'], answer: 0, emoji: '🌟' },
  { q: () => L('رتّب: ١، ٢، ؟، ٤', 'Order: 1, 2, ?, 4', 'Ordem: 1, 2, ?, 4'), options: () => ['3','5','1','6'], answer: 0, emoji: '🔢' },
  { q: () => L('كم 🦋🦋🦋🦋🦋🦋🦋؟', 'How many 🦋🦋🦋🦋🦋🦋🦋?', 'Quantos 🦋🦋🦋🦋🦋🦋🦋?'), options: () => ['7','6','8','5'], answer: 0, emoji: '🦋' },
  { q: () => L('ما الرقم الزوجي؟', 'Which is even?', 'Qual é par?'), options: () => ['4','3','5','7'], answer: 0, emoji: '🔢' },
  { q: () => L('ما الرقم الفردي؟', 'Which is odd?', 'Qual é ímpar?'), options: () => ['3','4','6','8'], answer: 0, emoji: '🔢' },
  { q: () => L('كم 🎈🎈؟', 'How many 🎈🎈?', 'Quantos 🎈🎈?'), options: () => ['2','1','3','4'], answer: 0, emoji: '🎈' },
  { q: () => L('ما العدد بين ٥ و ٧؟', 'What number is between 5 and 7?', 'Qual número está entre 5 e 7?'), options: () => ['6','4','8','5'], answer: 0, emoji: '🔢' },
  { q: () => L('كم 🐱🐱🐱🐱🐱🐱🐱🐱؟', 'How many 🐱🐱🐱🐱🐱🐱🐱🐱?', 'Quantos 🐱🐱🐱🐱🐱🐱🐱🐱?'), options: () => ['8','7','9','6'], answer: 0, emoji: '🐱' },
  { q: () => L('ما الرقم الذي قبل ١٠؟', 'What comes before 10?', 'O que vem antes do 10?'), options: () => ['9','8','11','7'], answer: 0, emoji: '🔢' },
  { q: () => L('أيهما أكبر: ١٠ أم ٦؟', 'Which is bigger: 10 or 6?', 'Qual é maior: 10 ou 6?'), options: () => ['10','6'], answer: 0, emoji: '⚖️' },
  { q: () => L('كم صفر في الرقم ١٠؟', 'How many zeros in 10?', 'Quantos zeros tem o 10?'), options: () => ['1','2','0','3'], answer: 0, emoji: '0️⃣' },
  { q: () => L('ما الرقم الذي يلي ٥؟', 'What comes after 5?', 'O que vem depois do 5?'), options: () => ['6','4','7','8'], answer: 0, emoji: '🔢' },
];

/* ═══════════════════════════
   WORLD 3 — Addition
   ═══════════════════════════ */
function genAddition() {
  const qs = [];
  const pairs = [[1,1],[1,2],[2,2],[2,3],[3,3],[1,4],[3,4],[4,4],[2,5],[5,5],[3,6],[4,5],[1,7],[2,8],[3,7],[5,4],[6,3],[1,9],[4,6],[5,5]];
  for (const [a, b] of pairs) {
    const ans = a + b;
    const wrongs = new Set();
    while (wrongs.size < 3) { const w = ans + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random()*3)+1); if (w > 0 && w !== ans) wrongs.add(w); }
    const opts = [String(ans), ...Array.from(wrongs).map(String)];
    qs.push({
      q: () => `${a} + ${b} = ?`,
      options: () => shuffle(opts),
      answer: -1, _correctVal: String(ans),
      emoji: '➕',
    });
  }
  return qs;
}

/* ═══════════════════════════
   WORLD 4 — Subtraction
   ═══════════════════════════ */
function genSubtraction() {
  const qs = [];
  const pairs = [[2,1],[3,1],[4,2],[5,3],[5,2],[6,3],[7,4],[8,5],[9,3],[10,4],[7,2],[6,1],[8,3],[9,6],[10,7],[10,5],[8,2],[9,4],[7,5],[10,8]];
  for (const [a, b] of pairs) {
    const ans = a - b;
    const wrongs = new Set();
    while (wrongs.size < 3) { const w = ans + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random()*3)+1); if (w >= 0 && w !== ans) wrongs.add(w); }
    const opts = [String(ans), ...Array.from(wrongs).map(String)];
    qs.push({
      q: () => `${a} - ${b} = ?`,
      options: () => shuffle(opts),
      answer: -1, _correctVal: String(ans),
      emoji: '➖',
    });
  }
  return qs;
}

/* ═══════════════════════════
   WORLD 5 — Arabic Letters
   ═══════════════════════════ */
const ARABIC_LETTERS = [
  { q: () => L('ما هذا الحرف؟ أ', 'What letter is this? أ', 'Qual é esta letra? أ'), options: () => [L('ألف','Alif','Alif'), L('باء','Ba','Ba'), L('تاء','Ta','Ta'), L('ثاء','Tha','Tha')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ب', 'What letter is this? ب', 'Qual é esta letra? ب'), options: () => [L('باء','Ba','Ba'), L('تاء','Ta','Ta'), L('ألف','Alif','Alif'), L('نون','Nun','Nun')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ت', 'What letter is this? ت', 'Qual é esta letra? ت'), options: () => [L('تاء','Ta','Ta'), L('باء','Ba','Ba'), L('ثاء','Tha','Tha'), L('نون','Nun','Nun')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ث', 'What letter is this? ث', 'Qual é esta letra? ث'), options: () => [L('ثاء','Tha','Tha'), L('تاء','Ta','Ta'), L('باء','Ba','Ba'), L('جيم','Jim','Jim')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ج', 'What letter is this? ج', 'Qual é esta letra? ج'), options: () => [L('جيم','Jim','Jim'), L('حاء','Ha','Ha'), L('خاء','Kha','Kha'), L('دال','Dal','Dal')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ح', 'What letter is this? ح', 'Qual é esta letra? ح'), options: () => [L('حاء','Ha','Ha'), L('جيم','Jim','Jim'), L('خاء','Kha','Kha'), L('هاء','Haa','Haa')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ خ', 'What letter is this? خ', 'Qual é esta letra? خ'), options: () => [L('خاء','Kha','Kha'), L('حاء','Ha','Ha'), L('جيم','Jim','Jim'), L('دال','Dal','Dal')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ د', 'What letter is this? د', 'Qual é esta letra? د'), options: () => [L('دال','Dal','Dal'), L('ذال','Dhal','Dhal'), L('راء','Ra','Ra'), L('زاي','Zay','Zay')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ر', 'What letter is this? ر', 'Qual é esta letra? ر'), options: () => [L('راء','Ra','Ra'), L('زاي','Zay','Zay'), L('دال','Dal','Dal'), L('واو','Waw','Waw')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ س', 'What letter is this? س', 'Qual é esta letra? س'), options: () => [L('سين','Sin','Sin'), L('شين','Shin','Shin'), L('صاد','Sad','Sad'), L('ضاد','Dad','Dad')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ش', 'What letter is this? ش', 'Qual é esta letra? ش'), options: () => [L('شين','Shin','Shin'), L('سين','Sin','Sin'), L('صاد','Sad','Sad'), L('ضاد','Dad','Dad')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ص', 'What letter is this? ص', 'Qual é esta letra? ص'), options: () => [L('صاد','Sad','Sad'), L('ضاد','Dad','Dad'), L('سين','Sin','Sin'), L('طاء','Taa','Taa')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ع', 'What letter is this? ع', 'Qual é esta letra? ع'), options: () => [L('عين','Ain','Ain'), L('غين','Ghain','Ghain'), L('فاء','Fa','Fa'), L('قاف','Qaf','Qaf')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ف', 'What letter is this? ف', 'Qual é esta letra? ف'), options: () => [L('فاء','Fa','Fa'), L('قاف','Qaf','Qaf'), L('كاف','Kaf','Kaf'), L('لام','Lam','Lam')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ق', 'What letter is this? ق', 'Qual é esta letra? ق'), options: () => [L('قاف','Qaf','Qaf'), L('فاء','Fa','Fa'), L('كاف','Kaf','Kaf'), L('لام','Lam','Lam')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ك', 'What letter is this? ك', 'Qual é esta letra? ك'), options: () => [L('كاف','Kaf','Kaf'), L('لام','Lam','Lam'), L('ميم','Mim','Mim'), L('نون','Nun','Nun')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ل', 'What letter is this? ل', 'Qual é esta letra? ل'), options: () => [L('لام','Lam','Lam'), L('كاف','Kaf','Kaf'), L('ميم','Mim','Mim'), L('نون','Nun','Nun')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ م', 'What letter is this? م', 'Qual é esta letra? م'), options: () => [L('ميم','Mim','Mim'), L('نون','Nun','Nun'), L('هاء','Haa','Haa'), L('واو','Waw','Waw')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ن', 'What letter is this? ن', 'Qual é esta letra? ن'), options: () => [L('نون','Nun','Nun'), L('ميم','Mim','Mim'), L('ياء','Ya','Ya'), L('باء','Ba','Ba')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ي', 'What letter is this? ي', 'Qual é esta letra? ي'), options: () => [L('ياء','Ya','Ya'), L('نون','Nun','Nun'), L('باء','Ba','Ba'), L('تاء','Ta','Ta')], answer: 0, emoji: '🔤' },
];

/* ═══════════════════════════
   WORLD 6 — English Letters
   ═══════════════════════════ */
const ENGLISH_LETTERS = [
  { q: () => L('ما هذا الحرف؟ A', 'What letter is this? A', 'Qual é esta letra? A'), options: () => ['A','B','C','D'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ B', 'What letter is this? B', 'Qual é esta letra? B'), options: () => ['B','D','P','R'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ C', 'What letter is this? C', 'Qual é esta letra? C'), options: () => ['C','G','O','Q'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ D', 'What letter is this? D', 'Qual é esta letra? D'), options: () => ['D','B','P','O'], answer: 0, emoji: '🔠' },
  { q: () => L('ما الحرف التالي: A, B, C, ?', 'What comes next: A, B, C, ?', 'O que vem depois: A, B, C, ?'), options: () => ['D','E','F','G'], answer: 0, emoji: '🔠' },
  { q: () => L('ما الحرف الصغير لـ G؟', 'What is the lowercase of G?', 'Qual é a minúscula de G?'), options: () => ['g','q','p','d'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ M', 'What letter is this? M', 'Qual é esta letra? M'), options: () => ['M','N','W','V'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ S', 'What letter is this? S', 'Qual é esta letra? S'), options: () => ['S','Z','C','5'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ W', 'What letter is this? W', 'Qual é esta letra? W'), options: () => ['W','M','V','U'], answer: 0, emoji: '🔠' },
  { q: () => L('ما الحرف التالي: X, Y, ?', 'What comes next: X, Y, ?', 'O que vem depois: X, Y, ?'), options: () => ['Z','W','A','V'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ F', 'What letter is this? F', 'Qual é esta letra? F'), options: () => ['F','E','P','T'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ H', 'What letter is this? H', 'Qual é esta letra? H'), options: () => ['H','N','M','K'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ K', 'What letter is this? K', 'Qual é esta letra? K'), options: () => ['K','X','H','R'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ L', 'What letter is this? L', 'Qual é esta letra? L'), options: () => ['L','I','J','T'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ O', 'What letter is this? O', 'Qual é esta letra? O'), options: () => ['O','Q','C','D'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ P', 'What letter is this? P', 'Qual é esta letra? P'), options: () => ['P','B','D','R'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ R', 'What letter is this? R', 'Qual é esta letra? R'), options: () => ['R','P','B','K'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ T', 'What letter is this? T', 'Qual é esta letra? T'), options: () => ['T','I','L','F'], answer: 0, emoji: '🔠' },
  { q: () => L('ما الحرف الكبير لـ e؟', 'What is the uppercase of e?', 'Qual é a maiúscula de e?'), options: () => ['E','F','G','3'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ Z', 'What letter is this? Z', 'Qual é esta letra? Z'), options: () => ['Z','S','N','2'], answer: 0, emoji: '🔠' },
];

/* ═══════════════════════════
   WORLD 7 — Words
   ═══════════════════════════ */
const WORDS = [
  { q: () => L('ما هذا؟ 🐱', 'What is this? 🐱', 'O que é isto? 🐱'), options: () => [L('قطة','Cat','Gato'), L('كلب','Dog','Cachorro'), L('أسد','Lion','Leão'), L('فأر','Mouse','Rato')], answer: 0, emoji: '🐱' },
  { q: () => L('ما هذا؟ 🐕', 'What is this? 🐕', 'O que é isto? 🐕'), options: () => [L('كلب','Dog','Cachorro'), L('قطة','Cat','Gato'), L('ذئب','Wolf','Lobo'), L('ثعلب','Fox','Raposa')], answer: 0, emoji: '🐕' },
  { q: () => L('ما هذا؟ 🏠', 'What is this? 🏠', 'O que é isto? 🏠'), options: () => [L('بيت','House','Casa'), L('مدرسة','School','Escola'), L('سيارة','Car','Carro'), L('شجرة','Tree','Árvore')], answer: 0, emoji: '🏠' },
  { q: () => L('ما هذا؟ 🚗', 'What is this? 🚗', 'O que é isto? 🚗'), options: () => [L('سيارة','Car','Carro'), L('حافلة','Bus','Ônibus'), L('قطار','Train','Trem'), L('طائرة','Plane','Avião')], answer: 0, emoji: '🚗' },
  { q: () => L('ما هذا؟ 🌳', 'What is this? 🌳', 'O que é isto? 🌳'), options: () => [L('شجرة','Tree','Árvore'), L('زهرة','Flower','Flor'), L('عشب','Grass','Grama'), L('ورقة','Leaf','Folha')], answer: 0, emoji: '🌳' },
  { q: () => L('ما هذا؟ ☀️', 'What is this? ☀️', 'O que é isto? ☀️'), options: () => [L('شمس','Sun','Sol'), L('قمر','Moon','Lua'), L('نجمة','Star','Estrela'), L('سحابة','Cloud','Nuvem')], answer: 0, emoji: '☀️' },
  { q: () => L('ما هذا؟ 🌙', 'What is this? 🌙', 'O que é isto? 🌙'), options: () => [L('قمر','Moon','Lua'), L('شمس','Sun','Sol'), L('نجمة','Star','Estrela'), L('كوكب','Planet','Planeta')], answer: 0, emoji: '🌙' },
  { q: () => L('ما هذا؟ 🍎', 'What is this? 🍎', 'O que é isto? 🍎'), options: () => [L('تفاحة','Apple','Maçã'), L('برتقالة','Orange','Laranja'), L('موزة','Banana','Banana'), L('عنب','Grape','Uva')], answer: 0, emoji: '🍎' },
  { q: () => L('ما هذا؟ 📚', 'What is this? 📚', 'O que é isto? 📚'), options: () => [L('كتاب','Book','Livro'), L('قلم','Pen','Caneta'), L('حقيبة','Bag','Bolsa'), L('ورقة','Paper','Papel')], answer: 0, emoji: '📚' },
  { q: () => L('ما هذا؟ ✈️', 'What is this? ✈️', 'O que é isto? ✈️'), options: () => [L('طائرة','Airplane','Avião'), L('سيارة','Car','Carro'), L('قارب','Boat','Barco'), L('صاروخ','Rocket','Foguete')], answer: 0, emoji: '✈️' },
  { q: () => L('ما هذا؟ 🐟', 'What is this? 🐟', 'O que é isto? 🐟'), options: () => [L('سمكة','Fish','Peixe'), L('حوت','Whale','Baleia'), L('دلفين','Dolphin','Golfinho'), L('سلحفاة','Turtle','Tartaruga')], answer: 0, emoji: '🐟' },
  { q: () => L('ما عكس كبير؟', 'What is the opposite of big?', 'Qual é o oposto de grande?'), options: () => [L('صغير','Small','Pequeno'), L('طويل','Tall','Alto'), L('ثقيل','Heavy','Pesado'), L('سريع','Fast','Rápido')], answer: 0, emoji: '↔️' },
  { q: () => L('ما عكس حار؟', 'What is the opposite of hot?', 'Qual é o oposto de quente?'), options: () => [L('بارد','Cold','Frio'), L('دافئ','Warm','Morno'), L('جاف','Dry','Seco'), L('رطب','Wet','Molhado')], answer: 0, emoji: '↔️' },
  { q: () => L('ما هذا؟ 🌧️', 'What is this? 🌧️', 'O que é isto? 🌧️'), options: () => [L('مطر','Rain','Chuva'), L('ثلج','Snow','Neve'), L('شمس','Sun','Sol'), L('رياح','Wind','Vento')], answer: 0, emoji: '🌧️' },
  { q: () => L('ما هذا؟ 🦁', 'What is this? 🦁', 'O que é isto? 🦁'), options: () => [L('أسد','Lion','Leão'), L('نمر','Tiger','Tigre'), L('دب','Bear','Urso'), L('ذئب','Wolf','Lobo')], answer: 0, emoji: '🦁' },
  { q: () => L('ما هذا؟ 🌺', 'What is this? 🌺', 'O que é isto? 🌺'), options: () => [L('زهرة','Flower','Flor'), L('شجرة','Tree','Árvore'), L('ورقة','Leaf','Folha'), L('عشب','Grass','Grama')], answer: 0, emoji: '🌺' },
  { q: () => L('ما هذا؟ 🎵', 'What is this? 🎵', 'O que é isto? 🎵'), options: () => [L('موسيقى','Music','Música'), L('رسم','Drawing','Desenho'), L('رقص','Dance','Dança'), L('غناء','Singing','Canto')], answer: 0, emoji: '🎵' },
  { q: () => L('ما هذا؟ 👨‍👩‍👧', 'What is this? 👨‍👩‍👧', 'O que é isto? 👨‍👩‍👧'), options: () => [L('عائلة','Family','Família'), L('أصدقاء','Friends','Amigos'), L('معلم','Teacher','Professor'), L('جيران','Neighbors','Vizinhos')], answer: 0, emoji: '👨‍👩‍👧' },
  { q: () => L('ما عكس سعيد؟', 'What is the opposite of happy?', 'Qual é o oposto de feliz?'), options: () => [L('حزين','Sad','Triste'), L('غاضب','Angry','Bravo'), L('خائف','Scared','Assustado'), L('متعب','Tired','Cansado')], answer: 0, emoji: '↔️' },
  { q: () => L('ما هذا؟ 🏫', 'What is this? 🏫', 'O que é isto? 🏫'), options: () => [L('مدرسة','School','Escola'), L('بيت','House','Casa'), L('مستشفى','Hospital','Hospital'), L('مسجد','Mosque','Mesquita')], answer: 0, emoji: '🏫' },
];

/* ═══════════════════════════
   WORLD 8 — Advanced Math
   ═══════════════════════════ */
function genAdvancedMath() {
  const qs = [];
  // Double-digit addition & subtraction
  const ops = [
    [12,5,'+'],[15,3,'+'],[20,10,'+'],[8,7,'+'],[14,6,'+'],
    [11,4,'+'],[16,3,'+'],[9,9,'+'],[13,7,'+'],[18,2,'+'],
    [15,8,'-'],[20,5,'-'],[13,6,'-'],[18,9,'-'],[12,4,'-'],
    [16,7,'-'],[19,8,'-'],[14,5,'-'],[11,3,'-'],[17,9,'-'],
  ];
  for (const [a, b, op] of ops) {
    const ans = op === '+' ? a + b : a - b;
    const wrongs = new Set();
    while (wrongs.size < 3) { const w = ans + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random()*4)+1); if (w >= 0 && w !== ans) wrongs.add(w); }
    const opts = [String(ans), ...Array.from(wrongs).map(String)];
    qs.push({
      q: () => `${a} ${op} ${b} = ?`,
      options: () => shuffle(opts),
      answer: -1, _correctVal: String(ans),
      emoji: op === '+' ? '➕' : '➖',
    });
  }
  return qs;
}

/* ═══════════════════════════
   WORLD 9 — Patterns
   ═══════════════════════════ */
const PATTERNS = [
  { q: () => L('أكمل: 🔴🔵🔴🔵🔴?', 'Complete: 🔴🔵🔴🔵🔴?', 'Complete: 🔴🔵🔴🔵🔴?'), options: () => ['🔵','🔴','🟢','🟡'], answer: 0, emoji: '🔄' },
  { q: () => L('أكمل: 🌟🌙🌟🌙🌟?', 'Complete: 🌟🌙🌟🌙🌟?', 'Complete: 🌟🌙🌟🌙🌟?'), options: () => ['🌙','🌟','☀️','⭐'], answer: 0, emoji: '🔄' },
  { q: () => L('أكمل: 2, 4, 6, 8, ?', 'Complete: 2, 4, 6, 8, ?', 'Complete: 2, 4, 6, 8, ?'), options: () => ['10','9','12','11'], answer: 0, emoji: '🔢' },
  { q: () => L('أكمل: 1, 3, 5, 7, ?', 'Complete: 1, 3, 5, 7, ?', 'Complete: 1, 3, 5, 7, ?'), options: () => ['9','8','10','11'], answer: 0, emoji: '🔢' },
  { q: () => L('أكمل: 🍎🍎🍊🍎🍎?', 'Complete: 🍎🍎🍊🍎🍎?', 'Complete: 🍎🍎🍊🍎🍎?'), options: () => ['🍊','🍎','🍇','🍌'], answer: 0, emoji: '🔄' },
  { q: () => L('أكمل: 10, 20, 30, ?', 'Complete: 10, 20, 30, ?', 'Complete: 10, 20, 30, ?'), options: () => ['40','35','50','25'], answer: 0, emoji: '🔢' },
  { q: () => L('أكمل: ⬜🔲⬜🔲⬜?', 'Complete: ⬜🔲⬜🔲⬜?', 'Complete: ⬜🔲⬜🔲⬜?'), options: () => ['🔲','⬜','⬛','🔳'], answer: 0, emoji: '🔄' },
  { q: () => L('أكمل: A, C, E, G, ?', 'Complete: A, C, E, G, ?', 'Complete: A, C, E, G, ?'), options: () => ['I','H','J','F'], answer: 0, emoji: '🔠' },
  { q: () => L('أكمل: 5, 10, 15, 20, ?', 'Complete: 5, 10, 15, 20, ?', 'Complete: 5, 10, 15, 20, ?'), options: () => ['25','22','30','21'], answer: 0, emoji: '🔢' },
  { q: () => L('أكمل: 🔺🔵🔺🔵🔺?', 'Complete: 🔺🔵🔺🔵🔺?', 'Complete: 🔺🔵🔺🔵🔺?'), options: () => ['🔵','🔺','🟢','🔶'], answer: 0, emoji: '🔄' },
  { q: () => L('أكمل: 3, 6, 9, 12, ?', 'Complete: 3, 6, 9, 12, ?', 'Complete: 3, 6, 9, 12, ?'), options: () => ['15','14','13','16'], answer: 0, emoji: '🔢' },
  { q: () => L('أكمل: 🐱🐕🐱🐕🐱?', 'Complete: 🐱🐕🐱🐕🐱?', 'Complete: 🐱🐕🐱🐕🐱?'), options: () => ['🐕','🐱','🐰','🐦'], answer: 0, emoji: '🔄' },
  { q: () => L('ما الذي لا ينتمي؟ 🍎🍊🍇🚗', 'Which doesn\'t belong? 🍎🍊🍇🚗', 'Qual não pertence? 🍎🍊🍇🚗'), options: () => ['🚗','🍎','🍊','🍇'], answer: 0, emoji: '❓' },
  { q: () => L('ما الذي لا ينتمي؟ 🐱🐕🦁🌳', 'Which doesn\'t belong? 🐱🐕🦁🌳', 'Qual não pertence? 🐱🐕🦁🌳'), options: () => ['🌳','🐱','🐕','🦁'], answer: 0, emoji: '❓' },
  { q: () => L('أكمل: 1, 1, 2, 2, 3, 3, ?', 'Complete: 1, 1, 2, 2, 3, 3, ?', 'Complete: 1, 1, 2, 2, 3, 3, ?'), options: () => ['4','3','5','6'], answer: 0, emoji: '🔢' },
  { q: () => L('أكمل: 🟢🟡🔴🟢🟡?', 'Complete: 🟢🟡🔴🟢🟡?', 'Complete: 🟢🟡🔴🟢🟡?'), options: () => ['🔴','🟢','🟡','🔵'], answer: 0, emoji: '🔄' },
  { q: () => L('أكمل: B, D, F, H, ?', 'Complete: B, D, F, H, ?', 'Complete: B, D, F, H, ?'), options: () => ['J','I','K','G'], answer: 0, emoji: '🔠' },
  { q: () => L('أكمل: 100, 90, 80, ?', 'Complete: 100, 90, 80, ?', 'Complete: 100, 90, 80, ?'), options: () => ['70','75','60','85'], answer: 0, emoji: '🔢' },
  { q: () => L('أكمل: 🏠🌳🏠🌳🏠?', 'Complete: 🏠🌳🏠🌳🏠?', 'Complete: 🏠🌳🏠🌳🏠?'), options: () => ['🌳','🏠','🚗','🌸'], answer: 0, emoji: '🔄' },
  { q: () => L('ما الذي لا ينتمي؟ ✈️🚗🚌🍎', 'Which doesn\'t belong? ✈️🚗🚌🍎', 'Qual não pertence? ✈️🚗🚌🍎'), options: () => ['🍎','✈️','🚗','🚌'], answer: 0, emoji: '❓' },
];

/* ═══════════════════════════
   WORLD 10 — Mixed Challenges
   ═══════════════════════════ */
function genMixed() {
  // Pull 4 from each of the static banks + 4 generated
  const pools = [COLORS_SHAPES, NUMBERS, ARABIC_LETTERS, ENGLISH_LETTERS, WORDS, PATTERNS];
  const mixed = [];
  for (const pool of pools) {
    const picked = shuffle([...pool]).slice(0, 3);
    mixed.push(...picked);
  }
  // add 2 random math
  mixed.push(...genAddition().slice(0, 1));
  mixed.push(...genSubtraction().slice(0, 1));
  return shuffle(mixed);
}

/* ═══════════════════════════
   Helper
   ═══════════════════════════ */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Tag questions with difficulty tiers ── */
function tagDifficulty(pool) {
  const third = Math.ceil(pool.length / 3);
  return pool.map((q, i) => {
    if (q.diff) return q;
    return { ...q, diff: i < third ? 1 : i < third * 2 ? 2 : 3 };
  });
}

/* ── True/False question generator ── */
function genTrueFalse() {
  const tf = (ar, en, pt, isTrue) => ({
    q: () => L(ar, en, pt),
    options: () => isTrue
      ? [L('صحيح','True','Verdadeiro'), L('خطأ','False','Falso')]
      : [L('خطأ','False','Falso'), L('صحيح','True','Verdadeiro')],
    answer: 0, emoji: '✅',
  });
  return shuffle([
    tf('الدائرة ليس لها زوايا','A circle has no corners','Um círculo não tem cantos', true),
    tf('المربع له 3 أضلاع','A square has 3 sides','Um quadrado tem 3 lados', false),
    tf('2 + 2 = 4','2 + 2 = 4','2 + 2 = 4', true),
    tf('5 أكبر من 3','5 is greater than 3','5 é maior que 3', true),
    tf('10 - 3 = 8','10 - 3 = 8','10 - 3 = 8', false),
    tf('كل المثلثات لها 3 زوايا','All triangles have 3 angles','Todos os triângulos têm 3 ângulos', true),
    tf('الحرف A حرف علة','The letter A is a vowel','A letra A é uma vogal', true),
    tf('القطة من الثدييات','A cat is a mammal','Um gato é um mamífero', true),
    tf('الشمس كوكب','The sun is a planet','O sol é um planeta', false),
    tf('الماء ليس له لون','Water has no color','A água não tem cor', true),
    tf('المستطيل له 4 أضلاع','A rectangle has 4 sides','Um retângulo tem 4 lados', true),
    tf('1 + 1 = 3','1 + 1 = 3','1 + 1 = 3', false),
    tf('النملة حشرة','An ant is an insect','Uma formiga é um inseto', true),
    tf('البرتقال فاكهة','An orange is a fruit','A laranja é uma fruta', true),
    tf('الأرض مسطحة','The Earth is flat','A Terra é plana', false),
  ]);
}

/* ═══════════════════════════
   Extra questions — expansion
   ═══════════════════════════ */
const EXTRA_COLORS = [
  { q: () => L('كم ضلع للمسدس؟','How many sides does a hexagon have?','Quantos lados tem um hexágono?'), options: () => ['6','5','7','8'], answer: 0, emoji: '⬡' },
  { q: () => L('ما لون الجزر؟ 🥕','What color is a carrot? 🥕','Qual é a cor da cenoura? 🥕'), options: () => [L('برتقالي','Orange','Laranja'), L('أحمر','Red','Vermelho'), L('أصفر','Yellow','Amarelo'), L('أخضر','Green','Verde')], answer: 0, emoji: '🥕' },
  { q: () => L('ما لون الليل؟ 🌃','What color is the night? 🌃','Qual é a cor da noite? 🌃'), options: () => [L('أسود','Black','Preto'), L('أزرق','Blue','Azul'), L('رمادي','Gray','Cinza'), L('بنفسجي','Purple','Roxo')], answer: 0, emoji: '🌃' },
  { q: () => L('ما الشكل الذي له 5 أضلاع؟','Which shape has 5 sides?','Qual forma tem 5 lados?'), options: () => [L('خماسي','Pentagon','Pentágono'), L('مربع','Square','Quadrado'), L('مثلث','Triangle','Triângulo'), L('سداسي','Hexagon','Hexágono')], answer: 0, emoji: '⬠' },
  { q: () => L('ما لون الكيوي؟ 🥝','What color is kiwi inside? 🥝','Qual a cor do kiwi? 🥝'), options: () => [L('أخضر','Green','Verde'), L('أصفر','Yellow','Amarelo'), L('بني','Brown','Marrom'), L('أحمر','Red','Vermelho')], answer: 0, emoji: '🥝' },
  { q: () => L('ما لون الذهب؟ 🥇','What color is gold? 🥇','Qual é a cor do ouro? 🥇'), options: () => [L('ذهبي','Gold','Dourado'), L('فضي','Silver','Prateado'), L('أبيض','White','Branco'), L('أصفر','Yellow','Amarelo')], answer: 0, emoji: '🥇' },
];

const EXTRA_NUMBERS = [
  { q: () => L('ما العدد الزوجي؟','Which is even?','Qual é par?'), options: () => ['6','5','7','9'], answer: 0, emoji: '🔢' },
  { q: () => L('كم 🌺🌺🌺🌺🌺🌺🌺🌺🌺؟','How many 🌺🌺🌺🌺🌺🌺🌺🌺🌺?','Quantos 🌺🌺🌺🌺🌺🌺🌺🌺🌺?'), options: () => ['9','8','10','7'], answer: 0, emoji: '🌺' },
  { q: () => L('ما الرقم الذي يلي ١٤؟','What comes after 14?','O que vem depois do 14?'), options: () => ['15','13','16','12'], answer: 0, emoji: '🔢' },
  { q: () => L('أيهما أصغر: ٣ أم ٩؟','Which is smaller: 3 or 9?','Qual é menor: 3 ou 9?'), options: () => ['3','9'], answer: 0, emoji: '⚖️' },
  { q: () => L('عُدّ بالخمسات: 5، 10، 15، ؟','Count by 5s: 5, 10, 15, ?','Conte de 5: 5, 10, 15, ?'), options: () => ['20','18','25','16'], answer: 0, emoji: '🔢' },
];

const EXTRA_ARABIC = [
  { q: () => L('ما هذا الحرف؟ ذ','What letter is this? ذ','Qual é esta letra? ذ'), options: () => [L('ذال','Dhal','Dhal'), L('دال','Dal','Dal'), L('راء','Ra','Ra'), L('زاي','Zay','Zay')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ز','What letter is this? ز','Qual é esta letra? ز'), options: () => [L('زاي','Zay','Zay'), L('راء','Ra','Ra'), L('سين','Sin','Sin'), L('ذال','Dhal','Dhal')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ ط','What letter is this? ط','Qual é esta letra? ط'), options: () => [L('طاء','Taa','Taa'), L('ظاء','Dhaa','Dhaa'), L('صاد','Sad','Sad'), L('ضاد','Dad','Dad')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ غ','What letter is this? غ','Qual é esta letra? غ'), options: () => [L('غين','Ghain','Ghain'), L('عين','Ain','Ain'), L('فاء','Fa','Fa'), L('خاء','Kha','Kha')], answer: 0, emoji: '🔤' },
  { q: () => L('ما هذا الحرف؟ هـ','What letter is this? هـ','Qual é esta letra? هـ'), options: () => [L('هاء','Haa','Haa'), L('حاء','Ha','Ha'), L('واو','Waw','Waw'), L('ياء','Ya','Ya')], answer: 0, emoji: '🔤' },
];

const EXTRA_ENGLISH = [
  { q: () => L('ما هذا الحرف؟ E','What letter is this? E','Qual é esta letra? E'), options: () => ['E','F','3','B'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ G','What letter is this? G','Qual é esta letra? G'), options: () => ['G','C','Q','O'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ J','What letter is this? J','Qual é esta letra? J'), options: () => ['J','I','L','T'], answer: 0, emoji: '🔠' },
  { q: () => L('ما هذا الحرف؟ N','What letter is this? N','Qual é esta letra? N'), options: () => ['N','M','H','Z'], answer: 0, emoji: '🔠' },
  { q: () => L('ما الحرف الصغير لـ Q؟','What is the lowercase of Q?','Qual é a minúscula de Q?'), options: () => ['q','p','g','d'], answer: 0, emoji: '🔠' },
];

const EXTRA_WORDS = [
  { q: () => L('ما هذا؟ 🐘','What is this? 🐘','O que é isto? 🐘'), options: () => [L('فيل','Elephant','Elefante'), L('زرافة','Giraffe','Girafa'), L('وحيد القرن','Rhino','Rinoceronte'), L('فرس النهر','Hippo','Hipopótamo')], answer: 0, emoji: '🐘' },
  { q: () => L('ما هذا؟ 🚌','What is this? 🚌','O que é isto? 🚌'), options: () => [L('حافلة','Bus','Ônibus'), L('سيارة','Car','Carro'), L('قطار','Train','Trem'), L('شاحنة','Truck','Caminhão')], answer: 0, emoji: '🚌' },
  { q: () => L('ما عكس طويل؟','What is the opposite of tall?','Qual é o oposto de alto?'), options: () => [L('قصير','Short','Baixo'), L('كبير','Big','Grande'), L('ثقيل','Heavy','Pesado'), L('بطيء','Slow','Lento')], answer: 0, emoji: '↔️' },
  { q: () => L('ما هذا؟ 🏥','What is this? 🏥','O que é isto? 🏥'), options: () => [L('مستشفى','Hospital','Hospital'), L('مدرسة','School','Escola'), L('بيت','House','Casa'), L('مطار','Airport','Aeroporto')], answer: 0, emoji: '🏥' },
  { q: () => L('ما عكس سريع؟','What is the opposite of fast?','Qual é o oposto de rápido?'), options: () => [L('بطيء','Slow','Lento'), L('قوي','Strong','Forte'), L('كبير','Big','Grande'), L('طويل','Tall','Alto')], answer: 0, emoji: '↔️' },
];

const EXTRA_PATTERNS = [
  { q: () => L('أكمل: ▲▼▲▼▲?','Complete: ▲▼▲▼▲?','Complete: ▲▼▲▼▲?'), options: () => ['▼','▲','■','●'], answer: 0, emoji: '🔄' },
  { q: () => L('أكمل: 4, 8, 12, 16, ?','Complete: 4, 8, 12, 16, ?','Complete: 4, 8, 12, 16, ?'), options: () => ['20','18','22','24'], answer: 0, emoji: '🔢' },
  { q: () => L('أكمل: 🐱🐕🐰🐱🐕?','Complete: 🐱🐕🐰🐱🐕?','Complete: 🐱🐕🐰🐱🐕?'), options: () => ['🐰','🐱','🐕','🐦'], answer: 0, emoji: '🔄' },
  { q: () => L('ما الذي لا ينتمي؟ 🔴🔵🟢🎵','Which doesn\'t belong? 🔴🔵🟢🎵','Qual não pertence? 🔴🔵🟢🎵'), options: () => ['🎵','🔴','🔵','🟢'], answer: 0, emoji: '❓' },
  { q: () => L('أكمل: Z, Y, X, W, ?','Complete: Z, Y, X, W, ?','Complete: Z, Y, X, W, ?'), options: () => ['V','U','T','S'], answer: 0, emoji: '🔠' },
];

/* ═══════════════════════════
   Generated — Shape Sides & Color Mixing
   ═══════════════════════════ */
function genColorShapesSides() {
  const shapes = [
    { name: () => L('المربع','Square','Quadrado'), sides: 4, emoji: '⬜' },
    { name: () => L('المثلث','Triangle','Triângulo'), sides: 3, emoji: '🔺' },
    { name: () => L('المستطيل','Rectangle','Retângulo'), sides: 4, emoji: '▬' },
    { name: () => L('السداسي','Hexagon','Hexágono'), sides: 6, emoji: '⬡' },
    { name: () => L('الخماسي','Pentagon','Pentágono'), sides: 5, emoji: '⬠' },
    { name: () => L('المعين','Rhombus','Losango'), sides: 4, emoji: '🔷' },
    { name: () => L('المثمن','Octagon','Octógono'), sides: 8, emoji: '🛑' },
  ];
  const qs = [];
  for (const s of shapes) {
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = s.sides + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
      if (w > 0 && w !== s.sides) wrongs.add(w);
    }
    qs.push({
      q: () => L(`كم ضلع لـ ${s.name()}؟`, `How many sides does a ${s.name()} have?`, `Quantos lados tem um ${s.name()}?`),
      options: () => shuffle([String(s.sides), ...Array.from(wrongs).map(String)]),
      answer: -1, _correctVal: String(s.sides),
      emoji: s.emoji,
    });
  }
  const mixes = [
    { q: () => L('ما نتيجة خلط الأحمر والأصفر؟','What do you get mixing red and yellow?','O que se obtém misturando vermelho e amarelo?'), ans: () => L('برتقالي','Orange','Laranja'), wrongs: () => [L('أخضر','Green','Verde'), L('بنفسجي','Purple','Roxo'), L('أبيض','White','Branco')], emoji: '🎨' },
    { q: () => L('ما نتيجة خلط الأزرق والأصفر؟','What do you get mixing blue and yellow?','O que se obtém misturando azul e amarelo?'), ans: () => L('أخضر','Green','Verde'), wrongs: () => [L('برتقالي','Orange','Laranja'), L('بنفسجي','Purple','Roxo'), L('وردي','Pink','Rosa')], emoji: '🎨' },
    { q: () => L('ما نتيجة خلط الأحمر والأزرق؟','What do you get mixing red and blue?','O que se obtém misturando vermelho e azul?'), ans: () => L('بنفسجي','Purple','Roxo'), wrongs: () => [L('برتقالي','Orange','Laranja'), L('أخضر','Green','Verde'), L('بني','Brown','Marrom')], emoji: '🎨' },
    { q: () => L('ما نتيجة خلط الأبيض والأسود؟','What do you get mixing white and black?','O que se obtém misturando branco e preto?'), ans: () => L('رمادي','Gray','Cinza'), wrongs: () => [L('بنفسجي','Purple','Roxo'), L('بني','Brown','Marrom'), L('أزرق','Blue','Azul')], emoji: '🎨' },
  ];
  for (const m of mixes) {
    qs.push({
      q: m.q,
      options: () => shuffle([m.ans(), ...m.wrongs()]),
      answer: -1, _correctVal: m.ans(),
      emoji: m.emoji,
    });
  }
  return qs;
}

/* ═══════════════════════════
   Generated — Arabic Letter Sequences
   ═══════════════════════════ */
function genArabicLetterSeq() {
  const letters = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','هـ','و','ي'];
  const qs = [];
  for (let i = 0; i < letters.length - 1; i += 2) {
    const next = letters[i + 1];
    const wrongs = letters.filter((_, idx) => idx !== i + 1 && idx !== i).sort(() => Math.random() - 0.5).slice(0, 3);
    qs.push({
      q: () => L(`ما الحرف الذي يأتي بعد "${letters[i]}"؟`, `What Arabic letter comes after "${letters[i]}"?`, `Qual letra árabe vem depois de "${letters[i]}"?`),
      options: () => shuffle([next, ...wrongs]),
      answer: -1, _correctVal: next,
      emoji: '🔤',
    });
  }
  return qs;
}

/* ═══════════════════════════
   Generated — English Letter Sequences
   ═══════════════════════════ */
function genEnglishLetterSeq() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const qs = [];
  for (let i = 0; i < upper.length - 1; i += 2) {
    const next = upper[i + 1];
    const wrongs = upper.split('').filter((_, idx) => idx !== i + 1 && idx !== i).sort(() => Math.random() - 0.5).slice(0, 3);
    qs.push({
      q: () => L(`ما الحرف الذي يأتي بعد "${upper[i]}"؟`, `What letter comes after "${upper[i]}"?`, `Qual letra vem depois de "${upper[i]}"?`),
      options: () => shuffle([next, ...wrongs]),
      answer: -1, _correctVal: next,
      emoji: '🔠',
    });
  }
  return qs;
}

/* ═══════════════════════════
   Generated — Number Pattern Sequences
   ═══════════════════════════ */
function genPatternSeq() {
  const qs = [];
  const pats = [
    { start: 2, step: 2, count: 4 },
    { start: 1, step: 3, count: 4 },
    { start: 5, step: 5, count: 4 },
    { start: 10, step: 10, count: 4 },
    { start: 1, step: 2, count: 4 },
    { start: 3, step: 3, count: 4 },
    { start: 4, step: 4, count: 4 },
    { start: 2, step: 5, count: 4 },
    { start: 1, step: 4, count: 4 },
    { start: 100, step: -10, count: 4 },
    { start: 20, step: -2, count: 4 },
    { start: 50, step: -5, count: 4 },
  ];
  for (const p of pats) {
    const seq = [];
    for (let i = 0; i < p.count; i++) seq.push(p.start + p.step * i);
    const answer = p.start + p.step * p.count;
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = answer + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * Math.abs(p.step) * 2) + 1);
      if (w !== answer && w >= 0) wrongs.add(w);
    }
    const seqStr = seq.join(LANG === 'ar' ? '، ' : ', ');
    qs.push({
      q: () => L(`أكمل: ${seqStr}، ؟`, `Complete: ${seqStr}, ?`, `Complete: ${seqStr}, ?`),
      options: () => shuffle([String(answer), ...Array.from(wrongs).map(String)]),
      answer: -1, _correctVal: String(answer),
      emoji: '🧩',
    });
  }
  return qs;
}

/* ═══════════════════════════════════════════
   Main export — get questions for a level
   ═══════════════════════════════════════════ */
const BANKS = {
  colors_shapes: [...COLORS_SHAPES, ...EXTRA_COLORS, ...genColorShapesSides()],
  numbers: [...NUMBERS, ...EXTRA_NUMBERS],
  addition: null,
  subtraction: null,
  arabic_letters: [...ARABIC_LETTERS, ...EXTRA_ARABIC, ...genArabicLetterSeq()],
  english_letters: [...ENGLISH_LETTERS, ...EXTRA_ENGLISH, ...genEnglishLetterSeq()],
  words: [...WORDS, ...EXTRA_WORDS],
  advanced_math: null,
  patterns: [...PATTERNS, ...EXTRA_PATTERNS, ...genPatternSeq()],
  mixed: null,
};

export function getQuestions(subject, count, difficulty) {
  let pool;
  if (subject === 'addition') pool = genAddition();
  else if (subject === 'subtraction') pool = genSubtraction();
  else if (subject === 'advanced_math') pool = genAdvancedMath();
  else if (subject === 'mixed') pool = genMixed();
  else pool = [...(BANKS[subject] || COLORS_SHAPES)];

  // Tag with difficulty tiers
  pool = tagDifficulty(pool);

  // Filter by difficulty if DDA specifies
  if (difficulty && pool.length > count) {
    const filtered = pool.filter(q => q.diff === difficulty);
    if (filtered.length >= count) pool = filtered;
  }

  // Mix in 1-2 True/False questions for variety (tag them with diff too)
  if (count >= 5 && subject !== 'mixed') {
    const tfCount = Math.min(2, Math.floor(count / 4));
    const tfQuestions = genTrueFalse().slice(0, tfCount).map(q => ({ ...q, diff: q.diff || 2 }));
    pool = [...pool, ...tfQuestions];
  }

  const picked = shuffle(pool).slice(0, count);

  return picked.map(raw => {
    const qText = typeof raw.q === 'function' ? raw.q() : raw.q;
    const opts = typeof raw.options === 'function' ? raw.options() : [...raw.options];

    // Get correct answer value before shuffling
    let correctVal;
    if (raw._correctVal !== undefined) {
      correctVal = raw._correctVal;
    } else {
      correctVal = opts[raw.answer];
    }

    // Shuffle ALL options to fix answer:0 bias
    const shuffled = shuffle(opts);
    let correctIdx = shuffled.indexOf(correctVal);
    if (correctIdx === -1) { shuffled[0] = correctVal; correctIdx = 0; }

    return { q: qText, options: shuffled, answer: correctIdx, emoji: raw.emoji || '❓' };
  });
}
