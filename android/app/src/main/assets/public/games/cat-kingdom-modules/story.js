/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Story Module
   World Intros, Fun Facts, Between-Level Learning
   Pattern: matches gem-kingdom-modules/story.js
   ═══════════════════════════════════════════════════════════════ */

import { LANG, L } from './i18n.js';

/* ══════════════════════════════
   World Intro Stories (shown on first visit)
   ══════════════════════════════ */
const WORLD_INTROS = {
  w1: {
    emoji: '🌈',
    title: L('عالم الألوان والأشكال', 'Colors & Shapes World', 'Mundo das Cores e Formas'),
    story: L(
      'مرحباً يا صديقي! 🐱 أنا القط الصغير وأحتاج مساعدتك! الألوان اختفت من هذا العالم السحري. هل يمكنك مساعدتي في إعادتها؟ هيا نتعلم عن الألوان والأشكال معاً!',
      'Hello friend! 🐱 I\'m your little cat and I need your help! The colors have disappeared from this magical world. Can you help me bring them back? Let\'s learn about colors and shapes together!',
      'Olá amigo! 🐱 Sou seu gatinho e preciso da sua ajuda! As cores desapareceram deste mundo mágico. Pode me ajudar a trazê-las de volta? Vamos aprender sobre cores e formas juntos!'
    ),
    tip: L('💡 انتبه للألوان جيداً!', '💡 Pay attention to colors!', '💡 Preste atenção nas cores!'),
  },
  w2: {
    emoji: '🔢',
    title: L('عالم الأرقام', 'Numbers World', 'Mundo dos Números'),
    story: L(
      'عالم الأرقام بحاجة لبطل! 🐱 الأرقام تاهت في كل مكان! هل تستطيع مساعدتي في ترتيبها وعدّها؟ كل رقم تجده يجعل قطتي أسعد!',
      'The number world needs a hero! 🐱 Numbers are lost everywhere! Can you help me sort and count them? Every number you find makes your cat happier!',
      'O mundo dos números precisa de um herói! 🐱 Os números estão perdidos por toda parte! Pode me ajudar a organizá-los e contá-los? Cada número encontrado deixa seu gato mais feliz!'
    ),
    tip: L('💡 عدّ ببطء ولا تستعجل', '💡 Count slowly, don\'t rush', '💡 Conte devagar, não tenha pressa'),
  },
  w3: {
    emoji: '➕',
    title: L('عالم الجمع', 'Addition World', 'Mundo da Adição'),
    story: L(
      'مرحباً بك في مملكة الجمع! 🐱 هنا نجمع الأشياء الجميلة معاً. تخيل أنك تجمع نجوم في السماء! كل إجابة صحيحة تضيء نجمة جديدة!',
      'Welcome to the Addition Kingdom! 🐱 Here we add beautiful things together. Imagine collecting stars in the sky! Every correct answer lights up a new star!',
      'Bem-vindo ao Reino da Adição! 🐱 Aqui somamos coisas bonitas juntas. Imagine coletar estrelas no céu! Cada resposta correta acende uma nova estrela!'
    ),
    tip: L('💡 استخدم أصابعك للعدّ', '💡 Use your fingers to count', '💡 Use seus dedos para contar'),
  },
  w4: {
    emoji: '➖',
    title: L('عالم الطرح', 'Subtraction World', 'Mundo da Subtração'),
    story: L(
      'أوه لا! بعض الحلوى اختفت! 🐱 في عالم الطرح نتعلم كم بقي. أنت ذكي وستعرف الإجابة! ساعدني في حل ألغاز الطرح!',
      'Oh no! Some candy disappeared! 🐱 In subtraction world we learn how much is left. You\'re smart and you\'ll know the answer! Help me solve subtraction puzzles!',
      'Oh não! Alguns doces desapareceram! 🐱 No mundo da subtração aprendemos quanto sobrou. Você é esperto e vai saber a resposta! Me ajude a resolver os enigmas!'
    ),
    tip: L('💡 فكر: كم بقي؟', '💡 Think: how many are left?', '💡 Pense: quantos sobraram?'),
  },
  w5: {
    emoji: '🔤',
    title: L('عالم الحروف العربية', 'Arabic Letters World', 'Mundo das Letras Árabes'),
    story: L(
      'أهلاً وسهلاً في عالم الحروف العربية! 🐱 الحروف تريد أن تعرّفك على نفسها. كل حرف له شكل وصوت جميل. هيا نكتشفها معاً!',
      'Welcome to the Arabic Letters World! 🐱 The letters want to introduce themselves. Each letter has a beautiful shape and sound. Let\'s discover them together!',
      'Bem-vindo ao Mundo das Letras Árabes! 🐱 As letras querem se apresentar. Cada letra tem uma forma e som bonitos. Vamos descobri-las juntos!'
    ),
    tip: L('💡 كل حرف له شكل مميز', '💡 Each letter has a unique shape', '💡 Cada letra tem uma forma única'),
  },
  w6: {
    emoji: '🔠',
    title: L('عالم الحروف الإنجليزية', 'English Letters World', 'Mundo das Letras em Inglês'),
    story: L(
      'مرحباً! 🐱 هل تعرف الحروف الإنجليزية؟ A, B, C وغيرها تنتظرك! كل حرف يفتح باباً جديداً في عالم المعرفة. هيا نتعلم معاً!',
      'Hello! 🐱 Do you know the English letters? A, B, C and more are waiting for you! Each letter opens a new door of knowledge. Let\'s learn together!',
      'Olá! 🐱 Conhece as letras em inglês? A, B, C e mais estão esperando por você! Cada letra abre uma nova porta do conhecimento. Vamos aprender juntos!'
    ),
    tip: L('💡 A, B, C... سهلة!', '💡 A, B, C... easy!', '💡 A, B, C... fácil!'),
  },
  w7: {
    emoji: '📖',
    title: L('عالم الكلمات', 'Words World', 'Mundo das Palavras'),
    story: L(
      'عالم الكلمات مليء بالقصص! 🐱 كل كلمة هي مفتاح لعالم جديد. هل تستطيع أن تقرأ الكلمات وتعرف معانيها؟ قطتي متحمسة لمساعدتك!',
      'The word world is full of stories! 🐱 Every word is a key to a new world. Can you read the words and know their meanings? Your cat is excited to help!',
      'O mundo das palavras está cheio de histórias! 🐱 Cada palavra é uma chave para um novo mundo. Pode ler as palavras e saber seus significados? Seu gato está animado para ajudar!'
    ),
    tip: L('💡 اقرأ بتمعّن', '💡 Read carefully', '💡 Leia com atenção'),
  },
  w8: {
    emoji: '🧮',
    title: L('عالم الرياضيات المتقدمة', 'Advanced Math World', 'Mundo da Matemática Avançada'),
    story: L(
      'واو! وصلت لعالم الرياضيات المتقدم! 🐱 هنا التحديات أكبر لكنك أصبحت أقوى! الضرب والقسمة ينتظرانك. هل أنت مستعد؟',
      'Wow! You reached the Advanced Math World! 🐱 Challenges are bigger but you\'re stronger now! Multiplication and division await. Are you ready?',
      'Uau! Você chegou ao Mundo Avançado! 🐱 Os desafios são maiores, mas você ficou mais forte! Multiplicação e divisão esperam. Está pronto?'
    ),
    tip: L('💡 خذ وقتك في التفكير', '💡 Take your time to think', '💡 Leve seu tempo para pensar'),
  },
  w9: {
    emoji: '🧩',
    title: L('عالم الأنماط', 'Patterns World', 'Mundo dos Padrões'),
    story: L(
      'مرحباً بالمحقق الصغير! 🐱 هل تستطيع اكتشاف النمط المخفي؟ الأشكال والألوان تتبع ترتيباً سرياً. اكتشف السر وأكمل النمط!',
      'Welcome little detective! 🐱 Can you discover the hidden pattern? Shapes and colors follow a secret order. Find the secret and complete the pattern!',
      'Bem-vindo pequeno detetive! 🐱 Pode descobrir o padrão escondido? Formas e cores seguem uma ordem secreta. Descubra o segredo e complete o padrão!'
    ),
    tip: L('💡 ابحث عن التكرار', '💡 Look for repetition', '💡 Procure a repetição'),
  },
  w10: {
    emoji: '🏆',
    title: L('عالم التحدي النهائي', 'Final Challenge World', 'Mundo do Desafio Final'),
    story: L(
      'هذا هو التحدي النهائي! 🐱 كل ما تعلمته سيُختبر هنا! أسئلة من كل العوالم. أنت بطل حقيقي وستنجح! قطتي تؤمن بك!',
      'This is the final challenge! 🐱 Everything you learned will be tested here! Questions from all worlds. You\'re a real hero and you\'ll succeed! Your cat believes in you!',
      'Este é o desafio final! 🐱 Tudo que aprendeu será testado aqui! Perguntas de todos os mundos. Você é um verdadeiro herói e vai conseguir! Seu gato acredita em você!'
    ),
    tip: L('💡 أنت بطل! ثق بنفسك', '💡 You\'re a hero! Trust yourself', '💡 Você é um herói! Confie em si'),
  },
};

