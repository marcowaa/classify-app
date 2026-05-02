/* ═══════════════════════════════════════════════════════════════
   Ice Kingdom Academy — Story Module 📖
   World intros (10 worlds × 3 langs), fun facts, encouragement
   Ice/arctic themed narrative content
   ═══════════════════════════════════════════════════════════════ */

import { LANG } from './i18n.js';

const STORAGE_KEY = 'icek_story';

function L(ar, en, pt) {
  if (LANG === 'en') return en;
  if (LANG === 'pt') return pt;
  return ar;
}

/* ─── World Intros ─── */
const WORLD_INTROS = {
  1: {
    emoji: '🧊',
    title: () => L('قرية الثلج', 'Snow Village', 'Vila da Neve'),
    text: () => L(
      'مرحباً في قرية الثلج! هنا ستتعلم الألوان والأشكال بين بيوت الجليد الساحرة. كل لون له قصة، وكل شكل له سر!',
      'Welcome to Snow Village! Here you\'ll learn colors and shapes among enchanted ice houses. Every color has a story, and every shape has a secret!',
      'Bem-vindo à Vila da Neve! Aqui você aprenderá cores e formas entre casas de gelo encantadas. Cada cor tem uma história, e cada forma tem um segredo!'
    ),
    tip: () => L('💡 أجب بسرعة لتحصل على نجوم أكثر!', '💡 Answer quickly to earn more stars!', '💡 Responda rápido para ganhar mais estrelas!'),
  },
  2: {
    emoji: '🐧',
    title: () => L('جزيرة البطاريق', 'Penguin Island', 'Ilha dos Pinguins'),
    text: () => L(
      'أهلاً بك في جزيرة البطاريق! ستتعرف على عالم الحيوانات والطبيعة. هل تعلم أن البطريق لا يطير لكنه سبّاح ماهر؟',
      'Welcome to Penguin Island! You\'ll explore the world of animals and nature. Did you know penguins can\'t fly but are expert swimmers?',
      'Bem-vindo à Ilha dos Pinguins! Você vai explorar o mundo dos animais e da natureza. Sabia que pinguins não voam mas são nadadores excelentes?'
    ),
    tip: () => L('💡 البطريق سيساعدك! اضغط عليه للتشجيع', '💡 Your penguin will help! Tap it for encouragement', '💡 Seu pinguim vai ajudar! Toque nele para encorajamento'),
  },
  3: {
    emoji: '🌨️',
    title: () => L('وادي العواصف', 'Storm Valley', 'Vale das Tempestades'),
    text: () => L(
      'ادخل وادي العواصف! ستكتشف أسرار الطقس والفصول الأربعة. من الثلج إلى المطر، كل ظاهرة لها تفسير!',
      'Enter Storm Valley! You\'ll discover the secrets of weather and the four seasons. From snow to rain, every phenomenon has an explanation!',
      'Entre no Vale das Tempestades! Você descobrirá os segredos do clima e das quatro estações. Da neve à chuva, cada fenômeno tem uma explicação!'
    ),
    tip: () => L('💡 استخدم قوة التجميد عند الأسئلة الصعبة!', '💡 Use freeze power on tough questions!', '💡 Use o poder de congelar nas perguntas difíceis!'),
  },
  4: {
    emoji: '🏔️',
    title: () => L('قمم الجبال', 'Mountain Peaks', 'Picos da Montanha'),
    text: () => L(
      'تسلّق قمم الجبال الجليدية! هنا ستتقن الأرقام والعد. كل قمة أعلى من السابقة، تماماً مثل الأرقام!',
      'Climb the icy mountain peaks! Here you\'ll master numbers and counting. Each peak is higher than the last, just like numbers!',
      'Escale os picos gelados das montanhas! Aqui você vai dominar números e contagem. Cada pico é mais alto que o anterior, assim como os números!'
    ),
    tip: () => L('💡 عُد الأشياء بترتيب للإجابة الصحيحة', '💡 Count things in order for the right answer', '💡 Conte as coisas em ordem para a resposta certa'),
  },
  5: {
    emoji: '❄️',
    title: () => L('كهف الجليد', 'Ice Cave', 'Caverna de Gelo'),
    text: () => L(
      'مرحباً في كهف الجليد السحري! ستتعلم الجمع هنا بين بلورات الثلج المتلألئة. كل بلورة تحمل عملية حسابية!',
      'Welcome to the magical Ice Cave! You\'ll learn addition among sparkling ice crystals. Every crystal carries a math problem!',
      'Bem-vindo à Caverna de Gelo mágica! Você aprenderá adição entre cristais de gelo brilhantes. Cada cristal carrega um problema de matemática!'
    ),
    tip: () => L('💡 الجمع سهل! فكر في عدّ الأصابع', '💡 Addition is easy! Think of counting fingers', '💡 Adição é fácil! Pense em contar nos dedos'),
  },
  6: {
    emoji: '🌊',
    title: () => L('محيط القطب', 'Polar Ocean', 'Oceano Polar'),
    text: () => L(
      'غُص في محيط القطب! ستتعلم الطرح بين أمواج المحيط المتجمد. كل موجة تأخذ معها بعض الأرقام!',
      'Dive into the Polar Ocean! You\'ll learn subtraction among frozen ocean waves. Each wave takes away some numbers!',
      'Mergulhe no Oceano Polar! Você aprenderá subtração entre ondas congeladas. Cada onda leva embora alguns números!'
    ),
    tip: () => L('💡 الطرح = كم بقي؟ سهل!', '💡 Subtraction = how many left? Easy!', '💡 Subtração = quantos restam? Fácil!'),
  },
  7: {
    emoji: '🌍',
    title: () => L('خريطة العالم', 'World Map', 'Mapa do Mundo'),
    text: () => L(
      'انطلق حول العالم! ستستكشف القارات والمحيطات والعواصم. بطريقك سيرافقك في هذه الرحلة الجغرافية!',
      'Travel around the world! You\'ll explore continents, oceans and capitals. Your penguin will join you on this geographic journey!',
      'Viaje ao redor do mundo! Você explorará continentes, oceanos e capitais. Seu pinguim o acompanhará nesta jornada geográfica!'
    ),
    tip: () => L('💡 تذكر: آسيا أكبر قارة!', '💡 Remember: Asia is the largest continent!', '💡 Lembre-se: A Ásia é o maior continente!'),
  },
  8: {
    emoji: '🔬',
    title: () => L('مختبر العلوم', 'Science Lab', 'Laboratório'),
    text: () => L(
      'مرحباً في مختبر العلوم الجليدي! ستكتشف حقائق علمية مذهلة عن الكواكب والعناصر والطبيعة!',
      'Welcome to the icy Science Lab! You\'ll discover amazing scientific facts about planets, elements and nature!',
      'Bem-vindo ao Laboratório de Ciências gelado! Você descobrirá fatos científicos incríveis sobre planetas, elementos e natureza!'
    ),
    tip: () => L('💡 العلم ممتع! كل تجربة تعلّمنا شيئاً', '💡 Science is fun! Every experiment teaches us', '💡 Ciência é divertida! Cada experimento nos ensina'),
  },
  9: {
    emoji: '🦕',
    title: () => L('عصر الديناصورات', 'Dinosaur Era', 'Era dos Dinossauros'),
    text: () => L(
      'سافر عبر الزمن إلى عصر الديناصورات! ستتعلم عن المخلوقات العملاقة التي سادت الأرض قبل ملايين السنين!',
      'Travel back in time to the Dinosaur Era! You\'ll learn about the giant creatures that ruled Earth millions of years ago!',
      'Viaje no tempo até a Era dos Dinossauros! Você aprenderá sobre as criaturas gigantes que dominaram a Terra há milhões de anos!'
    ),
    tip: () => L('💡 تي ركس = ملك السحالي الطاغية!', '💡 T-Rex = Tyrant Lizard King!', '💡 T-Rex = Rei dos Lagartos Tiranos!'),
  },
  10: {
    emoji: '🌌',
    title: () => L('تحدي الكوكب', 'Planet Challenge', 'Desafio do Planeta'),
    text: () => L(
      'وصلت إلى التحدي النهائي! أسئلة من كل المواضيع ستختبر كل ما تعلمته. أثبت أنك بطل مملكة الجليد!',
      'You\'ve reached the final challenge! Questions from all topics will test everything you\'ve learned. Prove you\'re the Ice Kingdom champion!',
      'Você chegou ao desafio final! Perguntas de todos os temas testarão tudo que aprendeu. Prove que você é o campeão do Reino de Gelo!'
    ),
    tip: () => L('💡 أنت جاهز! ثق بنفسك!', '💡 You\'re ready! Trust yourself!', '💡 Você está pronto! Confie em si mesmo!'),
  },
};

