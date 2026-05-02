/**
 * Math Challenge — story.js
 * World introductions, educational math facts ("Did You Know?"),
 * and quiz bonus system — all in 3 languages (ar/en/pt)
 *
 * Exports: getWorldIntro(worldIdx), getRandomFact(worldIdx), getQuiz(worldIdx), getAllFacts(worldIdx)
 */

import { LANG } from './config.js';

// World mascots (one per world)
const MASCOTS = ['🦊','🐙','🐬','🐉','⚡','🏰','🚀','🧩','📐','👑'];
const MASCOT_NAMES = {
  ar: ['فوكسي','أوكتا','دولفي','دراغو','بولت','كاسل','نوفا','بازل','جيو','كينغ'],
  en: ['Foxy','Octa','Dolphy','Drago','Bolt','Castle','Nova','Puzzle','Geo','King'],
  pt: ['Foxy','Octa','Golfy','Drago','Bolt','Castelo','Nova','Puzzle','Geo','Rei'],
};

// ===== WORLD INTRODUCTIONS =====
const INTROS = {
  ar: [
    // W0: Number Forest (Counting)
    [
      'مرحباً بك في غابة الأعداد! 🌿',
      'أنا فوكسي، حارس هذه الغابة السحرية!',
      'هنا ستتعلم عد الأشياء والتعرف على الأرقام',
      'كل شجرة وكل زهرة لها رقم — هيا نعدّها معاً!',
      'استعد للمغامرة! 🌟',
    ],
    // W1: Addition Orchard
    [
      'أهلاً بك في بستان الجمع! 🍎',
      'أنا أوكتا وأملك ثمانية أذرع لأجمع الأعداد!',
      'الجمع يعني ضم الأشياء معاً لنعرف كم أصبح لدينا',
      'لنجمع الفواكه اللذيذة ونتعلم الجمع! 🍊',
    ],
    // W2: Subtraction Ocean
    [
      'مرحباً بمحيط الطرح! 🌊',
      'أنا دولفي! أحب القفز فوق الأمواج!',
      'الطرح يعني إزالة أشياء لنعرف كم بقي',
      'هيا نغوص في عالم الطرح المثير! 🐠',
    ],
    // W3: Multiplication Volcano
    [
      'أهلاً ببركان الضرب! 🔥',
      'أنا دراغو التنين! أنفث النار والأرقام!',
      'الضرب هو جمع سريع — مجموعات متساوية!',
      'احذر من الحمم وتعلم جداول الضرب! 🐉',
    ],
    // W4: Division Electric City
    [
      'مرحباً بمدينة القسمة الكهربائية! ⚡',
      'أنا بولت! أقسم الكهرباء على الجميع بالعدل!',
      'القسمة تعني توزيع الأشياء بالتساوي',
      'هيا نوزع ونتعلم القسمة! 💡',
    ],
    // W5: Fractions Castle
    [
      'أهلاً بقلعة الكسور! 🏰',
      'أنا حارس القلعة! هنا نقسم الأشياء لأجزاء!',
      'الكسر هو جزء من كل — مثل نصف التفاحة! 🍎',
      'استكشف القلعة وأتقن الكسور! 🛡️',
    ],
    // W6: Decimals Space
    [
      'مرحباً بفضاء الأعشار! 🌌',
      'أنا نوفا رائدة الفضاء!',
      'الأعداد العشرية دقيقة مثل حسابات الفضاء!',
      'هيا نستكشف الكواكب والأعداد العشرية! 🚀',
    ],
    // W7: Patterns Land
    [
      'أهلاً بأرض الأنماط! 🧩',
      'أنا بازل! أحب ترتيب الأشكال والألوان!',
      'الأنماط في كل مكان — في الموسيقى والطبيعة والرياضيات!',
      'اكتشف النمط واكمل التسلسل! 🎨',
    ],
    // W8: Geometry City
    [
      'مرحباً بمدينة الهندسة! 🏗️',
      'أنا جيو المهندس! أبني بالأشكال الهندسية!',
      'المثلث، المربع، الدائرة — كل شكل له خصائص مميزة!',
      'هيا نبني ونقيس! 📐',
    ],
    // W9: Algebra Kingdom
    [
      'أهلاً بمملكة الجبر! 👑',
      'أنا الملك كينغ! هذا هو التحدي الأخير والأقوى!',
      'في الجبر نبحث عن المجهول — الحرف الذي يخفي رقماً!',
      'أثبت أنك بطل الرياضيات الحقيقي! 🏆',
    ],
  ],
  en: [
    [
      'Welcome to the Number Forest! 🌿',
      "I'm Foxy, guardian of this magical forest!",
      "Here you'll learn to count things and recognize numbers",
      'Every tree and flower has a number — let us count them together!',
      "Get ready for adventure! 🌟",
    ],
    [
      'Welcome to the Addition Orchard! 🍎',
      "I'm Octa and I have eight arms to add numbers!",
      'Adding means putting things together to find out how many we have',
      "Let's pick fruits and learn addition! 🍊",
    ],
    [
      'Welcome to the Subtraction Ocean! 🌊',
      "I'm Dolphy! I love jumping over waves!",
      'Subtraction means taking away to find out how many are left',
      "Let's dive into the exciting world of subtraction! 🐠",
    ],
    [
      'Welcome to the Multiplication Volcano! 🔥',
      "I'm Drago the Dragon! I breathe fire and numbers!",
      'Multiplication is fast adding — equal groups!',
      'Watch out for the lava and learn your times tables! 🐉',
    ],
    [
      'Welcome to the Electric Division City! ⚡',
      "I'm Bolt! I divide electricity fairly for everyone!",
      'Division means sharing things equally',
      "Let's distribute and learn division! 💡",
    ],
    [
      'Welcome to the Fraction Castle! 🏰',
      "I'm the castle guardian! Here we split things into parts!",
      'A fraction is a part of a whole — like half an apple! 🍎',
      'Explore the castle and master fractions! 🛡️',
    ],
    [
      'Welcome to Decimal Space! 🌌',
      "I'm Nova the astronaut!",
      'Decimals are precise — just like space calculations!',
      "Let's explore planets and decimals! 🚀",
    ],
    [
      'Welcome to Pattern Land! 🧩',
      "I'm Puzzle! I love arranging shapes and colors!",
      'Patterns are everywhere — in music, nature, and math!',
      'Find the pattern and complete the sequence! 🎨',
    ],
    [
      'Welcome to Geometry City! 🏗️',
      "I'm Geo the engineer! I build with geometric shapes!",
      'Triangles, squares, circles — each shape has special properties!',
      "Let's build and measure! 📐",
    ],
    [
      'Welcome to the Algebra Kingdom! 👑',
      "I'm King! This is the final and strongest challenge!",
      'In algebra, we search for the unknown — a letter hiding a number!',
      'Prove you are the true math champion! 🏆',
    ],
  ],
  pt: [
    [
      'Bem-vindo à Floresta dos Números! 🌿',
      'Eu sou Foxy, guardiã desta floresta mágica!',
      'Aqui você vai aprender a contar e reconhecer números',
      'Cada árvore e flor tem um número — vamos contá-los juntos!',
      'Prepare-se para a aventura! 🌟',
    ],
    [
      'Bem-vindo ao Pomar da Adição! 🍎',
      'Eu sou Octa e tenho oito braços para somar!',
      'Somar significa juntar coisas para saber quantas temos',
      'Vamos colher frutas e aprender adição! 🍊',
    ],
    [
      'Bem-vindo ao Oceano da Subtração! 🌊',
      'Eu sou Golfy! Adoro pular sobre as ondas!',
      'Subtração significa tirar para saber quantos restam',
      'Vamos mergulhar no mundo da subtração! 🐠',
    ],
    [
      'Bem-vindo ao Vulcão da Multiplicação! 🔥',
      'Eu sou Drago o Dragão! Cuspo fogo e números!',
      'Multiplicação é soma rápida — grupos iguais!',
      'Cuidado com a lava e aprenda a tabuada! 🐉',
    ],
    [
      'Bem-vindo à Cidade Elétrica da Divisão! ⚡',
      'Eu sou Bolt! Divido eletricidade igualmente!',
      'Divisão significa compartilhar igualmente',
      'Vamos distribuir e aprender divisão! 💡',
    ],
    [
      'Bem-vindo ao Castelo das Frações! 🏰',
      'Eu sou o guardião do castelo! Aqui dividimos em partes!',
      'Uma fração é parte de um todo — como metade da maçã! 🍎',
      'Explore o castelo e domine as frações! 🛡️',
    ],
    [
      'Bem-vindo ao Espaço Decimal! 🌌',
      'Eu sou Nova, a astronauta!',
      'Decimais são precisos — como cálculos espaciais!',
      'Vamos explorar planetas e decimais! 🚀',
    ],
    [
      'Bem-vindo à Terra dos Padrões! 🧩',
      'Eu sou Puzzle! Adoro organizar formas e cores!',
      'Padrões estão em todo lugar — na música, natureza e matemática!',
      'Encontre o padrão e complete a sequência! 🎨',
    ],
    [
      'Bem-vindo à Cidade da Geometria! 🏗️',
      'Eu sou Geo, o engenheiro! Construo com formas geométricas!',
      'Triângulos, quadrados, círculos — cada forma tem propriedades!',
      'Vamos construir e medir! 📐',
    ],
    [
      'Bem-vindo ao Reino da Álgebra! 👑',
      'Eu sou o Rei! Este é o desafio final e mais forte!',
      'Na álgebra, procuramos o desconhecido — uma letra escondendo um número!',
      'Prove que você é o verdadeiro campeão da matemática! 🏆',
    ],
  ],
};

