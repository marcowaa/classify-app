/* ═══════════════════════════════════════════════════════════════
   Ice Kingdom Academy — Questions Bank
   500+ questions across 10 subjects, 3 languages
   Includes: MCQ, True/False, generated math
   ═══════════════════════════════════════════════════════════════ */

import { LANG } from './i18n.js';

function L(ar, en, pt) {
  if (LANG === 'en') return en;
  if (LANG === 'pt') return pt;
  return ar;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ═══════════════════════════
   WORLD 1 — Colors & Shapes
   ═══════════════════════════ */
const COLORS_SHAPES = [
  { q: () => L('ما لون الثلج؟ ❄️','What color is snow? ❄️','Qual a cor da neve? ❄️'), options: () => [L('أبيض','White','Branco'),L('أزرق','Blue','Azul'),L('رمادي','Gray','Cinza'),L('أصفر','Yellow','Amarelo')], answer: 0, emoji: '❄️' },
  { q: () => L('ما لون السماء؟ 🌤️','What color is the sky? 🌤️','Qual a cor do céu? 🌤️'), options: () => [L('أزرق','Blue','Azul'),L('أخضر','Green','Verde'),L('أحمر','Red','Vermelho'),L('أصفر','Yellow','Amarelo')], answer: 0, emoji: '🌤️' },
  { q: () => L('ما لون الشمس؟ ☀️','What color is the sun? ☀️','Qual a cor do sol? ☀️'), options: () => [L('أصفر','Yellow','Amarelo'),L('أزرق','Blue','Azul'),L('أخضر','Green','Verde'),L('أحمر','Red','Vermelho')], answer: 0, emoji: '☀️' },
  { q: () => L('ما لون العشب؟ 🌿','What color is grass? 🌿','Qual a cor da grama? 🌿'), options: () => [L('أخضر','Green','Verde'),L('أزرق','Blue','Azul'),L('أصفر','Yellow','Amarelo'),L('أحمر','Red','Vermelho')], answer: 0, emoji: '🌿' },
  { q: () => L('ما لون البرتقال؟ 🍊','What color is orange? 🍊','Qual a cor da laranja? 🍊'), options: () => [L('برتقالي','Orange','Laranja'),L('أحمر','Red','Vermelho'),L('أصفر','Yellow','Amarelo'),L('أخضر','Green','Verde')], answer: 0, emoji: '🍊' },
  { q: () => L('ما هذا الشكل؟ ⬜','What shape is this? ⬜','Que forma é esta? ⬜'), options: () => [L('مربع','Square','Quadrado'),L('دائرة','Circle','Círculo'),L('مثلث','Triangle','Triângulo'),L('مستطيل','Rectangle','Retângulo')], answer: 0, emoji: '⬜' },
  { q: () => L('ما هذا الشكل؟ 🔴','What shape is this? 🔴','Que forma é esta? 🔴'), options: () => [L('دائرة','Circle','Círculo'),L('مربع','Square','Quadrado'),L('مثلث','Triangle','Triângulo'),L('نجمة','Star','Estrela')], answer: 0, emoji: '🔴' },
  { q: () => L('ما هذا الشكل؟ 🔺','What shape is this? 🔺','Que forma é esta? 🔺'), options: () => [L('مثلث','Triangle','Triângulo'),L('دائرة','Circle','Círculo'),L('مربع','Square','Quadrado'),L('معين','Diamond','Diamante')], answer: 0, emoji: '🔺' },
  { q: () => L('كم ضلع للمثلث؟','How many sides does a triangle have?','Quantos lados tem um triângulo?'), options: () => ['3','4','5','6'], answer: 0, emoji: '🔺' },
  { q: () => L('كم ضلع للمربع؟','How many sides does a square have?','Quantos lados tem um quadrado?'), options: () => ['4','3','5','6'], answer: 0, emoji: '⬜' },
  { q: () => L('ما لون الفراولة؟ 🍓','What color is a strawberry? 🍓','Qual a cor do morango? 🍓'), options: () => [L('أحمر','Red','Vermelho'),L('أزرق','Blue','Azul'),L('أخضر','Green','Verde'),L('أصفر','Yellow','Amarelo')], answer: 0, emoji: '🍓' },
  { q: () => L('ما لون الشوكولاتة؟ 🍫','What color is chocolate? 🍫','Qual a cor do chocolate? 🍫'), options: () => [L('بني','Brown','Marrom'),L('أسود','Black','Preto'),L('أحمر','Red','Vermelho'),L('أصفر','Yellow','Amarelo')], answer: 0, emoji: '🍫' },
  { q: () => L('ما الشكل الذي ليس له زوايا؟','Which shape has no corners?','Qual forma não tem cantos?'), options: () => [L('دائرة','Circle','Círculo'),L('مربع','Square','Quadrado'),L('مثلث','Triangle','Triângulo'),L('مستطيل','Rectangle','Retângulo')], answer: 0, emoji: '⭕' },
  { q: () => L('ما لون الليمون؟ 🍋','What color is a lemon? 🍋','Qual a cor do limão? 🍋'), options: () => [L('أصفر','Yellow','Amarelo'),L('أخضر','Green','Verde'),L('برتقالي','Orange','Laranja'),L('أحمر','Red','Vermelho')], answer: 0, emoji: '🍋' },
  { q: () => L('ما هذا الشكل؟ ⭐','What shape is this? ⭐','Que forma é esta? ⭐'), options: () => [L('نجمة','Star','Estrela'),L('دائرة','Circle','Círculo'),L('قلب','Heart','Coração'),L('مربع','Square','Quadrado')], answer: 0, emoji: '⭐' },
  { q: () => L('ما لون البحر؟ 🌊','What color is the sea? 🌊','Qual a cor do mar? 🌊'), options: () => [L('أزرق','Blue','Azul'),L('أخضر','Green','Verde'),L('أحمر','Red','Vermelho'),L('رمادي','Gray','Cinza')], answer: 0, emoji: '🌊' },
  { q: () => L('ما لون الباذنجان؟ 🍆','What color is eggplant? 🍆','Qual a cor da berinjela? 🍆'), options: () => [L('بنفسجي','Purple','Roxo'),L('أحمر','Red','Vermelho'),L('أزرق','Blue','Azul'),L('أخضر','Green','Verde')], answer: 0, emoji: '🍆' },
  { q: () => L('كم ضلع للمستطيل؟','How many sides does a rectangle have?','Quantos lados tem um retângulo?'), options: () => ['4','3','5','6'], answer: 0, emoji: '🟦' },
  { q: () => L('ما لون الموز؟ 🍌','What color is a banana? 🍌','Qual a cor da banana? 🍌'), options: () => [L('أصفر','Yellow','Amarelo'),L('أخضر','Green','Verde'),L('أحمر','Red','Vermelho'),L('أزرق','Blue','Azul')], answer: 0, emoji: '🍌' },
  { q: () => L('ما لون الورد؟ 🌹','What color is a rose? 🌹','Qual a cor da rosa? 🌹'), options: () => [L('أحمر','Red','Vermelho'),L('أزرق','Blue','Azul'),L('أخضر','Green','Verde'),L('أصفر','Yellow','Amarelo')], answer: 0, emoji: '🌹' },

  // True/False
  { q: () => L('الثلج أبيض اللون ❄️','Snow is white ❄️','A neve é branca ❄️'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '❄️', type: 'tf' },
  { q: () => L('المثلث له 4 أضلاع','A triangle has 4 sides','O triângulo tem 4 lados'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '🔺', type: 'tf' },
];

/* ═══════════════════════════
   WORLD 2 — Animals & Nature
   ═══════════════════════════ */
const ANIMALS_NATURE = [
  { q: () => L('أين يعيش البطريق؟ 🐧','Where do penguins live? 🐧','Onde vivem os pinguins? 🐧'), options: () => [L('القطب الجنوبي','Antarctica','Antártica'),L('الغابة','Forest','Floresta'),L('الصحراء','Desert','Deserto'),L('الفضاء','Space','Espaço')], answer: 0, emoji: '🐧' },
  { q: () => L('ما أكبر حيوان على الأرض؟','What is the largest animal on Earth?','Qual o maior animal da Terra?'), options: () => [L('الحوت الأزرق','Blue Whale','Baleia Azul'),L('الفيل','Elephant','Elefante'),L('الزرافة','Giraffe','Girafa'),L('الأسد','Lion','Leão')], answer: 0, emoji: '🐋' },
  { q: () => L('ماذا يأكل الدب القطبي؟ 🐻‍❄️','What does a polar bear eat? 🐻‍❄️','O que come o urso polar? 🐻‍❄️'), options: () => [L('أسماك وفقمات','Fish and seals','Peixes e focas'),L('عشب','Grass','Grama'),L('فواكه','Fruits','Frutas'),L('شوكولاتة','Chocolate','Chocolate')], answer: 0, emoji: '🐻‍❄️' },
  { q: () => L('كم رجل للعنكبوت؟ 🕷️','How many legs does a spider have? 🕷️','Quantas patas tem uma aranha? 🕷️'), options: () => ['8','6','4','10'], answer: 0, emoji: '🕷️' },
  { q: () => L('أي حيوان يطير؟','Which animal can fly?','Qual animal pode voar?'), options: () => [L('النسر','Eagle','Águia'),L('الحوت','Whale','Baleia'),L('القط','Cat','Gato'),L('السلحفاة','Turtle','Tartaruga')], answer: 0, emoji: '🦅' },
  { q: () => L('ما صوت الأسد؟ 🦁','What sound does a lion make? 🦁','Que som faz o leão? 🦁'), options: () => [L('زئير','Roar','Rugido'),L('نباح','Bark','Latido'),L('مواء','Meow','Miau'),L('تغريد','Tweet','Canto')], answer: 0, emoji: '🦁' },
  { q: () => L('أين تعيش الأسماك؟ 🐟','Where do fish live? 🐟','Onde vivem os peixes? 🐟'), options: () => [L('الماء','Water','Água'),L('الجبل','Mountain','Montanha'),L('الصحراء','Desert','Deserto'),L('السماء','Sky','Céu')], answer: 0, emoji: '🐟' },
  { q: () => L('ما أسرع حيوان بري؟','What is the fastest land animal?','Qual o animal terrestre mais rápido?'), options: () => [L('الفهد','Cheetah','Guepardo'),L('الحصان','Horse','Cavalo'),L('الكلب','Dog','Cão'),L('الأرنب','Rabbit','Coelho')], answer: 0, emoji: '🐆' },
  { q: () => L('كم رجل للحشرة؟ 🐛','How many legs does an insect have? 🐛','Quantas patas tem um inseto? 🐛'), options: () => ['6','4','8','10'], answer: 0, emoji: '🐛' },
  { q: () => L('أي حيوان يلد بيض؟','Which animal lays eggs?','Qual animal bota ovos?'), options: () => [L('الدجاجة','Chicken','Galinha'),L('القط','Cat','Gato'),L('الكلب','Dog','Cão'),L('الحصان','Horse','Cavalo')], answer: 0, emoji: '🐔' },
  { q: () => L('ما الحيوان الأطول؟','What is the tallest animal?','Qual o animal mais alto?'), options: () => [L('الزرافة','Giraffe','Girafa'),L('الفيل','Elephant','Elefante'),L('الحصان','Horse','Cavalo'),L('النعامة','Ostrich','Avestruz')], answer: 0, emoji: '🦒' },
  { q: () => L('أين يعيش الجمل؟ 🐫','Where does a camel live? 🐫','Onde vive o camelo? 🐫'), options: () => [L('الصحراء','Desert','Deserto'),L('البحر','Sea','Mar'),L('الغابة','Forest','Floresta'),L('القطب','Pole','Polo')], answer: 0, emoji: '🐫' },
  { q: () => L('ماذا تنتج النحلة؟ 🐝','What does a bee produce? 🐝','O que a abelha produz? 🐝'), options: () => [L('عسل','Honey','Mel'),L('حليب','Milk','Leite'),L('بيض','Eggs','Ovos'),L('صوف','Wool','Lã')], answer: 0, emoji: '🐝' },
  { q: () => L('كم عين للعنكبوت عادة؟','How many eyes does a spider usually have?','Quantos olhos tem uma aranha?'), options: () => ['8','2','4','6'], answer: 0, emoji: '🕷️' },
  { q: () => L('أي حيوان يسبح؟','Which animal can swim?','Qual animal pode nadar?'), options: () => [L('الدلفين','Dolphin','Golfinho'),L('النسر','Eagle','Águia'),L('الأسد','Lion','Leão'),L('الفراشة','Butterfly','Borboleta')], answer: 0, emoji: '🐬' },
  { q: () => L('ما أكبر طائر؟','What is the largest bird?','Qual a maior ave?'), options: () => [L('النعامة','Ostrich','Avestruz'),L('النسر','Eagle','Águia'),L('الببغاء','Parrot','Papagaio'),L('الحمامة','Dove','Pomba')], answer: 0, emoji: '🦩' },
  { q: () => L('البطريق يطير','Penguins can fly','Pinguins podem voar'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '🐧', type: 'tf' },
  { q: () => L('الدلفين من الثدييات','Dolphins are mammals','Golfinhos são mamíferos'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '🐬', type: 'tf' },
  { q: () => L('القط من الزواحف','Cats are reptiles','Gatos são répteis'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '🐱', type: 'tf' },
  { q: () => L('الفيل أكبر حيوان بري','The elephant is the largest land animal','O elefante é o maior animal terrestre'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '🐘', type: 'tf' },
];

/* ═══════════════════════════
   WORLD 3 — Weather & Seasons
   ═══════════════════════════ */
const WEATHER_SEASONS = [
  { q: () => L('كم فصل في السنة؟','How many seasons are there?','Quantas estações existem?'), options: () => ['4','3','5','6'], answer: 0, emoji: '🌦️' },
  { q: () => L('في أي فصل يتساقط الثلج؟','In which season does it snow?','Em que estação neva?'), options: () => [L('الشتاء','Winter','Inverno'),L('الصيف','Summer','Verão'),L('الربيع','Spring','Primavera'),L('الخريف','Autumn','Outono')], answer: 0, emoji: '❄️' },
  { q: () => L('ماذا يسبب المطر؟','What causes rain?','O que causa chuva?'), options: () => [L('الغيوم','Clouds','Nuvens'),L('الشمس','Sun','Sol'),L('القمر','Moon','Lua'),L('النجوم','Stars','Estrelas')], answer: 0, emoji: '🌧️' },
  { q: () => L('في أي فصل تتفتح الأزهار؟','In which season do flowers bloom?','Em que estação as flores desabrocham?'), options: () => [L('الربيع','Spring','Primavera'),L('الشتاء','Winter','Inverno'),L('الخريف','Autumn','Outono'),L('الصيف','Summer','Verão')], answer: 0, emoji: '🌸' },
  { q: () => L('ما لون قوس قزح؟','How many colors in a rainbow?','Quantas cores tem o arco-íris?'), options: () => ['7','5','3','10'], answer: 0, emoji: '🌈' },
  { q: () => L('أي فصل هو الأكثر حرارة؟','Which season is the hottest?','Qual estação é mais quente?'), options: () => [L('الصيف','Summer','Verão'),L('الشتاء','Winter','Inverno'),L('الربيع','Spring','Primavera'),L('الخريف','Autumn','Outono')], answer: 0, emoji: '☀️' },
  { q: () => L('ماذا نرى في السماء ليلاً؟','What do we see in the sky at night?','O que vemos no céu à noite?'), options: () => [L('النجوم','Stars','Estrelas'),L('قوس قزح','Rainbow','Arco-íris'),L('غيوم بيضاء','White clouds','Nuvens brancas'),L('الشمس','Sun','Sol')], answer: 0, emoji: '⭐' },
  { q: () => L('من أين تأتي الرياح؟','Where does wind come from?','De onde vem o vento?'), options: () => [L('حركة الهواء','Air movement','Movimento do ar'),L('البحر','Sea','Mar'),L('الأرض','Earth','Terra'),L('القمر','Moon','Lua')], answer: 0, emoji: '💨' },
  { q: () => L('متى يكون أقصر نهار؟','When is the shortest day?','Quando é o dia mais curto?'), options: () => [L('الشتاء','Winter','Inverno'),L('الصيف','Summer','Verão'),L('الربيع','Spring','Primavera'),L('الخريف','Autumn','Outono')], answer: 0, emoji: '🌙' },
  { q: () => L('ما الذي يسبب قوس قزح؟','What causes a rainbow?','O que causa o arco-íris?'), options: () => [L('شمس ومطر','Sun and rain','Sol e chuva'),L('رياح','Wind','Vento'),L('ثلج','Snow','Neve'),L('برق','Lightning','Raio')], answer: 0, emoji: '🌈' },
  { q: () => L('في أي فصل تسقط الأوراق؟','In which season do leaves fall?','Em que estação as folhas caem?'), options: () => [L('الخريف','Autumn','Outono'),L('الربيع','Spring','Primavera'),L('الصيف','Summer','Verão'),L('الشتاء','Winter','Inverno')], answer: 0, emoji: '🍂' },
  { q: () => L('ما شكل بلورة الثلج؟','What shape is a snowflake?','Qual a forma de um floco de neve?'), options: () => [L('سداسي','Hexagonal','Hexagonal'),L('دائري','Circular','Circular'),L('مربع','Square','Quadrado'),L('مثلث','Triangular','Triangular')], answer: 0, emoji: '❄️' },
  { q: () => L('الثلج يتكون من ماء متجمد','Snow is made of frozen water','A neve é feita de água congelada'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '❄️', type: 'tf' },
  { q: () => L('البرق يأتي قبل الرعد','Lightning comes before thunder','O relâmpago vem antes do trovão'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '⚡', type: 'tf' },
  { q: () => L('الشمس كوكب','The Sun is a planet','O Sol é um planeta'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '☀️', type: 'tf' },
  { q: () => L('ما هي أبرد قارة؟','What is the coldest continent?','Qual o continente mais frio?'), options: () => [L('أنتاركتيكا','Antarctica','Antártica'),L('أوروبا','Europe','Europa'),L('آسيا','Asia','Ásia'),L('أفريقيا','Africa','África')], answer: 0, emoji: '🧊' },
  { q: () => L('ماذا يقيس مقياس الحرارة؟','What does a thermometer measure?','O que o termômetro mede?'), options: () => [L('درجة الحرارة','Temperature','Temperatura'),L('الوزن','Weight','Peso'),L('الارتفاع','Height','Altura'),L('السرعة','Speed','Velocidade')], answer: 0, emoji: '🌡️' },
  { q: () => L('أي غاز نتنفسه؟','Which gas do we breathe?','Que gás respiramos?'), options: () => [L('أكسجين','Oxygen','Oxigênio'),L('نيتروجين','Nitrogen','Nitrogênio'),L('هيدروجين','Hydrogen','Hidrogênio'),L('هيليوم','Helium','Hélio')], answer: 0, emoji: '💨' },
  { q: () => L('قوس قزح له 5 ألوان','A rainbow has 5 colors','O arco-íris tem 5 cores'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '🌈', type: 'tf' },
  { q: () => L('الماء يتجمد عند 0 درجة','Water freezes at 0°C','A água congela a 0°C'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '🧊', type: 'tf' },
];

/* ═══════════════════════════
   WORLD 4 — Numbers & Counting
   ═══════════════════════════ */
const NUMBERS = [
  { q: () => L('كم عدد أصابع اليد؟ ✋','How many fingers on one hand? ✋','Quantos dedos tem uma mão? ✋'), options: () => ['5','4','6','3'], answer: 0, emoji: '✋' },
  { q: () => L('ما الرقم الذي يلي ٣؟','What number comes after 3?','Qual número vem depois do 3?'), options: () => ['4','5','2','6'], answer: 0, emoji: '🔢' },
  { q: () => L('ما الرقم الذي قبل ٧؟','What number comes before 7?','Qual número vem antes do 7?'), options: () => ['6','5','8','7'], answer: 0, emoji: '🔢' },
  { q: () => L('كم 🍎🍎🍎؟','How many 🍎🍎🍎?','Quantas 🍎🍎🍎?'), options: () => ['3','2','4','5'], answer: 0, emoji: '🍎' },
  { q: () => L('كم 🐧🐧🐧🐧🐧؟','How many 🐧🐧🐧🐧🐧?','Quantos 🐧🐧🐧🐧🐧?'), options: () => ['5','4','6','3'], answer: 0, emoji: '🐧' },
  { q: () => L('ما الرقم الذي يلي ٩؟','What comes after 9?','O que vem depois do 9?'), options: () => ['10','8','11','7'], answer: 0, emoji: '🔟' },
  { q: () => L('أيهما أكبر: ٥ أم ٣؟','Which is bigger: 5 or 3?','Qual é maior: 5 ou 3?'), options: () => ['5','3'], answer: 0, emoji: '⚖️' },
  { q: () => L('أيهما أصغر: ٢ أم ٨؟','Which is smaller: 2 or 8?','Qual é menor: 2 ou 8?'), options: () => ['2','8'], answer: 0, emoji: '⚖️' },
  { q: () => L('كم ❄️❄️❄️❄️؟','How many ❄️❄️❄️❄️?','Quantos ❄️❄️❄️❄️?'), options: () => ['4','3','5','6'], answer: 0, emoji: '❄️' },
  { q: () => L('رتّب: ١، ٢، ؟، ٤','Order: 1, 2, ?, 4','Ordem: 1, 2, ?, 4'), options: () => ['3','5','1','6'], answer: 0, emoji: '🔢' },
  { q: () => L('كم 🌟🌟🌟🌟🌟🌟🌟؟','How many 🌟🌟🌟🌟🌟🌟🌟?','Quantos 🌟🌟🌟🌟🌟🌟🌟?'), options: () => ['7','6','8','5'], answer: 0, emoji: '🌟' },
  { q: () => L('ما الرقم الزوجي؟','Which is even?','Qual é par?'), options: () => ['4','3','5','7'], answer: 0, emoji: '🔢' },
  { q: () => L('ما الرقم الفردي؟','Which is odd?','Qual é ímpar?'), options: () => ['3','4','6','8'], answer: 0, emoji: '🔢' },
  { q: () => L('كم 🎈🎈؟','How many 🎈🎈?','Quantos 🎈🎈?'), options: () => ['2','1','3','4'], answer: 0, emoji: '🎈' },
  { q: () => L('ما العدد بين ٥ و ٧؟','What number is between 5 and 7?','Qual número está entre 5 e 7?'), options: () => ['6','4','8','5'], answer: 0, emoji: '🔢' },
  { q: () => L('كم يوم في الأسبوع؟','How many days in a week?','Quantos dias na semana?'), options: () => ['7','5','6','8'], answer: 0, emoji: '📅' },
  { q: () => L('كم شهر في السنة؟','How many months in a year?','Quantos meses no ano?'), options: () => ['12','10','11','13'], answer: 0, emoji: '📅' },
  { q: () => L('العدد ١٠ زوجي','The number 10 is even','O número 10 é par'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '🔢', type: 'tf' },
  { q: () => L('العدد ٧ أكبر من ٩','7 is greater than 9','7 é maior que 9'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '🔢', type: 'tf' },
  { q: () => L('كم ساعة في اليوم؟','How many hours in a day?','Quantas horas no dia?'), options: () => ['24','12','20','30'], answer: 0, emoji: '⏰' },
];

/* ═══════════════════════════
   WORLD 5 — Addition (generated)
   ═══════════════════════════ */
function genAddition() {
  const qs = [];
  for (let i = 0; i < 22; i++) {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const correct = a + b;
    const opts = shuffle([correct, correct + 1, correct - 1, correct + 2].map(String));
    qs.push({ q: () => `${a} + ${b} = ?`, options: () => opts, answer: 0, _correctVal: String(correct), emoji: '➕' });
  }
  return qs;
}

/* ═══════════════════════════
   WORLD 6 — Subtraction (generated)
   ═══════════════════════════ */
function genSubtraction() {
  const qs = [];
  for (let i = 0; i < 22; i++) {
    const a = Math.floor(Math.random() * 12) + 5;
    const b = Math.floor(Math.random() * Math.min(a, 10)) + 1;
    const correct = a - b;
    const opts = shuffle([correct, correct + 1, correct - 1, correct + 2].map(String));
    qs.push({ q: () => `${a} - ${b} = ?`, options: () => opts, answer: 0, _correctVal: String(correct), emoji: '➖' });
  }
  return qs;
}

/* ═══════════════════════════
   WORLD 7 — Geography
   ═══════════════════════════ */
const GEOGRAPHY = [
  { q: () => L('ما أكبر قارة؟','What is the largest continent?','Qual o maior continente?'), options: () => [L('آسيا','Asia','Ásia'),L('أفريقيا','Africa','África'),L('أوروبا','Europe','Europa'),L('أمريكا','America','América')], answer: 0, emoji: '🌏' },
  { q: () => L('كم قارة في العالم؟','How many continents are there?','Quantos continentes existem?'), options: () => ['7','5','6','8'], answer: 0, emoji: '🌍' },
  { q: () => L('ما أكبر محيط؟','What is the largest ocean?','Qual o maior oceano?'), options: () => [L('المحيط الهادئ','Pacific Ocean','Oceano Pacífico'),L('الأطلسي','Atlantic','Atlântico'),L('الهندي','Indian','Índico'),L('القطبي','Arctic','Ártico')], answer: 0, emoji: '🌊' },
  { q: () => L('في أي قارة مصر؟','On which continent is Egypt?','Em que continente fica o Egito?'), options: () => [L('أفريقيا','Africa','África'),L('آسيا','Asia','Ásia'),L('أوروبا','Europe','Europa'),L('أمريكا','America','América')], answer: 0, emoji: '🏛️' },
  { q: () => L('ما عاصمة فرنسا؟','What is the capital of France?','Qual a capital da França?'), options: () => [L('باريس','Paris','Paris'),L('لندن','London','Londres'),L('برلين','Berlin','Berlim'),L('روما','Rome','Roma')], answer: 0, emoji: '🗼' },
  { q: () => L('أين يقع أطول نهر؟','Where is the longest river?','Onde fica o rio mais longo?'), options: () => [L('أفريقيا (النيل)','Africa (Nile)','África (Nilo)'),L('آسيا','Asia','Ásia'),L('أوروبا','Europe','Europa'),L('أمريكا','America','América')], answer: 0, emoji: '🏞️' },
  { q: () => L('ما أكبر دولة مساحة؟','What is the largest country by area?','Qual o maior país em área?'), options: () => [L('روسيا','Russia','Rússia'),L('كندا','Canada','Canadá'),L('الصين','China','China'),L('أمريكا','USA','EUA')], answer: 0, emoji: '🗺️' },
  { q: () => L('أين يقع برج إيفل؟','Where is the Eiffel Tower?','Onde fica a Torre Eiffel?'), options: () => [L('فرنسا','France','França'),L('إنجلترا','England','Inglaterra'),L('إيطاليا','Italy','Itália'),L('ألمانيا','Germany','Alemanha')], answer: 0, emoji: '🗼' },
  { q: () => L('ما أصغر قارة؟','What is the smallest continent?','Qual o menor continente?'), options: () => [L('أستراليا','Australia','Austrália'),L('أوروبا','Europe','Europa'),L('أنتاركتيكا','Antarctica','Antártica'),L('أفريقيا','Africa','África')], answer: 0, emoji: '🌏' },
  { q: () => L('في أي قارة البرازيل؟','On which continent is Brazil?','Em que continente fica o Brasil?'), options: () => [L('أمريكا الجنوبية','South America','América do Sul'),L('أفريقيا','Africa','África'),L('أوروبا','Europe','Europa'),L('آسيا','Asia','Ásia')], answer: 0, emoji: '🇧🇷' },
  { q: () => L('كم محيط في العالم؟','How many oceans are there?','Quantos oceanos existem?'), options: () => ['5','4','3','7'], answer: 0, emoji: '🌊' },
  { q: () => L('أين تقع الصحراء الكبرى؟','Where is the Sahara Desert?','Onde fica o Saara?'), options: () => [L('أفريقيا','Africa','África'),L('آسيا','Asia','Ásia'),L('أستراليا','Australia','Austrália'),L('أمريكا','America','América')], answer: 0, emoji: '🏜️' },
  { q: () => L('ما أطول سلسلة جبال؟','What is the longest mountain range?','Qual a cordilheira mais longa?'), options: () => [L('الأنديز','Andes','Andes'),L('الهيمالايا','Himalayas','Himalaias'),L('الألب','Alps','Alpes'),L('الروكي','Rockies','Rochosas')], answer: 0, emoji: '🏔️' },
  { q: () => L('القطب الشمالي أدفأ من الجنوبي','The North Pole is warmer than the South Pole','O Polo Norte é mais quente que o Sul'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '🧊', type: 'tf' },
  { q: () => L('أستراليا قارة وبلد','Australia is a continent and a country','A Austrália é um continente e um país'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '🌏', type: 'tf' },
  { q: () => L('الأمازون أطول نهر','The Amazon is the longest river','O Amazonas é o rio mais longo'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '🏞️', type: 'tf' },
  { q: () => L('ما عاصمة اليابان؟','What is the capital of Japan?','Qual a capital do Japão?'), options: () => [L('طوكيو','Tokyo','Tóquio'),L('بكين','Beijing','Pequim'),L('سيول','Seoul','Seul'),L('بانكوك','Bangkok','Bangcoc')], answer: 0, emoji: '🗾' },
  { q: () => L('أين يقع جبل إيفرست؟','Where is Mount Everest?','Onde fica o Monte Everest?'), options: () => [L('آسيا','Asia','Ásia'),L('أوروبا','Europe','Europa'),L('أفريقيا','Africa','África'),L('أمريكا','America','América')], answer: 0, emoji: '🏔️' },
  { q: () => L('ما عاصمة مصر؟','What is the capital of Egypt?','Qual a capital do Egito?'), options: () => [L('القاهرة','Cairo','Cairo'),L('الرياض','Riyadh','Riade'),L('بغداد','Baghdad','Bagdá'),L('دبي','Dubai','Dubai')], answer: 0, emoji: '🏛️' },
  { q: () => L('الأرض مسطحة','The Earth is flat','A Terra é plana'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '🌍', type: 'tf' },
];

/* ═══════════════════════════
   WORLD 8 — Science
   ═══════════════════════════ */
const SCIENCE = [
  { q: () => L('ما حالات الماء؟','What are the states of water?','Quais os estados da água?'), options: () => [L('صلب، سائل، غاز','Solid, Liquid, Gas','Sólido, Líquido, Gás'),L('ساخن، بارد','Hot, Cold','Quente, Frio'),L('أبيض، أزرق','White, Blue','Branco, Azul'),L('ثقيل، خفيف','Heavy, Light','Pesado, Leve')], answer: 0, emoji: '💧' },
  { q: () => L('ماذا تحتاج النباتات للنمو؟','What do plants need to grow?','O que as plantas precisam?'), options: () => [L('ماء وشمس','Water and sun','Água e sol'),L('شوكولاتة','Chocolate','Chocolate'),L('رياح','Wind','Vento'),L('ظلام','Darkness','Escuridão')], answer: 0, emoji: '🌱' },
  { q: () => L('ما أقرب كوكب للشمس؟','Which planet is closest to the Sun?','Qual planeta mais perto do Sol?'), options: () => [L('عطارد','Mercury','Mercúrio'),L('الزهرة','Venus','Vênus'),L('الأرض','Earth','Terra'),L('المريخ','Mars','Marte')], answer: 0, emoji: '☀️' },
  { q: () => L('ما أقرب نجم للأرض؟','What is the closest star to Earth?','Qual a estrela mais perto da Terra?'), options: () => [L('الشمس','The Sun','O Sol'),L('القمر','The Moon','A Lua'),L('المريخ','Mars','Marte'),L('بولاريس','Polaris','Polaris')], answer: 0, emoji: '⭐' },
  { q: () => L('كم كوكب في المجموعة الشمسية؟','How many planets in the solar system?','Quantos planetas no sistema solar?'), options: () => ['8','9','7','10'], answer: 0, emoji: '🪐' },
  { q: () => L('ما الكوكب الأحمر؟','Which planet is called the Red Planet?','Qual planeta é chamado de Planeta Vermelho?'), options: () => [L('المريخ','Mars','Marte'),L('المشتري','Jupiter','Júpiter'),L('زحل','Saturn','Saturno'),L('الزهرة','Venus','Vênus')], answer: 0, emoji: '🔴' },
  { q: () => L('ماذا يدور حول الأرض؟','What orbits the Earth?','O que orbita a Terra?'), options: () => [L('القمر','The Moon','A Lua'),L('الشمس','The Sun','O Sol'),L('المريخ','Mars','Marte'),L('النجوم','Stars','Estrelas')], answer: 0, emoji: '🌙' },
  { q: () => L('من أين نحصل على الكهرباء؟','Where do we get electricity from?','De onde vem a eletricidade?'), options: () => [L('مصادر متعددة','Multiple sources','Várias fontes'),L('القمر','Moon','Lua'),L('البحر فقط','Sea only','Só o mar'),L('النجوم','Stars','Estrelas')], answer: 0, emoji: '⚡' },
  { q: () => L('ما المادة التي تغطي ٧١٪ من الأرض؟','What covers 71% of Earth?','O que cobre 71% da Terra?'), options: () => [L('الماء','Water','Água'),L('الرمل','Sand','Areia'),L('الجليد','Ice','Gelo'),L('الغابات','Forests','Florestas')], answer: 0, emoji: '🌍' },
  { q: () => L('ما أكبر كوكب؟','What is the largest planet?','Qual o maior planeta?'), options: () => [L('المشتري','Jupiter','Júpiter'),L('زحل','Saturn','Saturno'),L('الأرض','Earth','Terra'),L('نبتون','Neptune','Netuno')], answer: 0, emoji: '🪐' },
  { q: () => L('النباتات تنتج الأكسجين','Plants produce oxygen','As plantas produzem oxigênio'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '🌿', type: 'tf' },
  { q: () => L('الشمس تدور حول الأرض','The Sun orbits the Earth','O Sol orbita a Terra'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '☀️', type: 'tf' },
  { q: () => L('الماء يغلي عند 100 درجة','Water boils at 100°C','A água ferve a 100°C'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '💧', type: 'tf' },
  { q: () => L('المريخ له حلقات','Mars has rings','Marte tem anéis'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '🔴', type: 'tf' },
  { q: () => L('ما الغاز الذي تحتاجه النار؟','What gas does fire need?','Que gás o fogo precisa?'), options: () => [L('أكسجين','Oxygen','Oxigênio'),L('هيدروجين','Hydrogen','Hidrogênio'),L('نيتروجين','Nitrogen','Nitrogênio'),L('هيليوم','Helium','Hélio')], answer: 0, emoji: '🔥' },
  { q: () => L('ما وحدة قياس الحرارة؟','What unit measures temperature?','Qual unidade mede temperatura?'), options: () => [L('سلسيوس/فهرنهايت','Celsius/Fahrenheit','Celsius/Fahrenheit'),L('كيلوغرام','Kilogram','Quilograma'),L('متر','Meter','Metro'),L('لتر','Liter','Litro')], answer: 0, emoji: '🌡️' },
  { q: () => L('ما أصلب مادة طبيعية؟','What is the hardest natural material?','Qual o material natural mais duro?'), options: () => [L('الألماس','Diamond','Diamante'),L('الحديد','Iron','Ferro'),L('الذهب','Gold','Ouro'),L('الصخر','Rock','Rocha')], answer: 0, emoji: '💎' },
  { q: () => L('كم عظمة في جسم الإنسان؟','How many bones in the human body?','Quantos ossos no corpo humano?'), options: () => ['206','100','300','150'], answer: 0, emoji: '🦴' },
  { q: () => L('الصوت أسرع من الضوء','Sound is faster than light','O som é mais rápido que a luz'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '💡', type: 'tf' },
  { q: () => L('الجاذبية تجعل الأشياء تسقط','Gravity makes things fall','A gravidade faz as coisas caírem'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '🍎', type: 'tf' },
];

/* ═══════════════════════════
   WORLD 9 — Dinosaurs & History
   ═══════════════════════════ */
const DINOSAURS = [
  { q: () => L('متى انقرضت الديناصورات؟','When did dinosaurs go extinct?','Quando os dinossauros foram extintos?'), options: () => [L('٦٦ مليون سنة','66 million years ago','66 milhões de anos'),L('١٠٠٠ سنة','1000 years ago','1000 anos'),L('مليون سنة','1 million years','1 milhão de anos'),L('لم تنقرض','Not extinct','Não extintos')], answer: 0, emoji: '🦕' },
  { q: () => L('ما أكبر ديناصور عاشبي؟','What was the largest herbivore dinosaur?','Qual o maior dinossauro herbívoro?'), options: () => [L('أرجنتينوصور','Argentinosaurus','Argentinosaurus'),L('تي ركس','T-Rex','T-Rex'),L('ستيغوصور','Stegosaurus','Estegossauro'),L('فيلوسيرابتور','Velociraptor','Velociraptor')], answer: 0, emoji: '🦕' },
  { q: () => L('تي ركس كان يأكل؟','T-Rex was a?','T-Rex era?'), options: () => [L('لاحم','Carnivore','Carnívoro'),L('عاشب','Herbivore','Herbívoro'),L('كلاهما','Both','Ambos'),L('لا يأكل','Didn\'t eat','Não comia')], answer: 0, emoji: '🦖' },
  { q: () => L('ما الذي قتل الديناصورات؟','What killed the dinosaurs?','O que matou os dinossauros?'), options: () => [L('نيزك عملاق','Giant asteroid','Asteroide gigante'),L('بركان','Volcano','Vulcão'),L('فيضان','Flood','Enchente'),L('إنسان','Humans','Humanos')], answer: 0, emoji: '☄️' },
  { q: () => L('ما أول حضارة في التاريخ؟','What was the first civilization?','Qual foi a primeira civilização?'), options: () => [L('سومر','Sumer','Suméria'),L('مصر','Egypt','Egito'),L('الصين','China','China'),L('روما','Rome','Roma')], answer: 0, emoji: '🏛️' },
  { q: () => L('من بنى الأهرامات؟','Who built the pyramids?','Quem construiu as pirâmides?'), options: () => [L('المصريون القدماء','Ancient Egyptians','Egípcios antigos'),L('الرومان','Romans','Romanos'),L('اليونان','Greeks','Gregos'),L('الصينيون','Chinese','Chineses')], answer: 0, emoji: '🔺' },
  { q: () => L('ترايسيراتوبس له؟','Triceratops had?','Triceratops tinha?'), options: () => [L('٣ قرون','3 horns','3 chifres'),L('جناحان','Wings','Asas'),L('زعانف','Fins','Barbatanas'),L('ذيل طويل','Long tail','Cauda longa')], answer: 0, emoji: '🦕' },
  { q: () => L('الماموث كان يعيش في؟','Mammoths lived in?','Os mamutes viviam em?'), options: () => [L('العصر الجليدي','Ice Age','Era do Gelo'),L('الصحراء','Desert','Deserto'),L('الماء','Water','Água'),L('الفضاء','Space','Espaço')], answer: 0, emoji: '🦣' },
  { q: () => L('بتيرانودون كان يستطيع؟','Pteranodon could?','O Pteranodonte podia?'), options: () => [L('الطيران','Fly','Voar'),L('السباحة فقط','Only swim','Só nadar'),L('الحفر','Dig','Cavar'),L('الجري فقط','Only run','Só correr')], answer: 0, emoji: '🦅' },
  { q: () => L('الديناصورات زواحف','Dinosaurs were reptiles','Os dinossauros eram répteis'), options: () => [L('صح','True','Verdadeiro'),L('خطأ','False','Falso')], answer: 0, emoji: '🦖', type: 'tf' },
  { q: () => L('الإنسان عاش مع الديناصورات','Humans lived with dinosaurs','Os humanos viveram com dinossauros'), options: () => [L('خطأ','False','Falso'),L('صح','True','Verdadeiro')], answer: 0, emoji: '🦕', type: 'tf' },
  { q: () => L('ما عمر الأرض تقريباً؟','How old is Earth approximately?','Qual a idade aproximada da Terra?'), options: () => [L('٤.٥ مليار سنة','4.5 billion years','4,5 bilhões de anos'),L('١٠٠٠ سنة','1000 years','1000 anos'),L('مليون سنة','1 million years','1 milhão de anos'),L('٥٠٠ سنة','500 years','500 anos')], answer: 0, emoji: '🌍' },
  { q: () => L('ستيغوصور معروف بـ؟','Stegosaurus is known for?','O Estegossauro é conhecido por?'), options: () => [L('صفائح ظهره','Its back plates','Placas nas costas'),L('أجنحته','Wings','Asas'),L('قرونه','Horns','Chifres'),L('سرعته','Speed','Velocidade')], answer: 0, emoji: '🦕' },
  { q: () => L('الماموث أقرب إلى؟','Mammoths are related to?','Os mamutes são parentes de?'), options: () => [L('الفيل','Elephant','Elefante'),L('الحصان','Horse','Cavalo'),L('الدب','Bear','Urso'),L('الخنزير','Pig','Porco')], answer: 0, emoji: '🦣' },
  { q: () => L('أين اكتُشف أول ديناصور؟','Where was the first dino found?','Onde foi descoberto o 1° dino?'), options: () => [L('إنجلترا','England','Inglaterra'),L('أمريكا','USA','EUA'),L('الصين','China','China'),L('مصر','Egypt','Egito')], answer: 0, emoji: '🦴' },
  { q: () => L('الماموث كان مغطى بـ؟','Mammoths were covered in?','Os mamutes eram cobertos de?'), options: () => [L('فرو كثيف','Thick fur','Pelo espesso'),L('حراشف','Scales','Escamas'),L('ريش','Feathers','Penas'),L('لا شيء','Nothing','Nada')], answer: 0, emoji: '🦣' },
  { q: () => L('فيلوسيرابتور كان بحجم؟','Velociraptor was the size of?','O Velociraptor tinha o tamanho de?'), options: () => [L('ديك رومي','Turkey','Peru'),L('فيل','Elephant','Elefante'),L('حصان','Horse','Cavalo'),L('سيارة','Car','Carro')], answer: 0, emoji: '🦖' },
  { q: () => L('الحفريات هي؟','Fossils are?','Fósseis são?'), options: () => [L('بقايا متحجرة','Petrified remains','Restos petrificados'),L('حيوانات حية','Living animals','Animais vivos'),L('نباتات','Plants','Plantas'),L('صخور عادية','Normal rocks','Rochas normais')], answer: 0, emoji: '🦴' },
  { q: () => L('النيزك الذي قتل الديناصورات كان بعرض؟','The asteroid that killed dinos was about?','O asteroide que matou os dinos tinha cerca de?'), options: () => [L('١٠ كم','10 km','10 km'),L('١ متر','1 meter','1 metro'),L('١٠٠ كم','100 km','100 km'),L('١ كم','1 km','1 km')], answer: 0, emoji: '☄️' },
  { q: () => L('تي ركس اسمه يعني؟','T-Rex name means?','O nome T-Rex significa?'), options: () => [L('ملك السحالي الطاغية','Tyrant Lizard King','Rei dos Lagartos Tiranos'),L('ديناصور كبير','Big dinosaur','Grande dinossauro'),L('سحلية سريعة','Fast lizard','Lagarto rápido'),L('ديناصور ذكي','Smart dinosaur','Dinossauro inteligente')], answer: 0, emoji: '🦖' },
];

/* ═══════════════════════════
   WORLD 10 — Mixed (generated)
   ═══════════════════════════ */
function genMixed() {
  const all = [
    ...COLORS_SHAPES.slice(0,5),
    ...ANIMALS_NATURE.slice(0,5),
    ...WEATHER_SEASONS.slice(0,5),
    ...NUMBERS.slice(0,4),
    ...GEOGRAPHY.slice(0,4),
    ...SCIENCE.slice(0,4),
    ...DINOSAURS.slice(0,4),
    ...genAddition().slice(0,3),
    ...genSubtraction().slice(0,3),
  ];
  return shuffle(all);
}

/* ═══════════════════════════════════════════
   Main export — get questions for a level
   ═══════════════════════════════════════════ */
const BANKS = {
  colors_shapes: COLORS_SHAPES,
  animals_nature: ANIMALS_NATURE,
  weather_seasons: WEATHER_SEASONS,
  numbers: NUMBERS,
  addition: null,
  subtraction: null,
  geography: GEOGRAPHY,
  science: SCIENCE,
  dinosaurs: DINOSAURS,
  mixed: null,
};

export function getQuestions(subject, count) {
  let pool;
  if (subject === 'addition') pool = genAddition();
  else if (subject === 'subtraction') pool = genSubtraction();
  else if (subject === 'mixed') pool = genMixed();
  else pool = [...(BANKS[subject] || COLORS_SHAPES)];

  const picked = shuffle(pool).slice(0, count);

  return picked.map(raw => {
    const qText = typeof raw.q === 'function' ? raw.q() : raw.q;
    const opts = typeof raw.options === 'function' ? raw.options() : [...raw.options];

    let correctIdx = raw.answer;
    if (raw._correctVal !== undefined) {
      correctIdx = opts.indexOf(raw._correctVal);
      if (correctIdx === -1) { opts[0] = raw._correctVal; correctIdx = 0; }
    }

    return { q: qText, options: opts, answer: correctIdx, emoji: raw.emoji || '❓', type: raw.type || 'mcq' };
  });
}
