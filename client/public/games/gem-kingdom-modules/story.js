/**
 * Gem Kingdom — story.js
 * Story dialogs, mascot conversations, "Did You Know?" educational facts
 * and quiz bonus system — supports all 25 languages (falls back to en)
 *
 * Exports: getWorldIntro(worldIdx), getRandomFact(worldIdx), getQuiz(worldIdx)
 */

import { LANG, SUPPORTED_LANGS, WORLD_MASCOTS, WORLD_MASCOT_NAMES } from './config.js';

// ===== WORLD INTRODUCTIONS =====
// Shown when player first enters a world (level 0)
const INTROS = {
  ar: [
    // World 0: Fruit Forest
    [
      'مرحباً بك في غابة الفاكهة! 🍎',
      'أنا حارس هذه الغابة السحرية',
      'تعلّم كيف تجمع الفواكه المتشابهة!',
      'اسحب الجواهر لتبديلها وصنع مجموعات من 3 أو أكثر',
      'هيا نبدأ المغامرة! 🌟',
    ],
    // World 1: Ocean Deep
    [
      'أهلاً بك في أعماق المحيط! 🐠',
      'هنا ستجد الجليد يغطي بعض الجواهر',
      'اصنع مجموعات بجانب الجليد لكسره!',
      'كلما تعمقنا أكثر، زادت التحديات 🌊',
    ],
    // World 2: Color Valley
    [
      'مرحباً بوادي الألوان! 🌈',
      'بعض الجواهر مقيدة بالسلاسل هنا',
      'اصنع مجموعة تتضمن الجوهرة المقيدة لتحريرها!',
      'الألوان الجميلة بانتظارك! 🎨',
    ],
    // World 3: Animal Safari
    [
      'مرحباً بسفاري الحيوانات! 🦁',
      'احذر من الصخور الصلبة!',
      'الصخور لا تتحرك، لكن يمكنك تحطيمها بالضربات المتكررة',
      'أنشئ جواهر خاصة قوية لتحطيم العوائق! ⚡',
    ],
    // World 4: Space Station
    [
      'أهلاً بمحطة الفضاء! 🚀',
      'هنا ستواجه المربعات المظلمة',
      'اصنع مجموعات فوق المربعات المظلمة لإنارتها!',
      'استكشف الفضاء واجمع النجوم! ⭐',
    ],
    // World 5: Music Hall
    [
      'مرحباً بقاعة الموسيقى! 🎵',
      'احذر من القنابل الموقوتة! 💣',
      'يجب عليك إبطال القنابل قبل أن تنفجر!',
      'اصنع مجموعات بجانبها لتعطيلها في الوقت المناسب ⏰',
    ],
    // World 6: Candy Land
    [
      'أهلاً بأرض الحلوى! 🍬',
      'ستجد بوابات سحرية وسيور ناقلة هنا!',
      'البوابات تنقل الجواهر، والسيور تحركها!',
      'استخدم هذه الآليات لصالحك! 🎪',
    ],
    // World 7: Element Lab
    [
      'مرحباً بمختبر العناصر! 🧪',
      'الظلال تنتشر وتغطي المزيد من الخلايا!',
      'الأقفال تمنع الجواهر من التحرك!',
      'استخدم القوى الخاصة للتغلب عليها! 🔬',
    ],
    // World 8: Book Library
    [
      'أهلاً بالمكتبة السحرية! 📚',
      'بعض الجواهر محبوسة في أقفاص!',
      'أنزلها إلى أسفل اللوحة لتحريرها!',
      'المعرفة هي القوة! 📖',
    ],
    // World 9: Diamond Palace
    [
      'مرحباً بقصر الماس! 💎',
      'هذا هو التحدي الأخير والأصعب!',
      'ستواجه كل أنواع العوائق معاً!',
      'أثبت أنك بطل حقيقي واهزم ملك الظلام! 👑',
    ],
  ],
  en: [
    [
      'Welcome to the Fruit Forest! 🍎',
      "I'm the guardian of this magical forest",
      'Learn how to match similar fruits!',
      'Swipe gems to swap them and make groups of 3 or more',
      "Let's start the adventure! 🌟",
    ],
    [
      'Welcome to the Ocean Deep! 🐠',
      "You'll find ice covering some gems here",
      'Make matches next to ice to break it!',
      'The deeper we go, the harder it gets 🌊',
    ],
    [
      'Welcome to Color Valley! 🌈',
      'Some gems are chained here',
      'Match a chained gem to free it!',
      'Beautiful colors await you! 🎨',
    ],
    [
      'Welcome to Animal Safari! 🦁',
      'Watch out for hard rocks!',
      "Rocks don't move, but you can break them with repeated hits",
      'Create powerful special gems to smash obstacles! ⚡',
    ],
    [
      'Welcome to the Space Station! 🚀',
      "You'll face dark tiles here",
      'Make matches on dark tiles to light them up!',
      'Explore space and collect stars! ⭐',
    ],
    [
      'Welcome to the Music Hall! 🎵',
      'Watch out for timed bombs! 💣',
      'You must defuse the bombs before they explode!',
      'Make matches next to them to disable them in time ⏰',
    ],
    [
      'Welcome to Candy Land! 🍬',
      "You'll find magic portals and conveyors here!",
      'Portals teleport gems, conveyors move them!',
      'Use these mechanics to your advantage! 🎪',
    ],
    [
      'Welcome to the Element Lab! 🧪',
      'Shadows spread and cover more cells!',
      'Locks prevent gems from moving!',
      'Use special powers to overcome them! 🔬',
    ],
    [
      'Welcome to the Magic Library! 📚',
      'Some gems are trapped in cages!',
      'Move them to the bottom of the board to free them!',
      'Knowledge is power! 📖',
    ],
    [
      'Welcome to the Diamond Palace! 💎',
      'This is the final and hardest challenge!',
      "You'll face all obstacle types together!",
      'Prove you are a true hero and defeat the Shadow King! 👑',
    ],
  ],
  pt: [
    [
      'Bem-vindo à Floresta das Frutas! 🍎',
      'Eu sou o guardião desta floresta mágica',
      'Aprenda a combinar frutas semelhantes!',
      'Deslize as gemas para trocá-las e formar grupos de 3 ou mais',
      'Vamos começar a aventura! 🌟',
    ],
    [
      'Bem-vindo ao Oceano Profundo! 🐠',
      'Você encontrará gelo cobrindo algumas gemas',
      'Faça combinações ao lado do gelo para quebrá-lo!',
      'Quanto mais fundo, mais difícil fica 🌊',
    ],
    [
      'Bem-vindo ao Vale das Cores! 🌈',
      'Algumas gemas estão acorrentadas aqui',
      'Combine uma gema acorrentada para libertá-la!',
      'Cores lindas esperam por você! 🎨',
    ],
    [
      'Bem-vindo ao Safari Animal! 🦁',
      'Cuidado com as pedras duras!',
      'Pedras não se movem, mas você pode quebrá-las com golpes repetidos',
      'Crie gemas especiais poderosas para destruir obstáculos! ⚡',
    ],
    [
      'Bem-vindo à Estação Espacial! 🚀',
      'Você enfrentará blocos escuros aqui',
      'Faça combinações sobre os blocos escuros para iluminá-los!',
      'Explore o espaço e colete estrelas! ⭐',
    ],
    [
      'Bem-vindo ao Salão da Música! 🎵',
      'Cuidado com as bombas temporizadas! 💣',
      'Você deve desativar as bombas antes que explodam!',
      'Faça combinações ao lado delas para desativá-las a tempo ⏰',
    ],
    [
      'Bem-vindo à Terra dos Doces! 🍬',
      'Você encontrará portais mágicos e esteiras aqui!',
      'Portais teletransportam gemas, esteiras as movem!',
      'Use essas mecânicas a seu favor! 🎪',
    ],
    [
      'Bem-vindo ao Laboratório de Elementos! 🧪',
      'Sombras se espalham e cobrem mais células!',
      'Cadeados impedem as gemas de se moverem!',
      'Use poderes especiais para superá-los! 🔬',
    ],
    [
      'Bem-vindo à Biblioteca Mágica! 📚',
      'Algumas gemas estão presas em gaiolas!',
      'Mova-as para a parte inferior do tabuleiro para libertá-las!',
      'Conhecimento é poder! 📖',
    ],
    [
      'Bem-vindo ao Palácio de Diamante! 💎',
      'Este é o desafio final e mais difícil!',
      'Você enfrentará todos os tipos de obstáculos juntos!',
      'Prove que você é um verdadeiro herói e derrote o Rei das Sombras! 👑',
    ],
  ],
  es: [
    ['¡Bienvenido al Bosque Frutal! 🍎', 'Soy el guardián de este bosque mágico', '¡Aprende a combinar frutas iguales!', 'Desliza las gemas para intercambiarlas y hacer grupos de 3 o más', '¡Comencemos la aventura! 🌟'],
    ['¡Bienvenido a las Profundidades del Océano! 🐠', 'Aquí encontrarás hielo cubriendo algunas gemas', '¡Haz combinaciones junto al hielo para romperlo!', 'Cuanto más profundo, más difícil 🌊'],
    ['¡Bienvenido al Valle de los Colores! 🌈', 'Algunas gemas están encadenadas aquí', '¡Combina una gema encadenada para liberarla!', '¡Hermosos colores te esperan! 🎨'],
    ['¡Bienvenido al Safari Animal! 🦁', '¡Cuidado con las rocas duras!', 'Las rocas no se mueven, pero puedes romperlas con golpes repetidos', '¡Crea gemas especiales poderosas para destruir obstáculos! ⚡'],
    ['¡Bienvenido a la Estación Espacial! 🚀', 'Aquí enfrentarás casillas oscuras', '¡Haz combinaciones sobre casillas oscuras para iluminarlas!', '¡Explora el espacio y colecciona estrellas! ⭐'],
    ['¡Bienvenido a la Sala de Música! 🎵', '¡Cuidado con las bombas temporizadas! 💣', '¡Debes desactivar las bombas antes de que exploten!', 'Haz combinaciones junto a ellas para desactivarlas a tiempo ⏰'],
    ['¡Bienvenido a la Tierra de los Dulces! 🍬', '¡Aquí encontrarás portales mágicos y cintas transportadoras!', '¡Los portales teletransportan gemas, las cintas las mueven!', '¡Usa estas mecánicas a tu favor! 🎪'],
    ['¡Bienvenido al Laboratorio de Elementos! 🧪', '¡Las sombras se expanden y cubren más celdas!', '¡Los candados impiden que las gemas se muevan!', '¡Usa poderes especiales para superarlos! 🔬'],
    ['¡Bienvenido a la Biblioteca Mágica! 📚', '¡Algunas gemas están atrapadas en jaulas!', '¡Muévelas al fondo del tablero para liberarlas!', '¡El conocimiento es poder! 📖'],
    ['¡Bienvenido al Palacio de Diamantes! 💎', '¡Este es el desafío final y más difícil!', '¡Enfrentarás todos los tipos de obstáculos juntos!', '¡Demuestra que eres un verdadero héroe y derrota al Rey de las Sombras! 👑'],
  ],
  fr: [
    ['Bienvenue dans la Forêt des Fruits ! 🍎', 'Je suis le gardien de cette forêt magique', 'Apprends à associer des fruits similaires !', 'Glisse les gemmes pour les échanger et faire des groupes de 3 ou plus', "C'est parti pour l'aventure ! 🌟"],
    ['Bienvenue dans les Profondeurs de l\'Océan ! 🐠', 'Tu trouveras de la glace recouvrant certaines gemmes', 'Fais des combinaisons à côté de la glace pour la briser !', 'Plus on descend, plus c\'est difficile 🌊'],
    ['Bienvenue dans la Vallée des Couleurs ! 🌈', 'Certaines gemmes sont enchaînées ici', 'Associe une gemme enchaînée pour la libérer !', 'De belles couleurs t\'attendent ! 🎨'],
    ['Bienvenue au Safari Animal ! 🦁', 'Attention aux rochers durs !', 'Les rochers ne bougent pas, mais tu peux les briser avec des coups répétés', 'Crée des gemmes spéciales puissantes pour détruire les obstacles ! ⚡'],
    ['Bienvenue à la Station Spatiale ! 🚀', 'Tu affronteras des cases sombres ici', 'Fais des combinaisons sur les cases sombres pour les éclairer !', 'Explore l\'espace et collecte des étoiles ! ⭐'],
    ['Bienvenue au Hall de la Musique ! 🎵', 'Attention aux bombes à retardement ! 💣', 'Tu dois désamorcer les bombes avant qu\'elles n\'explosent !', 'Fais des combinaisons à côté pour les désactiver à temps ⏰'],
    ['Bienvenue au Pays des Bonbons ! 🍬', 'Tu trouveras des portails magiques et des tapis roulants ici !', 'Les portails téléportent les gemmes, les tapis les déplacent !', 'Utilise ces mécanismes à ton avantage ! 🎪'],
    ['Bienvenue au Laboratoire des Éléments ! 🧪', 'Les ombres s\'étendent et couvrent plus de cellules !', 'Les cadenas empêchent les gemmes de bouger !', 'Utilise des pouvoirs spéciaux pour les surmonter ! 🔬'],
    ['Bienvenue à la Bibliothèque Magique ! 📚', 'Certaines gemmes sont piégées dans des cages !', 'Déplace-les vers le bas du plateau pour les libérer !', 'Le savoir est le pouvoir ! 📖'],
    ['Bienvenue au Palais de Diamant ! 💎', 'C\'est le défi final et le plus difficile !', 'Tu affronteras tous les types d\'obstacles ensemble !', 'Prouve que tu es un vrai héros et bats le Roi des Ombres ! 👑'],
  ],
};