// ===== DID YOU KNOW? — Educational Math Facts =====
// 10 facts per world × 3 languages = 300 facts total
const FACTS = {
  ar: [
    // W0: Counting & Numbers
    [
      'هل تعلم؟ الصفر اخترعه العرب والهنود منذ أكثر من 1500 سنة! 0️⃣',
      'هل تعلم؟ الأرقام التي نستخدمها تسمى "الأرقام العربية" في كل العالم! 🔢',
      'هل تعلم؟ أصابع يديك هي أول آلة حاسبة في التاريخ! 🖐️',
      'هل تعلم؟ النحل يستطيع العد حتى 4! 🐝',
      'هل تعلم؟ الغراب يمكنه التمييز بين الكميات المختلفة! 🐦‍⬛',
      'هل تعلم؟ في اليابان يتعلم الأطفال الحساب على أداة اسمها "السوروبان"! 🧮',
      'هل تعلم؟ أقدم عظمة للعد عمرها 20,000 سنة وجدت في أفريقيا! 🦴',
      'هل تعلم؟ كلمة "حساب" بالعربية أصل كلمة Algorithm بالإنجليزية! 📝',
      'هل تعلم؟ الرقم 1 ليس أولياً وليس مركباً — إنه فريد! ☝️',
      'هل تعلم؟ كل الأعداد الطبيعية إما زوجية أو فردية! 🔄',
    ],
    // W1: Addition
    [
      'هل تعلم؟ علامة + اخترعها عالم ألماني عام 1489! ➕',
      'هل تعلم؟ عندما تجمع أي عدد مع الصفر تحصل على نفس العدد! 0️⃣',
      'هل تعلم؟ الجمع هو أقدم عملية حسابية عرفها الإنسان! 📜',
      'هل تعلم؟ يمكنك جمع الأعداد بأي ترتيب والنتيجة نفسها! 🔄',
      'هل تعلم؟ الكمبيوتر يجمع ملايين الأعداد في ثانية واحدة! 💻',
      'هل تعلم؟ النقود تحتاج الجمع — كل مرة تجمع مصروفك فأنت تستخدم الرياضيات! 💰',
      'هل تعلم؟ علماء الفضاء يستخدمون الجمع لحساب مسارات الصواريخ! 🚀',
      'هل تعلم؟ الدماغ يعالج عمليات الجمع البسيطة في أقل من ثانية! 🧠',
      'هل تعلم؟ في الصين القديمة استخدموا العيدان للجمع! 🥢',
      'هل تعلم؟ جمع كل الأرقام من 1 إلى 100 يساوي 5050! كارل غاوس اكتشفها وعمره 7 سنوات! 🤓',
    ],
    // W2: Subtraction
    [
      'هل تعلم؟ علامة - اخترعها نفس العالم الذي اخترع علامة +! ➖',
      'هل تعلم؟ الطرح هو عكس الجمع! ↩️',
      'هل تعلم؟ عندما تطرح عدداً من نفسه تحصل على صفر! 0️⃣',
      'هل تعلم؟ الموازنة المالية تعتمد على الطرح — الدخل ناقص المصاريف! 💵',
      'هل تعلم؟ درجة الحرارة يمكن أن تكون سالبة — وهذا طرح! ❄️',
      'هل تعلم؟ ساعة العد التنازلي تستخدم الطرح: 10، 9، 8... 🚀',
      'هل تعلم؟ الطباخ يستخدم الطرح ليعرف كم بقي من المكونات! 👨‍🍳',
      'هل تعلم؟ عمرك هو طرح سنة ميلادك من السنة الحالية! 🎂',
      'هل تعلم؟ المسافة المتبقية في الرحلة تُحسب بالطرح! 🗺️',
      'هل تعلم؟ في البرمجة نستخدم الطرح لحساب الفرق بين القيم! 👨‍💻',
    ],
    // W3: Multiplication
    [
      'هل تعلم؟ علامة × اخترعها عالم إنجليزي عام 1631! ✖️',
      'هل تعلم؟ أي عدد مضروب في 1 يبقى كما هو! ☝️',
      'هل تعلم؟ أي عدد مضروب في 0 يساوي 0! 0️⃣',
      'هل تعلم؟ جداول الضرب موجودة في ألواح بابلية عمرها 4000 سنة! 📜',
      'هل تعلم؟ حاسوبك يقوم بمليارات عمليات الضرب كل ثانية! 💻',
      'هل تعلم؟ الضرب يوفر الوقت — بدلاً من جمع 5+5+5 نكتب 5×3! ⏰',
      'هل تعلم؟ مساحة الغرفة تُحسب بالضرب: الطول × العرض! 🏠',
      'هل تعلم؟ خدعة ضرب 9: مجموع أرقام النتيجة دائماً 9! 🪄',
      'هل تعلم؟ النجوم في المجرة ≈ 200,000,000,000 — نستخدم الضرب لكتابتها! ⭐',
      'هل تعلم؟ جسمك يضاعف خلاياه بالضرب — خلية واحدة تصبح اثنتين! 🫀',
    ],
    // W4: Division
    [
      'هل تعلم؟ علامة ÷ اخترعها عالم سويسري عام 1659! ➗',
      'هل تعلم؟ القسمة هي عكس الضرب! ↩️',
      'هل تعلم؟ لا يمكن القسمة على صفر — إنها قاعدة ذهبية! ⚠️',
      'هل تعلم؟ تقسيم البيتزا بالتساوي هو تطبيق للقسمة! 🍕',
      'هل تعلم؟ الوقت يستخدم القسمة — 60 دقيقة ÷ 4 = 15 دقيقة لكل ربع! ⏰',
      'هل تعلم؟ عند توزيع الحلوى بالتساوي، أنت تقسم! 🍬',
      'هل تعلم؟ القسمة تساعد في معرفة السرعة: المسافة ÷ الوقت! 🚗',
      'هل تعلم؟ المعدل الدراسي يُحسب بالقسمة! 📊',
      'هل تعلم؟ الخوارزمي كتب أول كتاب عن القسمة الطويلة! 📚',
      'هل تعلم؟ النسبة المئوية تعني القسمة على 100! 💯',
    ],
    // W5: Fractions
    [
      'هل تعلم؟ المصريون القدماء استخدموا الكسور قبل 4000 سنة! 🏛️',
      'هل تعلم؟ كسر النصف ½ هو أشهر كسر في العالم! ½',
      'هل تعلم؟ النوتات الموسيقية تعتمد على الكسور! 🎵',
      'هل تعلم؟ الطبخ يستخدم الكسور: ¼ كوب سكر! 🧑‍🍳',
      'هل تعلم؟ ⅓ من حياتك تقضيها نائماً — كسر حقيقي! 😴',
      'هل تعلم؟ الساعة مقسمة إلى كسور: ¼ و ½ و ¾! ⏰',
      'هل تعلم؟ كلمة "كسر" بالإنجليزية Fraction تعني "كسر" بالعربية! 📝',
      'هل تعلم؟ بيتزا مقسمة 8 قطع: كل قطعة = ⅛! 🍕',
      'هل تعلم؟ 0.5 = ½ — الكسور والأعشار أصدقاء! 🤝',
      'هل تعلم؟ الرياضيون استخدموا الكسور لبناء الأهرامات بدقة! 📐',
    ],
    // W6: Decimals
    [
      'هل تعلم؟ الفاصلة العشرية اخترعها عالم اسكتلندي عام 1614! 📝',
      'هل تعلم؟ النقود تستخدم الأعشار: 3.50 ريال! 💰',
      'هل تعلم؟ درجة حرارة جسمك الطبيعية 36.6 درجة — عدد عشري! 🌡️',
      'هل تعلم؟ سباقات الأولمبياد تقاس بأعشار الثانية! ⏱️',
      'هل تعلم؟ π (بي) = 3.14159... عدد عشري لا ينتهي! 🥧',
      'هل تعلم؟ الميزان يقيس الوزن بالأعشار: 2.5 كيلو! ⚖️',
      'هل تعلم؟ GPS يستخدم أعشاراً دقيقة جداً لتحديد موقعك! 📍',
      'هل تعلم؟ 0.1 + 0.2 لا يساوي 0.3 تماماً في الكمبيوتر! 💻',
      'هل تعلم؟ معدلك الدراسي عدد عشري مثل 3.75! 📊',
      'هل تعلم؟ نسبة الذهب = 1.618... تجعل الأشياء جميلة! ✨',
    ],
    // W7: Patterns & Sequences
    [
      'هل تعلم؟ متتالية فيبوناتشي 1,1,2,3,5,8,13 موجودة في الطبيعة! 🌻',
      'هل تعلم؟ أوراق الأشجار ترتب نفسها بنمط حلزوني رياضي! 🍃',
      'هل تعلم؟ الأنماط في الموسيقى تجعلها ممتعة للأذن! 🎶',
      'هل تعلم؟ قشرة الأناناس تتبع نمط فيبوناتشي! 🍍',
      'هل تعلم؟ ندف الثلج تتبع أنماطاً هندسية سداسية! ❄️',
      'هل تعلم؟ شفرة مورس تستخدم أنماطاً من النقاط والخطوط! 📡',
      'هل تعلم؟ DNA في جسمك يتبع نمطاً حلزونياً مزدوجاً! 🧬',
      'هل تعلم؟ الأعداد الأولية تتبع نمطاً غامضاً لم يكتشف بعد! 🔍',
      'هل تعلم؟ التشفير يعتمد على أنماط رياضية معقدة! 🔐',
      'هل تعلم؟ خلايا النحل سداسية لأنها النمط الأكثر كفاءة! 🐝',
    ],
    // W8: Geometry
    [
      'هل تعلم؟ كلمة "هندسة" تعني "قياس الأرض" باليونانية! 🌍',
      'هل تعلم؟ الأهرامات مبنية بأشكال هندسية مثالية! 🔺',
      'هل تعلم؟ الدائرة هي الشكل الذي له أكبر مساحة بأقل محيط! ⭕',
      'هل تعلم؟ المثلث هو أقوى شكل هندسي في البناء! 🔺',
      'هل تعلم؟ كرة القدم مصنوعة من مضلعات خماسية وسداسية! ⚽',
      'هل تعلم؟ خلايا النحل سداسية الشكل بدقة مذهلة! 🐝',
      'هل تعلم؟ الكون قد يكون على شكل كرة عملاقة! 🌌',
      'هل تعلم؟ العلماء يستخدمون الهندسة لتصميم الطائرات! ✈️',
      'هل تعلم؟ مجموع زوايا أي مثلث = 180 درجة دائماً! 📐',
      'هل تعلم؟ إقليدس كتب أهم كتاب في الهندسة: "العناصر"! 📚',
    ],
    // W9: Algebra
    [
      'هل تعلم؟ كلمة "الجبر" عربية اخترعها الخوارزمي! 📜',
      'هل تعلم؟ الخوارزمي يلقب بأبي الجبر — عالم مسلم عبقري! 🧑‍🏫',
      'هل تعلم؟ X في المعادلات جاءت من كلمة "شيء" بالعربية! 🔤',
      'هل تعلم؟ أينشتاين استخدم الجبر في نظرية النسبية: E=mc²! ⚛️',
      'هل تعلم؟ ألعاب الفيديو تستخدم الجبر لحساب الحركة! 🎮',
      'هل تعلم؟ البرمجة هي جبر تطبيقي — المتغيرات مثل X! 💻',
      'هل تعلم؟ Google يستخدم معادلات جبرية لترتيب نتائج البحث! 🔍',
      'هل تعلم؟ الهاتف الذكي يحل ملايين المعادلات كل ثانية! 📱',
      'هل تعلم؟ الجبر يساعد العلماء على التنبؤ بالطقس! 🌤️',
      'هل تعلم؟ كتاب الخوارزمي في الجبر عمره أكثر من 1200 سنة! 📖',
    ],
  ],
  en: [
    [
      'Did you know? Zero was invented by Arab and Indian scholars over 1500 years ago! 0️⃣',
      'Did you know? The digits we use are called "Arabic numerals" worldwide! 🔢',
      'Did you know? Your fingers are the first calculator in history! 🖐️',
      'Did you know? Bees can count up to 4! 🐝',
      'Did you know? Crows can distinguish between different quantities! 🐦‍⬛',
      'Did you know? In Japan, kids learn math on an abacus called "Soroban"! 🧮',
      'Did you know? The oldest counting bone is 20,000 years old, found in Africa! 🦴',
      'Did you know? The word "algorithm" comes from the Arabic mathematician Al-Khwarizmi! 📝',
      'Did you know? The number 1 is neither prime nor composite — it is unique! ☝️',
      'Did you know? Every natural number is either even or odd! 🔄',
    ],
    [
      'Did you know? The + sign was invented by a German scholar in 1489! ➕',
      'Did you know? Adding zero to any number gives the same number! 0️⃣',
      'Did you know? Addition is the oldest math operation known to humans! 📜',
      'Did you know? You can add numbers in any order and get the same result! 🔄',
      'Did you know? A computer can add millions of numbers in one second! 💻',
      'Did you know? Money needs addition — counting your savings is math! 💰',
      'Did you know? Space scientists use addition to calculate rocket paths! 🚀',
      'Did you know? Your brain processes simple additions in less than a second! 🧠',
      'Did you know? In ancient China, they used sticks for addition! 🥢',
      'Did you know? Adding 1 to 100 equals 5050! Gauss discovered this at age 7! 🤓',
    ],
    [
      'Did you know? The − sign was invented by the same person who created +! ➖',
      'Did you know? Subtraction is the opposite of addition! ↩️',
      'Did you know? Subtracting a number from itself always gives zero! 0️⃣',
      'Did you know? Budgets rely on subtraction — income minus expenses! 💵',
      'Did you know? Temperature can be negative — that is subtraction! ❄️',
      'Did you know? Countdown timers use subtraction: 10, 9, 8... 🚀',
      'Did you know? Cooks use subtraction to know how much ingredient is left! 👨‍🍳',
      'Did you know? Your age is subtraction — current year minus birth year! 🎂',
      'Did you know? Remaining distance on a trip is calculated by subtraction! 🗺️',
      'Did you know? Programmers use subtraction to calculate differences! 👨‍💻',
    ],
    [
      'Did you know? The × sign was invented by an English scholar in 1631! ✖️',
      'Did you know? Any number multiplied by 1 stays the same! ☝️',
      'Did you know? Any number multiplied by 0 equals 0! 0️⃣',
      'Did you know? Multiplication tables exist on Babylonian tablets 4000 years old! 📜',
      'Did you know? Your computer does billions of multiplications every second! 💻',
      'Did you know? Multiplication saves time — instead of 5+5+5, write 5×3! ⏰',
      'Did you know? Room area is calculated by multiplication: length × width! 🏠',
      'Did you know? The 9 times trick: digits of the result always add to 9! 🪄',
      'Did you know? Stars in our galaxy ≈ 200,000,000,000 — we use multiplication! ⭐',
      'Did you know? Your body multiplies cells — one cell becomes two! 🫀',
    ],
    [
      'Did you know? The ÷ sign was invented by a Swiss scholar in 1659! ➗',
      'Did you know? Division is the opposite of multiplication! ↩️',
      'Did you know? You cannot divide by zero — it is a golden rule! ⚠️',
      'Did you know? Sharing pizza equally is an application of division! 🍕',
      'Did you know? Time uses division — 60 minutes ÷ 4 = 15 minutes per quarter! ⏰',
      'Did you know? When you share candy equally, you are dividing! 🍬',
      'Did you know? Division helps find speed: distance ÷ time! 🚗',
      'Did you know? Grade point averages are calculated by division! 📊',
      'Did you know? Al-Khwarizmi wrote the first book on long division! 📚',
      'Did you know? Percentage means dividing by 100! 💯',
    ],
    [
      'Did you know? Ancient Egyptians used fractions 4000 years ago! 🏛️',
      'Did you know? One-half ½ is the most famous fraction in the world! ½',
      'Did you know? Musical notes are based on fractions! 🎵',
      'Did you know? Cooking uses fractions: ¼ cup of sugar! 🧑‍🍳',
      'Did you know? ⅓ of your life is spent sleeping — a real fraction! 😴',
      'Did you know? A clock is divided into fractions: ¼, ½, and ¾! ⏰',
      'Did you know? The word "fraction" means "broken" in Latin! 📝',
      'Did you know? A pizza cut into 8 slices: each slice = ⅛! 🍕',
      'Did you know? 0.5 = ½ — fractions and decimals are friends! 🤝',
      'Did you know? Mathematicians used fractions to build the pyramids! 📐',
    ],
    [
      'Did you know? The decimal point was invented by a Scottish scholar in 1614! 📝',
      'Did you know? Money uses decimals: $3.50! 💰',
      'Did you know? Normal body temperature is 36.6°C — a decimal! 🌡️',
      'Did you know? Olympic races are measured in tenths of a second! ⏱️',
      'Did you know? π (pi) = 3.14159... a never-ending decimal! 🥧',
      'Did you know? Scales measure weight in decimals: 2.5 kg! ⚖️',
      'Did you know? GPS uses very precise decimals to locate you! 📍',
      'Did you know? 0.1 + 0.2 does not exactly equal 0.3 in computers! 💻',
      'Did you know? Your GPA is a decimal like 3.75! 📊',
      'Did you know? The golden ratio = 1.618... makes things beautiful! ✨',
    ],
    [
      'Did you know? The Fibonacci sequence 1,1,2,3,5,8,13 exists in nature! 🌻',
      'Did you know? Tree leaves arrange themselves in mathematical spiral patterns! 🍃',
      'Did you know? Patterns in music make it enjoyable to listen to! 🎶',
      'Did you know? Pineapple skin follows the Fibonacci pattern! 🍍',
      'Did you know? Snowflakes follow hexagonal geometric patterns! ❄️',
      'Did you know? Morse code uses patterns of dots and dashes! 📡',
      'Did you know? DNA in your body follows a double helix pattern! 🧬',
      'Did you know? Prime numbers follow a mysterious unsolved pattern! 🔍',
      'Did you know? Encryption relies on complex mathematical patterns! 🔐',
      'Did you know? Bee honeycombs are hexagonal — the most efficient pattern! 🐝',
    ],
    [
      'Did you know? "Geometry" means "earth measurement" in Greek! 🌍',
      'Did you know? The pyramids are built with perfect geometric shapes! 🔺',
      'Did you know? A circle has the largest area for the smallest perimeter! ⭕',
      'Did you know? The triangle is the strongest shape in construction! 🔺',
      'Did you know? A soccer ball is made of pentagons and hexagons! ⚽',
      'Did you know? Bee honeycombs are perfectly hexagonal! 🐝',
      'Did you know? The universe might be shaped like a giant sphere! 🌌',
      'Did you know? Scientists use geometry to design airplanes! ✈️',
      'Did you know? The angles of any triangle always add up to 180°! 📐',
      'Did you know? Euclid wrote the most important geometry book: "Elements"! 📚',
    ],
    [
      'Did you know? The word "algebra" is Arabic, coined by Al-Khwarizmi! 📜',
      'Did you know? Al-Khwarizmi is called the Father of Algebra! 🧑‍🏫',
      'Did you know? X in equations came from the Arabic word for "thing"! 🔤',
      'Did you know? Einstein used algebra in his theory of relativity: E=mc²! ⚛️',
      'Did you know? Video games use algebra to calculate movement! 🎮',
      'Did you know? Programming is applied algebra — variables are like X! 💻',
      'Did you know? Google uses algebraic equations to rank search results! 🔍',
      'Did you know? Your smartphone solves millions of equations every second! 📱',
      'Did you know? Algebra helps scientists predict the weather! 🌤️',
      "Did you know? Al-Khwarizmi's algebra book is over 1200 years old! 📖",
    ],
  ],
  pt: [
    [
      'Sabia que? O zero foi inventado por árabes e indianos há mais de 1500 anos! 0️⃣',
      'Sabia que? Os dígitos que usamos são chamados "algarismos arábicos"! 🔢',
      'Sabia que? Seus dedos são a primeira calculadora da história! 🖐️',
      'Sabia que? Abelhas conseguem contar até 4! 🐝',
      'Sabia que? Corvos distinguem quantidades diferentes! 🐦‍⬛',
      'Sabia que? No Japão, crianças aprendem matemática no "Soroban"! 🧮',
      'Sabia que? O osso de contagem mais antigo tem 20.000 anos, da África! 🦴',
      'Sabia que? A palavra "algoritmo" vem do matemático Al-Khwarizmi! 📝',
      'Sabia que? O número 1 não é primo nem composto — é único! ☝️',
      'Sabia que? Todo número natural é par ou ímpar! 🔄',
    ],
    [
      'Sabia que? O sinal + foi inventado por um alemão em 1489! ➕',
      'Sabia que? Somar zero a qualquer número dá o mesmo número! 0️⃣',
      'Sabia que? Adição é a operação mais antiga conhecida! 📜',
      'Sabia que? Você pode somar números em qualquer ordem! 🔄',
      'Sabia que? Um computador soma milhões de números por segundo! 💻',
      'Sabia que? Dinheiro precisa de adição — contar economias é matemática! 💰',
      'Sabia que? Cientistas espaciais usam adição para calcular trajetórias! 🚀',
      'Sabia que? Seu cérebro processa somas simples em menos de 1 segundo! 🧠',
      'Sabia que? Na China antiga usavam palitos para somar! 🥢',
      'Sabia que? Somar 1 a 100 = 5050! Gauss descobriu isso aos 7 anos! 🤓',
    ],
    [
      'Sabia que? O sinal − foi inventado pela mesma pessoa que criou o +! ➖',
      'Sabia que? Subtração é o oposto da adição! ↩️',
      'Sabia que? Subtrair um número dele mesmo sempre dá zero! 0️⃣',
      'Sabia que? Orçamentos dependem de subtração — renda menos gastos! 💵',
      'Sabia que? A temperatura pode ser negativa — isso é subtração! ❄️',
      'Sabia que? Contagem regressiva usa subtração: 10, 9, 8... 🚀',
      'Sabia que? Cozinheiros usam subtração para saber ingredientes restantes! 👨‍🍳',
      'Sabia que? Sua idade é subtração — ano atual menos ano de nascimento! 🎂',
      'Sabia que? Distância restante numa viagem é calculada por subtração! 🗺️',
      'Sabia que? Programadores usam subtração para calcular diferenças! 👨‍💻',
    ],
    [
      'Sabia que? O sinal × foi inventado por um inglês em 1631! ✖️',
      'Sabia que? Qualquer número multiplicado por 1 fica igual! ☝️',
      'Sabia que? Qualquer número multiplicado por 0 dá 0! 0️⃣',
      'Sabia que? Tabuadas existem em tábuas babilônicas de 4000 anos! 📜',
      'Sabia que? Seu computador faz bilhões de multiplicações por segundo! 💻',
      'Sabia que? Multiplicação economiza tempo — em vez de 5+5+5, 5×3! ⏰',
      'Sabia que? Área de um quarto = comprimento × largura! 🏠',
      'Sabia que? Truque do 9: os dígitos do resultado sempre somam 9! 🪄',
      'Sabia que? Estrelas na galáxia ≈ 200 bilhões — usamos multiplicação! ⭐',
      'Sabia que? Seu corpo multiplica células — uma vira duas! 🫀',
    ],
    [
      'Sabia que? O sinal ÷ foi inventado por um suíço em 1659! ➗',
      'Sabia que? Divisão é o oposto da multiplicação! ↩️',
      'Sabia que? Não se pode dividir por zero — é regra de ouro! ⚠️',
      'Sabia que? Dividir pizza igualmente é aplicação de divisão! 🍕',
      'Sabia que? O tempo usa divisão — 60 min ÷ 4 = 15 min por quarto! ⏰',
      'Sabia que? Ao dividir doces igualmente, você está dividindo! 🍬',
      'Sabia que? Divisão ajuda a calcular velocidade: distância ÷ tempo! 🚗',
      'Sabia que? Médias escolares são calculadas por divisão! 📊',
      'Sabia que? Al-Khwarizmi escreveu o primeiro livro de divisão longa! 📚',
      'Sabia que? Porcentagem significa dividir por 100! 💯',
    ],
    [
      'Sabia que? Egípcios antigos usaram frações há 4000 anos! 🏛️',
      'Sabia que? Um meio ½ é a fração mais famosa do mundo! ½',
      'Sabia que? Notas musicais são baseadas em frações! 🎵',
      'Sabia que? Culinária usa frações: ¼ de xícara de açúcar! 🧑‍🍳',
      'Sabia que? ⅓ da sua vida é dormindo — uma fração real! 😴',
      'Sabia que? O relógio é dividido em frações: ¼, ½ e ¾! ⏰',
      'Sabia que? "Fração" vem do latim e significa "quebrado"! 📝',
      'Sabia que? Pizza cortada em 8: cada fatia = ⅛! 🍕',
      'Sabia que? 0,5 = ½ — frações e decimais são amigos! 🤝',
      'Sabia que? Matemáticos usaram frações para construir as pirâmides! 📐',
    ],
    [
      'Sabia que? O ponto decimal foi inventado por um escocês em 1614! 📝',
      'Sabia que? Dinheiro usa decimais: R$3,50! 💰',
      'Sabia que? Temperatura corporal normal é 36,6°C — um decimal! 🌡️',
      'Sabia que? Corridas olímpicas são medidas em décimos de segundo! ⏱️',
      'Sabia que? π (pi) = 3,14159... um decimal infinito! 🥧',
      'Sabia que? Balanças medem peso em decimais: 2,5 kg! ⚖️',
      'Sabia que? GPS usa decimais muito precisos para localizar você! 📍',
      'Sabia que? 0,1 + 0,2 não é exatamente 0,3 no computador! 💻',
      'Sabia que? Sua média escolar é um decimal como 3,75! 📊',
      'Sabia que? A proporção áurea = 1,618... torna as coisas belas! ✨',
    ],
    [
      'Sabia que? A sequência Fibonacci 1,1,2,3,5,8,13 existe na natureza! 🌻',
      'Sabia que? Folhas de árvores se organizam em espirais matemáticas! 🍃',
      'Sabia que? Padrões na música a tornam agradável de ouvir! 🎶',
      'Sabia que? A casca do abacaxi segue o padrão Fibonacci! 🍍',
      'Sabia que? Flocos de neve seguem padrões hexagonais! ❄️',
      'Sabia que? Código Morse usa padrões de pontos e traços! 📡',
      'Sabia que? O DNA segue um padrão de dupla hélice! 🧬',
      'Sabia que? Números primos seguem um padrão misterioso não resolvido! 🔍',
      'Sabia que? Criptografia depende de padrões matemáticos complexos! 🔐',
      'Sabia que? Favos de abelha são hexagonais — o padrão mais eficiente! 🐝',
    ],
    [
      'Sabia que? "Geometria" significa "medida da terra" em grego! 🌍',
      'Sabia que? As pirâmides foram construídas com formas geométricas perfeitas! 🔺',
      'Sabia que? O círculo tem a maior área para o menor perímetro! ⭕',
      'Sabia que? O triângulo é a forma mais forte na construção! 🔺',
      'Sabia que? Uma bola de futebol é feita de pentágonos e hexágonos! ⚽',
      'Sabia que? Favos de abelha são perfeitamente hexagonais! 🐝',
      'Sabia que? O universo pode ter forma de esfera gigante! 🌌',
      'Sabia que? Cientistas usam geometria para projetar aviões! ✈️',
      'Sabia que? Os ângulos de qualquer triângulo somam 180°! 📐',
      'Sabia que? Euclides escreveu o livro mais importante de geometria! 📚',
    ],
    [
      'Sabia que? A palavra "álgebra" é árabe, criada por Al-Khwarizmi! 📜',
      'Sabia que? Al-Khwarizmi é chamado de Pai da Álgebra! 🧑‍🏫',
      'Sabia que? O X nas equações veio da palavra árabe para "coisa"! 🔤',
      'Sabia que? Einstein usou álgebra na relatividade: E=mc²! ⚛️',
      'Sabia que? Jogos usam álgebra para calcular movimento! 🎮',
      'Sabia que? Programação é álgebra aplicada — variáveis são como X! 💻',
      'Sabia que? Google usa equações algébricas para classificar resultados! 🔍',
      'Sabia que? Seu celular resolve milhões de equações por segundo! 📱',
      'Sabia que? Álgebra ajuda cientistas a prever o tempo! 🌤️',
      'Sabia que? O livro de álgebra de Al-Khwarizmi tem mais de 1200 anos! 📖',
    ],
  ],
};

