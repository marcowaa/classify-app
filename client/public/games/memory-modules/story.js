/**
 * Memory Kingdom — story.js
 * World introductions, brain/memory educational facts ("Did You Know?"),
 * and quiz bonus system — all in 3 languages (ar/en/pt)
 *
 * Exports: getWorldIntro(worldIdx), getRandomFact(worldIdx), getQuiz(worldIdx), getAllFacts(worldIdx)
 */

import { LANG } from './config.js';

// World mascots (match config.js worldChars)
const MASCOTS = ['🦊','🐬','👨‍🍳','👨‍🚀','🎵','🗡️','🤖','🎨','🧙','👑'];
const MASCOT_NAMES = {
  ar: ['ثعلب الغابة','دولفي','الشيف','رائد','نغمة','المحارب','روبوتي','فنّان','الساحر','الملك'],
  en: ['Forest Fox','Dolphy','Chef','Astronaut','Melody','Warrior','Roboti','Artist','Wizard','King'],
  pt: ['Raposa','Golfinho','Chef','Astronauta','Melodia','Guerreiro','Robô','Artista','Mago','Rei'],
};

// ===== WORLD INTRODUCTIONS =====
const INTROS = {
  ar: [
    // W0: Dream Forest
    [
      'مرحباً بك في غابة الأحلام! 🌿',
      'أنا ثعلب الغابة، حارس الذاكرة هنا!',
      'الذاكرة مثل الغابة — كل شجرة تخفي سراً!',
      'تذكر مواقع البطاقات واكشف الأزواج المتشابهة!',
      'هيا نبدأ المغامرة! 🌟',
    ],
    // W1: Ocean Depths
    [
      'أهلاً بك في أعماق المحيط! 🌊',
      'أنا دولفي! أسبح بين الأمواج وأتذكر كل شيء!',
      'الأسماك تتذكر طريقها عبر آلاف الكيلومترات!',
      'هل ذاكرتك قوية مثلها؟ هيا نكتشف! 🐠',
    ],
    // W2: Magic Kitchen
    [
      'مرحباً بالمطبخ السحري! 🍕',
      'أنا الشيف! أتذكر كل وصفة طبختها!',
      'الطباخ الماهر يحفظ مكونات مئات الوصفات!',
      'تذكر البطاقات وطابقها — مثل مكونات الطبخ! 👨‍🍳',
    ],
    // W3: Space Journey
    [
      'أهلاً برحلة الفضاء! 🚀',
      'أنا رائد الفضاء! الذاكرة ضرورية في الفضاء!',
      'رواد الفضاء يتدربون لسنوات على تذكر الإجراءات!',
      'هيا نتحدى ذاكرتك في الفضاء! 🌌',
    ],
    // W4: Music City
    [
      'مرحباً بمدينة الموسيقى! 🎵',
      'أنا نغمة! الموسيقيون لديهم ذاكرة خارقة!',
      'العازف يحفظ آلاف النوتات عن ظهر قلب!',
      'طابق الأصوات والآلات — أنت بطل الذاكرة! 🎶',
    ],
    // W5: Adventure Land
    [
      'أهلاً بأرض المغامرات! ⚔️',
      'أنا المحارب! المغامر الحقيقي يتذكر كل طريق!',
      'المستكشفون يرسمون خرائط ذهنية لكل مكان!',
      'استخدم ذاكرتك للبقاء وتجاوز التحديات! 🗺️',
    ],
    // W6: Tech World
    [
      'مرحباً بعالم التقنية! 💻',
      'أنا روبوتي! الكمبيوتر ذاكرته كبيرة لكنك أذكى!',
      'الدماغ البشري يخزن معلومات أكثر من أي كمبيوتر!',
      'أثبت تفوق ذاكرتك البشرية! 🤖',
    ],
    // W7: Color Island
    [
      'أهلاً بجزيرة الألوان! 🎨',
      'أنا الفنان! الألوان تساعد على التذكر!',
      'العقل يتذكر الصور الملونة أفضل من الكلمات!',
      'استخدم عينيك وذاكرتك البصرية! 🌈',
    ],
    // W8: Castle of Secrets
    [
      'مرحباً بقلعة الأسرار! 🏰',
      'أنا الساحر! كل سر مخفي وراء بطاقة!',
      'السحرة يستخدمون حيل الذاكرة منذ آلاف السنين!',
      'اكشف أسرار القلعة بقوة ذاكرتك! 🔮',
    ],
    // W9: Memory Championship
    [
      'أهلاً ببطولة الذاكرة! 👑',
      'أنا الملك! هذا هو التحدي الأخير والأقوى!',
      'أبطال الذاكرة يتذكرون أوراق اللعب في ثوانٍ!',
      'أثبت أنك بطل الذاكرة الحقيقي! 🏆',
    ],
  ],
  en: [
    [
      'Welcome to the Dream Forest! 🌿',
      "I'm Forest Fox, memory guardian of this place!",
      'Memory is like a forest — every tree hides a secret!',
      'Remember card positions and find matching pairs!',
      "Let's begin the adventure! 🌟",
    ],
    [
      'Welcome to the Ocean Depths! 🌊',
      "I'm Dolphy! I swim through waves and remember everything!",
      'Fish remember their paths across thousands of kilometers!',
      "Is your memory as strong? Let's find out! 🐠",
    ],
    [
      'Welcome to the Magic Kitchen! 🍕',
      "I'm Chef! I remember every recipe I've ever cooked!",
      'Skilled chefs memorize hundreds of recipes by heart!',
      'Match the cards — like matching ingredients! 👨‍🍳',
    ],
    [
      'Welcome to the Space Journey! 🚀',
      "I'm Astronaut! Memory is essential in space!",
      'Astronauts train for years to memorize procedures!',
      "Let's challenge your memory in space! 🌌",
    ],
    [
      'Welcome to Music City! 🎵',
      "I'm Melody! Musicians have extraordinary memory!",
      'Players memorize thousands of notes by heart!',
      'Match sounds and instruments — memory champion! 🎶',
    ],
    [
      'Welcome to Adventure Land! ⚔️',
      "I'm Warrior! True adventurers remember every path!",
      'Explorers build mental maps of every place!',
      'Use your memory to survive the challenges! 🗺️',
    ],
    [
      'Welcome to Tech World! 💻',
      "I'm Roboti! Computers have big memory, but you're smarter!",
      'The human brain stores more than any computer!',
      'Prove your human memory is superior! 🤖',
    ],
    [
      'Welcome to Color Island! 🎨',
      "I'm Artist! Colors help you remember!",
      'The brain remembers colorful images better than words!',
      'Use your eyes and visual memory! 🌈',
    ],
    [
      'Welcome to the Castle of Secrets! 🏰',
      "I'm Wizard! Every secret is hidden behind a card!",
      'Magicians have used memory tricks for thousands of years!',
      'Uncover castle secrets with your memory power! 🔮',
    ],
    [
      'Welcome to the Memory Championship! 👑',
      "I'm King! This is the final and strongest challenge!",
      'Memory champions memorize entire decks in seconds!',
      'Prove you are the true memory champion! 🏆',
    ],
  ],
  pt: [
    [
      'Bem-vindo à Floresta dos Sonhos! 🌿',
      'Sou a Raposa, guardiã da memória deste lugar!',
      'A memória é como floresta — cada árvore esconde um segredo!',
      'Lembre as posições e encontre os pares!',
      'Vamos à aventura! 🌟',
    ],
    [
      'Bem-vindo às Profundezas do Oceano! 🌊',
      'Sou Golfinho! Nado pelas ondas e lembro de tudo!',
      'Peixes lembram caminhos por milhares de quilômetros!',
      'Sua memória é tão forte? Vamos descobrir! 🐠',
    ],
    [
      'Bem-vindo à Cozinha Mágica! 🍕',
      'Sou o Chef! Lembro de cada receita que cozinhei!',
      'Chefs habilidosos memorizam centenas de receitas!',
      'Combine as cartas — como ingredientes! 👨‍🍳',
    ],
    [
      'Bem-vindo à Jornada Espacial! 🚀',
      'Sou Astronauta! Memória é essencial no espaço!',
      'Astronautas treinam anos para memorizar procedimentos!',
      'Vamos desafiar sua memória no espaço! 🌌',
    ],
    [
      'Bem-vindo à Cidade da Música! 🎵',
      'Sou Melodia! Músicos têm memória extraordinária!',
      'Músicos memorizam milhares de notas de cor!',
      'Combine sons e instrumentos — campeão da memória! 🎶',
    ],
    [
      'Bem-vindo à Terra da Aventura! ⚔️',
      'Sou Guerreiro! Aventureiros lembram cada caminho!',
      'Exploradores criam mapas mentais de cada lugar!',
      'Use sua memória para sobreviver! 🗺️',
    ],
    [
      'Bem-vindo ao Mundo Tech! 💻',
      'Sou Robô! Computadores têm memória grande, mas você é mais esperto!',
      'O cérebro humano armazena mais que qualquer computador!',
      'Prove que sua memória humana é superior! 🤖',
    ],
    [
      'Bem-vindo à Ilha das Cores! 🎨',
      'Sou Artista! Cores ajudam a lembrar!',
      'O cérebro lembra imagens coloridas melhor que palavras!',
      'Use seus olhos e memória visual! 🌈',
    ],
    [
      'Bem-vindo ao Castelo dos Segredos! 🏰',
      'Sou Mago! Todo segredo está atrás de uma carta!',
      'Mágicos usam truques de memória há milhares de anos!',
      'Descubra os segredos do castelo com sua memória! 🔮',
    ],
    [
      'Bem-vindo ao Campeonato da Memória! 👑',
      'Sou Rei! Este é o desafio final e mais forte!',
      'Campeões de memória memorizam baralhos em segundos!',
      'Prove que você é o verdadeiro campeão! 🏆',
    ],
  ],
};