for (const lang of SUPPORTED_LANGS) {
  if (!INTROS[lang]) INTROS[lang] = INTROS.en;
}

// ===== DID YOU KNOW? — Educational Facts =====
// 10 facts per world, content available in ar/en/pt (others fall back to en)
const FACTS = {
  ar: [
    // World 0: Fruit Forest — Fruit & Nature facts
    [
      'هل تعلم؟ الفراولة هي الفاكهة الوحيدة التي بذورها على السطح الخارجي! 🍓',
      'هل تعلم؟ شجرة التفاح يمكن أن تعيش أكثر من 100 عام! 🍎',
      'هل تعلم؟ الموز ينمو على أعشاب عملاقة وليس على أشجار! 🍌',
      'هل تعلم؟ البرتقال يحتوي على فيتامين C الذي يقوي المناعة! 🍊',
      'هل تعلم؟ الأناناس يحتاج سنتين كاملتين لينمو! 🍍',
      'هل تعلم؟ العنب يمكن أن يكون أخضر أو أحمر أو أسود! 🍇',
      'هل تعلم؟ الطماطم فاكهة وليست خضار علمياً! 🍅',
      'هل تعلم؟ التفاح يطفو على الماء لأنه يحتوي على 25% هواء! 🍎',
      'هل تعلم؟ هناك أكثر من 7000 نوع من التفاح في العالم! 🌍',
      'هل تعلم؟ الليمون يحتوي على سكر أكثر من الفراولة! 🍋',
    ],
    // World 1: Ocean — Marine life facts
    [
      'هل تعلم؟ المحيط يغطي أكثر من 70% من سطح الأرض! 🌊',
      'هل تعلم؟ الأخطبوط لديه ثلاثة قلوب! 🐙',
      'هل تعلم؟ الدلفين ينام بنصف دماغه فقط! 🐬',
      'هل تعلم؟ المرجان كائن حي وليس صخرة! 🪸',
      'هل تعلم؟ نجم البحر ليس لديه دماغ! ⭐',
      'هل تعلم؟ الحوت الأزرق هو أكبر حيوان عاش على الأرض! 🐋',
      'هل تعلم؟ قنديل البحر يتكون من 95% ماء! 🪼',
      'هل تعلم؟ السلحفاة البحرية يمكن أن تعيش 150 سنة! 🐢',
      'هل تعلم؟ أعمق نقطة في المحيط تسمى خندق ماريانا! 🌊',
      'هل تعلم؟ الأسماك تتنفس من خلال الخياشيم! 🐟',
    ],
    // World 2: Colors — Art & Light facts
    [
      'هل تعلم؟ قوس قزح يتكون من 7 ألوان! 🌈',
      'هل تعلم؟ اللون الأبيض هو مزيج كل الألوان! ⚪',
      'هل تعلم؟ الألوان الأساسية هي الأحمر والأزرق والأصفر! 🎨',
      'هل تعلم؟ الشمس تبدو صفراء لكنها في الحقيقة بيضاء! ☀️',
      'هل تعلم؟ الفراشات ترى ألواناً لا يمكننا رؤيتها! 🦋',
      'هل تعلم؟ السماء زرقاء بسبب تشتت ضوء الشمس! 💙',
      'هل تعلم؟ لون المريخ أحمر بسبب أكسيد الحديد! 🔴',
      'هل تعلم؟ العين البشرية يمكنها تمييز 10 ملايين لون! 👁️',
      'هل تعلم؟ الحرباء تغير لونها حسب مزاجها! 🦎',
      'هل تعلم؟ الذهب لونه أصفر لأنه يمتص الضوء الأزرق! ✨',
    ],
    // World 3: Animals — Wildlife facts
    [
      'هل تعلم؟ الفيل هو الحيوان البري الأكبر على الأرض! 🐘',
      'هل تعلم؟ الزرافة لسانها يبلغ طوله 50 سنتيمتراً! 🦒',
      'هل تعلم؟ الفهد أسرع حيوان بري في العالم! 🐆',
      'هل تعلم؟ البومة يمكنها تدوير رأسها 270 درجة! 🦉',
      'هل تعلم؟ النحلة تزور 50 إلى 100 زهرة في رحلة واحدة! 🐝',
      'هل تعلم؟ الدببة القطبية فروها شفاف وليس أبيض! 🐻‍❄️',
      'هل تعلم؟ البطريق لا يستطيع الطيران لكنه سباح ماهر! 🐧',
      'هل تعلم؟ القط ينام 16 ساعة يومياً! 🐱',
      'هل تعلم؟ الكلب يمكنه شم المشاعر البشرية! 🐕',
      'هل تعلم؟ النملة تستطيع حمل 50 ضعف وزنها! 🐜',
    ],
    // World 4: Space — Astronomy facts
    [
      'هل تعلم؟ الشمس نجمة وليست كوكباً! ☀️',
      'هل تعلم؟ يوم على كوكب الزهرة أطول من سنته! 🌍',
      'هل تعلم؟ المشتري هو أكبر كوكب في نظامنا الشمسي! 🪐',
      'هل تعلم؟ القمر يبتعد عن الأرض 3.8 سم كل سنة! 🌙',
      'هل تعلم؟ لا يوجد صوت في الفضاء! 🤫',
      'هل تعلم؟ نجوم أكثر في الكون من حبات الرمل على الأرض! ⭐',
      'هل تعلم؟ كوكب المريخ يسمى الكوكب الأحمر! 🔴',
      'هل تعلم؟ رواد الفضاء يطولون في الفضاء! 👨‍🚀',
      'هل تعلم؟ زحل كثافته أقل من الماء — يمكنه أن يطفو! 🪐',
      'هل تعلم؟ الضوء يستغرق 8 دقائق للوصول من الشمس إلينا! 💡',
    ],
    // World 5: Music — Sound & Music facts
    [
      'هل تعلم؟ الموسيقى تساعد على تحسين الذاكرة! 🧠',
      'هل تعلم؟ البيانو يحتوي على 88 مفتاحاً! 🎹',
      'هل تعلم؟ الصوت ينتقل أسرع في الماء منه في الهواء! 🌊',
      'هل تعلم؟ الحيتان تغني أغاني يمكن سماعها لمسافات بعيدة! 🐋',
      'هل تعلم؟ الطبلة من أقدم الآلات الموسيقية! 🥁',
      'هل تعلم؟ القطط تستجيب للموسيقى الهادئة! 🐱🎵',
      'هل تعلم؟ الأذن البشرية تسمع ترددات بين 20 إلى 20000 هيرتز! 👂',
      'هل تعلم؟ الموسيقى تقلل التوتر والقلق! 😌',
      'هل تعلم؟ الغناء يقوي الجهاز المناعي! 🎤',
      'هل تعلم؟ الأطفال الذين يتعلمون الموسيقى يتفوقون في الرياضيات! 🎼',
    ],
    // World 6: Candy — Food & Chemistry facts
    [
      'هل تعلم؟ الشوكولاتة مصنوعة من بذور الكاكاو! 🍫',
      'هل تعلم؟ العسل لا يفسد أبداً! 🍯',
      'هل تعلم؟ السكر يعطي الطاقة للجسم! ⚡',
      'هل تعلم؟ الآيس كريم اخترع في الصين! 🍦',
      'هل تعلم؟ الماء يتكون من ذرتي هيدروجين وذرة أكسجين! 💧',
      'هل تعلم؟ الملح معدن والسكر من النباتات! 🧂',
      'هل تعلم؟ القرفة تأتي من لحاء شجرة! 🌳',
      'هل تعلم؟ الفشار يطير لأن الماء بداخله يتحول لبخار! 🍿',
      'هل تعلم؟ الجزر يساعد على تقوية النظر! 🥕',
      'هل تعلم؟ الحليب يحتوي على الكالسيوم لعظام قوية! 🥛',
    ],
    // World 7: Elements — Science facts
    [
      'هل تعلم؟ الماء يتجمد عند صفر درجة مئوية! ❄️',
      'هل تعلم؟ الذهب لا يصدأ أبداً! 🥇',
      'هل تعلم؟ البرق أسخن من سطح الشمس! ⚡',
      'هل تعلم؟ الألماس مصنوع من الكربون فقط! 💎',
      'هل تعلم؟ الأكسجين يشكل 21% من الهواء الذي نتنفسه! 🌬️',
      'هل تعلم؟ المغناطيس يجذب الحديد فقط! 🧲',
      'هل تعلم؟ النار تحتاج الأكسجين لتشتعل! 🔥',
      'هل تعلم؟ الجاذبية هي ما يبقينا على الأرض! 🌍',
      'هل تعلم؟ جسم الإنسان يحتوي على 60% ماء! 💧',
      'هل تعلم؟ الكهرباء تنتقل بسرعة الضوء تقريباً! ⚡',
    ],
    // World 8: Books — History & Knowledge facts
    [
      'هل تعلم؟ أول كتاب مطبوع كان في الصين عام 868! 📖',
      'هل تعلم؟ مكتبة الكونغرس تحتوي على أكثر من 170 مليون كتاب! 📚',
      'هل تعلم؟ الأبجدية العربية تحتوي على 28 حرفاً! ✏️',
      'هل تعلم؟ القراءة تنشط الدماغ وتقوي الذاكرة! 🧠',
      'هل تعلم؟ الأهرامات بنيت قبل أكثر من 4500 سنة! 🏛️',
      'هل تعلم؟ الورق اخترع في الصين! 📄',
      'هل تعلم؟ المصريون القدماء اخترعوا الكتابة قبل 5000 سنة! ✍️',
      'هل تعلم؟ الأطفال الذين يقرأون يكتسبون مفردات أكثر! 📖',
      'هل تعلم؟ تعلم لغات جديدة يجعل الدماغ أقوى! 🌐',
      'هل تعلم؟ الرياضيات هي لغة الكون! 🔢',
    ],
    // World 9: Diamonds — Geology & Earth facts
    [
      'هل تعلم؟ الألماس أصلب مادة طبيعية على الأرض! 💎',
      'هل تعلم؟ الأرض عمرها حوالي 4.5 مليار سنة! 🌍',
      'هل تعلم؟ البراكين تصنع جزراً جديدة! 🌋',
      'هل تعلم؟ الذهب يوجد في كل القارات! 🥇',
      'هل تعلم؟ الكريستال يتكون ببطء تحت الأرض! 🔮',
      'هل تعلم؟ المحيطات تحتوي على ذهب مذاب! 💰',
      'هل تعلم؟ الزلازل تحدث مليون مرة سنوياً! 🌏',
      'هل تعلم؟ طبقات الأرض مثل البصلة! 🧅',
      'هل تعلم؟ الياقوت والزمرد من أغلى الأحجار! 💍',
      'هل تعلم؟ النيزك الذي أنهى الديناصورات كان بحجم مدينة! ☄️',
    ],
  ],
  en: [
    [
      'Did you know? Strawberries are the only fruit with seeds on the outside! 🍓',
      'Did you know? An apple tree can live for over 100 years! 🍎',
      'Did you know? Bananas grow on giant herbs, not trees! 🍌',
      'Did you know? Oranges contain vitamin C which boosts immunity! 🍊',
      'Did you know? A pineapple takes 2 full years to grow! 🍍',
      'Did you know? Grapes can be green, red, or black! 🍇',
      'Did you know? Tomatoes are actually fruits, not vegetables! 🍅',
      'Did you know? Apples float on water because they are 25% air! 🍎',
      'Did you know? There are over 7,000 types of apples in the world! 🌍',
      'Did you know? Lemons contain more sugar than strawberries! 🍋',
    ],
    [
      'Did you know? The ocean covers over 70% of Earth! 🌊',
      'Did you know? An octopus has three hearts! 🐙',
      'Did you know? Dolphins sleep with only half their brain! 🐬',
      'Did you know? Coral is a living creature, not a rock! 🪸',
      'Did you know? A starfish has no brain! ⭐',
      'Did you know? The blue whale is the largest animal to ever live! 🐋',
      'Did you know? Jellyfish are 95% water! 🪼',
      'Did you know? Sea turtles can live up to 150 years! 🐢',
      'Did you know? The deepest ocean point is called the Mariana Trench! 🌊',
      'Did you know? Fish breathe through their gills! 🐟',
    ],
    [
      'Did you know? A rainbow has 7 colors! 🌈',
      'Did you know? White is a mix of all colors! ⚪',
      'Did you know? Primary colors are red, blue, and yellow! 🎨',
      'Did you know? The sun looks yellow but is actually white! ☀️',
      "Did you know? Butterflies can see colors we can't! 🦋",
      'Did you know? The sky is blue because of scattered sunlight! 💙',
      'Did you know? Mars is red because of iron oxide! 🔴',
      'Did you know? The human eye can distinguish 10 million colors! 👁️',
      'Did you know? Chameleons change color based on their mood! 🦎',
      'Did you know? Gold is yellow because it absorbs blue light! ✨',
    ],
    [
      'Did you know? Elephants are the largest land animals! 🐘',
      "Did you know? A giraffe's tongue is 50 cm long! 🦒",
      'Did you know? Cheetahs are the fastest land animals! 🐆',
      'Did you know? Owls can rotate their heads 270 degrees! 🦉',
      'Did you know? A bee visits 50-100 flowers in one trip! 🐝',
      "Did you know? Polar bears' fur is transparent, not white! 🐻‍❄️",
      "Did you know? Penguins can't fly but are excellent swimmers! 🐧",
      'Did you know? Cats sleep 16 hours a day! 🐱',
      'Did you know? Dogs can smell human emotions! 🐕',
      'Did you know? Ants can carry 50 times their own weight! 🐜',
    ],
    [
      'Did you know? The Sun is a star, not a planet! ☀️',
      'Did you know? A day on Venus is longer than its year! 🌍',
      'Did you know? Jupiter is the largest planet in our solar system! 🪐',
      'Did you know? The Moon moves 3.8 cm away from Earth each year! 🌙',
      'Did you know? There is no sound in space! 🤫',
      'Did you know? There are more stars than grains of sand on Earth! ⭐',
      'Did you know? Mars is called the Red Planet! 🔴',
      'Did you know? Astronauts grow taller in space! 👨‍🚀',
      'Did you know? Saturn is less dense than water — it could float! 🪐',
      'Did you know? Light takes 8 minutes to travel from the Sun to us! 💡',
    ],
    [
      'Did you know? Music helps improve memory! 🧠',
      'Did you know? A piano has 88 keys! 🎹',
      'Did you know? Sound travels faster in water than in air! 🌊',
      'Did you know? Whales sing songs that can be heard from far away! 🐋',
      'Did you know? The drum is one of the oldest instruments! 🥁',
      'Did you know? Cats respond to calm music! 🐱🎵',
      'Did you know? Humans hear frequencies between 20-20,000 Hz! 👂',
      'Did you know? Music reduces stress and anxiety! 😌',
      'Did you know? Singing strengthens the immune system! 🎤',
      'Did you know? Kids who learn music excel in math! 🎼',
    ],
    [
      'Did you know? Chocolate is made from cacao seeds! 🍫',
      'Did you know? Honey never spoils! 🍯',
      'Did you know? Sugar gives energy to the body! ⚡',
      'Did you know? Ice cream was invented in China! 🍦',
      'Did you know? Water is made of 2 hydrogen atoms and 1 oxygen atom! 💧',
      'Did you know? Salt is a mineral and sugar comes from plants! 🧂',
      'Did you know? Cinnamon comes from tree bark! 🌳',
      'Did you know? Popcorn pops because water inside turns to steam! 🍿',
      'Did you know? Carrots help strengthen eyesight! 🥕',
      'Did you know? Milk has calcium for strong bones! 🥛',
    ],
    [
      'Did you know? Water freezes at zero degrees Celsius! ❄️',
      'Did you know? Gold never rusts! 🥇',
      "Did you know? Lightning is hotter than the Sun's surface! ⚡",
      'Did you know? Diamonds are made from only carbon! 💎',
      'Did you know? Oxygen makes up 21% of the air we breathe! 🌬️',
      'Did you know? Magnets only attract iron! 🧲',
      'Did you know? Fire needs oxygen to burn! 🔥',
      'Did you know? Gravity keeps us on Earth! 🌍',
      'Did you know? The human body is 60% water! 💧',
      'Did you know? Electricity travels at nearly the speed of light! ⚡',
    ],
    [
      'Did you know? The first printed book was in China in 868 AD! 📖',
      'Did you know? The Library of Congress has over 170 million items! 📚',
      'Did you know? The Arabic alphabet has 28 letters! ✏️',
      'Did you know? Reading stimulates the brain and improves memory! 🧠',
      'Did you know? The pyramids were built over 4,500 years ago! 🏛️',
      'Did you know? Paper was invented in China! 📄',
      'Did you know? Ancient Egyptians invented writing 5,000 years ago! ✍️',
      'Did you know? Children who read gain more vocabulary! 📖',
      'Did you know? Learning new languages makes the brain stronger! 🌐',
      'Did you know? Mathematics is the language of the universe! 🔢',
    ],
    [
      'Did you know? Diamond is the hardest natural material on Earth! 💎',
      'Did you know? Earth is about 4.5 billion years old! 🌍',
      'Did you know? Volcanoes can create new islands! 🌋',
      'Did you know? Gold is found on every continent! 🥇',
      'Did you know? Crystals form slowly underground! 🔮',
      'Did you know? Oceans contain dissolved gold! 💰',
      'Did you know? Earthquakes happen 1 million times per year! 🌏',
      "Did you know? Earth's layers are like an onion! 🧅",
      'Did you know? Rubies and emeralds are among the most precious stones! 💍',
      'Did you know? The meteor that ended the dinosaurs was city-sized! ☄️',
    ],
  ],
  pt: [
    [
      'Sabia que? Morangos são a única fruta com sementes do lado de fora! 🍓',
      'Sabia que? Uma macieira pode viver mais de 100 anos! 🍎',
      'Sabia que? Bananas crescem em ervas gigantes, não árvores! 🍌',
      'Sabia que? Laranjas contêm vitamina C que fortalece a imunidade! 🍊',
      'Sabia que? Um abacaxi leva 2 anos para crescer! 🍍',
      'Sabia que? Uvas podem ser verdes, vermelhas ou pretas! 🍇',
      'Sabia que? Tomates são frutas, não legumes! 🍅',
      'Sabia que? Maçãs flutuam porque são 25% ar! 🍎',
      'Sabia que? Existem mais de 7.000 tipos de maçãs no mundo! 🌍',
      'Sabia que? Limões contêm mais açúcar que morangos! 🍋',
    ],
    [
      'Sabia que? O oceano cobre mais de 70% da Terra! 🌊',
      'Sabia que? Um polvo tem três corações! 🐙',
      'Sabia que? Golfinhos dormem com apenas metade do cérebro! 🐬',
      'Sabia que? Coral é um ser vivo, não uma rocha! 🪸',
      'Sabia que? Uma estrela-do-mar não tem cérebro! ⭐',
      'Sabia que? A baleia azul é o maior animal que já viveu! 🐋',
      'Sabia que? Águas-vivas são 95% água! 🪼',
      'Sabia que? Tartarugas marinhas podem viver 150 anos! 🐢',
      'Sabia que? O ponto mais fundo do oceano é a Fossa das Marianas! 🌊',
      'Sabia que? Peixes respiram pelas brânquias! 🐟',
    ],
    [
      'Sabia que? O arco-íris tem 7 cores! 🌈',
      'Sabia que? Branco é uma mistura de todas as cores! ⚪',
      'Sabia que? Cores primárias são vermelho, azul e amarelo! 🎨',
      'Sabia que? O sol parece amarelo mas é branco! ☀️',
      'Sabia que? Borboletas veem cores que nós não podemos! 🦋',
      'Sabia que? O céu é azul por causa da dispersão da luz solar! 💙',
      'Sabia que? Marte é vermelho por causa do óxido de ferro! 🔴',
      'Sabia que? O olho humano distingue 10 milhões de cores! 👁️',
      'Sabia que? Camaleões mudam de cor conforme o humor! 🦎',
      'Sabia que? O ouro é amarelo porque absorve luz azul! ✨',
    ],
    [
      'Sabia que? Elefantes são os maiores animais terrestres! 🐘',
      'Sabia que? A língua da girafa tem 50 cm! 🦒',
      'Sabia que? Guepardos são os animais terrestres mais rápidos! 🐆',
      'Sabia que? Corujas giram a cabeça 270 graus! 🦉',
      'Sabia que? Uma abelha visita 50-100 flores por viagem! 🐝',
      'Sabia que? O pelo dos ursos polares é transparente! 🐻‍❄️',
      'Sabia que? Pinguins não voam mas nadam muito bem! 🐧',
      'Sabia que? Gatos dormem 16 horas por dia! 🐱',
      'Sabia que? Cães podem sentir emoções humanas pelo cheiro! 🐕',
      'Sabia que? Formigas carregam 50 vezes seu peso! 🐜',
    ],
    [
      'Sabia que? O Sol é uma estrela, não um planeta! ☀️',
      'Sabia que? Um dia em Vênus é mais longo que seu ano! 🌍',
      'Sabia que? Júpiter é o maior planeta do sistema solar! 🪐',
      'Sabia que? A Lua se afasta 3,8 cm da Terra por ano! 🌙',
      'Sabia que? Não há som no espaço! 🤫',
      'Sabia que? Há mais estrelas do que grãos de areia na Terra! ⭐',
      'Sabia que? Marte é chamado de Planeta Vermelho! 🔴',
      'Sabia que? Astronautas ficam mais altos no espaço! 👨‍🚀',
      'Sabia que? Saturno poderia flutuar na água! 🪐',
      'Sabia que? A luz leva 8 minutos do Sol até nós! 💡',
    ],
    [
      'Sabia que? Música ajuda a melhorar a memória! 🧠',
      'Sabia que? Um piano tem 88 teclas! 🎹',
      'Sabia que? O som viaja mais rápido na água que no ar! 🌊',
      'Sabia que? Baleias cantam canções ouvidas de longe! 🐋',
      'Sabia que? O tambor é um dos instrumentos mais antigos! 🥁',
      'Sabia que? Gatos respondem a música calma! 🐱🎵',
      'Sabia que? Humanos ouvem frequências de 20 a 20.000 Hz! 👂',
      'Sabia que? Música reduz estresse e ansiedade! 😌',
      'Sabia que? Cantar fortalece o sistema imunológico! 🎤',
      'Sabia que? Crianças que aprendem música se destacam em matemática! 🎼',
    ],
    [
      'Sabia que? Chocolate é feito de sementes de cacau! 🍫',
      'Sabia que? O mel nunca estraga! 🍯',
      'Sabia que? Açúcar dá energia ao corpo! ⚡',
      'Sabia que? O sorvete foi inventado na China! 🍦',
      'Sabia que? Água é feita de 2 átomos de hidrogênio e 1 de oxigênio! 💧',
      'Sabia que? Sal é mineral e açúcar vem de plantas! 🧂',
      'Sabia que? Canela vem da casca de árvore! 🌳',
      'Sabia que? Pipoca estoura porque a água vira vapor! 🍿',
      'Sabia que? Cenouras fortalecem a visão! 🥕',
      'Sabia que? Leite tem cálcio para ossos fortes! 🥛',
    ],
    [
      'Sabia que? A água congela a zero graus Celsius! ❄️',
      'Sabia que? O ouro nunca enferruja! 🥇',
      'Sabia que? O raio é mais quente que a superfície do Sol! ⚡',
      'Sabia que? Diamantes são feitos apenas de carbono! 💎',
      'Sabia que? O oxigênio é 21% do ar que respiramos! 🌬️',
      'Sabia que? Ímãs só atraem ferro! 🧲',
      'Sabia que? O fogo precisa de oxigênio para queimar! 🔥',
      'Sabia que? A gravidade nos mantém na Terra! 🌍',
      'Sabia que? O corpo humano é 60% água! 💧',
      'Sabia que? A eletricidade viaja quase à velocidade da luz! ⚡',
    ],
    [
      'Sabia que? O primeiro livro impresso foi na China em 868! 📖',
      'Sabia que? A Biblioteca do Congresso tem mais de 170 milhões de itens! 📚',
      'Sabia que? O alfabeto árabe tem 28 letras! ✏️',
      'Sabia que? Ler estimula o cérebro e melhora a memória! 🧠',
      'Sabia que? As pirâmides foram construídas há mais de 4.500 anos! 🏛️',
      'Sabia que? O papel foi inventado na China! 📄',
      'Sabia que? Egípcios antigos inventaram a escrita há 5.000 anos! ✍️',
      'Sabia que? Crianças que leem ganham mais vocabulário! 📖',
      'Sabia que? Aprender idiomas fortalece o cérebro! 🌐',
      'Sabia que? Matemática é a linguagem do universo! 🔢',
    ],
    [
      'Sabia que? Diamante é o material natural mais duro da Terra! 💎',
      'Sabia que? A Terra tem cerca de 4,5 bilhões de anos! 🌍',
      'Sabia que? Vulcões podem criar novas ilhas! 🌋',
      'Sabia que? Ouro é encontrado em todos os continentes! 🥇',
      'Sabia que? Cristais se formam lentamente no subsolo! 🔮',
      'Sabia que? Oceanos contêm ouro dissolvido! 💰',
      'Sabia que? Terremotos acontecem 1 milhão de vezes por ano! 🌏',
      'Sabia que? As camadas da Terra são como uma cebola! 🧅',
      'Sabia que? Rubis e esmeraldas são das pedras mais preciosas! 💍',
      'Sabia que? O meteoro que extinguiu os dinossauros era do tamanho de uma cidade! ☄️',
    ],
  ],
};