/* ══════════════════════════════
   Fun Facts per Subject
   Shown between levels for micro-learning
   ══════════════════════════════ */
const FUN_FACTS = {
  COLORS_SHAPES: [
    L('🌈 قوس قزح يتكون من 7 ألوان!', '🌈 A rainbow has 7 colors!', '🌈 O arco-íris tem 7 cores!'),
    L('⭐ النجمة لها خمس نقاط', '⭐ A star has five points', '⭐ Uma estrela tem cinco pontas'),
    L('🔵 السماء زرقاء بسبب ضوء الشمس!', '🔵 The sky is blue because of sunlight!', '🔵 O céu é azul por causa da luz solar!'),
    L('🟡 الشمس أكبر من الأرض مليون مرة!', '🟡 The sun is 1 million times bigger than Earth!', '🟡 O sol é 1 milhão de vezes maior que a Terra!'),
    L('❤️ القلب شكل يعبّر عن الحب!', '❤️ The heart shape represents love!', '❤️ O formato de coração representa amor!'),
    L('🟢 الأشجار خضراء بسبب مادة الكلوروفيل', '🟢 Trees are green because of chlorophyll', '🟢 As árvores são verdes por causa da clorofila'),
    L('🔺 المثلث أقوى شكل هندسي!', '🔺 Triangle is the strongest shape!', '🔺 O triângulo é a forma mais forte!'),
    L('🟣 البنفسجي مزيج من الأحمر والأزرق', '🟣 Purple is a mix of red and blue', '🟣 Roxo é uma mistura de vermelho e azul'),
  ],
  NUMBERS: [
    L('0️⃣ الصفر اخترعه العرب!', '0️⃣ Zero was invented by Arab mathematicians!', '0️⃣ O zero foi inventado por matemáticos árabes!'),
    L('🔢 أصابع يديك عشرة!', '🔢 You have 10 fingers!', '🔢 Você tem 10 dedos!'),
    L('💯 المئة تعني عشر عشرات', '💯 One hundred means ten tens', '💯 Cem significa dez dezenas'),
    L('7️⃣ أيام الأسبوع سبعة!', '7️⃣ There are 7 days in a week!', '7️⃣ Há 7 dias na semana!'),
    L('🗓️ السنة فيها 12 شهر!', '🗓️ A year has 12 months!', '🗓️ Um ano tem 12 meses!'),
    L('🐙 الأخطبوط له 8 أذرع!', '🐙 An octopus has 8 arms!', '🐙 Um polvo tem 8 braços!'),
    L('🕷️ العنكبوت له 8 أرجل!', '🕷️ A spider has 8 legs!', '🕷️ Uma aranha tem 8 pernas!'),
    L('🦁 الأسد ملك الحيوانات!', '🦁 The lion is the king of animals!', '🦁 O leão é o rei dos animais!'),
  ],
  ADDITION: [
    L('➕ الجمع يعني: نضيف أكثر!', '➕ Addition means: we add more!', '➕ Adição significa: adicionamos mais!'),
    L('🍎 تفاحة + تفاحة = تفاحتان!', '🍎 1 apple + 1 apple = 2 apples!', '🍎 1 maçã + 1 maçã = 2 maçãs!'),
    L('👆 أصابعك تساعدك في الجمع!', '👆 Your fingers help with addition!', '👆 Seus dedos ajudam na adição!'),
    L('🧠 الدماغ يستطيع حساب أرقام كبيرة!', '🧠 The brain can calculate big numbers!', '🧠 O cérebro pode calcular números grandes!'),
    L('🎲 مجموع أوجه النرد: 1+2+3+4+5+6=21', '🎲 Sum of dice faces: 1+2+3+4+5+6=21', '🎲 Soma das faces do dado: 1+2+3+4+5+6=21'),
    L('🐾 القطة لها 4 أرجل + 1 ذيل = 5!', '🐾 A cat has 4 legs + 1 tail = 5!', '🐾 Um gato tem 4 patas + 1 rabo = 5!'),
  ],
  SUBTRACTION: [
    L('➖ الطرح يعني: كم بقي؟', '➖ Subtraction means: how many left?', '➖ Subtração significa: quantos sobraram?'),
    L('🍪 لو أكلت 2 من 5 بسكويت = بقي 3!', '🍪 If you eat 2 of 5 cookies = 3 left!', '🍪 Se comer 2 de 5 biscoitos = sobram 3!'),
    L('📏 الطرح عكس الجمع!', '📏 Subtraction is the opposite of addition!', '📏 Subtração é o oposto da adição!'),
    L('🎈 لو طارت 3 بالونات من 7 = بقي 4!', '🎈 If 3 of 7 balloons fly away = 4 left!', '🎈 Se 3 de 7 balões voarem = sobram 4!'),
    L('🦷 الطفل عنده 20 سن حليب!', '🦷 A child has 20 baby teeth!', '🦷 Uma criança tem 20 dentes de leite!'),
  ],
  ARABIC_LETTERS: [
    L('📝 الحروف العربية 28 حرفاً!', '📝 Arabic has 28 letters!', '📝 O árabe tem 28 letras!'),
    L('✍️ العربية تُكتب من اليمين لليسار', '✍️ Arabic is written right to left', '✍️ O árabe é escrito da direita para esquerda'),
    L('🕌 القرآن نزل بالعربية', '🕌 The Quran was revealed in Arabic', '🕌 O Alcorão foi revelado em árabe'),
    L('🌍 أكثر من 400 مليون يتحدث العربية!', '🌍 Over 400 million speak Arabic!', '🌍 Mais de 400 milhões falam árabe!'),
    L('🐪 كلمة "جمل" تبدأ بحرف الجيم', '🐪 "Jamal" (camel) starts with Jeem', '🐪 "Jamal" (camelo) começa com Jeem'),
    L('🌙 حرف الألف أول الحروف!', '🌙 Alef is the first letter!', '🌙 Alef é a primeira letra!'),
  ],
  ENGLISH_LETTERS: [
    L('🔤 الإنجليزية تحتوي 26 حرفاً', '🔤 English has 26 letters', '🔤 O inglês tem 26 letras'),
    L('📚 حرف E هو الأكثر استخداماً!', '📚 The letter E is the most used!', '📚 A letra E é a mais usada!'),
    L('🅰️ حرف A يعني "واحد" في بعض الجمل', '🅰️ The letter A means "one" in some phrases', '🅰️ A letra A significa "um" em algumas frases'),
    L('🔡 الحروف الصغيرة والكبيرة مختلفة!', '🔡 Lowercase and uppercase are different!', '🔡 Minúsculas e maiúsculas são diferentes!'),
    L('🌐 الإنجليزية أكثر لغة في الإنترنت', '🌐 English is the most used language online', '🌐 Inglês é a língua mais usada online'),
  ],
  WORDS: [
    L('📖 القراءة تجعلك أذكى!', '📖 Reading makes you smarter!', '📖 Ler te torna mais inteligente!'),
    L('✏️ الكتابة تقوّي الذاكرة', '✏️ Writing strengthens memory', '✏️ Escrever fortalece a memória'),
    L('📚 أطول كلمة عربية: "أفاستسقيناكموها"', '📚 Arabic can create very long words!', '📚 O árabe pode criar palavras muito longas!'),
    L('🗣️ كل كلمة لها معنى خاص', '🗣️ Every word has a special meaning', '🗣️ Cada palavra tem um significado especial'),
    L('📕 القاموس يحتوي ملايين الكلمات', '📕 A dictionary has millions of words', '📕 Um dicionário tem milhões de palavras'),
  ],
  ADVANCED_MATH: [
    L('✖️ الضرب = جمع متكرر!', '✖️ Multiplication = repeated addition!', '✖️ Multiplicação = adição repetida!'),
    L('➗ القسمة = توزيع بالتساوي', '➗ Division = sharing equally', '➗ Divisão = compartilhar igualmente'),
    L('🧮 المعداد أداة عمرها 5000 سنة!', '🧮 The abacus is 5000 years old!', '🧮 O ábaco tem 5000 anos!'),
    L('🏛️ الرياضيات أم العلوم!', '🏛️ Math is the mother of sciences!', '🏛️ Matemática é a mãe das ciências!'),
    L('🔢 2 × 2 = 4 ... سهلة جداً!', '🔢 2 × 2 = 4 ... very easy!', '🔢 2 × 2 = 4 ... muito fácil!'),
  ],
  PATTERNS: [
    L('🧩 الأنماط في كل مكان حولنا!', '🧩 Patterns are everywhere around us!', '🧩 Padrões estão em toda parte!'),
    L('🐝 خلايا النحل سداسية الشكل - نمط!', '🐝 Beehives are hexagonal - a pattern!', '🐝 Colmeias são hexagonais - um padrão!'),
    L('🌻 بذور عباد الشمس تتبع نمط لولبي', '🌻 Sunflower seeds follow a spiral pattern', '🌻 Sementes de girassol seguem um padrão espiral'),
    L('🦓 خطوط الحمار الوحشي نمط فريد!', '🦓 Zebra stripes are a unique pattern!', '🦓 As listras da zebra são um padrão único!'),
    L('🎵 الموسيقى مليئة بالأنماط!', '🎵 Music is full of patterns!', '🎵 A música está cheia de padrões!'),
    L('🌊 أمواج البحر تتبع نمطاً منتظماً', '🌊 Ocean waves follow a regular pattern', '🌊 Ondas do oceano seguem um padrão regular'),
  ],
  MIXED: [
    L('🎓 أنت بطل! تعلمت الكثير!', '🎓 You\'re a champion! You learned so much!', '🎓 Você é um campeão! Aprendeu tanto!'),
    L('🧠 دماغك يزداد قوة بالتعلم', '🧠 Your brain gets stronger with learning', '🧠 Seu cérebro fica mais forte aprendendo'),
    L('🌟 كل تحدٍّ يجعلك أقوى', '🌟 Every challenge makes you stronger', '🌟 Cada desafio te torna mais forte'),
    L('🏆 النجاح يأتي بالممارسة', '🏆 Success comes with practice', '🏆 Sucesso vem com prática'),
    L('📈 أنت تتحسن كل يوم!', '📈 You\'re improving every day!', '📈 Você está melhorando todo dia!'),
  ],
};

