var ponyclicker = (function(){
  "use strict"
  // Polyfill for old browsers and IE
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log10
  Math.log10 = Math.log10 || function(x) {
    return Math.log(x) / Math.LN10;
  };

  

  var $ponyversion = {major:0,minor:90,revision:0};
      
  function CreateGame() {
    return {
      upgrades:[], // list of upgrade IDs that are owned
      upgradeHash:{},
      smiles:0,
      totalsmiles:0,
      SPC:1,
      SPS:0,
      shiftDown:false,
      totalTime:0,
      clicks:0,
      achievements:{}, // List of achievements as an object that we pretend is a hash.
      achievementcount:0, // We can't efficiently count properties so we store a length ourselves.
      muffins:0, // total number of muffins gained from achievements.

      store:[1,0,0,0,0,0,0,0,0,0,0,0,0], // amount player has bought of each store item.
      ponyList:genPonyList(), // precalculated list of randomized ponies (so we can reconstruct them after a save/load)
      pinkies:[], // list of smiles siphoned by rampaging pinkies
      clonespopped:0, // number of pinkie clones popped
      cupcakes:0, // total number of cupcakes gained through soft resets
      resets:0, // number of times the game has been reset
      legacysmiles:0, // total number of smiles from previous resets
      legacyclicks:0,
      version:5, // incremented every time this object format changes so we know to deal with it.
      settings: {
        useCanvas:true,
        optimizeFocus:false,
        closingWarn:false,
        showHighlight:false,
        numDisplay:0, // 0 is names, 1 is raw numbers, 2 is scientific notation
      }
    };
  }
  
  function ParseGame(src) {
    var g = JSON.parse(src);
    switch(g.version)
    {
      case 3:
        g.settings.numDisplay = 0;
        g.version = 4;
      case 4:
        delete g.achievement_muffins;
        g.pinkies = [];
        g.settings.showHighlight = false;
        g.clonespopped = 0;
        g.cupcakes = 0;
        g.resets = 0;
        g.legacysmiles = 0;
        g.legacyclicks = 0;
        g.version = 5;
      case 5:
        Game = g;
        break;
      default:
        alert('Неопознанная версия! Невозможно загрузить игру.');
    }
  }

  //
  // -------------------------------- Pony list generation --------------------------------
  //
  var PonyList = ["Pinkie Pie", "Adagio Dazzle", "Aloe", "Amethyst Star", "Applebloom", "Applejack", "Aria Blaze", "Babs Seed", "Berry Punch", "Big McIntosh", "Blossomforth", "Braeburn", "Carrot Top", "Cheerilee", "Cheese Sandwich", "Chrysalis", "Cloudchaser", "Coco Pommel", "Colgate", "Daring Do", "Diamond Tiara", "Dinky Doo", "Ditsy Doo", "Dr Whooves", "Fancy Pants", "Flam", "Fleur de Lis", "Flim", "Flitter", "Fluttershy", "Hoity Toity", "King Sombra", "Lightning Dust", "Lotus", "Lyra Heartstrings", "Maud Pie", "Mrs Harshwhinny", "Night Glider", "Octavia Melody", "Prince Blueblood", "Princess Cadance", "Princess Celestia", "Princess Luna", "Rainbow Dash", "Rarity", "Scootaloo", "Shining Armor", "Silver Spoon", "Sonata Dusk", "Starlight Glimmer", "Sunset Shimmer", "Sweetie Belle", "Thunderlane", "Trenderhoof", "Trixie", "Trouble Shoes", "Twilight Sparkle", "Zecora", "Vinyl Scratch"];
  
  var ElementList = ["element_of_loyalty", "element_of_honesty", "element_of_kindness", "element_of_laughter", "element_of_generosity", "element_of_magic", "element_of_melody", "element_of_muffins", "element_of_music", "element_of_sweets", "element_of_time", "element_of_wubs", "element_of_upvote", "element_of_downvote"];
  
  // https://stackoverflow.com/a/2450976/1344955
  function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }
  
  function genPonyList() {
    var list = [];
    for(var i = 1; i < PonyList.length; ++i) {
      list.push(i);
    }
    shuffle(list);
    list.unshift(0);
    return list;
  }
  



  //
  // -------------------------------- Store definitions --------------------------------
  //
  var Store = [
    {cost:function(n) {},name:"Пони", plural: "пони", desc: "Это пони. Чтобы генерировать улыбки, пони нужны дружбы.", img: function(n){ return 'ponies/'+PonyList[Game.ponyList[n]]+'.svg'; }},
    {cost:function(n) {},name:"Дружба", plural: "дружб", desc: "Дружба между двумя пони. Новую дружбу купить нельзя, если все уже дружат друг с другом!", img: function(n){ return 'store/hoofbump.svg'; } },
    {cost:function(n) {},name:"Выступление", plural: "выступлений", desc: "Небольшое выступление для своих друзей.", formula: "Генерирует по одной улыбке за пони.<i>УВС = П</i>", img: function(n){ return 'store/cello.svg'; }}, // P
    {cost:function(n) {},name:"Вечеринка", plural: "вечеринок", desc: "Устроить вечеринку для всех друзей!", formula: "Генерирует по одной улыбке за каждую дружбу.<i>УВС = Д</i>", img: function(n){ return 'store/balloon.svg'; }}, // F
    {cost:function(n) {},name:"Парад", plural: "парадов", desc: "Организовать грандиозный парад для всех друзей и их друзей!", formula: "Генерирует по одной улыбке за каждую пони и дружбу.<i>УВС = П&plus;Д</i>", img: function(n){ return 'store/trixie_wagon.svg'; }}, // P+F
    {cost:function(n) {},name:"Концерт", plural: "концертов", desc: "Устроить концерт для всего города!", formula: "Генерирует по одной улыбке за каждую пони, дружбу, выступление, вечеринку и парад.<i>УВС = П&plus;Д&plus;Выступления&plus;Вечеринки&plus;Парады</i>", img: function(n){ return 'store/octavia_cutiemark.svg'; }}, // P+F+Recitals+Parties+Parades
    {cost:function(n) {},name:"Фестиваль", plural: "фестивалей", desc: "Устроить фестиваль на все выходные!", formula: "Генерирует по одной улыбке на каждую пони умножить на количество дружб.<i>УВС = П&times;Д</i>", img: function(n){ return 'store/stage.png'; }}, // P*F
    {cost:function(n) {},name:"Дискотека", plural: "дискотек", desc: "Устроить дискотеку, чтобы танцевал весь Кантерлот!", formula: "Генерирует по одной улыбке за каждую пони умножить на количество дружб умножить на количество концертов.<i>УВС = П&times;Д&times;Концерты</i>", img: function(n){ return 'store/turntable.png'; }}, // P*F*Concerts
    {cost:function(n) {},name:"Грандиозный Гала-Концерт", plural: "грандиозных гала-концертов", desc: "Устроить грандиозный гала-концерт и пригласить пони со всей Эквестрии!", formula: "Генерирует по одной улыбке за каждую пони умножить на количество дружб умножить на количество вечеринок и парадов.<i>УВС = П&times;Д&times;(Вечеринки&plus;Парады)</i>", img: function(n){ return 'store/redhat.svg'; }}, //P*F*(Parties + Parades)
    {cost:function(n) {},name:"Коронация", plural: "коронаций", desc: "Сделать кого-нибудь принцессой, чтобы был повод гулять всю ночь!", formula: "Генерирует по одной улыбке за каждую пони умножить на количество дружб умножить на количество концертов умножить на количество дискотек.<i>УВС = П&times;Д&times;Концерты&times;Дискотеки</i>", img: function(n){ return 'store/twilicorn_crown.svg'; }}, //P*F*Concerts*Raves
    {cost:function(n) {},name:"Государственный праздник", plural: "государственных праздников", desc: "Объявить государственный праздник, чтобы каждая пони в Эквестрии могла отрываться вместе с вами, а не заниматься полезными вещами!", formula: "Генерирует по одной улыбке за каждую пони умножить на количество дружб умножить на количество парадов умножить на количество фестивалей умножить на количество коронаций.<i>УВС = П&times;Д&times;Парады&times;Фестивали&times;Коронации</i>", img: function(n){ return 'store/calendar.svg'; }}, //P*F*Parades*Festivals*Coronations
    {cost:function(n) {},name:"Элементы гармонии", plural: "элементов гармонии", desc: "Решите все свои проблемы одним залпом огромного радужного луча дружбы!", formula: "Генерирует по одной улыбке за каждую пони умножить на количество дружб умножить на экспоненту корня четвертой степени от произведения количества дружб и зданий.<i>УВС = П&times;Д&times;exp((Д*З)<sup>&frac14</sup>)</i>", img: function(n){ return 'store/'+ElementList[n%ElementList.length]+'.svg'; }}, //P*F*exp((F*B)^1/4)
  ];




  function factorial(n) { var r = n; while(--n > 1) { r = r*n; } return r; }
  function factorial_limit(n,k) { var r = n; while(--n > k) { r = r*n; } return r; }
  function max_binomial(n) { var n2=Math.floor(n/2); var r = n; while(--n > n2) { r = r*n; } return Math.floor(r/factorial(n2)); }
  function triangular(n) { return (n*(n-1))/2; } // number of edges in a complete graph of n nodes
  function inv_triangular(n) { return 0.5*(Math.sqrt(8*n + 1) + 1); } // Returns the triangular number that would produce this many edges
  function fbnext(x) { return x + 1 + (x>>1) + (x>>3) - (x>>7) + (x>>10) - (x>>13); }
  
  // The game's difficulty is modelled using a series of curves defined by these values
  function fn_ratio(init,curve) { return function(n) { return init*Math.pow(curve,n); }; }
  var fcurve = 1.24; // Friendship curve
  var fcurve_init = 20;
  var rcurve = 1.31; // cost ratio curve
  var rcurve_init = 15; // Initial cost ratio (jump forwards twice to get the cost ratio for a recital)
  var ccurve = 1.21;
  
  // The fundamental curve is the cost of friendships. This forms a simple recurrence relation f_n = a*f_n-1, which has a closed-form solution of f_n = f_0*a^n
  var fn_cost1 = fn_ratio(fcurve_init, fcurve);
  Store[1].initcost = fcurve_init;
  Store[1].costcurve = fcurve;

  // The cost of ponies is based on the cost of buying k+1 friendships, where k is the number of edges in a complete graph of n-nodes, which is just a triangular number. So, we take the current number of ponies, find the corresponding triangular number, add one and plug that into the friendship cost function.
  var fn_cost0 = function(n) { return (n<2)?15:fn_cost1(triangular(n)+1); };
  function countb(store) { var r=0; for(var i = 2; i < store.length; ++i) r+=store[i]; return r; }
  
  Store[0].fn_SPS = function(store) { return 0; };
  Store[1].fn_SPS = function(store) { return 1.0; };
  Store[2].fn_SPS = function(store) { return store[0]; };
  Store[3].fn_SPS = function(store) { return store[1]; };
  Store[4].fn_SPS = function(store) { return store[0]+store[1]; };
  Store[5].fn_SPS = function(store) { return store[0]+store[1]+store[2]+store[3]+store[4]; };
  Store[6].fn_SPS = function(store) { return store[0]*store[1]; };
  Store[7].fn_SPS = function(store) { return store[0]*store[1]*store[5]; };
  Store[8].fn_SPS = function(store) { return store[0]*store[1]*(store[3]+store[4]); };
  Store[9].fn_SPS = function(store) { return store[0]*store[1]*store[5]*store[7]; };
  Store[10].fn_SPS = function(store) { return store[0]*store[1]*store[4]*store[6]*store[9]; };
  Store[11].fn_SPS = function(store) { return store[0]*store[1]*Math.exp(Math.pow(countb(store)*store[1], 1/4)); };

  function inv_cost(i, cost) { return Math.floor(Math.log(cost/Store[i].initcost)/Math.log(Store[i].costcurve)) }

  var Fvals = [0,0,4,12,30,40,50,60,75,80,95,120];
  var fn_rratio = fn_ratio(rcurve_init,rcurve); // gets the SPS ratio for a store of level n
  function get_rratio(n) {
    switch(n) {
      case 10: return 2.0*fn_rratio(n);
      case 11: return 3.5*fn_rratio(n);
    }
    return fn_rratio(n);
  }
  function initSPS(i, store) { return Store[i].fn_SPS(store); }
  function initcost(i, store) { return initSPS(i, store)*get_rratio(i); }
  function estimatestore(f, max) { 
    var s = [Math.floor(inv_triangular(f)),f];
    for(var j = 2; j < max; j++)
      s.push(inv_cost(j, fn_cost1(f)));
    return s;
  }
  for(var i = 2; i < 12; ++i) {
    Store[i].initcost = initcost(i, estimatestore(Fvals[i], i));
    Store[i].costcurve = ccurve; //fn_costcurve(5, fn_rratio(i-2)*1.5, i, Store[i].initcost);
  }
  // Calculates a poisson distribution, which is useful for countering the SPS/cost ratio dip at the beginning of the cost function. Beyond n > 40 the function begins returning values on the order of 0.00000000001, so we just set it to 0 to prevent underflow errors.
  function poisson(n,L) { return n>40?0:Math.pow(L,n)*Math.exp(-L)/factorial(n); }
  function default_cost(i, n) { return Store[i].initcost*Math.pow(Store[i].costcurve,n)*(1+poisson(n+3,14)*5); }

  Store[0].cost = fn_cost0;
  Store[1].cost = fn_cost1;
  Store[2].cost = function(n) { return default_cost(2, n); };
  Store[3].cost = function(n) { return default_cost(3, n); };
  Store[4].cost = function(n) { return default_cost(4, n); };
  Store[5].cost = function(n) { return default_cost(5, n); };
  Store[6].cost = function(n) { return default_cost(6, n); };
  Store[7].cost = function(n) { return default_cost(7, n); };
  Store[8].cost = function(n) { return default_cost(8, n); };
  Store[9].cost = function(n) { return default_cost(9, n); };
  Store[10].cost = function(n) { return default_cost(10, n); };
  Store[11].cost = function(n) { return default_cost(11, n); };
  
  //
  // -------------------------------- Game Loading and Settings --------------------------------
  //
  function ResetGame() {
    for(var i = 0; i < Game.pinkies.length; ++i) {
      if(Game.pinkies[i]>=0) Earn(Game.pinkies[i]);
    }
    if(Game.totalsmiles > 1000000000) EarnAchievement(212);
    if(Game.totalsmiles > 1000000000000) EarnAchievement(213);
    if(Game.totalsmiles > 1000000000000000) EarnAchievement(214);
    if(Game.totalsmiles > 1000000000000000000) EarnAchievement(215);
    if(Game.totalsmiles > 1000000000000000000000) EarnAchievement(216);
    if(Game.totalsmiles > 1000000000000000000000000) EarnAchievement(217);
    if(Game.totalsmiles > 1000000000000000000000000000) EarnAchievement(218);
    if(Game.totalsmiles > 1000000000000000000000000000000) EarnAchievement(219);
    
    //var muffins = Math.floor(inv_triangular(Game.totalsmiles/1000000000000))-1;
    //Game.muffins += muffins;
    //ShowNotice("Game reset", ((muffins==0)?null:"You get <b>" + Pluralize(muffins, " muffin") + "</b> for your <b>" + Pluralize(Game.totalsmiles, " smile") + "</b>"), null);
    ShowNotice("Сброс игры", "Извините, некоторые бонусы за маффины временно отключены!");
    Game.legacysmiles += Game.totalsmiles;
    Game.legacyclicks += Game.clicks;
    Game.resets += 1;
    Game.store = [1,0,0,0,0,0,0,0,0,0,0,0,0];
    Game.upgrades = [];
    Game.upgradeHash = {};
    Game.smiles = 0;
    Game.totalsmiles = 0;
    Game.SPC = 1;
    Game.SPS = 0;
    Game.clicks = 0;
    SaveGame();
    InitializeGame();
  }
  function WipeAllData() { localStorage.removeItem('game'); Game = CreateGame(); InitializeGame(); }

  function ImportGame(src) {
    ParseGame(src);
    InitializeGame();
    EarnAchievement(202);
    CheckAchievements(Object.keys(achievementList));
  }
  function InitializeGame() {
    $pinkieclones.empty();
    UpdateOverlay(-1,0);
    Earn(0);
    UpdateSPS();
    OrganizePonies();
    ApplySettings();
    UpdateNews();
    updateUpgradesAchievements();
    $stat_clicks.html(PrettyNum(Game.clicks));
    CheckAchievements(Object.keys(achievementList));
    UpdateSPS();
    ResetApocalypse();
    CheckApocalypse();
  }
  function LoadGame() {
    if(localStorage.getItem('game')!==null) { ParseGame(localStorage.getItem('game')); }
    ApplySettings();
  }

  function ExportGame() { return JSON.stringify(Game); }
  function SaveGame() { localStorage.setItem('game', ExportGame()); ShowNotice("Game saved", null, null); }
  function ApplySettings() {
    $EnableE.prop('checked',Game.settings.useCanvas);
    $EnableF.prop('checked',Game.settings.optimizeFocus);
    $EnableW.prop('checked',Game.settings.closingWarn);
    $EnableH.prop('checked',Game.settings.showHighlight);
    $('#numdisplay' + Game.settings.numDisplay).prop('checked', true);
  }
  function GetSettings() {
    Game.settings.useCanvas = $EnableE.prop('checked');
    Game.settings.optimizeFocus = $EnableF.prop('checked');
    Game.settings.closingWarn = $EnableW.prop('checked');
    Game.settings.showHighlight = $EnableH.prop('checked');
    if($('#numdisplay0').prop('checked')) Game.settings.numDisplay = 0;
    if($('#numdisplay1').prop('checked')) Game.settings.numDisplay = 1;
    if($('#numdisplay2').prop('checked')) Game.settings.numDisplay = 2;
    UpdateSPS();
  }

  function GetRandNum(min, max) { // Random number in the range [low, high)
    return Math.floor(Math.random()*(max-min))+min;
  }

  //
  // -------------------------------- News Headlines and Functions --------------------------------
  //
  function GetNews() {
    var news = [];

    // These are specific smile count related messages
    if(Game.totalsmiles < 30) {
      news.push(
		"В Понивилле все как в воду опущенные, отмечает случайный прохожий.",
        "В Понивилле обнаружен катастрофический дефицит улыбок.",
        "Прогноз по улыбкам на сегодня: отчаяние с шансом депрессии.",
        "Понивилль срочно необходимо встряхнуть.",
        "По всему Понивиллю с прилавков сметают антидепрессанты.",
        "На вопрос, почему Понивилль утопает в унынии, Мэр ответила, что ей сейчас не до того."
      );
    } else if(Game.totalsmiles < 1000) {
      news.push("Жители Понивилля восхищаются новым состоянием сознания! Учеными выдвинут термин «Улыбка». Конспирологи утверждают, что это заговор с целью захвата мира.",
        "Все больше и больше пони чувствуют, что с ними творится что-то непонятное!",
        "На улицах города были замечены играющие жеребята! Родителями обсуждается вопрос о запрете так называемого «веселья».",
        "Небольшой магазинчик начинает продавать «сдобные вкусности» вместо «сдобных нормальностей». Покупатели опасаются маркетинговой аферы.");
    
	
	} else if(Game.totalsmiles < 1000000) {
      news.push("Пони на улицах улыбаются друг другу! Городские старейшины осуждают новую моду.",
        "Айрон Вилл перешел на тренинги по самоутверждению вместо тренингов по борьбе с депрессией!",
        "Молодежь при встрече стукается копытами! Родители озабочены новым трендом!",
        "Местный психиатр недоволен всеобщим подъемом настроения, жалуется на отток клиентов.");
    
	} else if(Game.totalsmiles < 1000000000) {
      news.push("По всему Понивиллю тут и там спонтанно запеваются песни!",
      "Понивилль признан самым счастливым местом в Эквестрии!",
      "Пони по всей Эквестрии стремятся попасть в Понивилль!");
    } else if(Game.totalsmiles < 1000000000000) {
      news.push(
        "Принцесса Твайлайт обнаружена дома с передозировкой дружбой, отправлена на реабилитацию!",
        "Жители Понивилля так счастливы, что придумали для этого новое слово! Дебаты о его правильном написании вскоре переросли в уличные беспорядки!");
    } else if(Game.totalsmiles < 1000000000000000) {

      news.push("Жители Понивилля страдают от хронического счастья! Доктора не могут определить, в чем тут проблема!");
    } else if(Game.totalsmiles < 1000000000000000000) {

      news.push("Ученым удалось расщепить дружбу и обнаружить цепную реакцию! Армия начинает разработку дружбомбы!");
    } else {

      news.push("Новая физическая теория доказывает, что вся материя состоит из разного рода улыбок!");
    }


    // After 10000 smiles we start putting in most of the standard news messages into rotation.
    if(Game.totalsmiles > 10000) {
      news.push('Твайлайт шипит Рейнбоу Дэш со всем в Эквестрии! В стране назревает восстание!',
        'Лира и Бон-Бон заявляют, что они «просто друзья»! Пони по всей стране шокированы!',
        "Тяга Селестии к тортам оборачивается катастрофой на королевской кухне! Панихида по безвременно усопшей шоколадной стружке состоится в понедельник.",
        "Розовый смертник в Сахарном уголке окончательно свихнулся! В заложниках 15 маффинов!",
        "Граждане Понивилля голосуют за создание общественной библиотеки, чтобы больше не полагаться на частную коллекцию чокнутой фиолетовой кобылы!",
        "Жеребенок обнаруживает пропавший сарай семьи Эпплов в открытом космосе. Рейнбоу Дэш отрицает все обвинения.",
        "Рэрити вступает в ряды защитников окружающей среды, отказывается от посещения СПА-салона. СПА-салон разоряется.",
        "После инцидента с натрием не в той банке и взрывающимся унитазом Свити Бот обязана зарегистрировать себя как оружие массового поражения.",
        "Рейнбоу Дэш продолжает инвестировать в облачные сервисы. Остальные пегасы понятия не имеют, что это вообще такое.",
        "Принцесса Твайлайт выясняет, что на самом деле пони — это маленькие ядерные реакторы! «Это объясняет, почему я никогда не хожу в туалет», — комментирует Рейнбоу Дэш.",
        "Пони пони Пони пони пони пони Пони пони!",
        "Принцесса Твайлайт встречается с персиком! Персик комментировать ситуацию отказался.",
        'Доктор Хувс сталкивается с самим собой. Жители Понивилля в страхе ожидают конца света.',
        'Биг Мак и Смарти Пентс ведут глубокие филосовские беседы. На вопрос о том, как он может разговаривать, Смарти Пентс отказался отвечать.',
        'Эппл Блум обнаружена в шоковом состоянии на окраине Вечносвободного леса; по ее словам, она наткнулась на деревню пони без кьютимарок.',
        'Эпплджек нашла золотое яблоко. При вопросе о том, откуда оно взялось, она прячет глаза и меняет тему.',
        'Пинки Пай в панике носится по Понивиллю и вопит, что «Вся наша жизнь — это просто выдуманный сюжет в мультике для маленьких детей!»"'
      );

      if(Game.muffins > 10) {
        news.push('Дерпи Хувс чудом спасает пекарню от пожара; приписывает свою отвагу «Силе маффинов».',
          "Попробуйте новые маффины со вкусом улыбок уже сегодня!",
          'Безумный Доктор взял Мэра в заложники, требует построить фабрику маффинов «ради блага всего понячества»!',
          'Дерпи выходит замуж за Траблшуз! Понивиль не переживает свадьбу.',
          'Учеными изучается вопрос о влиянии маффинов на крупные сюжетные элементы.',
          'Рэрити анонсирует новую линейку одежды для одаренных природой кобылок, комментирует: «Белье с маффинами — писк этого сезона».',
          "Рейнбоу Дэш устраивает вечеринку в честь выхода нового романа А.К. Йерлинг, «Дэринг Ду и пекарь Азкабана».",
          "Флаттершай отменяет традиционный пикник со зверушками и отправляется вместо этого на презентацию новых маффинов. Связаться со зверушками и услышать их коммментарии не удалось.",
          "На фоне падающих продаж яблочной продукции Эпплджек выходит на рынок яблочных маффинов.",
          "Твайлайт Спаркл орестована за магические эксперименты над животными — попытку скрестить мышь и маффин.",
          "Пинки Пай проводит компанию по ребрендингу капкейков как «десертных маффинов», результаты оставляют желать лучшего."
        );
      }
      if(Game.muffins > 100) {

        news.push('Дерпи врезается в огромный маффин. Такова ирония.',
        "Дискорд сожрал 40 маффинов, а это аж 4 раза по 10, и это же ужасно!",
          "Установлено, что Принцесса Селестия в этом году съела как минимум 37 маффинов. «Что, подряд?» — прокомментировала новость Принцесса Луна.",
          "Princess Cadence Announces that all muffins produced in the Crystal Empire now come with ‘Free Shipping’.  Her Highness then winked suggestively.",
          "На фоне захлестнувшей Эквестрию волны маффиннового безумия Сапфир Шорс выпускает новый мьюзикл, «Мои маленькие маффины: Выпечка это магия».",
          "Даймонд Тиара утверждает, что у ее папы коллекция маффинов больше, чем у тебя, как бы неправдоподобно это ни звучало.",
          "Опрос издания Фоал Фри Пресс показывает, что самые большие улыбки на лицах жеребят вызывают свежие маффины.",
          'Сахарный Уголок устраивает распродажу маффинов. Понивилль скорбит по пропавшим без вести в очередях.',
          "Кризалис возвращается! За маффинами."
          );
      }
      if(Game.muffins > 200) {
        news.push('Пришлите помошь! Застрял в Эквестрии, заставляют переводить какую-то муть.'
          );
      }

    }

    return news[GetRandNum(0, news.length)];
  }
  var newsnum = 0,
      newswait = 15000,
      lastNews;



  function UpdateNews() {
    var n2 = (newsnum + 1) % 2;
    $news.children()
      .last().prependTo($news).css('opacity',0).html(GetNews()).fadeTo(500,1)
      .next().fadeTo(500,0);
  }
  
  //
  // -------------------------------- Math and Number Displays --------------------------------
  //
  function NumCommas(x) {
    if(x<1e20) { // if we're below the precision threshold of toFixed, we cheat and insert commas into that.
      var n = x.toFixed(0);
      var len = n.length%3;
      if(!len) len = 3;
      var r = n.substring(0, len);
      for(var i = len; i < n.length; i+=3) {
        r += ',' + n.substring(i, i+3);
      }
      return r;
    }
    // TODO: This is laughably inefficient because we build the arrays in reverse.
    var r = (Math.floor(x)%1000).toFixed(0);
    x = Math.floor(x/1000);
    while(x) {
      var len = r.split(',')[0].length;
      for(var i = len; i < 3; ++i) {
        r = '0' + r;
      }
      r = (x%1000).toFixed(0) + ',' + r;
      x = Math.floor(x/1000);
    }
    return r;
  }
  
  var number_names = [
    "миллион",
  "миллиард",
  "триллион",
  "квадриллион",
  "квинтиллион",
  "секстиллион",
  "септиллион",
  "октиллион",
  "нониллион",
  "дециллион",
  "ундециллион",
  "додециллион",
  "тредециллион",
  "кваттоурдециллион",
  "квиндециллион",
  "седециллион",
  "септдециллион",
  "октодециллион",
  "новемдециллион",
  "вигинтиллион"];
  
  function PrettyNumStatic(x, fixed, display) {

    switch(display)
    {
    case 0:
      var d = Math.floor(Math.log10(x));
      if(d<6) return NumCommas(x);
      x = Math.floor(x/Math.pow(10,d-(d%3)-3));
      var n = Math.floor((d-3)/3) - 1;
      if(n >= number_names.length) return "Бесконечность";
      return (fixed?(x/1000).toFixed(3):(x/1000)) + " " + number_names[n];
    case 1:
      return NumCommas(Math.floor(x));
    case 2:
      return (x<=999999)?NumCommas(x):(x.toExponential(3).replace("e+","&times;10<sup>")+'</sup>');
    }
  }
  function PrettyNum(x, fixed) { return PrettyNumStatic(x, fixed, Game.settings.numDisplay); }
  function PrintTime(time) {
    var t = [0, 0, 0, 0, 0]; // years, days, hours, minutes, seconds
    t[4] = time % 60;
    time = (time - t[4]) / 60;
    t[3] = time % 60;
    time = (time - t[3]) / 60;
    t[2] = time % 24;
    time = (time - t[2]) / 24;
    t[1] = time % 365;
    t[0] = (time - t[1]) / 365;
    if (t[0] > 100) return "веков"; // more than 100 years
    for (var i = 3; i <= 4; i++) if (t[i] < 10) t[i] = "0" + t[i];
    var output = (t[2]>0?(t[2] + ":"):"") + t[3] + ":" + t[4];
    if (t[1]) output = t[1] + " дней и " + output;
    if (t[0]) output = t[0] + " лет, " + output;
    return output;
  }
  function Pluralize2(n, s, s2, fixed, display) { return PrettyNumStatic(n, fixed, display) + ((n==1)?s:s2); }
  function Pluralize(n, s, fixed) { return Pluralize2(n, s, s + '', fixed, Game.settings.numDisplay); }
  


  function gen_upgradetype1(item, pSPS, mSPS) { return function(sps, store) { sps.pStore[item] += pSPS*store[item]; sps.mStore[item] += mSPS*store[item]; return sps; } }
  function gen_upgradetype2(item, p, m) { return function(sps, store) { sps.pSPC += p*store[item]; sps.mSPC += m; return sps; } }

  function gen_upgradetype3(p, m) { return function(sps, store) { sps.pSPS += p; sps.mSPS += m; return sps; } }
  function gen_finalupgrade(m) { return function(sps, store) { var b = (store[0]+store[1]+CountBuildings(store))*m; for(var i = 0; i < sps.mStore.length; ++i) sps.mStore[i] += b; return sps;} }
  function gen_muffinupgrade(pSPS, mSPS) { return function(sps, store) { sps.mMuffin += mSPS*((typeof Game !== 'undefined')?Game.muffins:0); return sps; } }

























  /* upgrade pool object: {
    pSPS, // Global additive bonus to SPS (applied after store)
    mSPS, // Global multiplier to SPS (applied after store)
    pSPC, // Additive bonus to SPC
    mSPC, // percentage of the total SPS after everything else has been applied to add to the SPC
    mMuffin, // multiplier bonus applied after global SPS bonus (usually muffins)
    pStore, // Array of additive bonuses to individual store item SPS
    mStore // array of multiplicative bonuses to individual store item SPS
  }*/
  




  //
  // -------------------------------- Upgrade generation --------------------------------
  //
  var defcond = function(){ return this.cost < (Game.totalsmiles*1.1)};
  function genprecond(id) { return function() { return (Game.upgradeHash[id] !== undefined) && (this.cost < (Game.totalsmiles*1.1)); } }
  function gencountcond(item, count) { return function() { return Game.store[item] >= count && this.cost < (Game.totalsmiles*1.2)} }
  
  var upgradeList = {
    '1':{id:1, cost:600, name:"Тык-ассистенты", desc: "Каждый тык дает +1 улыбок за тык за каждую пони.", fn:gen_upgradetype2(0, 1, 0), cond:defcond, flavor: 'Тык-отряд, за работу!.'},
    '2':{id:2, cost:7000, name:"Тык это магия", desc: "Каждый тык дает +1 улыбок за тык за каждую дружбу.", fn:gen_upgradetype2(1, 1, 0), cond:defcond },
    '3':{id:3, cost:80000, name:"Щекочащие курсоры", desc: "Каждый тык дает 1% от улыбок в секунду.", fn:gen_upgradetype2(0, 0, 0.01), cond:defcond},
    '4':{id:4, cost:900000, name:"Курсоры с перышками", desc: "Каждый тык дает 2% от улыбок в секунду.", fn:gen_upgradetype2(0, 0, 0.02), cond:defcond},
    '5':{id:5, cost:10000000, name:"Мастер щекотеквандо", desc: "Каждый тык дает 3% от улыбок в секунду.", fn:gen_upgradetype2(0, 0, 0.03), cond:defcond},
    '6':{id:6, cost:110000000, name:"Иньекция счастья", desc: "Каждый тык дает 4% от улыбок в секунду.", fn:gen_upgradetype2(0, 0, 0.04), cond:defcond},
    '7':{id:7, cost:700000, name:"Дружба — это магия", desc: "Дружба генерирует +1 улыбок в секунду за каждую другую дружбу.", fn:gen_upgradetype1(1, 1, 0), cond:defcond },
    '8':{id:8, cost:10000000, name:"Дружба — это волшебство", desc: "Дружба генерирует +10 улыбок в секунду за каждую другую дружбу.", fn:gen_upgradetype1(1, 10, 0), cond:defcond },
    '9':{id:9, cost:500000000, name:"Дружба — это чародейство", desc: "Дружба генерирует +100 улыбок в секунду за каждую другую дружбу.", fn:gen_upgradetype1(1, 100, 0), cond:defcond },
    '10':{id:10, cost:10000000000, name:"Дружба — это колдовство", desc: "Дружба генерирует +1000 улыбок в секунду за каждую другую дружбу.", fn:gen_upgradetype1(1, 1000, 0), cond:defcond },
    '11':{id:11, cost:300000000000, name:"Дружба — это преимущества", desc: "Дружба генерирует +10000 улыбок в секунду за каждую другую дружбу.", fn:gen_upgradetype1(1, 10000, 0), cond:defcond },
    '12':{id:12, cost:3800000000000, name:"Дружба — это радуга", desc: "Дружба генерирует +100000 улыбок в секунду за каждую другую дружбу.", fn:gen_upgradetype1(1, 100000, 0), cond:defcond },
    '13':{id:13, cost:7777777, name:"Я не знаю, что пошло не так!", desc: "Вы получаете +0.1% улыбок в секунду за каждый маффин.", fn:gen_muffinupgrade(0, 0.01), cond:defcond },
    '14':{id:14, cost:7777777777, name:"Пони-почтальон", desc: "Вы получаете +0.2% улыбок в секунду за каждый маффин.", fn:gen_muffinupgrade(0, 0.02), cond:defcond },
    '15':{id:15, cost:7777777777777, name:"Служба доставки Дерпи", desc: "Вы получаете +0.3% улыбок в секунду за каждый маффин.", fn:gen_muffinupgrade(0, 0.03), cond:defcond },
    '16':{id:16, cost:7777777777777777, name:"Маффины с черникой", desc: "Вы получаете +0.4% улыбок в секунду за каждый маффин.", fn:gen_muffinupgrade(0, 0.04), cond:defcond },
    '17':{id:17, cost:7777777777777777777, name:"Маффины с шоколадной крошкой", desc: "Вы получаете +0.5% улыбок в секунду за каждый маффин.", fn:gen_muffinupgrade(0, 0.05), cond:defcond },
    '18':{id:18, cost:7777777777777777777777, name:"Маффины с лимоном", desc: "Вы получаете +0.6% улыбок в секунду за каждый маффин.", fn:gen_muffinupgrade(0, 0.06), cond:defcond },
    '19':{id:19, cost:7777777777777777777777777, name:"Маффины с маком", desc: "Вы получаете +0.7% улыбок в секунду за каждый маффин.", fn:gen_muffinupgrade(0, 0.07), cond:defcond },
    '20':{id:20, cost:7777777777777777777777777777, name:"Сеть пекарен маффинов", desc: "Вы получаете +0.8% улыбок в секунду за каждый маффин.", fn:gen_muffinupgrade(0, 0.08), cond:defcond },
    '21':{id:21, cost:7777777777777777777777777777777, name:"Дизайнерские маффины", desc: "Вы получаете +0.9% улыбок в секунду за каждый маффин.", fn:gen_muffinupgrade(0, 0.09), cond:defcond },
    '22':{id:22, cost:7777777777777777777777777777777777, name:"Фабрики маффинов", desc: "Вы получаете +1.0% улыбок в секунду за каждый маффин.", fn:gen_muffinupgrade(0, 0.1), cond:defcond },
    '23':{id:23, cost:320000, name:"В лесу родилась елочка", desc: "Выступления генерируют +1 улыбок в секунду за каждое другое выступление.", fn:gen_upgradetype1(2, 1, 0), cond:defcond },
    '24':{id:24, cost:9000000, name:"Für Elise", desc: "Выступления генерируют +10 SPS улыбок в секунду за каждое другое выступление.", fn:gen_upgradetype1(2, 10, 0), cond:defcond },
    '25':{id:25, cost:350000000, name:"Лунная соната", desc: "Выступления генерируют +100 SPS улыбок в секунду за каждое другое выступление.", fn:gen_upgradetype1(2, 100, 0), cond:defcond },
    '26':{id:26, cost:12000000000, name:"Токката и фуга в ре миноре", desc: "Выступления генерируют +1000 SPS улыбок в секунду за каждое другое выступление.", fn:gen_upgradetype1(2, 1000, 0), cond:defcond },
    '27':{id:27, cost:200000000000, name:"Ноктюрн", desc: "Выступления генерируют +10000 SPS улыбок в секунду за каждое другое выступление.", fn:gen_upgradetype1(2, 10000, 0), cond:defcond },
    '28':{id:28, cost:660000, name:"Приветственная вечеринка", desc: "Вечеринки генерируют +2 улыбок в секунду за каждую другую вечеринку.", fn:gen_upgradetype1(3, 2, 0), cond:defcond },
    '29':{id:29, cost:50000000, name:"День рождения", desc: "Вечеринки генерируют +20 улыбок в секунду за каждую другую вечеринку.", fn:gen_upgradetype1(3, 20, 0), cond:defcond },
    '30':{id:30, cost:1000000000, name:"Дегустация сидра", desc: "Вечеринки генерируют +200 улыбок в секунду за каждую другую вечеринку.", fn:gen_upgradetype1(3, 200, 0), cond:defcond },
    '31':{id:31, cost:20000000000, name:"Свадьба", desc: "Вечеринки генерируют +2000 улыбок в секунду за каждую другую вечеринку.", fn:gen_upgradetype1(3, 2000, 0), cond:defcond },
    '32':{id:32, cost:320000000000, name:"Годовщина", desc: "Вечеринки генерируют +20000 улыбок в секунду за каждую другую вечеринку.", fn:gen_upgradetype1(3, 20000, 0), cond:defcond },
    '33':{id:33, cost:900000, name:"День Мэра", desc: "Парады генерируют +4 улыбок в секунду за каждый другой парад.", fn:gen_upgradetype1(4, 4, 0), cond:defcond },
    '34':{id:34, cost:100000000, name:"День Селестии", desc: "Парады генерируют +40 улыбок в секунду за каждый другой парад.", fn:gen_upgradetype1(4, 40, 0), cond:defcond },
    '35':{id:35, cost:2000000000, name:"День парадов", desc: "Парады генерируют +400 улыбок в секунду за каждый другой парад.", fn:gen_upgradetype1(4, 400, 0), cond:defcond },
    '36':{id:36, cost:40000000000, name:"День... ночи?", desc: "Парады генерируют +4000 улыбок в секунду за каждый другой парад.", fn:gen_upgradetype1(4, 4000, 0), cond:defcond },
    '37':{id:37, cost:850000000000, name:"День дня???", desc: "Парады генерируют +40000 улыбок в секунду за каждый другой парад.", fn:gen_upgradetype1(4, 40000, 0), cond:defcond },
    '38':{id:38, cost:1000000, name:"Канон Пахельбеля", desc: "Концерты генерируют +8 улыбок в секунду за каждый другой концерт.", fn:gen_upgradetype1(5, 8, 0), cond:defcond, flavor: "Они следят за тобой. Бежать больше некуда." },
    '39':{id:39, cost:100000000, name:"Времена года", desc: "Концерты генерируют +80 улыбок в секунду за каждый другой концерт.", fn:gen_upgradetype1(5, 80, 0), cond:defcond },
    '40':{id:40, cost:1750000000, name:"Щелкунчик", desc: "Концерты генерируют +800 улыбок в секунду за каждый другой концерт.", fn:gen_upgradetype1(5, 800, 0), cond:defcond },
    '41':{id:41, cost:80000000000, name:"Девятая симфония", desc: "Концерты генерируют +8000 улыбок в секунду за каждый другой концерт.", fn:gen_upgradetype1(5, 8000, 0), cond:defcond },
    '42':{id:42, cost:1000000000000, name:"Реквием в ре миноре", desc: "Концерты генерируют +80000 улыбок в секунду за каждый другой концерт.", fn:gen_upgradetype1(5, 80000, 0), cond:defcond },
    '43':{id:43, cost:1500000000, name:"Праздничное празднование", desc: "Фестивали генерируют в два раза больше улыбок.", fn:gen_upgradetype1(6, 0, 1.0), cond:defcond },
    '44':{id:44, cost:15000000000, name:"Фестиваль цветов", desc: "Генерация улыбок фестивалями удваивается еще раз.", fn:gen_upgradetype1(6, 0, 1.0), cond:defcond },
    //'45':{id:45, cost:150000000000, name:"Upgrade 6", desc: "Festivals smile generation doubled, again.", fn:gen_upgradetype1(6, 0, 1.0), cond:defcond },
    //'46':{id:46, cost:1500000000000, name:"Upgrade 6", desc: "Festivals smile generation doubled, again.", fn:gen_upgradetype1(6, 0, 1.0), cond:defcond },
    //'47':{id:47, cost:15000000000000, name:"Upgrade 6", desc: "Festivals smile generation doubled, again.", fn:gen_upgradetype1(6, 0, 1.0), cond:defcond },
    '48':{id:48, cost:8000000, name:"DJ Pon-3", desc: "Дискотеки генерируют +32 улыбок в секунду за каждую другую дискотеку.", fn:gen_upgradetype1(7, 32, 0), cond:defcond },
    '49':{id:49, cost:800000000, name:"Тусовка", desc: "Дискотеки генерируют +320 улыбок в секунду за каждую другую дискотеку.", fn:gen_upgradetype1(7, 320, 0), cond:defcond },
    '50':{id:50, cost:11000000000, name:"Светящиеся палочки", desc: "Дискотеки генерируют +3200 улыбок в секунду за каждую другую дискотеку.", fn:gen_upgradetype1(7, 3200, 0), cond:defcond },
    '51':{id:51, cost:160000000000, name:"Больше светящихся палочек!", desc: "Дискотеки генерируют +32000 улыбок в секунду за каждую другую дискотеку.", fn:gen_upgradetype1(7, 32000, 0), cond:defcond },
    '52':{id:52, cost:2300000000000, name:"Сабвуферы", desc: "Дискотеки генерируют +320000 улыбок в секунду за каждую другую дискотеку.", fn:gen_upgradetype1(7, 320000, 0), cond:defcond },
    '53':{id:53, cost:16000000, name:"Платье за две монеты", desc: "Грандиозные гала-концерты генерируют +64 улыбок в секунду за каждый другой гала-концерт.", fn:gen_upgradetype1(8, 64, 0), cond:defcond },
    '54':{id:54, cost:400000000, name:"Официальный костюм", desc: "Грандиозные гала-концерты генерируют +640 улыбок в секунду за каждый другой гала-концерт.", fn:gen_upgradetype1(8, 640, 0), cond:defcond },
    '55':{id:55, cost:6000000000, name:"Фрак на заказ", desc: "Грандиозные гала-концерты генерируют +6400 улыбок в секунду за каждый другой гала-концерт.", fn:gen_upgradetype1(8, 6400, 0), cond:defcond },
    '56':{id:56, cost:120000000000, name:"Шедевр от Рэрити", desc: "Грандиозные гала-концерты генерируют +64000 улыбок в секунду за каждый другой гала-концерт.", fn:gen_upgradetype1(8, 64000, 0), cond:defcond },
    '57':{id:57, cost:3000000000000, name:"Шляпы", desc: "Грандиозные гала-концерты генерируют +640000 улыбок в секунду за каждый другой гала-концерт.", fn:gen_upgradetype1(8, 640000, 0), cond:defcond },
    '58':{id:58, cost:32000000, name:"Принцесса Твайлайт", desc: "Коронации генерируют +128 улыбок в секунду за каждую другую коронацию.", fn:gen_upgradetype1(9, 128, 0), cond:defcond },
    '59':{id:59, cost:1500000000, name:"Принцесса Кейденс", desc: "Коронации генерируют +1280 улыбок в секунду за каждую другую коронацию.", fn:gen_upgradetype1(9, 1280, 0), cond:defcond },
    '60':{id:60, cost:22000000000, name:"Принцесса Дерпи", desc: "Коронации генерируют +12800 улыбок в секунду за каждую другую коронацию.", fn:gen_upgradetype1(9, 12800, 0), cond:defcond },
    '61':{id:61, cost:340000000000, name:"Принцесса Биг Мак", desc: "Коронации генерируют +128000 улыбок в секунду за каждую другую коронацию.", fn:gen_upgradetype1(9, 128000, 0), cond:defcond },
    '62':{id:62, cost:8000000000000, name:"Фаустикор", desc: "Коронации генерируют +1280000 улыбок в секунду за каждую другую коронацию.", fn:gen_upgradetype1(9, 1280000, 0), cond:defcond },
    '63':{id:63, cost:64000000, name:"Трехдневное празднование", desc: "Государственные праздники генерируют +256 улыбок в секунду за каждый другой государственный праздник.", fn:gen_upgradetype1(10, 256, 0), cond:defcond },
    '64':{id:64, cost:1500000000, name:"Дополнительные выходные", desc: "Государственные праздники генерируют +2560 улыбок в секунду за каждый другой государственный праздник.", fn:gen_upgradetype1(10, 2560, 0), cond:defcond },
    '65':{id:65, cost:22000000000, name:"Четыре дня выходных", desc: "Государственные праздники генерируют +25600 улыбок в секунду за каждый другой государственный праздник.", fn:gen_upgradetype1(10, 25600, 0), cond:defcond },
    '66':{id:66, cost:300000000000, name:"Дополнительный отпуск", desc: "Государственные праздники генерируют +256000 улыбок в секунду за каждый другой государственный праздник.", fn:gen_upgradetype1(10, 256000, 0), cond:defcond },
    '67':{id:67, cost:900000000000, name:"Бессрочный творческий отпуск", desc: "Государственные праздники генерируют +2560000 улыбок в секунду за каждый другой государственный праздник.", fn:gen_upgradetype1(10, 2560000, 0), cond:defcond },
    '68':{id:68, cost:100000, name:"Бублики", desc: "+1% улыбок в секунду", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '69':{id:69, cost:1000000, name:"Бублики с маком", desc: "+1% улыбок в секунду", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '70':{id:70, cost:10000000, name:"Бублики с черникой", desc: "+1% улыбок в секунду", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '71':{id:71, cost:100000000, name:"Бублики с луком", desc: "+1% улыбок в секунду", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '72':{id:72, cost:1000000000, name:"Бублики с корицей", desc: "+1% улыбок в секунду", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '73':{id:73, cost:10000000000, name:"Бублики с маслом", desc: "+1% улыбок в секунду", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '74':{id:74, cost:100000000000, name:"Бублики с бананом", desc: "+1% улыбок в секунду", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '75':{id:75, cost:1000000000000, name:"Булочки с сыром", desc: "+5% улыбок в секунду", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '76':{id:76, cost:1500000000000, name:"Булочки с шоколадом", desc: "+5% улыбок в секунду", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '77':{id:77, cost:2000000000000, name:"Булочки с вишней", desc: "+5% улыбок в секунду", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '78':{id:78, cost:2500000000000, name:"Булочки с клубникой", desc: "+5% улыбок в секунду", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '79':{id:79, cost:3000000000000, name:"Булочки с черникой", desc: "+5% улыбок в секунду", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '80':{id:80, cost:3500000000000, name:"Булочки с малиной", desc: "+5% улыбок в секунду", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '81':{id:81, cost:4000000000000, name:"Булочки с ежевикой", desc: "+5% улыбок в секунду", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '82':{id:82, cost:100000000000, name:"Дружба — это дружба", desc: "Дружбы генерируют +1% улыбок в секунду.", fn:gen_upgradetype1(1, 0, 0.01), cond:defcond },
    '83':{id:83, cost:30000000000, name:"Дружба — это концерты", desc: "Концерты генерируют +1% улыбок в секунду.", fn:gen_upgradetype1(2, 0, 0.01), cond:defcond },
    '84':{id:84, cost:100000000000, name:"Дружба — это вечеринки", desc: "Вечеринки генерируют +1% улыбок в секунду.", fn:gen_upgradetype1(3, 0, 0.01), cond:defcond },
    '85':{id:85, cost:200000000000, name:"Дружба — это парады", desc: "Парады генерируют +1% улыбок в секунду.", fn:gen_upgradetype1(4, 0, 0.01), cond:defcond },
    '86':{id:86, cost:500000000000, name:"Дружба — это концерты", desc: "Концерты генерируют +1% улыбок в секунду.", fn:gen_upgradetype1(5, 0, 0.01), cond:defcond },
    '87':{id:87, cost:1000000000000, name:"Дружба — это фестивали", desc: "Фестивали генерируют +1% улыбок в секунду.", fn:gen_upgradetype1(6, 0, 0.01), cond:defcond },
    '88':{id:88, cost:2000000000000, name:"Дружба — это дискотеки", desc: "Дискотеки генерируют +1% улыбок в секунду.", fn:gen_upgradetype1(7, 0, 0.01), cond:defcond },
    '89':{id:89, cost:10000000000000000, name:"Зеркальное озеро", desc: "Все получает +0.01% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.0001), cond:defcond },
    '90':{id:90, cost:40000000000000000, name:"Зеркальное зеркальное озеро", desc: "Все получает +0.02% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.0002), cond:genprecond(89) },
    '91':{id:91, cost:800000000000000000, name:"Супер-зеркальное озеро", desc: "Все получает +0.04% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.0004), cond:genprecond(90) },
    '92':{id:92, cost:1600000000000000000, name:"Пупер-зеркальное озеро", desc: "Все получает +0.07% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.0007), cond:genprecond(91) },
    '93':{id:93, cost:3200000000000000000, name:"Дупер-зеркальное озеро", desc: "Все получает +0.1% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.001), cond:genprecond(92) },
    '94':{id:94, cost:9000000000000000000, name:"Великое-зеркальное озеро", desc: "Все получает +0.2% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.002), cond:genprecond(93) },
    '95':{id:95, cost:50000000000000000000, name:"Мега-зеркальное озеро", desc: "Все получает +0.4% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.004), cond:genprecond(94) },
    '96':{id:96, cost:250000000000000000000, name:"Гига-зеркальное озеро", desc: "Все получает +0.7% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.007), cond:genprecond(95) },
    '97':{id:97, cost:1000000000000000000000, name:"Ультра-зеркальное озеро", desc: "Все получает +1% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.01), cond:genprecond(96) },
    '98':{id:98, cost:4000000000000000000000, name:"Сверх-зеркальное озеро", desc: "Все получает +2% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.02), cond:genprecond(97) },
    '99':{id:99, cost:12000000000000000000000, name:"Абсолют-зеркальное озеро", desc: "Все получает +4% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.04), cond:genprecond(98) },
    '100':{id:100, cost:24000000000000000000000, name:"Убер-зеркальное озеро", desc: "Все получает +7% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.07), cond:genprecond(99) },
    '101':{id:101, cost:50000000000000000000000, name:"Омни-зеркальное озеро", desc: "Все получает +10% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.1), cond:genprecond(100) },
    '102':{id:102, cost:100000000000000000000000, name:"Всевышне-зеркальное озеро", desc: "Все получает +20% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.2), cond:genprecond(101) },
    '103':{id:103, cost:200000000000000000000000, name:"Нео-зеркальное озеро", desc: "Все получает +30% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.3), cond:genprecond(102) },
    '104':{id:104, cost:500000000000000000000000, name:"Эпик-зеркальное озеро", desc: "Все получает +40% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.4), cond:genprecond(103) },
    '105':{id:105, cost:1000000000000000000000000, name:"Глобальное зеркальное озеро", desc: "Все получает +50% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.5), cond:genprecond(104) },
    '106':{id:106, cost:2000000000000000000000000, name:"Солнечное зеркальное озеро", desc: "Все получает +60% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.6), cond:genprecond(105) },
    '107':{id:107, cost:4000000000000000000000000, name:"Галактическое зеркальное озеро", desc: "Все получает +70% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.7), cond:genprecond(106) },
    '108':{id:108, cost:8000000000000000000000000, name:"Вселенское зеркальное озеро", desc: "Все получает +80% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.8), cond:genprecond(107) },
    '109':{id:109, cost:15000000000000000000000000, name:"Космическое зеркальное озеро", desc: "Все получает +90% улыбок в секунду за все остальное.", fn:gen_finalupgrade(0.9), cond:genprecond(108) },
    '110':{id:110, cost:30000000000000000000000000, name:"Бессмертное зеркальное озеро", desc: "Все получает +100% улыбок в секунду за все остальное.", fn:gen_finalupgrade(1), cond:genprecond(109) },
    '111':{id:111, cost:1000000000000000000000000000, name:"Вечное зеркальное озеро", desc: "Все получает +1000% улыбок в секунду за все остальное.", fn:gen_finalupgrade(10), cond:genprecond(110) },
    '112':{id:112, cost:100000000000000000000000000000, name:"Бесконечное зеркальное озеро", desc: "Все получает +10000% улыбок в секунду за все остальное.", fn:gen_finalupgrade(100), cond:genprecond(111) },
    '113':{id:113, cost:100000000000000000000000000000000, name:"Последнее зеркальное озеро", desc: "Все получает +100000% улыбок в секунду за все остальное.", fn:gen_finalupgrade(1000), cond:genprecond(112) },
  };

  var curUpgradeList = [];

  //
  // -------------------------------- Achievement Generation --------------------------------
  //
  var achievementList = {

    '1': { name:"Главное — участие", desc: "Вы пошевелили мышкой!", muffins:0},
    '2': { name:"Приветик!", desc: "Тыкнуть пони <b>один раз</b>.", muffins:0, cond:function(){ return Game.clicks > 0; } },






    '200': { name:"Осторожность", desc: "Сохранить игру вручную.", muffins:1},
    '201': { name:"Параноик", desc: "Экспортировать сохранение.", muffins:1},
    '202': { name:"Машина времени", desc: "Импортировать сохранение.", muffins:1},
    '203': { name:"Нарциссизм!", desc: "Щелкнуть по картинке Клауд Хопа в окне «Автор».", muffins:1},
    '204': { name:"Под музыку веселее", desc: "Насладиться песней про улыбки.", muffins:1},
    '205': { name:"Чудовище!", desc: "Продать дружбу.", muffins:1},
    '206': { name:"Не сметь тыкать!", desc: "Заработать <b>"+PrettyNumStatic(1000000000000, false, 0)+"</b> улыбок, сделав не больше 35 кликов.", muffins:1, cond:function() { return Game.clicks <= 35 && Game.totalsmiles >= 1000000000000; } },
    '207': { name:"Барабан дружбы", desc: "Крутануть пони.", muffins:1, cond:function() { return Math.abs(vangle)>0.05; } },


    //'208': { name:"Centrifuge of Friendship", desc: "Spin the ponies <b>really fast</b>.", muffins:2, cond:function() { return Math.abs(vangle)>3; } },
    '209': { name:"Уничтожить!", desc: "Сбросить игру <b>один раз</b>.", muffins:1, cond:function() { return Game.resets>0; } },
    '210': { name:"Подрывник", desc: "Сбросить игру <b>10 раз</b>.", muffins:2, cond:function() { return Game.resets>=10; } },
    '211': { name:"Сентябрь", desc: "Сбросить игру <b>20 раз</b>.", muffins:3, cond:function() { return Game.resets>=20; } },
    '212': { name:"Ноль", desc: "Сбросить игру, имея <b>"+PrettyNumStatic(1000000000, false, 0)+" улыбок</b>.", muffins:1 },
    '213': { name:"Пусто", desc: "Сбросить игру, имея <b>"+PrettyNumStatic(1000000000000, false, 0)+" улыбок</b>.", muffins:2 },
    '214': { name:"Зеро", desc: "Сбросить игру, имея <b>"+PrettyNumStatic(1000000000000000, false, 0)+" улыбок</b>.", muffins:3 },
    '215': { name:"Опять", desc: "Сбросить игру, имея <b>"+PrettyNumStatic(1000000000000000000, false, 0)+" улыбок</b>.", muffins:4 },
    '216': { name:"Бездна", desc: "Сбросить игру, имея <b>"+PrettyNumStatic(1000000000000000000000, false, 0)+" улыбок</b>.", muffins:5 },
    '217': { name:"Ничто", desc: "Сбросить игру, имея <b>"+PrettyNumStatic(1000000000000000000000000, false, 0)+" улыбок</b>.", muffins:6 },
    '218': { name:"Забвение", desc: "Сбросить игру, имея <b>"+PrettyNumStatic(1000000000000000000000000000, false, 0)+" улыбок</b>.", muffins:7 },
    '219': { name:"Дзен", desc: "Сбросить игру, имея <b>"+PrettyNumStatic(1000000000000000000000000000000, false, 0)+" улыбок</b>.", muffins:8 },
    
    //'229': { name:"Prepare For The End", desc: "Find the secret song reference.", muffins:1 },
    '230': { name:"Что мы наделали?!", desc: "Купить зеркальное озеро.", muffins:5, cond:function() { return (Game.upgradeHash['89'] !== undefined); } },
    '231': { name:"Слишком Много Пинки Пай", desc: "Лопнуть <b>10 клонов Пинки</b>.", muffins:1, cond:function() { return Game.clonespopped>=10; } },
    '232': { name:"О, птичка!", desc: "Лопнуть <b>100 клонов Пинки</b>", muffins:2, cond:function() { return Game.clonespopped>=100; } },
    '233': { name:"Повторы это магия — 5", desc: "Лопнуть <b>400 клонов Пинки</b>.", muffins:3, cond:function() { return Game.clonespopped>=400; } },
    '234': { name:"Оптимизатор", desc: "Купить все улучшения.", muffins:1, cond:function() { return Game.upgrades.count==Object.keys(upgradeList).length; }},
    
    '255': { name:"Комплиционист", desc: "Получить все достижения.", muffins:100}
  };

  function genAchievements(names, amounts, descgen, condgen) {
    var ids = [];

    if(names.length != amounts.length) { alert("ERROR: names != amounts"); }
    for(var i = 0; i < names.length; ++i) {
      ids.push(achievementCount);
      achievementList[achievementCount++] = { name:names[i], desc: descgen(amounts[i]), muffins:(i+1), cond:condgen(amounts[i]) };
    }

    return ids;
  }

  var extraAchievements = Object.keys(achievementList).length-3; // minus three because the array starts at 1 instead of 0
  var achievementCount = 3;
  var achievements_clicks = genAchievements(


    ["Щекотно!", "Война щекоток", "Война щекоток II: Месть щекотки", "А это не вредно?", "Туннельный синдром", "Прощай, запястье", "It's Over Nine Thousand!"],
    [10,100,500,1000,2500,5000,9001],
    function(n) { return "Тыкнуть пони <b>"+PrettyNumStatic(n, false, 0)+"</b> раз."; },
    function(n) { return function() { return Game.clicks >= n; }; });
  achievements_clicks.push(2);

  var achievements_smiles = genAchievements(

    ["Веселье", "Забава", "Блаженство", "Нирвана", "Экстаз", "В погоне за счастьем", "Уже можно остановиться", "Это уже просто смешно", "Книжку иди почитай, что ли?", "Как?!"],
    [100,10000,1000000,100000000,10000000000,1000000000000,100000000000000,10000000000000000,1000000000000000000,100000000000000000000],
    function(n) { return "Получить <b>"+PrettyNumStatic(n, false, 0)+"</b> улыбок."; },
    function(n) { return function() { return Game.totalsmiles >= n; }; });
  achievements_smiles.push(206); // Add "No Booping Allowed".

  function genShopCond(item) {
    return function(n) { return function() { return Game.store[item]>=n; }; };
  }


  var achievements_shop = [];
  function genShopAchievements(item, names) {
    return genAchievements(
    names,
    [1, 50, 100, 150, 200],
    function(n) { return "Купить <b>"+Pluralize2(n, "</b> " + Store[item].name.toLowerCase(), "</b> " + Store[item].plural.toLowerCase(), false, 0) + "."; },
    genShopCond(item));
  }






  achievements_shop = achievements_shop.concat(genShopAchievements(2, ["Любитель", "Уличный музыкант", "Исполнитель", "Мультиинструменталист", "Дирижер"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(3, ["Экстроверт", "Тусовщик", "Праздник-пушка", "Душа вечеринки", "Пинки Пай"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(4, ["Участник парада", "Надувная летающая Рейнбоу Дэш", "Слишком много конфетти", "Гвоздь программы", "Мэр Понивилля"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(5, ["Соло на пианино", "Струнный квартет", "Камерный хор", "Симфонический оркестр", "Октавия"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(6, ["Празднование дня Солнца", "Забег осенних листьев", "Последний день зимы", "День горящего очага", "Церемония встречи весны"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(7, ["Энтузиаст", "Фанат", "Всем по светящейся палочке!", "Басы на полную!", "DJ Pon3"]));



  achievements_shop = achievements_shop.concat(genShopAchievements(8, ["Лучший вечер в жизни", "Аристократия", "Бальные танцы", "ВЫ МЕНЯ ПОЛЮБИТЕ!", "Довольно скучно"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(9, ["Принцесса Твайлайт", "Принц Шайнинг Армор", "Принцесса Биг Мак", "Принцесса Дерпи", "Все — принцессы!"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(10, ["Ночь кошмаров", "День матери", "День фермера", "День «Рейнбоу Дэш круче всех»", "Международный день крупа"]));
  achievements_shop = achievements_shop.concat(genAchievements(

    ["Верность", "Единением наших сил", "Честность", "Смех", "Щедрость", "Доброта"],
    [1, 6, 20, 40, 80, 160],
    function(n) { return "Купить <b>"+Pluralize2(n, "</b> " + Store[11].name.toLowerCase(), "</b> " + Store[11].plural.toLowerCase(), false, 0) + "."; },
    genShopCond(11)));
  










































































  achievements_shop = achievements_shop.concat(genAchievements(
    ["Лучшие друзья", "Товарищи-метконосцы", "Своя компания", "Клуб друзей месяца", "Вместе веселее", "Ошибка таблицы значений"],
    [2,3,6,12,18,24],
    function(n) { return 'Купить все возможные дружбы, имея хотя бы <b>'+n+' пони</b>.'; },
    function(n) { return function(){ return (Game.store[0]>=n) && (Game.store[1] >= triangular(n)); }; }
  ));
   



  achievements_shop.push(234); // Fixer Upper achievement
  achievements_shop.push(230); // What Have You Done
  


  achievementCount += extraAchievements; // for our special ones at the end



  //
  // -------------------------------- Game Management --------------------------------
  //
  function ResizeCanvas() {
    canvas.width  = pbg.offsetWidth;
    canvas.height = pb.offsetHeight;
  }


  
  function appendStoreClick($el,index){
    $el.on('click contextmenu',function(e){
      e.preventDefault();
      if (e.type === 'contextmenu') { // you can ALWAYS try to sell something even if the button is disabled
        Sell(index);
      } else if (!$(this).hasClass('disable')){
        Buy(index);
      }
      else if (e.type === 'click') { ShowMouseText(
        (index!=1)?

        'Слишком дорого!':
          (NeedsMorePonies()?


          'Нужно больше пони!':
          'Слишком дорого!')
        ,0,-40);
      }
    });
  }




























  function Click(id) {
      var amount = Math.floor(Game.SPC);
      Earn(amount);
      Game.clicks += 1;
      $stat_clicks.html(PrettyNum(Game.clicks));
      ShowMouseText('+' + PrettyNum(amount), 2, -40);
      CheckAchievements(achievements_clicks);
  }




























































































  function Earn(num) {
    if(num>0) { Game.totalsmiles += num; }
    Game.smiles += num;
    $score.html(Pluralize(Game.smiles, " улыбок", true));
    $stat_cursmiles.html(PrettyNum(Game.smiles, true));
    $stat_totalsmiles.html(PrettyNum(Game.totalsmiles, true));
    UpdateStore();
    CheckAchievements(achievements_smiles);
  }
  function EarnAchievement(id) {
    if(Game.achievements[id] == null) {
      Game.achievements[id] = achievementList[id].muffins;
      Game.achievementcount++;
      ShowNotice(achievementList[id].name, achievementList[id].desc, "достижение");
      Game.muffins += achievementList[id].muffins;

      updateUpgradesAchievements();
      UpdateSPS();
      UpdateOverlay(null, null);
      if(Game.achievementcount >= (achievementCount-1)) {
        EarnAchievement(255);
      }
    }
  }
  function CheckAchievements(list) {
    for(var i = 0; i < list.length; ++i) {
      if(achievementList[list[i]].cond !== undefined && achievementList[list[i]].cond()) {
        EarnAchievement(list[i]);
      }
    }
  }
  function CountBuildings(store) {
    var count = 0;
    for(var i = 2; i < store.length; ++i)
      count += store[i];
    return count;
  }
  // Seperating this out lets us make predictions on what a purchase will do to your SPS
  function CalcSPS(store, upgrades, docache) {
    var res = CalcSPSinit(store);
    
    var obj = {
      pSPS:0, // Global additive bonus to SPS (applied after store)
      mSPS:0, // Global multiplier to SPS (applied after store)
      pSPC:0, // Additive bonus to SPC
      mSPC:0, // percentage of the total SPS after everything else has been applied to add to the SPC
      mMuffin:0, // multiplier bonus applied after global SPS bonus (usually muffins)
      pStore:new Array(res.length), // Array of additive bonuses to individual store item SPS
      mStore:new Array(res.length) // array of multiplicative bonuses to individual store item SPS
    };
    for(var i = 0; i < res.length; ++i) { obj.pStore[i]=0; obj.mStore[i]=0; } // initialize values
    
    for(var i = 0; i < upgrades.length; ++i) {
      obj = upgradeList[upgrades[i]].fn(obj, store);
      if(!obj || obj.pSPS === undefined) {
        alert("ILLEGAL UPGRADE: " + upgrades[i]);
      }
    }

    var SPS = 0;
    for(var i = 0; i < res.length; ++i) { // Calculate individual store object SPS and create base SPS amount
      res[i] = (res[i]+obj.pStore[i])*(obj.mStore[i]+1.0);
      if(docache) { Store[i].SPS_cache = res[i]; }
      SPS += res[i]*store[i];
    }
    SPS = (SPS+obj.pSPS)*(obj.mSPS+1.0); // Apply global SPS modifiers
    SPS *= (obj.mMuffin+1.0); // Apply muffin modifiers
    if(docache) // Calculate resulting SPC if we're caching values.
      Game.SPC = 1 + obj.pSPC + (obj.mSPC*SPS);
    
    return SPS;
  }
  function CalcSPSinit(store) {
    var result = [];
    for(var i = 0; i < Store.length; ++i) {
      result.push(Store[i].fn_SPS(store));
    }
    return result;
  }

  function Buy(id) {
    var n = Game.shiftDown ? 10 : 1,
        numPurchase = 0,
        totalCost = 0;
    for(var i = 0; i < n; ++i) {
      var cost = Store[id].cost(Game.store[id]);
      if(Game.smiles >= cost && (id != 1 || !NeedsMorePonies())) {
        numPurchase++;
        totalCost+=cost;
        Earn(-cost);
        Game.store[id] += 1;
      }
    }
    if(n>1)
      ShowNotice(Store[id].name, "Куплено <b>" + numPurchase + " " + Store[id].plural + "</b> за <b>" + Pluralize(totalCost, " улыбок") + "</b>");

    UpdateStore();
    UpdateSPS();
    UpdateOverlay(null, null);
    if(id<2) OrganizePonies();
    CheckAchievements(achievements_shop);
  }
  function Sell(id) {
    if(!id) return; // you can't sell ponies you heartless monster

    var n = Game.shiftDown ? 10 : 1,
        numSell = 0,
        totalCost = 0;
    for(var i = 0; i < n; ++i) {
      if(Game.store[id]>0) {
        Game.store[id] -= 1;
        var cost = 0.5 * Store[id].cost(Game.store[id]);
        Earn(cost);
        numSell++;
        totalCost+=cost;
      }
    }
    if(n>1)
      ShowNotice(Store[id].name, "Продано <b>" + numSell + " " + Store[id].plural + "</b> за <b>" + Pluralize(totalCost, " улыбок") + "</b>");
    if(numSell>0 && id==1)
      EarnAchievement(205);
    UpdateStore();
    UpdateSPS();
    UpdateOverlay(null, null);
    if(id<2) OrganizePonies();
    $stat_buildings.html(CountBuildings(Game.store).toFixed(0));
  }
  function BuyUpgrade(id) {
    var x = upgradeList[id];
    if(Game.smiles > x.cost) {
      Earn(-1 * x.cost);
      Game.upgrades.push(id);
      Game.upgradeHash[id] = id;
    }

    UpdateSPS();
    updateUpgradesAchievements();
    UpdateStore();
    UpdateUpgradeOverlay(null, null, null);
    CheckApocalypse();
  }
  var MAX_PINKIES = 50;
  
  function CheckApocalypse() {
    if(Game.upgradeHash['89'] !== undefined && apocalypseTime == -1) {
      apocalypseTime = new Date().getTime();
      $('#apocalypse')[0].style.opacity = 1;
      $('#mandatory-fun')[0].href = 'https://www.youtube.com/watch?v=19G0I7xHQBM';
      $('#mandatory-fun').html('Конец близок.');
      pinkie_freelist = [];
      if(Game.pinkies.length == 0) {
        Game.pinkies = [];
        for(var i = 0; i < MAX_PINKIES; ++i) {
          Game.pinkies.push(-1);
          pinkie_freelist.push(i);
        }
      } else {
        for(var i = 0; i < Game.pinkies.length; ++i) {
          if(Game.pinkies[i]>=0) SpawnPinkie(i);
          else pinkie_freelist.push(i);
        }
      }
    }
  }
  function ResetApocalypse() {
    apocalypseTime = -1;
    $('#apocalypse')[0].style.opacity = 0;
    $('#mandatory-fun')[0].href = 'https://www.youtube.com/watch?v=otAFRGL4yX4';
    $('#mandatory-fun').html('Обязательно к прослушиванию во время игры.');
  }
  
  function SpawnPinkie(id) {
    if(id == null) {
      if(pinkie_freelist.length == 0) return;
      id = pinkie_freelist.pop();
    }
    var w = pbg.offsetWidth, h = pb.offsetHeight;
    Game.pinkies[id] = 0;
    $pinkieclones.append($(document.createElement('div'))
      .css('left', GetRandNum(0, w - 53*2))
      .css('top', GetRandNum(0, h - 64*2))
      .attr('data-x', GetRandNum(0, w - 53*2))
      .attr('data-y', GetRandNum(0, h - 64*2))
      .attr('id', 'pclone' + id)
      .on('click', function(){ $(this).remove(); ClickPinkie(id); }));
      
    UpdateSPS();
  }
  
  function ClickPinkie(id) {
    CheckAchievements(['231','232','233'])
    Earn(Game.pinkies[id]);
    ShowMouseText("+" + PrettyNum(Game.pinkies[id]), -6, -40);
    Game.pinkies[id] = -1;
    pinkie_freelist.push(id);
    UpdateSPS();
  }
  //
  // -------------------------------- Update HTML functions --------------------------------
  //
  function dynFontSize(str) {
    var size=80;
    if(str.length < 21) {
      size=100;
    } else if(str.length < 31) {
      size=90;
    }
    return '<span style="font-size:'+size+'%;">'+str+'</span>';
  }
  function updateUpgradesAchievements() {
    $achievements_owned.html(Game.achievementcount.toFixed(0));
    $upgrades_owned.html(Game.upgrades.length.toFixed(0));
    var makeAchievement = function(iterator, prop, upgrade){
        var $ach = $(document.createElement('div')).addClass('achievement').css('background-image','url('+(!upgrade?'achievements':'upgrades')+'.png)');
        $(document.createElement('div'))
          .addClass('menutooltip').css('left',-2-((iterator%5)*54))
          .html(
            !upgrade
            ?'<strong>'+dynFontSize(achievementList[prop].name)+'</strong><i>[достижение]</i><hr><p>'+achievementList[prop].desc+'</p>'
            :'<strong>'+dynFontSize(upgradeList[prop].name)+'</strong><i>[улучшение]</i><hr><p>'+upgradeList[prop].desc+'</p>'
          )
          .appendTo($ach);
        if(!upgrade) $(document.createElement('div')).addClass('muffin').html('+' + achievementList[prop].muffins).appendTo($ach);
        if (Game.achievements[prop]==null && !upgrade) $ach.addClass('hidden');

        return $ach;
    };

    $achievements.empty();
    var count = 0;
    for (var prop in achievementList) {
        if(achievementList.hasOwnProperty(prop)){
          $achievements.append(makeAchievement(count, prop));
          count++;
        }
    }

    $upgradelist.empty();
    for(var i = 0; i < Game.upgrades.length; i++) // TODO: Make unique upgrade images
      $upgradelist.append(makeAchievement(i, Game.upgrades[i], true));

    UpdateMuffins();
  }
  
  function NeedsMorePonies() {
    return Game.store[1] >= triangular(Game.store[0]);
  }

  // https://stackoverflow.com/a/16436975/1344955
  function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  
  var lastUpgrade = [];
  var scopeUpgradeList = []; // These arrays are declared up here and re-used because chrome's garbage collector WILL NOT FUCKING CLEAN UP OLD ARRAYS. EVER. So we have to re-use them instead.
  var updatestore_nstore = [];
  for(var i = 0; i < Store.length; ++i) { updatestore_nstore.push(0); }
  
  function UpdateStore() {
    var minPayPerSmile = Number.MAX_VALUE,
        minItem = -1;
    
    if(Game.settings.showHighlight) {
      // Find the most efficient building
      for(var i = 0; i < Store.length; ++i) {
        for(var j = 0; j < Store.length; ++j) updatestore_nstore[j] = 0+Game.store[j];
        
        updatestore_nstore[i]+=1;
        var nSPS = CalcSPS(updatestore_nstore, Game.upgrades, false),
            payPerSmile = Store[i].cost(Game.store[i])/(nSPS - Game.SPS);
        
        if(payPerSmile < minPayPerSmile) {
          minPayPerSmile = payPerSmile;
          minItem = i;
        }
      }
    }
    
    $ponycost.html("(НУЖНО " + Math.ceil(inv_triangular(Game.store[1]+1)) + " ПОНИ)").hide();
    for(var i = 0; i < Store.length; ++i) {
      var item = Store[i],
          count = Game.store[i],
          cost = item.cost(count),
          $buyN = $("#buy" + i);
      if(i == 1 && NeedsMorePonies()) {
        $buyN.addClass("disable");
        $ponycost.show();
      } else {
        $buyN.attr('class',(cost>Game.smiles)?"disable":"");
      }
      if(minItem == i) $buyN[0].style.color = '#afa'; //jQuery uses a lot of memory for some reason???
      else $buyN[0].style.color = '#fff';
      
      $("#cost" + i).html(PrettyNum(cost));
      $("#count" + i).html(count);
      var elem = $("#icon" + i)[0];
      var nimg = "url('"+Store[i].img(Game.store[i])+"')";
      if(nimg != elem.style.backgroundImage) elem.style.backgroundImage = nimg; // helps alleviate memory leaks
    }
    
    curUpgradeList.length = 0; // We don't do = [] here because this may be referenced elsewhere
    scopeUpgradeList.length = 0; // we mark whether or not something is disabled by negating it's ID, but we can't put negatives in curUpgradeList.



    for(var i in upgradeList) {
      if(upgradeList[i].cond() && Game.upgradeHash[i] == null) {
        var hide = upgradeList[i].cost>Game.smiles;
        curUpgradeList.push(i);
        scopeUpgradeList.push(hide?-i:i);
      }
    }
    
    curUpgradeList.sort(function(a, b){return upgradeList[a].cost-upgradeList[b].cost}); 
    if(!arraysEqual(lastUpgrade,scopeUpgradeList)) {
      var achs = [];
      for(var i = 0; i < curUpgradeList.length; ++i) {
          var hide = upgradeList[curUpgradeList[i]].cost>Game.smiles;
        var $ach = $(document.createElement('div'))
          .addClass('achievement'+(hide?' hidden':''))
          .css('background-image','url(upgrades.png)');
  
        (function($el,index){ $el.on('click',function(){ BuyUpgrade(index) }); })($ach,curUpgradeList[i]);
  
        achs.push($ach);
      }


      $storeupgrades.empty().append(achs);
      var save = lastUpgrade; // save the lastUpgrade list
      lastUpgrade = scopeUpgradeList;
      scopeUpgradeList = save; // set the scope list to the old last upgrade reference      
    }
    $stat_buildings.html(CountBuildings(Game.store).toFixed(0));
  }

  function UpdateSPS() {
    Game.SPS = CalcSPS(Game.store, Game.upgrades, true);
    $stat_SPC.html(PrettyNum(Math.floor(Game.SPC)));
    if(Game.SPS > 0) {
      var wither = (apocalypseTime < 0)?0:(1-Math.pow(1-PINKIE_WITHER, Game.pinkies.length - pinkie_freelist.length));
      if(wither > 0) {
        var nsps = (1-wither)*Game.SPS;
        $SPS.html("+" + ((nsps<=999)?nsps.toFixed(1):PrettyNum(nsps)) + ' в секунду <span style="color:#900">(-'+(wither*100).toFixed(1)+'%)</span>').show();
      } else {
        $SPS.html("+" + ((Game.SPS<=999)?Game.SPS.toFixed(1):PrettyNum(Game.SPS)) + " в секунду").show();
      }
    }
    else $SPS.hide();

    $stat_SPS.html(PrettyNum(Game.SPS));
  }
  function UpdateMuffins() {
    $stat_muffins.html(PrettyNum(Game.muffins));
  }
  function displayTime(milliseconds) {
    var seconds = Math.floor(milliseconds/1000)%60,
        minutes = Math.floor(milliseconds/60000)%60,
        pad = function(n){return n<10?'0'+n:n};
    return Math.floor(milliseconds/3600000).toFixed(0) + ':' + pad(minutes.toFixed(0)) + ':' + pad(seconds.toFixed(0));
  }
  function drawImage($img, x, y, r) {
    var img = $img[0],
        w = $img.width(),
        h = $img.height();
    if($img.doneLoading) {
      if(r != 0) {
        ctx.translate(w/2, h/2);
        ctx.translate(x, y);
        ctx.rotate(r);
        ctx.drawImage(img,-w/2,-h/2);
      } else {
        ctx.drawImage(img, x, y);
      }
    }
    ctx.restore();
  }

   // Ticks are used for things like updating the total playtime
  var lastTime, startTime, lastTick, lastSave, lastSpin, apocalypseTime=-1;
  function UpdateGame(timestamp) {
    if(!startTime) {
      startTime =
      lastNews =
      lastTime =
      lastTick =
      lastSave = timestamp;
    }
    Game.delta = timestamp - lastTime;
    
    if(Math.abs(vangle)>0.0005) curangle += vangle*0.9;
    vangle *= 0.95;
    if(curangle != lastSpin) {
      document.getElementById('ponyspin').style.transform = ('rotate('+curangle+'rad)');
      lastSpin = curangle;
    }
    
    var hasFocus = !Game.settings.optimizeFocus || document.hasFocus(),
        framelength = (hasFocus?33:500); // 33 is 30 FPS
    if(Game.delta>framelength) { // play at 30 FPS or the text starts flickering
      ProcessSPS(Game.delta);
      lastTime = timestamp;
      //var $overlaytime = $('#overlaytime'); // Can't cache this because it's destroyed often
      //if($overlaytime.length) $overlaytime.html(CalcTimeItem($overlaytime.attr('data-item')));
    }
    if((timestamp - lastNews)>newswait) {
      UpdateNews();
      lastNews = timestamp;
    }
    if((timestamp - lastSave)>60000) {
      SaveGame();
      lastSave = timestamp;
    }
    if((timestamp - lastTick)>500) {
      Game.totalTime += timestamp - lastTick;
      $stat_time.html(displayTime(Game.totalTime));
      UpdateOverlay(null, null);
      lastTick = timestamp;
    }
    if(apocalypseTime > 0) {
      if((Game.delta*0.0003)/(Game.pinkies.length - pinkie_freelist.length + 1) > Math.random()) { 
        SpawnPinkie();
      }
      var ch = $pinkieclones[0].children;
      for(var i = 0; i < ch; ++i) {
        
      }
    }
    if(Game.settings.useCanvas && (hasFocus || Game.delta>framelength)) {
      var grd = ctx.createLinearGradient(0,0,0,canvas.height);
      grd.addColorStop(0,"#d8f6ff");
      grd.addColorStop(1,"#1288e2");
      ctx.fillStyle = grd;

      if(apocalypseTime>0) {
        var alpha = (new Date().getTime() - apocalypseTime)/10000;
        ctx.save();
        
        if(alpha < 1.0) {
          ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.globalAlpha=alpha;
        }
      
        grd = ctx.createLinearGradient(0,0,0,canvas.height);
        grd.addColorStop(0,"#ff5e5e");
        grd.addColorStop(1,"#ad0025");
        ctx.fillStyle = grd;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.restore();
      } else {
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      
      $img_rays.css({width:2470,height:2460});
      $img_ground.css({width:2501,height:560});
      ctx.save();

      var calc = function(k, $el){
        return canvas[k]/(k === 'width'?2:1) - $el[k]()/2;
      };
      drawImage($img_rays, calc('width',$img_rays), calc('height',$img_rays), ((timestamp - startTime)/3000)%(2*Math.PI));
      drawImage($img_ground, calc('width',$img_ground)*.64, calc('height',$img_ground), 0);
    }
    window.requestAnimationFrame(UpdateGame);
  }

  function CalcTimeItem(item) {
    var time = Math.ceil((Store[item].cost(Game.store[item]) - Game.smiles) / Game.SPS);
    return (time <= 0)?'<b>прямо сейчас</b>':('через <b>' + PrintTime(time)+'</b>');
  }
  
  var updateoverlay_nstore = []; // Because chrome doesn't know how to clean up after itself
  for(var i = 0; i < Store.length; ++i) { updateoverlay_nstore.push(0); }
  function UpdateOverlay(item, y, mobile) {
    var skip = false;
    if(item == null)
      item = $overlay.attr('data-item');
    else if(item == $overlay.attr('data-item'))
      skip = true;
      
    if(!skip)
    {
      $overlay.attr('data-item', item);
  
      if(item < 0) return $overlay.hide();
  
      var x = Store[item],
          xcount = Game.store[item],
          xcost = x.cost(xcount),
          $title = $(document.createElement('div'))
            .addClass('title')
            .append('<p>'+x.name+'</p><span>'+smilethumb+PrettyNum(xcost)+'</span>');
  
      if(xcount > 0) $title.append('<div>['+PrettyNum(xcount)+' куплено]</div>');
      $overlay.empty().append($title, '<hr><p>'+x.desc+'</p>');//<ul>
      var $ul = $(document.createElement('ul'));
  
      if(x.formula) $ul.append('<li class="formula">'+x.formula+'</li>');
      if(x.SPS_cache > 0 || item==1) $ul.append('<li>1 '+x.name.toLowerCase()+' генерирует <b>'+Pluralize(x.SPS_cache, ' улыбок')+'</b> в секунду</li>');
      if(xcount > 0 && x.SPS_cache > 0) $ul.append('<li><b>'+PrettyNum(xcount)+'</b> '+x.plural.toLowerCase()+' генерируют <b>'+Pluralize(xcount*x.SPS_cache, ' улыбок')+'</b> в секунду</li>');
      var lowerbound = Game.SPS/140737488355328; // this is Game.SPS / 2^47, which gives us about 5 bits of meaningful precision before the double falls apart.
      for(var i = 0; i < Store.length; ++i) { updateoverlay_nstore[i] = 0+Game.store[i]; } //ensure javascript isn't passing references around for some insane reason


      updateoverlay_nstore[item]+=1;
      var nSPS = CalcSPS(updateoverlay_nstore, Game.upgrades, false),
          sps_increase = nSPS - Game.SPS,
          payPerSmile = xcost/(nSPS - Game.SPS),

          increaseText = sps_increase > 0 ? 'увеличит генерацию улыбок в секунду на <b>'+(sps_increase > lowerbound ? PrettyNum(sps_increase) : 'совсем чуть-чуть')+'</b>' : "<b>НЕ</b> увеличит генерацию улыбок в секунду",
          payPerSmileText = isFinite(payPerSmile) ? '<i>Вы заплатите <b>'+(sps_increase > lowerbound ? Pluralize(payPerSmile, ' улыбок') : 'очень много') + '</b> за +1 улыбок в секунду</i>' : '';
  
      $ul.append('<li>Еще 1 '+x.name.toLowerCase()+' '+increaseText+payPerSmileText+'</li>');
      if(xcost>Game.smiles && Game.SPS > 0) $ul.append('<li>Можно купить <span id="overlaytime" data-item="'+item+'">' + CalcTimeItem(item) + '</span></li>');
      
      // Display buy/sell information
      var helpStr = '<li><kbd>Shift + клик</kbd> — купить 10';
      if (xcount > 0 && item>0) helpStr += ', <kbd>Правый клик</kbd> — продать 1'; // you can't sell ponies
      $ul.append(helpStr+'</li>');
      
      $overlay.append('<hr>',$ul).show();
    }
    
    if(y != null && item >= 0)
      $overlay.css('top',function(){ return Math.min(Math.max(y-(mobile?(16+this.offsetHeight):40),0),window.innerHeight-this.offsetHeight); });
  }
  function UpdateUpgradeOverlay(item, x, y) {
    var skip = false;
    if(item != null && item >= curUpgradeList.length) item = -1;

    if(y != null && item >= 0) {
      if(y > ($storeupgrades.get(0).offsetHeight + $storeupgrades.offset().top)) item = -1;
    }
    if(item == null)
      item = $upgradeoverlay.attr('data-item');
    else if(item == $upgradeoverlay.attr('data-item'))
      skip = true;
      
    if(!skip)
    {
      if(item >= curUpgradeList.length) item = -1; // This edge case happens when you buy all the upgrades
      $upgradeoverlay.attr('data-item', item);
      
      if(item < 0) return $upgradeoverlay.hide();
      
      var u = upgradeList[curUpgradeList[item]];
      $upgradeoverlay.empty().html('<div class="title"><p>'+u.name+'</p><span>'+smilethumb+PrettyNum(u.cost)+'</span></div><hr><p>'+u.desc+'</p>').show();
    }
    
    if(y != null && item >= 0) {
      $upgradeoverlay.css({
        left: Math.max(0, x-320) + 'px',
        top: function(){ return Math.min(Math.max(y-(14+this.offsetHeight),0),window.innerHeight-this.offsetHeight); }
      });
    }
  }
  var PINKIE_WITHER = 0.01;
  function ProcessSPS(delta) {
    var SPS = Game.SPS*(delta/1000.0);


























  











    if(apocalypseTime > 0) {
      for(var i = 0; i < Game.pinkies.length; ++i) {
        if(Game.pinkies[i] >= 0) {
          var absorb = SPS*PINKIE_WITHER;
          Game.pinkies[i] += absorb*1.1;
          SPS -= absorb;
        } 









      }






    }
    




    Earn(SPS);
  }
  function distance(x1,y1,x2,y2) {
     return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
  }
  function GetEdgeLength(r, n) {
    switch(n)
    {
      case 1: return 400;
      case 2: return 350;
      case 3: return 300;
      case 4: return 260;
    }
    var a = (2*Math.PI)/n;
    var tx = Math.cos(a)*r - r;
    var ty = Math.sin(a)*r;
    return Math.pow(ty*ty + tx*tx,0.5*0.95);
  }
  function OrganizePonies() {
    var n = Game.store[0],
        radd = n*30,
        r=(n>1?140+radd:0),
        a = (2*Math.PI)/ n,
        th = (n-2)*0.08,
        edge = GetEdgeLength(r, n);

    $ponywrapper.empty();
    for(var i = 0; i < n; ++i) {
      var pone = ((i<Game.ponyList.length)?Game.ponyList[i]:0),
          $ponyDiv = $(document.createElement('div'))
              .attr('id','pony'+i)
              .addClass('pony')
              .css({
                top: Math.sin(a*i + th)*r-(edge/2),
                left: Math.cos(a*i + th)*r-(edge/2),
                width: edge,
                height: edge,
              });

      (function($el,index){ $el.on('click', function(){ Click(index) }) })($ponyDiv,i);

      var $innerpony = $(document.createElement('div')).css({
        transform: 'rotate('+(a*i + th + Math.PI/2)+'rad)',
        backgroundSize: edge+'px',
        backgroundImage: 'url("ponies/'+PonyList[pone]+'.svg")',
      });
      $ponyDiv.append($innerpony);
      
      $ponywrapper.append($ponyDiv);
    }

    canvaslines.width = r*2;
    canvaslines.height = r*2;
    canvaslines.style.left= -r + 'px';
    radd+=20;
    switch(n)
    {
      case 1:
      case 2:
        break;
      case 3:
        radd = radd+edge*0.4;
        break;
      default:
        radd = radd+edge*0.5;
    }
    document.getElementById('ponywrapper').style.top = radd + 'px';
    canvaslines.style.top= -r + radd + 'px';
    
    // Draw friendship lines
    ctxlines.clearRect(0, 0, $canvaslines.width(), $canvaslines.height());
    ctxlines.beginPath();
    ctxlines.lineWidth=3;
    ctxlines.strokeStyle="#333";
    if(n>1) {
      var f = Game.store[1], k = n- 1, j = 0;
      for(var i = 0; i < f; i++) {
          var p1 = j;
          var p2 = j+k;
          var x1 = Math.cos(a*p1 + th)*r + r;
          var y1 = Math.sin(a*p1 + th)*r + r;
          var x2 = Math.cos(a*p2 + th)*r + r;
          var y2 = Math.sin(a*p2 + th)*r + r;
          ctxlines.moveTo(x1,y1);
          ctxlines.lineTo(x2,y2);
          j += 1;
          if((j+k) >= n) { j=0; k-=1; }
      }
    }
    ctxlines.stroke();
  }

  //
  // -------------------------------- Set document hooks --------------------------------
  //

  var setShiftDown = function(event){
      if(event.keyCode === 16 || event.charCode === 16 || event.keyCode === 17 || event.charCode === 17){
          Game.shiftDown = true;
      }
  };

  var setShiftUp = function(event){
      if(event.keyCode === 16 || event.charCode === 16 || event.keyCode === 17 || event.charCode === 17){
          Game.shiftDown = false;
      }
  };
  function aniEndFunc() {
    $(this).remove();
  }

  function ShowMouseText(text,x,y) {
      $(document.createElement('div'))
        .addClass('mousetext')
        .css({
          left: curMouseX+x,
          top: (curMouseY+y),
        })
        .html('<p>'+text+'</p>')
        .on('webkitAnimationEnd animationend',aniEndFunc)
        .appendTo($mousetexts);
  }

  function ShowNotice(title, desc, flavor) {
    var $div = $(document.createElement('div'))
      .html('<strong>'+title+'</strong>'+(flavor!=null?'<i>['+flavor+']</i>':'') + (desc!=null?'<hr><p>'+desc+'</p>':''))
      .on('webkitAnimationEnd animationend click', aniEndFunc);
    $notices.prepend($div);
  }

  function ShowMenu(b) {
    $menubtn.toggle();
    $menu.toggle();
    if($doc.width() >= 600) $board.css('padding-left',b?'259px':0);
    ResizeCanvas();
  }
  
  function CheckForUpdates() {
    $.ajax({
      url:'./version.json',
      cache:'false', // jQuery bypasses cache by appending a timestamp to the request
      dataType:'json',
      beforeSend: function(xhr) { xhr.overrideMimeType( "application/json" ); }, // Firefox REQUIRES this, dataType is not sufficient. ¯\(°_o)/¯
      success: function(data,status,r) {
        if(data.major > $ponyversion.major || (data.major == $ponyversion.major && data.minor > $ponyversion.minor)) {
          $('#pagealert').addClass('pagealertactive');
        }        
      }
    });
    window.setTimeout(CheckForUpdates, 60000); //check every minute
  }
    
  // You would not believe the horrific sequence of events that led to the creation of this function.
  var setMouseMove = function(event){
    var root = $('#buy0')[0],
        wrapper = $('#storewrapper')[0],
        item = -1,
        actualTop = root.offsetTop-wrapper.scrollTop+wrapper.offsetTop,
        mobile = $doc.width() < 600;
        
    if((event.clientX>wrapper.offsetLeft) && (event.clientY>actualTop) && (!mobile || event.clientY>wrapper.offsetTop)) {
      item = Math.floor((event.clientY - actualTop)/root.offsetHeight);
      if(item >= Store.length) item = -1;
    }
    UpdateOverlay(item, event.clientY, mobile);

    item = -1;
    actualTop = $('#storeupgrades')[0].offsetTop-wrapper.scrollTop+wrapper.offsetTop;
    if((event.clientX>wrapper.offsetLeft) && (event.clientY>actualTop) && (!mobile || event.clientY>wrapper.offsetTop)) {
      item = Math.floor((event.clientY - actualTop)/52)*6 + Math.floor((event.clientX - wrapper.offsetLeft)/52);
    }
    UpdateUpgradeOverlay(item, event.clientX, event.clientY);

    curMouseX=event.clientX;
    curMouseY=event.clientY;
    EarnAchievement(1);
  };
  
  var public_members = {
    Store:Store,
    Upgrades:upgradeList, 
    Achievements:achievementList,
    CreateGame : CreateGame,
    CalcSPS : CalcSPS
  };
  
  // If you are loading Pony Clicker's javascript outside of the game, set disable_ponyclicker to true
  // to prevent it from initializing. This allows the actual game functions to be accessed manually.
  if (typeof disable_ponyclicker !== 'undefined') return public_members;
  
  //
  // -------------------------------- Begin Game Initialization --------------------------------
  //
  var $doc = $(document),
      $w = $(window),
      $loadscreen = $('#loadscreen'),
      $EnableE = $('#EnableEffects'),
      $EnableF = $('#EnableFocus'),
      $EnableW = $('#EnableWarn'),
      $EnableH = $('#EnableHighlight'),
      $menu = $('#menu'),
      $score = $("#scorenum"),
      $store = $("#store"),
      $SPS = $("#SPS"),
      $stats = $menu.children('.stats'),
      $stat_cursmiles = $stats.find('.cursmiles'),
      $stat_totalsmiles = $stats.find('.totalsmiles'),
      $stat_SPS = $stats.find('.SPS'),
      $stat_clicks = $stats.find('.clicks'),
      $stat_SPC = $stats.find('.SPC'),
      $stat_buildings = $stats.find('.buildings'),
      $stat_time = $stats.find('.time'),
      $stat_muffins = $stats.find('.muffins'),
      $achievements_owned = $('#achievements_owned'),
      $achievements_total = $('#achievements_total'),
      $upgrades_owned = $('#upgrades_owned'),
      $upgrades_total = $('#upgrades_total'),
      $ponywrapper = $('#ponywrapper'),
      $achievements = $('#achievements'),
      smilethumb = '<img src="pinkiehappy.png" alt="Smiles: " title="Smiles" />',
      canvas = document.getElementById('canvas'),
      $canvas = $(canvas),
      ctx = canvas.getContext("2d"),
      canvaslines = document.getElementById('canvaslines'),
      $canvaslines = $(canvaslines),
      ctxlines = canvaslines.getContext("2d"),
      $img_rays = $(new Image()).attr('src','rays.svg').on('load', function(){ $img_rays.doneLoading = true; }), // the onload check is done for firefox, which gets overeager
      $img_ground = $(new Image()).attr('src','ground.svg').on('load', function(){ $img_ground.doneLoading = true; }),
      $overlay = $('#overlay'),
      $upgradeoverlay = $('#upgradeoverlay'),
      $storeupgrades = $('#storeupgrades'),
      $upgradelist = $('#upgradelist'),
      $ponycost = $('#ponycost'),
      $menubtn = $('#menubutton'),
      $notices = $('#notices'),
      $storewrapper = $('#storewrapper'),
      $board = $('#ponyboard'),
      $news = $board.children('.newsactive'),
      pbg = $('#ponybg')[0],
      $mousetexts = $('#mousetexts'),
      $pinkieclones = $('#pinkieclones'),
      pb = $board[0];
      
  var Game = CreateGame(),
      curMouseX = 0,
      curMouseY = 0,
      pinkie_freelist = [];

  LoadGame();
  $achievements_total.html(achievementCount.toFixed(0));
  $upgrades_total.html((Object.keys(upgradeList).length-1).toFixed(0)); //-1 for the error one at 0
  
  // Generate store HTML
  $store.empty();
  for(var i = 0; i < Store.length; ++i) {
    var $item = $(document.createElement('li'))
          .attr('id','buy'+i)
          .addClass('disable')
          .html(Store[i].name.toLowerCase() + '<br>')
          .prepend($(document.createElement('div'))
            .attr('id','icon'+i)
            .addClass('icon')
            .css({backgroundImage:"url('"+Store[i].img(Game.store[i])+"')"})
          ),
        $costSpan = $(document.createElement('span'))
          .addClass('cost')
          .append(
            smilethumb,
            $(document.createElement('span'))
              .attr('id','cost'+i)
              .html(0)
          ),
        $countSpan = $(document.createElement('span'))
            .attr('id','count'+i)
            .addClass('count')
            .text(0);
    $item.append($costSpan);
    if(i==1) $item.append($ponycost = $(document.createElement('span')).attr('id','ponycost').text('(NEEDS 2 PONIES)'));
    $item.append($countSpan);
    appendStoreClick($item,i);

    $store.append($item);
  }

  var $showmenu = $('#showmenu').on('click',function(){ ShowMenu(true) }),
      $hidemenu = $('#hidemenu').on('click',function(){ ShowMenu(false) }),
      $exportWindow = $('#exportwindow'),
      $credits = $('#credits');
  $('#showcredits').on('click',function(){
    $credits.show();
  });
  $credits.children('button').on('click',function(){
    $credits.hide();
  });
  $credits.find('.cloudhop').on('click',function(){
    EarnAchievement(203);
  });
  $('#wipeall').on('click',function(){

    if (window.confirm('Вы потеряете все игровые данные, в том числе настройки и достижения. Вы уверены?'))
      WipeAllData();
  });

  $exportWindow.find('button').on('click',function(){
    $exportWindow.hide();
  });
  $('#exportbtn').on('click',function(){
    EarnAchievement(201);
    $('#exportarea').html(ExportGame());
    $exportWindow.show();
  });
  $('#importbtn').on('click',function(){

    var x = window.prompt('Скопируйте сюда экспортированное сохранение. ВНИМАНИЕ: Текущая игра будет перезаписана, даже если сохранение повреждено! На всякий случай экспортируйте текущую игру.');
    if(x!==null) ImportGame(x);
  });
  $('#resetbtn').on('click',function(){
    if(window.confirm("Вы потеряете все улыбки, здания и улучшения, но у вас останутся достижения и маффины, заработанные в предыдущих играх. Вы уверены, что хотите сбросить игру?")) { 
      ResetGame(); 
    }
  });

  $('#manualsave').on('click',function(){
    EarnAchievement(200);
    SaveGame();
  });
  $menu.find('label').children().on('click',GetSettings);

  $('#mandatory-fun').on('click',function(){
    EarnAchievement(204);
  });
  
  var curangle = -Math.PI/2; // this starts pinkie right side up.
  var lastangle = 0;
  var vangle = 0;
  var vlastangle = 0;
  var mleftdown = false;
  $('#pagealert').on('click',function(){
    SaveGame(); Game.settings.closingWarn=false; location.reload(true);
  });
  
  function getAngle(event) {
    var cx = $ponywrapper.offset().left;
    var cy = $ponywrapper.offset().top;
    return Math.atan2(event.clientY-cy, event.clientX-cx);
  }
  var fnmousedown = function(event) {
    mleftdown = true; 
    lastangle = getAngle(event)-curangle;
    vlastangle = vangle = 0;
  }
  var fnmousemove = function(event) {
    vlastangle = getAngle(event)-(curangle+lastangle);
    curangle = (getAngle(event)-lastangle);
  }
  var fnmouseup = function(event) {
    vangle = vlastangle;
    //CheckAchievements([207, 208]);
    CheckAchievements(['207']);
    mleftdown=false;
    vlastangle = 0;
  }
  $('#ponyboard').on('mousedown', function(event){
    if(event.which===1) fnmousedown(event);
  }); 
  $('#ponyboard').on('touchstart', function(event){ fnmousedown(event.originalEvent.targetTouches[0]); });
  $('#ponyboard').on('mousemove', function(event){
    if(mleftdown) fnmousemove(event);
  });
  $('#ponyboard').on('touchmove', function(event){ event.preventDefault(); fnmousemove(event.originalEvent.targetTouches[0]);});
  

  $w.on('resize',ResizeCanvas);
  $w.on('load',function(){ // doOnLoad equivalent
    $doc
      .on('mousemove',setMouseMove)
      .on('mouseup',function(event){ if(event.which===1) fnmouseup(event); })
      .on('touchend touchcancel',function(event){ fnmouseup(event); })
      .on('mousedown',function(event){ if(event.which===1) { vlastangle=vangle; }})
      .on('touchstart',function(event){ vlastangle=vangle; })
      .on('keydown', setShiftDown)
      .on('keyup', setShiftUp);
    window.onbeforeunload = function (e) {
        if(!Game.settings.closingWarn) return null;
        e = e || window.event;
        var text = "You are about to leave Pony Clicker!";
        if (e) e.returnValue = text;
        return text;
    };
    $('#ponyversion').html($ponyversion.major + '.' + $ponyversion.minor);
    
    InitializeGame();
    ResizeCanvas();
    window.requestAnimationFrame(UpdateGame);
    $loadscreen.css('opacity',0).delay(700).hide();
    CheckForUpdates();
  });

  
  public_members.Game = Game;
  return public_members;
})();