for (const lang of SUPPORTED_LANGS) {
  if (!FACTS[lang]) FACTS[lang] = FACTS.en;
}

// ===== QUIZ SYSTEM =====
// Quick bonus quiz after level completion (optional)
const QUIZZES = {
  ar: [
    // World 0
    [
      { q: 'ما الفاكهة التي بذورها على سطحها؟', a: ['الفراولة', 'التفاح', 'الموز'], correct: 0 },
      { q: 'كم سنة يمكن أن تعيش شجرة التفاح؟', a: ['10', '50', '100+'], correct: 2 },
      { q: 'أي فيتامين في البرتقال؟', a: ['A', 'B', 'C'], correct: 2 },
    ],
    // World 1
    [
      { q: 'كم قلب للأخطبوط؟', a: ['1', '2', '3'], correct: 2 },
      { q: 'ما نسبة الماء في قنديل البحر؟', a: ['50%', '75%', '95%'], correct: 2 },
      { q: 'ما أكبر حيوان عاش على الأرض؟', a: ['الفيل', 'الحوت الأزرق', 'الديناصور'], correct: 1 },
    ],
    // World 2
    [
      { q: 'كم لون في قوس قزح؟', a: ['5', '7', '9'], correct: 1 },
      { q: 'ما الألوان الأساسية؟', a: ['أحمر وأزرق وأصفر', 'أحمر وأخضر وأزرق', 'أبيض وأسود'], correct: 0 },
      { q: 'لماذا السماء زرقاء؟', a: ['الماء', 'تشتت الضوء', 'الفضاء'], correct: 1 },
    ],
    // World 3
    [
      { q: 'ما أسرع حيوان بري؟', a: ['الأسد', 'الفهد', 'الحصان'], correct: 1 },
      { q: 'كم ساعة ينام القط يومياً؟', a: ['8', '12', '16'], correct: 2 },
      { q: 'كم ضعف وزنها تحمل النملة؟', a: ['5', '20', '50'], correct: 2 },
    ],
    // World 4
    [
      { q: 'الشمس نجمة أم كوكب؟', a: ['كوكب', 'نجمة', 'قمر'], correct: 1 },
      { q: 'ما أكبر كوكب في نظامنا الشمسي؟', a: ['زحل', 'المشتري', 'نبتون'], correct: 1 },
      { q: 'كم يستغرق الضوء من الشمس إلينا؟', a: ['8 ثوانٍ', '8 دقائق', '8 ساعات'], correct: 1 },
    ],
    // World 5 — Music Forest 🎵
    [
      { q: 'كم مفتاح في البيانو؟', a: ['66', '78', '88'], correct: 2 },
      { q: 'ما أكبر آلة في الأوركسترا؟', a: ['الطبل الكبير', 'الكمان', 'البيانو الكبير'], correct: 2 },
      { q: 'كم وتر للجيتار الكلاسيكي؟', a: ['4', '6', '8'], correct: 1 },
    ],
    // World 6 — Candy Factory 🍬
    [
      { q: 'من أين تأتي الشوكولاتة؟', a: ['الكاكاو', 'القمح', 'الأرز'], correct: 0 },
      { q: 'ما المادة الأساسية في الحلوى؟', a: ['الملح', 'السكر', 'الدقيق'], correct: 1 },
      { q: 'أي بلد يُنتج أكثر شوكولاتة؟', a: ['سويسرا', 'بلجيكا', 'ساحل العاج'], correct: 2 },
    ],
    // World 7 — Thunder Lab ⚡
    [
      { q: 'عند أي درجة يتجمد الماء؟', a: ['-10°C', '0°C', '10°C'], correct: 1 },
      { q: 'ما الذي يسبب البرق؟', a: ['الرياح', 'الشحنات الكهربائية', 'المطر'], correct: 1 },
      { q: 'ما سرعة الضوء تقريباً؟', a: ['100,000 كم/ث', '300,000 كم/ث', '500,000 كم/ث'], correct: 1 },
    ],
    // World 8 — Book City 📚
    [
      { q: 'أين طُبع أول كتاب؟', a: ['مصر', 'الصين', 'ألمانيا'], correct: 1 },
      { q: 'من كتب "هاري بوتر"؟', a: ['ج.ك. رولينغ', 'ج.ر.ر. تولكين', 'سي.إس. لويس'], correct: 0 },
      { q: 'ما أقدم قصة مكتوبة معروفة؟', a: ['الإلياذة', 'ملحمة جلجامش', 'المهابهاراتا'], correct: 1 },
    ],
    // World 9 — Diamond Peak 💎
    [
      { q: 'ما أصلب مادة طبيعية؟', a: ['الحديد', 'الألماس', 'الذهب'], correct: 1 },
      { q: 'ما لون الزمرد؟', a: ['أحمر', 'أزرق', 'أخضر'], correct: 2 },
      { q: 'من أين يتشكل الألماس؟', a: ['البحر', 'البراكين', 'أعماق الأرض'], correct: 2 },
    ],
  ],
  en: [
    [
      { q: 'Which fruit has seeds on the outside?', a: ['Strawberry', 'Apple', 'Banana'], correct: 0 },
      { q: 'How long can an apple tree live?', a: ['10 years', '50 years', '100+ years'], correct: 2 },
      { q: 'Which vitamin is in oranges?', a: ['A', 'B', 'C'], correct: 2 },
    ],
    [
      { q: 'How many hearts does an octopus have?', a: ['1', '2', '3'], correct: 2 },
      { q: 'What percentage of a jellyfish is water?', a: ['50%', '75%', '95%'], correct: 2 },
      { q: 'What is the largest animal ever?', a: ['Elephant', 'Blue whale', 'T-Rex'], correct: 1 },
    ],
    [
      { q: 'How many colors in a rainbow?', a: ['5', '7', '9'], correct: 1 },
      { q: 'What are the primary colors?', a: ['Red, blue, yellow', 'Red, green, blue', 'Black, white'], correct: 0 },
      { q: 'Why is the sky blue?', a: ['Water', 'Light scattering', 'Space'], correct: 1 },
    ],
    [
      { q: 'What is the fastest land animal?', a: ['Lion', 'Cheetah', 'Horse'], correct: 1 },
      { q: 'How many hours does a cat sleep daily?', a: ['8', '12', '16'], correct: 2 },
      { q: 'How much can an ant carry?', a: ['5x weight', '20x weight', '50x weight'], correct: 2 },
    ],
    [
      { q: 'Is the Sun a star or a planet?', a: ['Planet', 'Star', 'Moon'], correct: 1 },
      { q: 'What is the largest planet?', a: ['Saturn', 'Jupiter', 'Neptune'], correct: 1 },
      { q: 'How long does sunlight take to reach us?', a: ['8 seconds', '8 minutes', '8 hours'], correct: 1 },
    ],
    // World 5 — Music Forest 🎵
    [
      { q: 'How many keys on a piano?', a: ['66', '78', '88'], correct: 2 },
      { q: 'What is the largest instrument in an orchestra?', a: ['Bass drum', 'Violin', 'Grand piano'], correct: 2 },
      { q: 'How many strings does a classical guitar have?', a: ['4', '6', '8'], correct: 1 },
    ],
    // World 6 — Candy Factory 🍬
    [
      { q: 'Where does chocolate come from?', a: ['Cacao', 'Wheat', 'Rice'], correct: 0 },
      { q: 'What is the main ingredient in candy?', a: ['Salt', 'Sugar', 'Flour'], correct: 1 },
      { q: 'Which country produces the most cocoa?', a: ['Switzerland', 'Belgium', 'Ivory Coast'], correct: 2 },
    ],
    // World 7 — Thunder Lab ⚡
    [
      { q: 'At what temperature does water freeze?', a: ['-10°C', '0°C', '10°C'], correct: 1 },
      { q: 'What causes lightning?', a: ['Wind', 'Electric charges', 'Rain'], correct: 1 },
      { q: 'What is the approximate speed of light?', a: ['100,000 km/s', '300,000 km/s', '500,000 km/s'], correct: 1 },
    ],
    // World 8 — Book City 📚
    [
      { q: 'Where was the first book printed?', a: ['Egypt', 'China', 'Germany'], correct: 1 },
      { q: 'Who wrote "Harry Potter"?', a: ['J.K. Rowling', 'J.R.R. Tolkien', 'C.S. Lewis'], correct: 0 },
      { q: 'What is the oldest known written story?', a: ['The Iliad', 'Epic of Gilgamesh', 'Mahabharata'], correct: 1 },
    ],
    // World 9 — Diamond Peak 💎
    [
      { q: 'What is the hardest natural material?', a: ['Iron', 'Diamond', 'Gold'], correct: 1 },
      { q: 'What color is an emerald?', a: ['Red', 'Blue', 'Green'], correct: 2 },
      { q: 'Where do diamonds form?', a: ['Ocean', 'Volcanoes', 'Deep underground'], correct: 2 },
    ],
  ],
  pt: [
    [
      { q: 'Qual fruta tem sementes do lado de fora?', a: ['Morango', 'Maçã', 'Banana'], correct: 0 },
      { q: 'Quanto tempo uma macieira pode viver?', a: ['10 anos', '50 anos', '100+ anos'], correct: 2 },
      { q: 'Qual vitamina está na laranja?', a: ['A', 'B', 'C'], correct: 2 },
    ],
    [
      { q: 'Quantos corações tem um polvo?', a: ['1', '2', '3'], correct: 2 },
      { q: 'Quanto % de uma água-viva é água?', a: ['50%', '75%', '95%'], correct: 2 },
      { q: 'Qual o maior animal que já viveu?', a: ['Elefante', 'Baleia azul', 'T-Rex'], correct: 1 },
    ],
    [
      { q: 'Quantas cores tem o arco-íris?', a: ['5', '7', '9'], correct: 1 },
      { q: 'Quais são as cores primárias?', a: ['Vermelho, azul, amarelo', 'Vermelho, verde, azul', 'Preto, branco'], correct: 0 },
      { q: 'Por que o céu é azul?', a: ['Água', 'Dispersão da luz', 'Espaço'], correct: 1 },
    ],
    [
      { q: 'Qual o animal terrestre mais rápido?', a: ['Leão', 'Guepardo', 'Cavalo'], correct: 1 },
      { q: 'Quantas horas um gato dorme por dia?', a: ['8', '12', '16'], correct: 2 },
      { q: 'Quanto uma formiga pode carregar?', a: ['5x peso', '20x peso', '50x peso'], correct: 2 },
    ],
    [
      { q: 'O Sol é estrela ou planeta?', a: ['Planeta', 'Estrela', 'Lua'], correct: 1 },
      { q: 'Qual o maior planeta?', a: ['Saturno', 'Júpiter', 'Netuno'], correct: 1 },
      { q: 'Quanto tempo a luz do Sol leva até nós?', a: ['8 segundos', '8 minutos', '8 horas'], correct: 1 },
    ],
    // World 5 — Music Forest 🎵
    [
      { q: 'Quantas teclas tem um piano?', a: ['66', '78', '88'], correct: 2 },
      { q: 'Qual o maior instrumento de uma orquestra?', a: ['Bumbo', 'Violino', 'Piano de cauda'], correct: 2 },
      { q: 'Quantas cordas tem um violão clássico?', a: ['4', '6', '8'], correct: 1 },
    ],
    // World 6 — Candy Factory 🍬
    [
      { q: 'De onde vem o chocolate?', a: ['Cacau', 'Trigo', 'Arroz'], correct: 0 },
      { q: 'Qual o ingrediente principal dos doces?', a: ['Sal', 'Açúcar', 'Farinha'], correct: 1 },
      { q: 'Qual país produz mais cacau?', a: ['Suíça', 'Bélgica', 'Costa do Marfim'], correct: 2 },
    ],
    // World 7 — Thunder Lab ⚡
    [
      { q: 'A que temperatura a água congela?', a: ['-10°C', '0°C', '10°C'], correct: 1 },
      { q: 'O que causa os relâmpagos?', a: ['Vento', 'Cargas elétricas', 'Chuva'], correct: 1 },
      { q: 'Qual a velocidade aproximada da luz?', a: ['100.000 km/s', '300.000 km/s', '500.000 km/s'], correct: 1 },
    ],
    // World 8 — Book City 📚
    [
      { q: 'Onde foi impresso o primeiro livro?', a: ['Egito', 'China', 'Alemanha'], correct: 1 },
      { q: 'Quem escreveu "Harry Potter"?', a: ['J.K. Rowling', 'J.R.R. Tolkien', 'C.S. Lewis'], correct: 0 },
      { q: 'Qual a história escrita mais antiga conhecida?', a: ['A Ilíada', 'Epopeia de Gilgamesh', 'Mahabharata'], correct: 1 },
    ],
    // World 9 — Diamond Peak 💎
    [
      { q: 'Qual o material natural mais duro?', a: ['Ferro', 'Diamante', 'Ouro'], correct: 1 },
      { q: 'Qual a cor de uma esmeralda?', a: ['Vermelho', 'Azul', 'Verde'], correct: 2 },
      { q: 'Onde os diamantes se formam?', a: ['Oceano', 'Vulcões', 'Sob a terra'], correct: 2 },
    ],
  ],
};