/* ─── Fun Facts (per subject, trilingual) ─── */
const FUN_FACTS = {
  colors_shapes: [
    () => L('🎨 هل تعلم أن العين البشرية تستطيع تمييز حوالي 10 ملايين لون مختلف؟', '🎨 Did you know the human eye can distinguish about 10 million different colors?', '🎨 Sabia que o olho humano pode distinguir cerca de 10 milhões de cores?'),
    () => L('🔺 المثلث هو أقوى شكل هندسي! لذلك يُستخدم في الجسور', '🔺 The triangle is the strongest geometric shape! That\'s why it\'s used in bridges', '🔺 O triângulo é a forma geométrica mais forte! Por isso é usado em pontes'),
    () => L('🌈 قوس قزح يظهر عندما تمر أشعة الشمس عبر قطرات المطر', '🌈 A rainbow appears when sunlight passes through raindrops', '🌈 O arco-íris aparece quando a luz solar passa pelas gotas de chuva'),
    () => L('⬛ الأسود ليس لوناً! إنه غياب كل الألوان', '⬛ Black isn\'t a color! It\'s the absence of all colors', '⬛ Preto não é uma cor! É a ausência de todas as cores'),
    () => L('⭕ كل نقطة على الدائرة تبعد نفس المسافة عن المركز', '⭕ Every point on a circle is the same distance from the center', '⭕ Cada ponto no círculo está à mesma distância do centro'),
    () => L('💎 الألماس يتكون من ذرات كربون مرتبة على شكل مكعب', '💎 Diamond is made of carbon atoms arranged in a cube shape', '💎 O diamante é feito de átomos de carbono dispostos em forma de cubo'),
    () => L('🟡 اللون الأصفر هو أول لون يراه الأطفال الرضع', '🟡 Yellow is the first color babies can see', '🟡 Amarelo é a primeira cor que os bebês podem ver'),
    () => L('⬡ خلايا نحل العسل سداسية الشكل لأنها الأكثر كفاءة', '⬡ Honeycomb cells are hexagonal because it\'s the most efficient shape', '⬡ Favos de mel são hexagonais porque é a forma mais eficiente'),
  ],
  animals_nature: [
    () => L('🐧 البطريق يستطيع أن يشرب ماء البحر! كليته تصفي الملح', '🐧 Penguins can drink seawater! Their kidneys filter the salt', '🐧 Pinguins podem beber água do mar! Seus rins filtram o sal'),
    () => L('🐋 قلب الحوت الأزرق بحجم سيارة صغيرة!', '🐋 A blue whale\'s heart is the size of a small car!', '🐋 O coração da baleia azul tem o tamanho de um carro pequeno!'),
    () => L('🦒 الزرافة لها نفس عدد فقرات الرقبة مثل الإنسان: 7!', '🦒 A giraffe has the same number of neck vertebrae as humans: 7!', '🦒 A girafa tem o mesmo número de vértebras cervicais que humanos: 7!'),
    () => L('🐙 الأخطبوط لديه 3 قلوب و 9 أدمغة!', '🐙 An octopus has 3 hearts and 9 brains!', '🐙 Um polvo tem 3 corações e 9 cérebros!'),
    () => L('🐬 الدلفين ينام بنصف دماغه فقط! النصف الآخر يبقى مستيقظاً', '🐬 Dolphins sleep with only half their brain! The other half stays awake', '🐬 Golfinhos dormem com apenas metade do cérebro! A outra metade fica acordada'),
    () => L('🦅 النسر يستطيع رؤية أرنب من مسافة 3 كيلومترات!', '🦅 An eagle can spot a rabbit from 3 kilometers away!', '🦅 Uma águia pode ver um coelho a 3 quilômetros de distância!'),
    () => L('🐻‍❄️ الدب القطبي جلده أسود! فروه الأبيض شفاف فقط', '🐻‍❄️ Polar bears have black skin! Their white fur is actually transparent', '🐻‍❄️ Ursos polares têm pele preta! O pelo branco é na verdade transparente'),
    () => L('🐝 النحلة تزور حوالي 2 مليون زهرة لصنع كيلو عسل', '🐝 Bees visit about 2 million flowers to make 1 kg of honey', '🐝 Abelhas visitam cerca de 2 milhões de flores para fazer 1 kg de mel'),
  ],
  weather_seasons: [
    () => L('❄️ لا توجد ندفتا ثلج متماثلتان! كل واحدة فريدة', '❄️ No two snowflakes are alike! Each one is unique', '❄️ Não existem dois flocos de neve iguais! Cada um é único'),
    () => L('⚡ البرق أسخن من سطح الشمس بـ 5 مرات!', '⚡ Lightning is 5 times hotter than the surface of the sun!', '⚡ O relâmpago é 5 vezes mais quente que a superfície do sol!'),
    () => L('🌪️ الإعصار يمكن أن تصل سرعته إلى 500 كم/ساعة', '🌪️ A tornado can reach speeds of 500 km/h', '🌪️ Um tornado pode atingir velocidades de 500 km/h'),
    () => L('🌧️ قطرة المطر تسقط بسرعة 32 كم/ساعة', '🌧️ A raindrop falls at 32 km/h', '🌧️ Uma gota de chuva cai a 32 km/h'),
    () => L('☀️ ضوء الشمس يحتاج 8 دقائق ليصل الأرض', '☀️ Sunlight takes 8 minutes to reach Earth', '☀️ A luz do sol leva 8 minutos para chegar à Terra'),
    () => L('🌡️ أبرد درجة حرارة سُجلت كانت -89°C في أنتاركتيكا', '🌡️ The coldest temperature ever recorded was -89°C in Antarctica', '🌡️ A temperatura mais fria já registrada foi -89°C na Antártica'),
    () => L('🌈 يمكنك رؤية قوس قزح كامل (دائري) من الطائرة!', '🌈 You can see a full circular rainbow from an airplane!', '🌈 Você pode ver um arco-íris circular completo de um avião!'),
    () => L('💨 الرياح لا تصدر صوتاً إلا عندما تصطدم بشيء', '💨 Wind doesn\'t make sound unless it hits something', '💨 O vento não faz som a menos que bata em algo'),
  ],
  numbers: [
    () => L('🔢 الصفر اخترعه العرب والهنود! بدونه لا حاسوب', '🔢 Zero was invented by Arabs and Indians! Without it, no computers', '🔢 O zero foi inventado por árabes e indianos! Sem ele, nada de computadores'),
    () => L('📐 في القرن الـ9، الخوارزمي أسس علم الجبر', '📐 In the 9th century, Al-Khwarizmi founded algebra', '📐 No século 9, Al-Khwarizmi fundou a álgebra'),
    () => L('🎲 احتمال رمي 6 على النرد هو 1 من 6', '🎲 The chance of rolling a 6 on a die is 1 in 6', '🎲 A chance de tirar 6 no dado é 1 em 6'),
    () => L('♾️ الأعداد لا تنتهي أبداً! دائماً يوجد رقم أكبر', '♾️ Numbers never end! There\'s always a bigger number', '♾️ Números nunca acabam! Sempre existe um número maior'),
    () => L('🧮 المصريون القدماء استخدموا الكسور قبل 4000 سنة', '🧮 Ancient Egyptians used fractions 4000 years ago', '🧮 Os antigos egípcios usavam frações há 4000 anos'),
    () => L('📊 الرقم 7 هو الأكثر شعبية حول العالم', '📊 Number 7 is the most popular number worldwide', '📊 O número 7 é o mais popular do mundo'),
    () => L('🔢 2520 هو أصغر رقم يقبل القسمة على 1-10', '🔢 2520 is the smallest number divisible by 1-10', '🔢 2520 é o menor número divisível por 1-10'),
    () => L('🎯 كل رقم زوجي يمكن كتابته كمجموع عددين أوليين', '🎯 Every even number can be written as the sum of two primes', '🎯 Todo número par pode ser escrito como soma de dois primos'),
  ],
  addition: [
    () => L('➕ الجمع هو أقدم عملية حسابية عرفها الإنسان!', '➕ Addition is the oldest math operation known to humans!', '➕ Adição é a operação matemática mais antiga conhecida!'),
    () => L('🧮 المحظوز الصيني (الأباكس) كان أول آلة حاسبة!', '🧮 The Chinese abacus was the first calculator!', '🧮 O ábaco chinês foi a primeira calculadora!'),
    () => L('🤖 أول حاسوب كان بحجم غرفة كاملة ويجمع بطيئاً', '🤖 The first computer was room-sized and added slowly', '🤖 O primeiro computador era do tamanho de uma sala e somava devagar'),
    () => L('🧠 دماغك يحسب عمليات جمع في أقل من ثانية!', '🧠 Your brain calculates additions in less than a second!', '🧠 Seu cérebro calcula adições em menos de um segundo!'),
    () => L('📏 عندما تقيس طولك، أنت تجمع السنتيمترات!', '📏 When you measure your height, you\'re adding centimeters!', '📏 Quando você mede sua altura, está somando centímetros!'),
    () => L('🛒 في المتجر، نجمع أسعار المشتريات كل يوم!', '🛒 In stores, we add up prices every day!', '🛒 Nas lojas, somamos preços todos os dias!'),
    () => L('⏰ عدّ الساعات والدقائق هو جمع!', '⏰ Counting hours and minutes is addition!', '⏰ Contar horas e minutos é adição!'),
    () => L('🎂 حساب عمرك هو جمع السنوات!', '🎂 Calculating your age is adding years!', '🎂 Calcular sua idade é somar anos!'),
  ],
  subtraction: [
    () => L('➖ الطرح هو عكس الجمع! بسيط ومهم', '➖ Subtraction is the opposite of addition! Simple and important', '➖ Subtração é o oposto da adição! Simples e importante'),
    () => L('💰 عندما تشتري شيئاً، تطرح الثمن من نقودك', '💰 When you buy something, you subtract the price from your money', '💰 Quando compra algo, subtrai o preço do seu dinheiro'),
    () => L('📅 حساب الأيام المتبقية للعطلة = طرح!', '📅 Counting days to vacation = subtraction!', '📅 Contar dias para as férias = subtração!'),
    () => L('🎮 عندما تخسر نقاط في لعبة، هذا طرح!', '🎮 When you lose points in a game, that\'s subtraction!', '🎮 Quando perde pontos no jogo, isso é subtração!'),
    () => L('🌡️ حساب فرق درجات الحرارة = طرح!', '🌡️ Calculating temperature difference = subtraction!', '🌡️ Calcular diferença de temperatura = subtração!'),
    () => L('⏱️ حساب الوقت المتبقي هو عملية طرح', '⏱️ Calculating remaining time is subtraction', '⏱️ Calcular o tempo restante é subtração'),
    () => L('🏃 حساب المسافة المتبقية في السباق = طرح', '🏃 Calculating remaining distance in a race = subtraction', '🏃 Calcular a distância restante numa corrida = subtração'),
    () => L('🍕 إذا أكلت 3 قطع من 8, تبقى 5! هذا طرح', '🍕 If you eat 3 slices of 8, 5 remain! That\'s subtraction', '🍕 Se comer 3 fatias de 8, restam 5! Isso é subtração'),
  ],
  geography: [
    () => L('🌍 الأرض ليست كروية تماماً! هي مفلطحة قليلاً عند القطبين', '🌍 Earth isn\'t perfectly round! It\'s slightly flattened at the poles', '🌍 A Terra não é perfeitamente redonda! É ligeiramente achatada nos polos'),
    () => L('🏔️ أعلى قمة في العالم هي إيفرست بارتفاع 8,849 متر', '🏔️ The tallest peak in the world is Everest at 8,849 meters', '🏔️ O pico mais alto do mundo é o Everest com 8.849 metros'),
    () => L('🌊 المحيط الهادئ أكبر من كل اليابسة مجتمعة!', '🌊 The Pacific Ocean is bigger than all land combined!', '🌊 O Oceano Pacífico é maior que toda a terra firme combinada!'),
    () => L('🗺️ روسيا تمتد عبر 11 منطقة زمنية!', '🗺️ Russia spans 11 time zones!', '🗺️ A Rússia abrange 11 fusos horários!'),
    () => L('🏜️ الصحراء الكبرى بحجم أمريكا تقريباً!', '🏜️ The Sahara Desert is almost the size of the USA!', '🏜️ O Saara é quase do tamanho dos EUA!'),
    () => L('🏞️ نهر الأمازون يحتوي على 20% من مياه الأنهار العذبة', '🏞️ The Amazon holds 20% of Earth\'s freshwater river flow', '🏞️ O Amazonas contém 20% da água doce dos rios do mundo'),
    () => L('🌋 هناك حوالي 1,500 بركان نشط على الأرض', '🌋 There are about 1,500 active volcanoes on Earth', '🌋 Existem cerca de 1.500 vulcões ativos na Terra'),
    () => L('🧊 أنتاركتيكا تحتوي على 70% من المياه العذبة للأرض', '🧊 Antarctica holds 70% of Earth\'s freshwater', '🧊 A Antártica contém 70% da água doce da Terra'),
  ],
  science: [
    () => L('💧 الماء هو المادة الوحيدة الموجودة بـ3 حالات طبيعياً', '💧 Water is the only substance that exists in 3 states naturally', '💧 A água é a única substância que existe em 3 estados naturalmente'),
    () => L('⚡ البرق يسخن الهواء إلى 30,000 درجة!', '⚡ Lightning heats air to 30,000 degrees!', '⚡ O relâmpago aquece o ar a 30.000 graus!'),
    () => L('🦴 طفل عمره سنة لديه عظام أكثر من البالغ!', '🦴 A 1-year-old has more bones than an adult!', '🦴 Um bebê de 1 ano tem mais ossos que um adulto!'),
    () => L('🌙 القمر يبتعد عن الأرض 3.8 سم كل سنة', '🌙 The Moon moves 3.8 cm away from Earth each year', '🌙 A Lua se afasta da Terra 3,8 cm a cada ano'),
    () => L('🔬 ذرة واحدة أصغر بمليار مرة من حبة رمل', '🔬 One atom is a billion times smaller than a grain of sand', '🔬 Um átomo é um bilhão de vezes menor que um grão de areia'),
    () => L('🪐 زحل خفيف لدرجة أنه سيطفو على الماء!', '🪐 Saturn is so light it would float on water!', '🪐 Saturno é tão leve que flutuaria na água!'),
    () => L('🧬 الحمض النووي البشري طوله 2 متر في كل خلية!', '🧬 Human DNA is 2 meters long in every cell!', '🧬 O DNA humano tem 2 metros de comprimento em cada célula!'),
    () => L('💡 الضوء يسافر بسرعة 300,000 كم في الثانية!', '💡 Light travels at 300,000 km per second!', '💡 A luz viaja a 300.000 km por segundo!'),
  ],
  dinosaurs: [
    () => L('🦕 الديناصورات عاشت 165 مليون سنة! الإنسان فقط 300,000', '🦕 Dinosaurs lived for 165 million years! Humans only 300,000', '🦕 Dinossauros viveram 165 milhões de anos! Humanos só 300.000'),
    () => L('🦖 ذراع تي ركس كانت بطول ذراع إنسان فقط!', '🦖 T-Rex\'s arms were only as long as a human\'s arm!', '🦖 Os braços do T-Rex tinham o tamanho de braços humanos!'),
    () => L('🦴 أول ديناصور سُمّي كان "ميغالوصور" عام 1824', '🦴 The first named dinosaur was "Megalosaurus" in 1824', '🦴 O primeiro dinossauro nomeado foi "Megalosaurus" em 1824'),
    () => L('🥚 بيض الديناصور كان بحجم كرة قدم!', '🥚 Dinosaur eggs were the size of a football!', '🥚 Ovos de dinossauro eram do tamanho de uma bola de futebol!'),
    () => L('🦕 أرجنتينوصور كان طوله 40 متراً! أطول من حوت أزرق', '🦕 Argentinosaurus was 40 meters long! Longer than a blue whale', '🦕 Argentinosaurus tinha 40 metros! Mais longo que uma baleia azul'),
    () => L('☄️ النيزك حفر حفرة بعرض 180 كم في المكسيك!', '☄️ The asteroid created a 180 km wide crater in Mexico!', '☄️ O asteroide criou uma cratera de 180 km no México!'),
    () => L('🐔 الدجاج أقرب الحيوانات الحية للديناصورات!', '🐔 Chickens are the closest living relatives of dinosaurs!', '🐔 Galinhas são os parentes vivos mais próximos dos dinossauros!'),
    () => L('🦣 الماموث انقرض منذ 4,000 سنة فقط!', '🦣 Mammoths went extinct only 4,000 years ago!', '🦣 Mamutes foram extintos há apenas 4.000 anos!'),
  ],
  mixed: [
    () => L('🧠 دماغك يستهلك 20% من طاقة جسمك!', '🧠 Your brain uses 20% of your body\'s energy!', '🧠 Seu cérebro usa 20% da energia do corpo!'),
    () => L('🌟 التعلم يقوّي الاتصالات بين خلايا الدماغ', '🌟 Learning strengthens connections between brain cells', '🌟 Aprender fortalece as conexões entre células cerebrais'),
    () => L('📚 القراءة تنشّط أجزاء كثيرة من الدماغ معاً', '📚 Reading activates many parts of the brain together', '📚 A leitura ativa muitas partes do cérebro juntas'),
    () => L('🎵 الموسيقى والرياضيات مرتبطتان! تستخدمان نفس مناطق الدماغ', '🎵 Music and math are linked! They use the same brain areas', '🎵 Música e matemática estão ligadas! Usam as mesmas áreas do cérebro'),
    () => L('💤 النوم يساعد الدماغ على تخزين المعلومات الجديدة', '💤 Sleep helps the brain store new information', '💤 O sono ajuda o cérebro a armazenar novas informações'),
    () => L('🏃 التمارين الرياضية تحسّن الذاكرة والتركيز!', '🏃 Exercise improves memory and focus!', '🏃 Exercícios melhoram memória e concentração!'),
    () => L('🧩 حل الألغاز يجعل دماغك أقوى!', '🧩 Solving puzzles makes your brain stronger!', '🧩 Resolver puzzles torna seu cérebro mais forte!'),
    () => L('✨ أنت تتعلم شيئاً جديداً الآن! عقلك ينمو', '✨ You\'re learning something new right now! Your mind is growing', '✨ Você está aprendendo algo novo agora! Sua mente está crescendo'),
  ],
};