// ===== DID YOU KNOW? — Brain & Memory Science Facts =====
// 10 facts per world × 3 languages = 300 total
const FACTS = {
  ar: [
    // W0: Dream Forest — Nature & Animal Memory
    [
      'هل تعلم؟ السنجاب يتذكر مواقع آلاف المكسرات المخبأة! 🐿️',
      'هل تعلم؟ الفيلة تتذكر الطرق والأماكن لعشرات السنين! 🐘',
      'هل تعلم؟ الكلاب تتذكر أصحابها حتى بعد سنوات من الفراق! 🐕',
      'هل تعلم؟ النحل يتذكر مواقع الزهور ويرسم خريطة ذهنية! 🐝',
      'هل تعلم؟ الدلافين تتذكر أصوات أصدقائها لأكثر من 20 سنة! 🐬',
      'هل تعلم؟ النوم يساعد دماغك على تثبيت الذكريات! 😴',
      'هل تعلم؟ الغراب يتذكر وجوه البشر الذين يعاملونه! 🐦‍⬛',
      'هل تعلم؟ القطط تملك ذاكرة قصيرة المدى أفضل من الكلاب! 🐱',
      'هل تعلم؟ المشي في الطبيعة يحسّن الذاكرة بنسبة 20%! 🌿',
      'هل تعلم؟ دماغك يعمل حتى أثناء النوم لترتيب الذكريات! 🧠',
    ],
    // W1: Ocean Depths — Memory & the Sea
    [
      'هل تعلم؟ الأخطبوط لديه 9 أدمغة — واحد رئيسي و8 في أذرعه! 🐙',
      'هل تعلم؟ سمك السلمون يتذكر النهر الذي ولد فيه ويعود إليه! 🐟',
      'هل تعلم؟ السلاحف البحرية تتذكر الشاطئ الذي فقست فيه! 🐢',
      'هل تعلم؟ الحوت الأزرق يتذكر مسارات الهجرة لآلاف الكيلومترات! 🐳',
      'هل تعلم؟ شرب الماء يحسّن أداء الذاكرة بنسبة 14%! 💧',
      'هل تعلم؟ الدلافين تنام بنصف دماغها فقط! 🐬',
      'هل تعلم؟ 75% من دماغك مكون من الماء! 🧠',
      'هل تعلم؟ أسماك القرش تتذكر الأماكن الغنية بالطعام لسنوات! 🦈',
      'هل تعلم؟ الأخطبوط يمكنه حل المتاهات بذكاء مذهل! 🐙',
      'هل تعلم؟ صوت الأمواج يساعد على الاسترخاء وتحسين التركيز! 🌊',
    ],
    // W2: Magic Kitchen — Food & Brain
    [
      'هل تعلم؟ الشوكولاتة الداكنة تحسّن الذاكرة! 🍫',
      'هل تعلم؟ الأسماك تحتوي أوميغا 3 المفيد لصحة الدماغ! 🐟',
      'هل تعلم؟ التوت الأزرق يُسمى "غذاء الدماغ"! 🫐',
      'هل تعلم؟ المكسرات تشبه شكل الدماغ وهي مفيدة له! 🥜',
      'هل تعلم؟ دماغك يستهلك 20% من طاقة جسمك رغم صغر حجمه! ⚡',
      'هل تعلم؟ الإفطار الجيد يحسّن الذاكرة والتركيز في المدرسة! 🥣',
      'هل تعلم؟ البيض يحتوي مادة "كولين" المهمة للذاكرة! 🥚',
      'هل تعلم؟ شم الروزماري يحسّن الذاكرة بنسبة 15%! 🌿',
      'هل تعلم؟ السكر الكثير يضعف الذاكرة — الفواكه أفضل! 🍎',
      'هل تعلم؟ الطباخون المحترفون يحفظون أكثر من 500 وصفة! 👨‍🍳',
    ],
    // W3: Space — Brain as Universe
    [
      'هل تعلم؟ دماغك يحتوي 86 مليار خلية عصبية — مثل عدد النجوم! ⭐',
      'هل تعلم؟ الإشارات في دماغك تسافر بسرعة 430 كم/ساعة! ⚡',
      'هل تعلم؟ رواد الفضاء يواجهون تحديات في الذاكرة بسبب انعدام الجاذبية! 🚀',
      'هل تعلم؟ دماغك يستطيع تخزين 2.5 بيتابايت — مليون غيغا! 💾',
      'هل تعلم؟ الخلايا العصبية تتواصل عبر 100 تريليون وصلة! 🔗',
      'هل تعلم؟ دماغك يولّد كهرباء كافية لإضاءة مصباح صغير! 💡',
      'هل تعلم؟ الذاكرة ليست في مكان واحد — موزعة في كل الدماغ! 🧠',
      'هل تعلم؟ حجم دماغك يشبه حجم قبضتيك معاً! ✊',
      'هل تعلم؟ دماغك يعالج صورة في 13 مللي ثانية فقط! ⏱️',
      'هل تعلم؟ NASA تدرب رواد الفضاء على ألعاب الذاكرة! 🎮',
    ],
    // W4: Music — Sound & Memory
    [
      'هل تعلم؟ العزف على آلة موسيقية يقوي الذاكرة! 🎹',
      'هل تعلم؟ الأغاني تساعدك على تذكر المعلومات أسرع! 🎶',
      'هل تعلم؟ موتسارت بدأ التأليف وعمره 5 سنوات فقط! 🎵',
      'هل تعلم؟ الموسيقى تنشط أجزاء من الدماغ لا ينشطها شيء آخر! 🧠',
      'هل تعلم؟ الاستماع للموسيقى أثناء الدراسة قد يحسّن الحفظ! 🎧',
      'هل تعلم؟ مرضى الزهايمر يتذكرون الأغاني حتى بعد نسيان كل شيء! 🎼',
      'هل تعلم؟ الإيقاع يساعد الدماغ على تنظيم المعلومات! 🥁',
      'هل تعلم؟ الطيور تحفظ أغانيها وتعلمها لصغارها! 🐦',
      'هل تعلم؟ 30 دقيقة من الموسيقى يومياً تحسّن الذاكرة! ⏰',
      'هل تعلم؟ أذنك ترسل إشارات للدماغ بسرعة 0.01 ثانية! 👂',
    ],
    // W5: Adventure — Memory Techniques
    [
      'هل تعلم؟ قصر الذاكرة تقنية يستخدمها أبطال الذاكرة! 🏰',
      'هل تعلم؟ ربط المعلومات بصور مضحكة يجعلها أسهل للتذكر! 😄',
      'هل تعلم؟ التكرار المتباعد أفضل طريقة للحفظ طويل المدى! 📚',
      'هل تعلم؟ المستكشفون القدماء حفظوا خرائط كاملة في أذهانهم! 🗺️',
      'هل تعلم؟ التمارين الرياضية تزيد حجم الحُصين (مركز الذاكرة)! 🏃',
      'هل تعلم؟ 10 دقائق تأمل يومياً تقوي التركيز والذاكرة! 🧘',
      'هل تعلم؟ الكتابة باليد تساعد على التذكر أكثر من الكتابة بالكمبيوتر! ✍️',
      'هل تعلم؟ القراءة بصوت عالٍ تحسّن الحفظ بنسبة 25%! 📖',
      'هل تعلم؟ تعليم الآخرين أفضل طريقة لتثبيت المعلومات! 👨‍🏫',
      'هل تعلم؟ الروائح تستدعي ذكريات قوية جداً! 👃',
    ],
    // W6: Tech — Digital Brain
    [
      'هل تعلم؟ الدماغ أقوى من أي كمبيوتر خارق! 💻',
      'هل تعلم؟ الذكاء الاصطناعي مستوحى من الخلايا العصبية! 🤖',
      'هل تعلم؟ ألعاب الذاكرة تقوي الروابط العصبية في الدماغ! 🎮',
      'هل تعلم؟ الشاشات قبل النوم تضعف تثبيت الذكريات! 📱',
      'هل تعلم؟ تعلم البرمجة ينمي التفكير المنطقي والذاكرة! 👨‍💻',
      'هل تعلم؟ الإنترنت يحتوي معلومات تحتاج مليون سنة لقراءتها! 🌐',
      'هل تعلم؟ RAM الكمبيوتر تشبه الذاكرة قصيرة المدى! 💾',
      'هل تعلم؟ تعدد المهام يقلل كفاءة الذاكرة بنسبة 40%! ⚠️',
      'هل تعلم؟ الإنسان يتذكر الوجوه أفضل من الأسماء! 👤',
      'هل تعلم؟ القراءة الرقمية أبطأ 25% من القراءة الورقية! 📖',
    ],
    // W7: Colors — Visual Memory
    [
      'هل تعلم؟ العين البشرية تميز 10 ملايين لون! 🌈',
      'هل تعلم؟ الألوان الزاهية أسهل للتذكر من الألوان الباهتة! 🎨',
      'هل تعلم؟ ذاكرتك البصرية تخزن صوراً بدقة مذهلة! 📸',
      'هل تعلم؟ اللون الأحمر يزيد الانتباه والتركيز! 🔴',
      'هل تعلم؟ اللون الأزرق يساعد على الإبداع والتفكير! 🔵',
      'هل تعلم؟ الصور تُحفظ في الذاكرة أسرع 60,000 مرة من الكلمات! 🖼️',
      'هل تعلم؟ الرسم يساعد على تذكر المعلومات بشكل أفضل! ✏️',
      'هل تعلم؟ الدماغ يعالج المعلومات البصرية في 250 مللي ثانية! ⚡',
      'هل تعلم؟ الخرائط الذهنية تستخدم الألوان لتحسين الحفظ! 🗺️',
      'هل تعلم؟ الأطفال يتذكرون الصور أفضل من البالغين! 👶',
    ],
    // W8: Castle — History of Memory
    [
      'هل تعلم؟ الإغريق القدماء اخترعوا "قصر الذاكرة" قبل 2500 سنة! 🏛️',
      'هل تعلم؟ الحافظون يتذكرون القرآن كاملاً — أكثر من 600 صفحة! 📖',
      'هل تعلم؟ شيريشيفسكي تذكر كل شيء في حياته ولم ينسَ أبداً! 🧠',
      'هل تعلم؟ في العصور الوسطى كان الحفظ أهم مهارة للعلماء! 📜',
      'هل تعلم؟ أول بطولة عالمية للذاكرة أقيمت عام 1991! 🏆',
      'هل تعلم؟ السحرة يستخدمون خدع الذاكرة في عروضهم! 🎩',
      'هل تعلم؟ المصريون القدماء اعتقدوا أن الذاكرة في القلب! ❤️',
      'هل تعلم؟ الورق اللاصق اختُرع بالصدفة كمساعد للذاكرة! 📝',
      'هل تعلم؟ كلمة "ذاكرة" تأتي من الإلهة اليونانية منيموسيني! 🏛️',
      'هل تعلم؟ مكتبة الإسكندرية كانت "ذاكرة العالم القديم"! 📚',
    ],
    // W9: Championship — Brain Records & Champions
    [
      'هل تعلم؟ بطل ذاكرة حفظ ترتيب 52 ورقة لعب في 13 ثانية! 🃏',
      'هل تعلم؟ أبطال الذاكرة يحفظون أكثر من 1000 رقم في ساعة! 🔢',
      'هل تعلم؟ الذاكرة عضلة — كلما تدربت أكثر أصبحت أقوى! 💪',
      'هل تعلم؟ أصغر بطل ذاكرة عمره 10 سنوات فقط! 👦',
      'هل تعلم؟ التدريب اليومي 15 دقيقة كافٍ لتحسين ذاكرتك! ⏰',
      'هل تعلم؟ دماغك يكوّن وصلات عصبية جديدة في أي عمر! 🧠',
      'هل تعلم؟ ألعاب البطاقات من أقدم تمارين الذاكرة في التاريخ! 🃏',
      'هل تعلم؟ الثقة بالنفس تحسّن أداء الذاكرة بشكل كبير! 💫',
      'هل تعلم؟ الضحك يفرز مواد كيميائية تقوي الذاكرة! 😄',
      'هل تعلم؟ أنت بالفعل بطل — كل مستوى يقوي دماغك! 🏆',
    ],
  ],
  en: [
    [
      'Did you know? Squirrels remember locations of thousands of hidden nuts! 🐿️',
      'Did you know? Elephants remember routes and places for decades! 🐘',
      'Did you know? Dogs remember their owners even after years apart! 🐕',
      'Did you know? Bees remember flower locations and create mental maps! 🐝',
      'Did you know? Dolphins remember friends\' voices for over 20 years! 🐬',
      'Did you know? Sleep helps your brain consolidate memories! 😴',
      'Did you know? Crows remember faces of people who treat them well! 🐦‍⬛',
      'Did you know? Cats have better short-term memory than dogs! 🐱',
      'Did you know? Walking in nature improves memory by 20%! 🌿',
      'Did you know? Your brain works even during sleep to organize memories! 🧠',
    ],
    [
      'Did you know? An octopus has 9 brains — 1 main and 8 in its arms! 🐙',
      'Did you know? Salmon remember the river they were born in and return! 🐟',
      'Did you know? Sea turtles remember the beach where they hatched! 🐢',
      'Did you know? Blue whales remember migration routes spanning thousands of km! 🐳',
      'Did you know? Drinking water improves memory performance by 14%! 💧',
      'Did you know? Dolphins sleep with only half their brain! 🐬',
      'Did you know? 75% of your brain is made of water! 🧠',
      'Did you know? Sharks remember food-rich locations for years! 🦈',
      'Did you know? An octopus can solve mazes with amazing intelligence! 🐙',
      'Did you know? Ocean wave sounds help relaxation and focus! 🌊',
    ],
    [
      'Did you know? Dark chocolate can improve your memory! 🍫',
      'Did you know? Fish contains omega-3 which is great for brain health! 🐟',
      'Did you know? Blueberries are called "brain food"! 🫐',
      'Did you know? Nuts look like brains and are great for them too! 🥜',
      'Did you know? Your brain uses 20% of your body\'s energy despite its small size! ⚡',
      'Did you know? A good breakfast improves memory and focus at school! 🥣',
      'Did you know? Eggs contain choline which is vital for memory! 🥚',
      'Did you know? Smelling rosemary can improve memory by 15%! 🌿',
      'Did you know? Too much sugar weakens memory — fruits are better! 🍎',
      'Did you know? Professional chefs memorize over 500 recipes! 👨‍🍳',
    ],
    [
      'Did you know? Your brain has 86 billion neurons — like the number of stars! ⭐',
      'Did you know? Brain signals travel at 430 km/h! ⚡',
      'Did you know? Astronauts face memory challenges due to zero gravity! 🚀',
      'Did you know? Your brain can store 2.5 petabytes — a million gigabytes! 💾',
      'Did you know? Neurons communicate via 100 trillion connections! 🔗',
      'Did you know? Your brain generates enough electricity to power a small bulb! 💡',
      'Did you know? Memory isn\'t in one spot — it\'s distributed across the brain! 🧠',
      'Did you know? Your brain is about the size of both your fists together! ✊',
      'Did you know? Your brain processes an image in just 13 milliseconds! ⏱️',
      'Did you know? NASA trains astronauts with memory games! 🎮',
    ],
    [
      'Did you know? Playing a musical instrument strengthens memory! 🎹',
      'Did you know? Songs help you remember information faster! 🎶',
      'Did you know? Mozart started composing at just 5 years old! 🎵',
      'Did you know? Music activates brain areas that nothing else can! 🧠',
      'Did you know? Listening to music while studying may improve retention! 🎧',
      "Did you know? Alzheimer's patients remember songs after forgetting everything else! 🎼",
      'Did you know? Rhythm helps the brain organize information! 🥁',
      'Did you know? Birds memorize songs and teach them to their young! 🐦',
      'Did you know? 30 minutes of daily music can improve memory! ⏰',
      'Did you know? Your ear sends signals to your brain in 0.01 seconds! 👂',
    ],
    [
      'Did you know? Memory Palace is a technique used by memory champions! 🏰',
      'Did you know? Linking info to funny images makes it easier to remember! 😄',
      'Did you know? Spaced repetition is the best long-term memorization method! 📚',
      'Did you know? Ancient explorers memorized entire maps in their heads! 🗺️',
      'Did you know? Exercise increases hippocampus size (your memory center)! 🏃',
      'Did you know? 10 minutes of daily meditation strengthens focus and memory! 🧘',
      'Did you know? Handwriting helps memory more than typing on a computer! ✍️',
      'Did you know? Reading aloud improves retention by 25%! 📖',
      'Did you know? Teaching others is the best way to cement knowledge! 👨‍🏫',
      'Did you know? Smells trigger incredibly strong memories! 👃',
    ],
    [
      'Did you know? The brain is more powerful than any supercomputer! 💻',
      'Did you know? AI is inspired by the structure of neurons! 🤖',
      'Did you know? Memory games strengthen neural connections in the brain! 🎮',
      'Did you know? Screens before sleep weaken memory consolidation! 📱',
      'Did you know? Learning to code develops logical thinking and memory! 👨‍💻',
      'Did you know? The internet contains info that would take a million years to read! 🌐',
      'Did you know? Computer RAM is similar to your short-term memory! 💾',
      'Did you know? Multitasking reduces memory efficiency by 40%! ⚠️',
      'Did you know? Humans remember faces better than names! 👤',
      'Did you know? Digital reading is 25% slower than paper reading! 📖',
    ],
    [
      'Did you know? The human eye can distinguish 10 million colors! 🌈',
      'Did you know? Bright colors are easier to remember than dull ones! 🎨',
      'Did you know? Your visual memory stores images with amazing detail! 📸',
      'Did you know? The color red increases attention and focus! 🔴',
      'Did you know? Blue color helps creativity and thinking! 🔵',
      'Did you know? Images are stored 60,000x faster than words in memory! 🖼️',
      'Did you know? Drawing helps you remember information better! ✏️',
      'Did you know? The brain processes visual information in 250 milliseconds! ⚡',
      'Did you know? Mind maps use colors to improve memorization! 🗺️',
      'Did you know? Children remember images better than adults! 👶',
    ],
    [
      'Did you know? Ancient Greeks invented the Memory Palace 2500 years ago! 🏛️',
      'Did you know? Hafiz scholars memorize the entire Quran — over 600 pages! 📖',
      'Did you know? Shereshevsky remembered everything and never forgot! 🧠',
      'Did you know? In medieval times, memorization was a scholar\'s top skill! 📜',
      'Did you know? The first World Memory Championship was held in 1991! 🏆',
      'Did you know? Magicians use memory tricks in their shows! 🎩',
      'Did you know? Ancient Egyptians believed memory was in the heart! ❤️',
      'Did you know? Sticky notes were accidentally invented as memory aids! 📝',
      'Did you know? The word "memory" comes from Greek goddess Mnemosyne! 🏛️',
      'Did you know? The Library of Alexandria was the "memory of the ancient world"! 📚',
    ],
    [
      'Did you know? A memory champion memorized 52 cards in 13 seconds! 🃏',
      'Did you know? Champions memorize over 1000 digits in an hour! 🔢',
      'Did you know? Memory is a muscle — the more you train, the stronger it gets! 💪',
      'Did you know? The youngest memory champion was only 10 years old! 👦',
      'Did you know? 15 minutes of daily training is enough to improve memory! ⏰',
      'Did you know? Your brain forms new neural connections at any age! 🧠',
      'Did you know? Card games are one of the oldest memory exercises in history! 🃏',
      'Did you know? Self-confidence significantly improves memory performance! 💫',
      'Did you know? Laughter releases chemicals that strengthen memory! 😄',
      'Did you know? You are already a champion — every level strengthens your brain! 🏆',
    ],
  ],
  pt: [
    [
      'Sabia que? Esquilos lembram locais de milhares de nozes escondidas! 🐿️',
      'Sabia que? Elefantes lembram rotas e locais por décadas! 🐘',
      'Sabia que? Cães lembram seus donos mesmo após anos separados! 🐕',
      'Sabia que? Abelhas lembram locais de flores e criam mapas mentais! 🐝',
      'Sabia que? Golfinhos lembram vozes de amigos por mais de 20 anos! 🐬',
      'Sabia que? O sono ajuda seu cérebro a consolidar memórias! 😴',
      'Sabia que? Corvos lembram rostos de pessoas que os tratam bem! 🐦‍⬛',
      'Sabia que? Gatos têm memória de curto prazo melhor que cães! 🐱',
      'Sabia que? Caminhar na natureza melhora a memória em 20%! 🌿',
      'Sabia que? Seu cérebro trabalha até dormindo para organizar memórias! 🧠',
    ],
    [
      'Sabia que? O polvo tem 9 cérebros — 1 principal e 8 nos braços! 🐙',
      'Sabia que? Salmões lembram o rio onde nasceram e voltam! 🐟',
      'Sabia que? Tartarugas marinhas lembram a praia onde nasceram! 🐢',
      'Sabia que? Baleias azuis lembram rotas migratórias de milhares de km! 🐳',
      'Sabia que? Beber água melhora o desempenho da memória em 14%! 💧',
      'Sabia que? Golfinhos dormem com apenas metade do cérebro! 🐬',
      'Sabia que? 75% do seu cérebro é feito de água! 🧠',
      'Sabia que? Tubarões lembram locais ricos em comida por anos! 🦈',
      'Sabia que? Um polvo pode resolver labirintos com incrível inteligência! 🐙',
      'Sabia que? O som das ondas ajuda no relaxamento e foco! 🌊',
    ],
    [
      'Sabia que? Chocolate amargo pode melhorar sua memória! 🍫',
      'Sabia que? Peixes contêm ômega-3, ótimo para saúde cerebral! 🐟',
      'Sabia que? Mirtilos são chamados de "alimento do cérebro"! 🫐',
      'Sabia que? Nozes parecem com cérebros e são ótimas para eles! 🥜',
      'Sabia que? Seu cérebro usa 20% da energia do corpo apesar do tamanho pequeno! ⚡',
      'Sabia que? Um bom café da manhã melhora memória e foco na escola! 🥣',
      'Sabia que? Ovos contêm colina, vital para a memória! 🥚',
      'Sabia que? Cheirar alecrim pode melhorar a memória em 15%! 🌿',
      'Sabia que? Açúcar em excesso enfraquece a memória — frutas são melhores! 🍎',
      'Sabia que? Chefs profissionais memorizam mais de 500 receitas! 👨‍🍳',
    ],
    [
      'Sabia que? Seu cérebro tem 86 bilhões de neurônios — como o número de estrelas! ⭐',
      'Sabia que? Sinais cerebrais viajam a 430 km/h! ⚡',
      'Sabia que? Astronautas enfrentam desafios de memória pela gravidade zero! 🚀',
      'Sabia que? Seu cérebro armazena 2,5 petabytes — um milhão de gigabytes! 💾',
      'Sabia que? Neurônios se comunicam por 100 trilhões de conexões! 🔗',
      'Sabia que? Seu cérebro gera eletricidade suficiente para uma lâmpada pequena! 💡',
      'Sabia que? A memória não está em um lugar — está distribuída no cérebro! 🧠',
      'Sabia que? Seu cérebro tem o tamanho dos dois punhos juntos! ✊',
      'Sabia que? Seu cérebro processa uma imagem em apenas 13 milissegundos! ⏱️',
      'Sabia que? A NASA treina astronautas com jogos de memória! 🎮',
    ],
    [
      'Sabia que? Tocar instrumento musical fortalece a memória! 🎹',
      'Sabia que? Músicas ajudam a lembrar informações mais rápido! 🎶',
      'Sabia que? Mozart começou a compor com apenas 5 anos! 🎵',
      'Sabia que? Música ativa áreas do cérebro que nada mais ativa! 🧠',
      'Sabia que? Ouvir música estudando pode melhorar a retenção! 🎧',
      'Sabia que? Pacientes de Alzheimer lembram músicas após esquecer tudo! 🎼',
      'Sabia que? Ritmo ajuda o cérebro a organizar informações! 🥁',
      'Sabia que? Pássaros memorizam canções e ensinam aos filhotes! 🐦',
      'Sabia que? 30 minutos de música diária podem melhorar a memória! ⏰',
      'Sabia que? Sua orelha envia sinais ao cérebro em 0,01 segundos! 👂',
    ],
    [
      'Sabia que? Palácio da Memória é técnica usada por campeões! 🏰',
      'Sabia que? Ligar informações a imagens engraçadas facilita lembrar! 😄',
      'Sabia que? Repetição espaçada é o melhor método de memorização! 📚',
      'Sabia que? Exploradores antigos memorizavam mapas inteiros na mente! 🗺️',
      'Sabia que? Exercício aumenta o hipocampo (centro da memória)! 🏃',
      'Sabia que? 10 minutos de meditação diária fortalece foco e memória! 🧘',
      'Sabia que? Escrever à mão ajuda a memória mais que digitar! ✍️',
      'Sabia que? Ler em voz alta melhora a retenção em 25%! 📖',
      'Sabia que? Ensinar outros é a melhor forma de fixar conhecimento! 👨‍🏫',
      'Sabia que? Cheiros despertam memórias incrivelmente fortes! 👃',
    ],
    [
      'Sabia que? O cérebro é mais poderoso que qualquer supercomputador! 💻',
      'Sabia que? IA é inspirada na estrutura dos neurônios! 🤖',
      'Sabia que? Jogos de memória fortalecem conexões neurais! 🎮',
      'Sabia que? Telas antes de dormir enfraquecem a consolidação da memória! 📱',
      'Sabia que? Aprender a programar desenvolve lógica e memória! 👨‍💻',
      'Sabia que? A internet contém informações que levariam 1 milhão de anos para ler! 🌐',
      'Sabia que? RAM do computador é similar à memória de curto prazo! 💾',
      'Sabia que? Multitarefa reduz eficiência da memória em 40%! ⚠️',
      'Sabia que? Humanos lembram rostos melhor que nomes! 👤',
      'Sabia que? Leitura digital é 25% mais lenta que em papel! 📖',
    ],
    [
      'Sabia que? O olho humano distingue 10 milhões de cores! 🌈',
      'Sabia que? Cores vibrantes são mais fáceis de lembrar! 🎨',
      'Sabia que? Sua memória visual armazena imagens com detalhe incrível! 📸',
      'Sabia que? A cor vermelha aumenta atenção e foco! 🔴',
      'Sabia que? A cor azul ajuda na criatividade e pensamento! 🔵',
      'Sabia que? Imagens são armazenadas 60.000x mais rápido que palavras! 🖼️',
      'Sabia que? Desenhar ajuda a lembrar informações melhor! ✏️',
      'Sabia que? O cérebro processa informação visual em 250 milissegundos! ⚡',
      'Sabia que? Mapas mentais usam cores para melhorar memorização! 🗺️',
      'Sabia que? Crianças lembram imagens melhor que adultos! 👶',
    ],
    [
      'Sabia que? Gregos antigos inventaram o Palácio da Memória há 2500 anos! 🏛️',
      'Sabia que? Hafiz memorizam o Alcorão inteiro — mais de 600 páginas! 📖',
      'Sabia que? Shereshevsky lembrava de tudo e nunca esquecia! 🧠',
      'Sabia que? Na Idade Média, memorização era a habilidade principal dos sábios! 📜',
      'Sabia que? O primeiro Campeonato Mundial de Memória foi em 1991! 🏆',
      'Sabia que? Mágicos usam truques de memória em seus shows! 🎩',
      'Sabia que? Egípcios antigos acreditavam que a memória ficava no coração! ❤️',
      'Sabia que? Post-its foram inventados acidentalmente como ajuda para memória! 📝',
      'Sabia que? A palavra "memória" vem da deusa grega Mnemosyne! 🏛️',
      'Sabia que? A Biblioteca de Alexandria era a "memória do mundo antigo"! 📚',
    ],
    [
      'Sabia que? Um campeão memorizou 52 cartas em 13 segundos! 🃏',
      'Sabia que? Campeões memorizam mais de 1000 dígitos por hora! 🔢',
      'Sabia que? Memória é um músculo — quanto mais treina, mais forte fica! 💪',
      'Sabia que? O campeão de memória mais jovem tinha apenas 10 anos! 👦',
      'Sabia que? 15 minutos de treino diário bastam para melhorar a memória! ⏰',
      'Sabia que? Seu cérebro forma novas conexões neurais em qualquer idade! 🧠',
      'Sabia que? Jogos de cartas são dos exercícios de memória mais antigos! 🃏',
      'Sabia que? Autoconfiança melhora significativamente o desempenho da memória! 💫',
      'Sabia que? Rir libera químicos que fortalecem a memória! 😄',
      'Sabia que? Você já é campeão — cada nível fortalece seu cérebro! 🏆',
    ],
  ],
};