for (const lang of SUPPORTED_LANGS) {
  if (!QUIZZES[lang]) QUIZZES[lang] = QUIZZES.en;
}

// ===== PUBLIC API =====

export function getWorldIntro(worldIdx) {
  const lang = INTROS[LANG] ? LANG : 'en';
  const lines = INTROS[lang]?.[worldIdx];
  if (!lines) return null;

  const nameKey = WORLD_MASCOT_NAMES?.[LANG] ? LANG : (WORLD_MASCOT_NAMES?.en ? 'en' : 'ar');
  return {
    mascot: WORLD_MASCOTS[worldIdx],
    name: (WORLD_MASCOT_NAMES?.[nameKey]?.[worldIdx]) || '',
    lines,
  };
}

export function getRandomFact(worldIdx) {
  const lang = FACTS[LANG] ? LANG : 'en';
  const worldFacts = FACTS[lang]?.[worldIdx];
  if (!worldFacts || worldFacts.length === 0) return null;
  return worldFacts[Math.floor(Math.random() * worldFacts.length)];
}

export function getQuiz(worldIdx) {
  const lang = QUIZZES[LANG] ? LANG : 'en';
  const quizzes = QUIZZES[lang]?.[worldIdx];
  if (!quizzes || quizzes.length === 0) return null;
  return quizzes[Math.floor(Math.random() * quizzes.length)];
}

export function getAllFacts(worldIdx) {
  const lang = FACTS[LANG] ? LANG : 'en';
  return FACTS[lang]?.[worldIdx] || [];
}

/** Alias used by core.js */
export function getFacts(worldIdx) {
  return getAllFacts(worldIdx);
}