/* ─── Encouragement (ice-themed) ─── */
const ENCOURAGEMENTS = [
  () => L('🐧 أحسنت! بطريقك فخور بك!', '🐧 Great job! Your penguin is proud!', '🐧 Ótimo trabalho! Seu pinguim está orgulhoso!'),
  () => L('❄️ رائع! أنت مستكشف حقيقي!', '❄️ Amazing! You\'re a real explorer!', '❄️ Incrível! Você é um explorador de verdade!'),
  () => L('🧊 ممتاز! عقلك بارد كالثلج!', '🧊 Excellent! Your mind is cool as ice!', '🧊 Excelente! Sua mente é fria como gelo!'),
  () => L('🌟 نجم! أنت تتألق في مملكة الجليد!', '🌟 Star! You shine in the Ice Kingdom!', '🌟 Estrela! Você brilha no Reino de Gelo!'),
  () => L('🏔️ أنت تتسلق قمم المعرفة!', '🏔️ You\'re climbing the peaks of knowledge!', '🏔️ Você está escalando os picos do conhecimento!'),
  () => L('💎 كل إجابة صحيحة هي كنز جديد!', '💎 Every correct answer is a new treasure!', '💎 Cada resposta certa é um novo tesouro!'),
  () => L('⭐ واصل! أنت بطل مملكة الجليد!', '⭐ Keep going! You\'re the Ice Kingdom champion!', '⭐ Continue! Você é o campeão do Reino de Gelo!'),
  () => L('🌊 كالمحيط، معرفتك لا حدود لها!', '🌊 Like the ocean, your knowledge is limitless!', '🌊 Como o oceano, seu conhecimento é ilimitado!'),
];