// ===== QUIZ SYSTEM =====
const QUIZZES = {
  ar: [
    // W0: Counting
    [
      { q: 'كم إصبع في يديك الاثنتين؟', a: ['8','10','12'], correct: 1 },
      { q: 'ما العدد الذي يأتي بعد 7؟', a: ['6','8','9'], correct: 1 },
      { q: 'أي عدد هو الأصغر؟', a: ['5','3','7'], correct: 1 },
    ],
    // W1: Addition
    [
      { q: 'كم يساوي 3 + 4؟', a: ['6','7','8'], correct: 1 },
      { q: 'مجموع 1 إلى 10 هو؟', a: ['45','50','55'], correct: 2 },
      { q: 'أي عدد + 0 = نفسه؟', a: ['فقط 1','فقط 10','كل الأعداد'], correct: 2 },
    ],
    // W2: Subtraction
    [
      { q: 'كم يساوي 10 - 3؟', a: ['6','7','8'], correct: 1 },
      { q: 'أي عدد - نفسه = ؟', a: ['1','0','العدد نفسه'], correct: 1 },
      { q: 'اذا كان لديك 8 تفاحات واكلت 3، كم بقي؟', a: ['4','5','6'], correct: 1 },
    ],
    // W3: Multiplication
    [
      { q: 'كم يساوي 6 × 7؟', a: ['36','42','48'], correct: 1 },
      { q: 'أي عدد × 0 = ؟', a: ['العدد نفسه','1','0'], correct: 2 },
      { q: 'جدول ضرب أي عدد تنتهي أرقامه بنمط؟', a: ['5','3','7'], correct: 0 },
    ],
    // W4: Division
    [
      { q: 'كم يساوي 20 ÷ 4؟', a: ['4','5','6'], correct: 1 },
      { q: 'هل يمكن القسمة على صفر؟', a: ['نعم','لا','أحياناً'], correct: 1 },
      { q: '100 ÷ 100 = ؟', a: ['0','1','100'], correct: 1 },
    ],
    // W5-W9
    [{ q: 'ما هو نصف 1؟', a: ['0.25','0.5','0.75'], correct: 1 }],
    [{ q: 'كم يساوي 0.1 + 0.2 تقريباً؟', a: ['0.3','0.12','0.03'], correct: 0 }],
    [{ q: 'ما العدد التالي: 1, 1, 2, 3, 5, ?', a: ['7','8','6'], correct: 1 }],
    [{ q: 'كم زاوية للمثلث؟', a: ['2','3','4'], correct: 1 }],
    [{ q: 'إذا كان x + 3 = 7، كم يساوي x؟', a: ['3','4','5'], correct: 1 }],
  ],
  en: [
    [
      { q: 'How many fingers on both hands?', a: ['8','10','12'], correct: 1 },
      { q: 'What number comes after 7?', a: ['6','8','9'], correct: 1 },
      { q: 'Which number is smallest?', a: ['5','3','7'], correct: 1 },
    ],
    [
      { q: 'What is 3 + 4?', a: ['6','7','8'], correct: 1 },
      { q: 'Sum of 1 to 10 is?', a: ['45','50','55'], correct: 2 },
      { q: 'Any number + 0 = ?', a: ['Only 1','Only 10','The same number'], correct: 2 },
    ],
    [
      { q: 'What is 10 - 3?', a: ['6','7','8'], correct: 1 },
      { q: 'Any number minus itself = ?', a: ['1','0','The number itself'], correct: 1 },
      { q: 'You have 8 apples, eat 3. How many left?', a: ['4','5','6'], correct: 1 },
    ],
    [
      { q: 'What is 6 × 7?', a: ['36','42','48'], correct: 1 },
      { q: 'Any number × 0 = ?', a: ['The number','1','0'], correct: 2 },
      { q: 'Which times table always ends in a pattern?', a: ['5','3','7'], correct: 0 },
    ],
    [
      { q: 'What is 20 ÷ 4?', a: ['4','5','6'], correct: 1 },
      { q: 'Can you divide by zero?', a: ['Yes','No','Sometimes'], correct: 1 },
      { q: '100 ÷ 100 = ?', a: ['0','1','100'], correct: 1 },
    ],
    [{ q: 'What is half of 1?', a: ['0.25','0.5','0.75'], correct: 1 }],
    [{ q: 'What is 0.1 + 0.2 approximately?', a: ['0.3','0.12','0.03'], correct: 0 }],
    [{ q: 'Next number: 1, 1, 2, 3, 5, ?', a: ['7','8','6'], correct: 1 }],
    [{ q: 'How many angles in a triangle?', a: ['2','3','4'], correct: 1 }],
    [{ q: 'If x + 3 = 7, what is x?', a: ['3','4','5'], correct: 1 }],
  ],
  pt: [
    [
      { q: 'Quantos dedos nas duas mãos?', a: ['8','10','12'], correct: 1 },
      { q: 'Que número vem depois do 7?', a: ['6','8','9'], correct: 1 },
      { q: 'Qual número é menor?', a: ['5','3','7'], correct: 1 },
    ],
    [
      { q: 'Quanto é 3 + 4?', a: ['6','7','8'], correct: 1 },
      { q: 'Soma de 1 a 10 é?', a: ['45','50','55'], correct: 2 },
      { q: 'Qualquer número + 0 = ?', a: ['Só o 1','Só o 10','O mesmo número'], correct: 2 },
    ],
    [
      { q: 'Quanto é 10 - 3?', a: ['6','7','8'], correct: 1 },
      { q: 'Qualquer número menos ele mesmo = ?', a: ['1','0','O próprio número'], correct: 1 },
      { q: 'Você tem 8 maçãs, come 3. Quantas restam?', a: ['4','5','6'], correct: 1 },
    ],
    [
      { q: 'Quanto é 6 × 7?', a: ['36','42','48'], correct: 1 },
      { q: 'Qualquer número × 0 = ?', a: ['O número','1','0'], correct: 2 },
      { q: 'Qual tabuada sempre termina em padrão?', a: ['5','3','7'], correct: 0 },
    ],
    [
      { q: 'Quanto é 20 ÷ 4?', a: ['4','5','6'], correct: 1 },
      { q: 'Pode dividir por zero?', a: ['Sim','Não','Às vezes'], correct: 1 },
      { q: '100 ÷ 100 = ?', a: ['0','1','100'], correct: 1 },
    ],
    [{ q: 'Qual é a metade de 1?', a: ['0,25','0,5','0,75'], correct: 1 }],
    [{ q: 'Quanto é 0,1 + 0,2 aproximadamente?', a: ['0,3','0,12','0,03'], correct: 0 }],
    [{ q: 'Próximo número: 1, 1, 2, 3, 5, ?', a: ['7','8','6'], correct: 1 }],
    [{ q: 'Quantos ângulos tem um triângulo?', a: ['2','3','4'], correct: 1 }],
    [{ q: 'Se x + 3 = 7, quanto é x?', a: ['3','4','5'], correct: 1 }],
  ],
};

// ===== PUBLIC API =====

export function getWorldIntro(worldIdx) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const lines = INTROS[lang]?.[worldIdx];
  if (!lines) return null;
  return {
    mascot: MASCOTS[worldIdx],
    name: MASCOT_NAMES[lang]?.[worldIdx] || '',
    lines,
  };
}

export function getRandomFact(worldIdx) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const worldFacts = FACTS[lang]?.[worldIdx];
  if (!worldFacts || worldFacts.length === 0) return null;
  return worldFacts[Math.floor(Math.random() * worldFacts.length)];
}

export function getQuiz(worldIdx) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const quizzes = QUIZZES[lang]?.[worldIdx];
  if (!quizzes || quizzes.length === 0) return null;
  return quizzes[Math.floor(Math.random() * quizzes.length)];
}

export function getAllFacts(worldIdx) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  return FACTS[lang]?.[worldIdx] || [];
}