// ===== QUIZ SYSTEM =====
const QUIZZES = {
  ar: [
    [
      { q: 'كم سنة يتذكر الدلفين صوت صديقه؟', a: ['5','20','2'], correct: 1 },
      { q: 'من يملك ذاكرة قصيرة أفضل؟', a: ['الكلب','القط','السمكة'], correct: 1 },
      { q: 'ما فائدة النوم للذاكرة؟', a: ['ينسيك','يثبت الذكريات','لا فائدة'], correct: 1 },
    ],
    [
      { q: 'كم دماغ عند الأخطبوط؟', a: ['3','9','1'], correct: 1 },
      { q: 'كم نسبة الماء في الدماغ؟', a: ['50%','75%','90%'], correct: 1 },
    ],
    [
      { q: 'أي طعام يسمى "غذاء الدماغ"؟', a: ['الحلوى','التوت الأزرق','البطاطا'], correct: 1 },
      { q: 'كم من طاقة جسمك يستهلك الدماغ؟', a: ['5%','20%','50%'], correct: 1 },
    ],
    [
      { q: 'كم خلية عصبية في الدماغ؟', a: ['86 مليون','86 مليار','86 ألف'], correct: 1 },
      { q: 'بأي سرعة تسافر إشارات الدماغ؟', a: ['43 كم/س','430 كم/س','4300 كم/س'], correct: 1 },
    ],
    [
      { q: 'ماذا يفعل العزف على آلة للدماغ؟', a: ['يضعف الذاكرة','يقوي الذاكرة','لا تأثير'], correct: 1 },
      { q: 'كم كان عمر موتسارت عندما بدأ التأليف؟', a: ['3','5','10'], correct: 1 },
    ],
    [
      { q: 'ما هو "قصر الذاكرة"؟', a: ['مبنى حقيقي','تقنية حفظ','لعبة'], correct: 1 },
      { q: 'أي حاسة تستدعي أقوى الذكريات؟', a: ['البصر','السمع','الشم'], correct: 2 },
    ],
    [
      { q: 'هل الدماغ أقوى من الكمبيوتر؟', a: ['لا','نعم','متساويان'], correct: 1 },
      { q: 'كم يقلل تعدد المهام من كفاءة الذاكرة؟', a: ['10%','40%','70%'], correct: 1 },
    ],
    [
      { q: 'كم لون يميز العين البشرية؟', a: ['1000','10 ملايين','100'], correct: 1 },
      { q: 'الصور تُحفظ أسرع من الكلمات بكم مرة؟', a: ['100','1000','60000'], correct: 2 },
    ],
    [
      { q: 'متى أُقيمت أول بطولة ذاكرة عالمية؟', a: ['1950','1991','2010'], correct: 1 },
      { q: 'أين اعتقد المصريون أن الذاكرة موجودة؟', a: ['الرأس','القلب','اليد'], correct: 1 },
    ],
    [
      { q: 'في كم ثانية حفظ بطل 52 ورقة؟', a: ['30','13','60'], correct: 1 },
      { q: 'هل الذاكرة تتحسن بالتدريب؟', a: ['لا','نعم','فقط للأطفال'], correct: 1 },
    ],
  ],
  en: [
    [
      { q: 'How many years can a dolphin remember a friend\'s voice?', a: ['5','20','2'], correct: 1 },
      { q: 'Which has better short-term memory?', a: ['Dog','Cat','Fish'], correct: 1 },
      { q: 'How does sleep help memory?', a: ['It erases memories','It consolidates them','No effect'], correct: 1 },
    ],
    [
      { q: 'How many brains does an octopus have?', a: ['3','9','1'], correct: 1 },
      { q: 'What percentage of your brain is water?', a: ['50%','75%','90%'], correct: 1 },
    ],
    [
      { q: 'Which food is called "brain food"?', a: ['Candy','Blueberries','Potatoes'], correct: 1 },
      { q: 'How much of your body\'s energy does the brain use?', a: ['5%','20%','50%'], correct: 1 },
    ],
    [
      { q: 'How many neurons are in the brain?', a: ['86 million','86 billion','86 thousand'], correct: 1 },
      { q: 'How fast do brain signals travel?', a: ['43 km/h','430 km/h','4300 km/h'], correct: 1 },
    ],
    [
      { q: 'What does playing an instrument do for the brain?', a: ['Weakens memory','Strengthens memory','No effect'], correct: 1 },
      { q: 'How old was Mozart when he started composing?', a: ['3','5','10'], correct: 1 },
    ],
    [
      { q: 'What is a "Memory Palace"?', a: ['A real building','A memorization technique','A game'], correct: 1 },
      { q: 'Which sense triggers the strongest memories?', a: ['Sight','Hearing','Smell'], correct: 2 },
    ],
    [
      { q: 'Is the brain more powerful than a computer?', a: ['No','Yes','Equal'], correct: 1 },
      { q: 'How much does multitasking reduce memory efficiency?', a: ['10%','40%','70%'], correct: 1 },
    ],
    [
      { q: 'How many colors can the human eye distinguish?', a: ['1000','10 million','100'], correct: 1 },
      { q: 'Images are stored how many times faster than words?', a: ['100x','1000x','60,000x'], correct: 2 },
    ],
    [
      { q: 'When was the first World Memory Championship?', a: ['1950','1991','2010'], correct: 1 },
      { q: 'Where did Egyptians think memory was stored?', a: ['Head','Heart','Hand'], correct: 1 },
    ],
    [
      { q: 'In how many seconds did a champion memorize 52 cards?', a: ['30','13','60'], correct: 1 },
      { q: 'Does memory improve with training?', a: ['No','Yes','Only for kids'], correct: 1 },
    ],
  ],
  pt: [
    [
      { q: 'Quantos anos um golfinho lembra a voz de um amigo?', a: ['5','20','2'], correct: 1 },
      { q: 'Qual tem melhor memória de curto prazo?', a: ['Cão','Gato','Peixe'], correct: 1 },
      { q: 'Como o sono ajuda a memória?', a: ['Apaga memórias','Consolida-as','Sem efeito'], correct: 1 },
    ],
    [
      { q: 'Quantos cérebros tem um polvo?', a: ['3','9','1'], correct: 1 },
      { q: 'Qual porcentagem do cérebro é água?', a: ['50%','75%','90%'], correct: 1 },
    ],
    [
      { q: 'Qual alimento é chamado "alimento do cérebro"?', a: ['Doce','Mirtilo','Batata'], correct: 1 },
      { q: 'Quanta energia do corpo o cérebro usa?', a: ['5%','20%','50%'], correct: 1 },
    ],
    [
      { q: 'Quantos neurônios existem no cérebro?', a: ['86 milhões','86 bilhões','86 mil'], correct: 1 },
      { q: 'A que velocidade viajam os sinais cerebrais?', a: ['43 km/h','430 km/h','4300 km/h'], correct: 1 },
    ],
    [
      { q: 'O que tocar instrumento faz pelo cérebro?', a: ['Enfraquece memória','Fortalece memória','Sem efeito'], correct: 1 },
      { q: 'Quantos anos Mozart tinha quando começou a compor?', a: ['3','5','10'], correct: 1 },
    ],
    [
      { q: 'O que é um "Palácio da Memória"?', a: ['Prédio real','Técnica de memorização','Um jogo'], correct: 1 },
      { q: 'Qual sentido desperta as memórias mais fortes?', a: ['Visão','Audição','Olfato'], correct: 2 },
    ],
    [
      { q: 'O cérebro é mais poderoso que um computador?', a: ['Não','Sim','Iguais'], correct: 1 },
      { q: 'Quanto a multitarefa reduz a eficiência da memória?', a: ['10%','40%','70%'], correct: 1 },
    ],
    [
      { q: 'Quantas cores o olho humano distingue?', a: ['1000','10 milhões','100'], correct: 1 },
      { q: 'Imagens são armazenadas quantas vezes mais rápido?', a: ['100x','1000x','60.000x'], correct: 2 },
    ],
    [
      { q: 'Quando foi o primeiro Campeonato Mundial de Memória?', a: ['1950','1991','2010'], correct: 1 },
      { q: 'Onde egípcios achavam que a memória ficava?', a: ['Cabeça','Coração','Mão'], correct: 1 },
    ],
    [
      { q: 'Em quantos segundos um campeão memorizou 52 cartas?', a: ['30','13','60'], correct: 1 },
      { q: 'A memória melhora com treino?', a: ['Não','Sim','Só para crianças'], correct: 1 },
    ],
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