/* ══════════════════════════════
   Extra Fun Facts — expand micro-learning pool
   ══════════════════════════════ */
const EXTRA_FACTS = {
  COLORS_SHAPES: [
    L('🎨 اللون البرتقالي خليط أحمر وأصفر!', '🎨 Orange is a mix of red and yellow!', '🎨 Laranja é mistura de vermelho e amarelo!'),
    L('🔷 المعيّن شكل رباعي أضلاعه متساوية', '🔷 A rhombus has 4 equal sides', '🔷 Um losango tem 4 lados iguais'),
    L('⬡ الشكل السداسي له 6 أضلاع', '⬡ A hexagon has 6 sides', '⬡ Um hexágono tem 6 lados'),
    L('🌊 اللون الأزرق يجعلنا هادئين', '🌊 Blue makes us feel calm', '🌊 Azul nos faz sentir calmos'),
    L('🏀 الكرة شكل ثلاثي الأبعاد!', '🏀 A ball is a 3D shape!', '🏀 Uma bola é uma forma 3D!'),
  ],
  NUMBERS: [
    L('👀 لديك عينان اثنتان!', '👀 You have 2 eyes!', '👀 Você tem 2 olhos!'),
    L('🦴 جسمك فيه 206 عظمة!', '🦴 Your body has 206 bones!', '🦴 Seu corpo tem 206 ossos!'),
    L('🌟 الرقم 1 هو بداية كل شيء!', '🌟 Number 1 is the beginning of everything!', '🌟 Número 1 é o começo de tudo!'),
    L('❄️ كل ندفة ثلج لها 6 أذرع!', '❄️ Every snowflake has 6 arms!', '❄️ Cada floco de neve tem 6 braços!'),
    L('🐈 القطة لها 5 أصابع في كل يد أمامية!', '🐈 A cat has 5 toes on each front paw!', '🐈 Um gato tem 5 dedos em cada pata dianteira!'),
  ],
  ADDITION: [
    L('🍕 قطعة + قطعة + قطعة = 3 قطع بيتزا!', '🍕 1 slice + 1 + 1 = 3 pizza slices!', '🍕 1 fatia + 1 + 1 = 3 fatias de pizza!'),
    L('🌈 3 ألوان أساسية + خلط = كل الألوان!', '🌈 3 primary colors + mixing = all colors!', '🌈 3 cores primárias + mistura = todas as cores!'),
    L('🐾 4 أرجل + 4 أرجل = 8 أرجل قطتين!', '🐾 4 legs + 4 legs = 8 legs for two cats!', '🐾 4 patas + 4 patas = 8 patas de dois gatos!'),
    L('🌙 7 أيام + 7 أيام = أسبوعان!', '🌙 7 days + 7 days = 2 weeks!', '🌙 7 dias + 7 dias = 2 semanas!'),
  ],
  SUBTRACTION: [
    L('🦷 20 سن حليب − 1 سن يسقط = 19!', '🦷 20 baby teeth − 1 falls out = 19!', '🦷 20 dentes de leite − 1 cai = 19!'),
    L('🖐️ 10 أصابع − 5 = يد واحدة!', '🖐️ 10 fingers − 5 = one hand!', '🖐️ 10 dedos − 5 = uma mão!'),
    L('🐱 9 أرواح − 1 = 8 أرواح للقطة!', '🐱 9 lives − 1 = 8 cat lives!', '🐱 9 vidas − 1 = 8 vidas de gato!'),
    L('📅 7 أيام − 2 عطلة = 5 أيام دراسة!', '📅 7 days − 2 weekend = 5 school days!', '📅 7 dias − 2 fim de semana = 5 dias de escola!'),
    L('🌟 الطرح يساعدنا في معرفة الفرق', '🌟 Subtraction helps us find the difference', '🌟 Subtração ajuda a encontrar a diferença'),
  ],
  ARABIC_LETTERS: [
    L('🖋️ الخط العربي فن جميل جداً!', '🖋️ Arabic calligraphy is a beautiful art!', '🖋️ A caligrafia árabe é uma arte linda!'),
    L('📿 حرف الباء له نقطة واحدة تحته', '📿 The letter Baa has one dot below', '📿 A letra Baa tem um ponto abaixo'),
    L('🐔 حرف الدال يشبه الباب!', '🐔 The letter Dal looks like a door!', '🐔 A letra Dal parece uma porta!'),
    L('🌙 العربية من أقدم لغات العالم', '🌙 Arabic is one of the oldest languages', '🌙 O árabe é uma das línguas mais antigas'),
  ],
  ENGLISH_LETTERS: [
    L('🔤 حرف Q دائماً يأتي مع U!', '🔤 Q is almost always followed by U!', '🔤 Q quase sempre vem seguido de U!'),
    L('🅱️ حرف B يشبه الفراشة!', '🅱️ The letter B looks like a butterfly!', '🅱️ A letra B parece uma borboleta!'),
    L('📝 أقصر جملة إنجليزية: "I am."', '📝 Shortest English sentence: "I am."', '📝 Frase mais curta em inglês: "I am."'),
    L('🔠 حرف S هو أكثر حرف يبدأ به كلمات!', '🔠 S starts more English words than any letter!', '🔠 S começa mais palavras em inglês!'),
    L('🎵 أغنية ABC تساعدك في حفظ الحروف!', '🎵 The ABC song helps memorize letters!', '🎵 A música ABC ajuda a memorizar letras!'),
  ],
  WORDS: [
    L('🗺️ "ماما" أول كلمة لكل طفل تقريباً!', '🗺️ "Mama" is usually a baby\'s first word!', '🗺️ "Mamãe" geralmente é a primeira palavra!'),
    L('📖 كلمة "كتاب" من أقدم الكلمات العربية', '📖 "Kitab" (book) is an ancient Arabic word', '📖 "Kitab" (livro) é uma palavra árabe antiga'),
    L('🌍 بعض الكلمات نفسها في كل اللغات!', '🌍 Some words are the same in all languages!', '🌍 Algumas palavras são iguais em todas as línguas!'),
    L('🎭 الكلمات تعبّر عن مشاعرنا', '🎭 Words express our feelings', '🎭 Palavras expressam nossos sentimentos'),
    L('📚 القراءة كل يوم تزيد كلماتك!', '📚 Reading daily increases your vocabulary!', '📚 Ler diariamente aumenta seu vocabulário!'),
  ],
  ADVANCED_MATH: [
    L('🔢 5 × 5 = 25 ... خمسة وعشرون!', '🔢 5 × 5 = 25 ... twenty-five!', '🔢 5 × 5 = 25 ... vinte e cinco!'),
    L('🍕 قسمة البيتزا = رياضيات لذيذة!', '🍕 Dividing pizza = delicious math!', '🍕 Dividir pizza = matemática deliciosa!'),
    L('🏗️ المهندسون يستخدمون الرياضيات كل يوم', '🏗️ Engineers use math every day', '🏗️ Engenheiros usam matemática todo dia'),
    L('🚀 الصواريخ تحتاج رياضيات للطيران!', '🚀 Rockets need math to fly!', '🚀 Foguetes precisam de matemática para voar!'),
    L('🎯 10 ÷ 2 = 5 ... نصف العشرة!', '🎯 10 ÷ 2 = 5 ... half of ten!', '🎯 10 ÷ 2 = 5 ... metade de dez!'),
  ],
  PATTERNS: [
    L('🐚 الأصداف البحرية تتبع نمط لولبي!', '🐚 Seashells follow a spiral pattern!', '🐚 Conchas seguem um padrão espiral!'),
    L('🍯 خلايا النحل أمثل شكل هندسي!', '🍯 Honeycomb is the most efficient shape!', '🍯 O favo de mel é a forma mais eficiente!'),
    L('🌺 بتلات الزهور تتبع أرقام فيبوناتشي!', '🌺 Flower petals follow Fibonacci numbers!', '🌺 Pétalas de flores seguem números de Fibonacci!'),
    L('🐆 بقع النمر نمط فريد كبصمة الأصبع', '🐆 Leopard spots are unique like fingerprints', '🐆 Manchas do leopardo são únicas como impressões digitais'),
  ],
  MIXED: [
    L('🎯 التركيز مفتاح النجاح!', '🎯 Focus is the key to success!', '🎯 Foco é a chave do sucesso!'),
    L('🐱 القطط تنام 16 ساعة يومياً!', '🐱 Cats sleep 16 hours a day!', '🐱 Gatos dormem 16 horas por dia!'),
    L('📐 الرياضيات واللغات مهمتان معاً!', '📐 Math and languages are both important!', '📐 Matemática e idiomas são ambos importantes!'),
    L('🌟 الخطأ ليس فشلاً بل تعلّم!', '🌟 Mistakes aren\'t failure, they\'re learning!', '🌟 Erros não são fracasso, são aprendizado!'),
    L('💡 كل يوم تتعلم شيئاً جديداً!', '💡 Every day you learn something new!', '💡 Todo dia você aprende algo novo!'),
  ],
};