/* ─── State Management ─── */
function loadStory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { seenIntros: [], factIndex: {} };
  } catch { return { seenIntros: [], factIndex: {} }; }
}

function saveStory(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

/* ─── Public API ─── */
export function getWorldIntro(worldId) {
  const intro = WORLD_INTROS[worldId];
  if (!intro) return null;
  return {
    emoji: intro.emoji,
    title: intro.title(),
    text: intro.text(),
    tip: intro.tip(),
  };
}

export function markIntroSeen(worldId) {
  const data = loadStory();
  if (!data.seenIntros.includes(worldId)) {
    data.seenIntros.push(worldId);
    saveStory(data);
  }
}

export function isIntroSeen(worldId) {
  const data = loadStory();
  return data.seenIntros.includes(worldId);
}

export function getFunFact(subject) {
  const facts = FUN_FACTS[subject] || FUN_FACTS.mixed;
  const data = loadStory();
  if (!data.factIndex) data.factIndex = {};
  const idx = (data.factIndex[subject] || 0) % facts.length;
  data.factIndex[subject] = idx + 1;
  saveStory(data);
  return facts[idx]();
}

export function getEncouragement() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]();
}

export function getAllIntros() {
  return Object.keys(WORLD_INTROS).map(id => ({
    worldId: parseInt(id),
    ...getWorldIntro(parseInt(id)),
  }));
}

export function resetStory() {
  localStorage.removeItem(STORAGE_KEY);
}