/* Merge extra facts into main pool */
for (const [key, facts] of Object.entries(EXTRA_FACTS)) {
  if (FUN_FACTS[key]) FUN_FACTS[key].push(...facts);
}

/* map world subject keys to FUN_FACTS keys */
const SUBJECT_MAP = {
  COLORS_SHAPES: 'COLORS_SHAPES',
  NUMBERS: 'NUMBERS',
  ADDITION: 'ADDITION',
  SUBTRACTION: 'SUBTRACTION',
  ARABIC_LETTERS: 'ARABIC_LETTERS',
  ENGLISH_LETTERS: 'ENGLISH_LETTERS',
  WORDS: 'WORDS',
  ADVANCED_MATH: 'ADVANCED_MATH',
  PATTERNS: 'PATTERNS',
  MIXED: 'MIXED',
};

/* ══════════════════════════════
   Storage (track which intros seen)
   ══════════════════════════════ */
const STORY_KEY = 'catk_story';

function loadStoryState() {
  try {
    const raw = localStorage.getItem(STORY_KEY);
    return raw ? JSON.parse(raw) : { seenIntros: [], factIndex: {} };
  } catch (e) {
    return { seenIntros: [], factIndex: {} };
  }
}

function saveStoryState(st) {
  try { localStorage.setItem(STORY_KEY, JSON.stringify(st)); } catch (e) {}
}

/* ══════════════════════════════
   Public API
   ══════════════════════════════ */

/**
 * Get world intro if not seen before
 * Returns null if already seen
 */
export function getWorldIntro(worldId) {
  const st = loadStoryState();
  if (st.seenIntros.includes(worldId)) return null;
  return WORLD_INTROS[worldId] || null;
}

/**
 * Mark world intro as seen
 */
export function markIntroSeen(worldId) {
  const st = loadStoryState();
  if (!st.seenIntros.includes(worldId)) {
    st.seenIntros.push(worldId);
    saveStoryState(st);
  }
}

/**
 * Get a fun fact for a subject (cycles through them)
 */
export function getFunFact(subject) {
  const key = SUBJECT_MAP[subject] || 'MIXED';
  const facts = FUN_FACTS[key] || FUN_FACTS.MIXED;
  const st = loadStoryState();

  if (!st.factIndex[key]) st.factIndex[key] = 0;
  const idx = st.factIndex[key] % facts.length;
  st.factIndex[key] = idx + 1;
  saveStoryState(st);

  return facts[idx];
}

/**
 * Get random encouraging message between levels
 */
export function getEncouragement() {
  const msgs = [
    L('🌟 أحسنت! استمر!', '🌟 Great job! Keep going!', '🌟 Ótimo trabalho! Continue!'),
    L('💪 أنت رائع!', '💪 You\'re amazing!', '💪 Você é incrível!'),
    L('🎉 ممتاز يا بطل!', '🎉 Excellent, champion!', '🎉 Excelente, campeão!'),
    L('⭐ نجم ساطع!', '⭐ Shining star!', '⭐ Estrela brilhante!'),
    L('🚀 إلى الأمام!', '🚀 Onwards!', '🚀 Em frente!'),
    L('🐱 قطتك فخورة بك!', '🐱 Your cat is proud of you!', '🐱 Seu gato está orgulhoso de você!'),
    L('🏅 بطل حقيقي!', '🏅 A real champion!', '🏅 Um verdadeiro campeão!'),
    L('🌈 رائع! العالم أجمل معك!', '🌈 Wonderful! The world is better with you!', '🌈 Maravilhoso! O mundo é melhor com você!'),
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

/**
 * All world intros data (for forced display)
 */
export function getAllIntros() { return WORLD_INTROS; }

/**
 * Check if a world intro has been seen
 */
export function hasSeenIntro(worldId) {
  const st = loadStoryState();
  return st.seenIntros.includes(worldId);
}

/**
 * Get world intro regardless of seen state (for re-watch)
 */
export function getWorldIntroForced(worldId) {
  return WORLD_INTROS[worldId] || null;
}

/**
 * Reset seen intros (testing)
 */
export function resetStory() {
  localStorage.removeItem(STORY_KEY);
}
