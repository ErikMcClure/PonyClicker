$(function(){
  // Polyfill for old browsers and IE
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log10
  Math.log10 = Math.log10 || function(x) {
    return Math.log(x) / Math.LN10;
  };

  var $doc = $(document),
      $w = $(window),
      $loadscreen = $('#loadscreen'),
      $EnableE = $('#EnableEffects'),
      $EnableF = $('#EnableFocus'),
      $EnableW = $('#EnableWarn'),
      $upgrades_total = $('#upgrades_total'),
      $ponyversion = {major:0,minor:87,revision:0};
      
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
      muffins:0, // total muffin count, which is a combination of muffins gained from achievements and prestige.
      achievement_muffins:0, // Muffins from achievements only, recalculated every time an achievement is earned
      store:[1,0,0,0,0,0,0,0,0,0,0,0,0], // amount player has bought of each store item.
      ponyList:genPonyList(), // precalculated list of randomized ponies (so we can reconstruct them after a save/load)
      version:3, // incremented every time this object format changes so we know to deal with it.
      settings: {
        useCanvas:true,
        optimizeFocus:false,
        closingWarn:false,
        numDisplay:0, // 0 is names, 1 is raw numbers, 2 is scientific notation
      }
    };
  }

  var PonyList = ["Pinkie Pie", "Adagio Dazzle", "Aloe", "Amethyst Star", "Applebloom", "Applejack", "Aria Blaze", "Babs Seed", "Berry Punch", "Big McIntosh", "Blossomforth", "Braeburn", "Carrot Top", "Cheerilee", "Cheese Sandwich", "Chrysalis", "Cloudchaser", "Coco Pommel", "Colgate", "Daring Do", "Diamond Tiara", "Dinky Doo", "Ditsy Doo", "Dr Whooves", "Fancy Pants", "Flam", "Fleur de Lis", "Flim", "Flitter", "Fluttershy", "Hoity Toity", "King Sombra", "Lightning Dust", "Lotus", "Lyra Heartstrings", "Maud Pie", "Mrs Harshwhinny", "Night Glider", "Octavia Melody", "Prince Blueblood", "Princess Cadance", "Princess Celestia", "Princess Luna", "Rainbow Dash", "Rarity", "Scootaloo", "Shining Armor", "Silver Spoon", "Sonata Dusk", "Starlight Glimmer", "Sunset Shimmer", "Sweetie Belle", "Thunderlane", "Trenderhoof", "Trixie", "Trouble Shoes", "Twilight Sparkle", "Zecora", "Vinyl Scratch"];
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

  var Game = CreateGame(),
      curMouseX = 0,
      curMouseY = 0;

  function UpdateMuffins() {
    $stat_muffins.html(PrettyNum(Game.muffins));
    $stat_achievementmuffins.html(PrettyNum(Game.achievement_muffins));
  }
  function ResetGame() {
    var muffins = Math.floor(inv_triangular(Game.totalsmiles/1000000000000))-1;
    //Game.muffins += muffins;
    //ShowNotice("Game reset", ((muffins==0)?null:"You get <b>" + Pluralize(muffins, " muffin") + "</b> for your <b>" + Pluralize(Game.totalsmiles, " smile") + "</b>"), null);
    ShowNotice("Game Reset", "Muffin prestige has been temporarily disabled, sorry!");
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
  function ParseGame(src) {
    var g = JSON.parse(src);
    switch(g.version)
    {
      case 3:
        Game = g;
        if(Game.settings.numDisplay === undefined) Game.settings.numDisplay = 0;
        break;
      default:
        alert('Unrecognized version! Game not loaded.');
    }
  }
  function ImportGame(src) {
    ParseGame(src);
    InitializeGame();
    EarnAchievement(202);
    CheckAchievements(Object.keys(achievementList));
  }
  function InitializeGame() {
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
    $('#numdisplay' + Game.settings.numDisplay).prop('checked', true);
  }
  function GetSettings() {
    Game.settings.useCanvas = $EnableE.prop('checked');
    Game.settings.optimizeFocus = $EnableF.prop('checked');
    Game.settings.closingWarn = $EnableW.prop('checked');
    if($('#numdisplay0').prop('checked')) Game.settings.numDisplay = 0;
    if($('#numdisplay1').prop('checked')) Game.settings.numDisplay = 1;
    if($('#numdisplay2').prop('checked')) Game.settings.numDisplay = 2;
    UpdateSPS();
  }

  LoadGame();

  var Store = [
    {cost:0,count:1,name:"Pony", plural: "ponies", desc: "This is a pony. Ponies need friendships to generate smiles."},
    {cost:0,count:0,name:"Friendship", plural: "friendships", desc: "A friendship between two ponies. You can't buy a friendship if everypony is friends with everypony else!" },
    {cost:0,count:0,name:"Recital", plural: "recitals", desc: "A small recital for everypony you know.", formula: "Generates one smile per pony.<i>SPS = P</i>"}, // P
    {cost:0,count:0,name:"Party", plural: "parties", desc: "Throw a party for all your friends!", formula: "Generates one smile per friendship.<i>SPS = F</i>"}, // F
    {cost:0,count:0,name:"Parade", plural: "parades", desc: "Throw a big parade for everypony and all their friends!", formula: "Generates two smiles for each friendship and each pony.<i>SPS = 2&times;(P&plus;F)</i>"}, // (P+F)*2.0
    {cost:0,count:0,name:"Concert", plural: "concerts", desc: "Throw a concert for the whole town!", formula: "Generates one smile for every pony, friendship, and building you have.<i>SPS = P&plus;F&plus;B</i>"}, // P+F+B
    {cost:0,count:0,name:"Festival", plural: "festivals", desc: "Celebrate a festival for a whole weekend!", formula: "Generates one smile for every pony you have, times the number of friends you have, times 1&frac12;.<i>SPS = P&times;F&times1.5</i>"}, // P*F*1.5
    {cost:0,count:0,name:"Rave", plural: "raves", desc: "Throw a gigantic rave party in Canterlot!", formula: "Generates one smile for every pony you have, times the number of friendships and buildings you have.<i>SPS = P&times;(F&plus;B)</i>"}, // P*(F+B)
    {cost:0,count:0,name:"Grand Galloping Gala", plural: "grand galloping galas", desc: "Celebrate the Grand Galloping Gala with ponies from all over Equestria!", formula: "Generates one smile for every pony you have, times the number of friendships you have, times the number of buildings you have.<i>SPS = P&times;F&times;B</i>"}, //P*F*(B+1)
    {cost:0,count:0,name:"Coronation", plural: "coronations", desc: "Make some random pony a princess so you have an excuse to party all night!", formula: "Generates one smile per friendship, times two for every pony you have, plus the number of buildings you have.<i>SPS = 2<sup>P</sup>&times;F&plus;B</i>"}, //2^P*F+B
    {cost:0,count:0,name:"National Holiday", plural: "national holidays", desc: "Declare a national holiday so everypony in equestria can party with you instead of being productive!", formula: "Generates one smile per friendship, times the number of buildings you have, times two for every pony you have.<i>2<sup>P</sup>&times;F&times;B</i>"}, //2^P*F*(B+1)
    {cost:0,count:0,name:"Elements Of Harmony", plural: "Elements of Harmony", desc: "Use a giant rainbow friendship beam to solve all your problems!", formula: "Generates a bajillion smiles for every pony you have, plus one smile per friendship times the number of buildings you own.<i>P!&div;5! &plus; F&times;B</i>"}, //P!/(P-5)! + F*B
    //{cost:0,count:1,name:"DEBUGMOUSE", plural:"DEBUGMOUSES", desc: "DEBUG DO NOT USE"}
  ];

  function factorial(n) { var r = n; while(--n > 1) { r = r*n; } return r; }
  function factorial_limit(n,k) { var r = n; while(--n > k) { r = r*n; } return r; }
  function max_binomial(n) { var n2=Math.floor(n/2); var r = n; while(--n > n2) { r = r*n; } return Math.floor(r/factorial(n2)); }

  var number_names = [
  "million",
  "billion",
  "trillion",
  "quadrillion",
  "quintillion",
  "sextillion",
  "septillion",
  "octillion",
  "nonillion",
  "decillion",
  "undecillion",
  "duodecillion",
  "tredecillion",
  "quattuordecillion", // This name is so long it breaks formatting in places :C
  "quindecillion",
  "sexdecillion",
  "septendecillion",
  "octodecillion",
  "novendecillion",
  "vigintillion"];

  function GetRandNum(min, max) { // Random number in the range [low, high)
    return Math.floor(Math.random()*(max-min))+min;
  }

  function GetNews() {
    var news = [];

    // These are specific smile count related messages
    if(Game.totalsmiles < 30) {
      news.push(
        "Ponyville down in the dumps, reports anonymous bystander.",
        "Ponyville reports distinct lack of smiles.",
        "Smile forecast for today: Depression with a touch of despair.",
        "Ponyville in desperate need of excitement.",
        "Antidepressants selling out all across Ponyville.",
        "Mayor Mare asked why everyone is feeling so down, reports she can't be bothered to figure it out."
      );
    } else if(Game.totalsmiles < 1000) {
      news.push("Ponyville citizens wonder what this strange new sensation is! Scientists call it 'smiling', conspiracy theorists denounce it as a ploy to take over the world.",
        "Morose ponies increasingly out of place in chipper Ponyville!",
        "Small foals spotted playing in the streets! Parents unsure if so called 'fun' should be allowed.",
        "Chef proposes selling 'baked goods' instead of 'baked okays'. Customers wary of new marketing scam.");
    } else if(Game.totalsmiles < 1000000) {
      news.push("Ponies greeting each other with a smile! Cranky old ponies decry new development!",
        "Iron Will now teaching assertiveness instead of methods of coping with depression!",
        "Several young colts spotted hoofbumping! Parents concerned over new trend!",
        "Therapist upset about recent mood upswing, says it's bad for business.");
    } else if(Game.totalsmiles < 1000000000) {
      news.push("Songs now spontaneously erupting across Ponyville!",
      "Ponyville voted happiest town in equestria!",
      "Ponies from all over Equestria come to visit Ponyville!");
    } else if(Game.totalsmiles < 1000000000000) {
      news.push(
        "Princess Twilight found overdosed on friendship, taken to rehab center!",
        "Citizens of Ponyville so happy they invent new word for it! Debates about how to spell it immediately turn into murderous riots!");
    } else if(Game.totalsmiles < 1000000000000000) {
      news.push("Ponyville citizens suffer from chronic happiness! Doctors unsure if it's actually a problem or not!");
    } else if(Game.totalsmiles < 1000000000000000000) {
      news.push("Scientists split friendship and discover a runaway chain reaction! Nuclear friendship bomb proposed by military!");
    } else {
      news.push("New system of physics suggests all matter in universe composed of different kinds of smiles!");
    }

    // After 10000 smiles we start putting in most of the standard news messages into rotation.
    if(Game.totalsmiles > 10000) {
      news.push(
        'Twilight found shipping Rainbow Dash with everything in the universe! Riots erupt all across Equestria!',
        'Lyra and BonBon revealed as "just friends"! Ponies everywhere faint in shock!',
        "Celestia's insatiable desire for cake causes caketastrophe in the Royal Kitchen! A memorial service for the lost chocolate chips to be held on Monday.",
        "Pink menace at Sugarcube corner goes batty, takes 15 muffins hostage!",
        "Citizens of Ponyville vote to create a public library instead of relying on a private collection organized by a crazed purple mare!",
        "Small colt finds lost Apple barn floating in space. Rainbow Dash claims she has no idea how it got up there.",
        "Rarity joins environmentalists, declares she will no longer go to the spa. Ponyville's spa immediately goes bankrupt.",
        "Following an incident involving mislabeled sodium and an exploding toilet, Celestia orders Sweetie Bot to register herself as a lethal weapon.",
        "Rainbow Dash reportedly investing in the Cloud. Pegasi everywhere confused by what this means.",
        "Princess Twilight discovers that ponies are actually tiny nuclear reactors! \"That explains why I never need to go to the bathroom,\" says Rainbow Dash.",
        "Pony pony Pony pony pony pony Pony pony!",
        "Princess Twilight Sparkle dating a peach! The peach has no comment on the matter."
      );

      if(Game.muffins > 10) {
        news.push(
          'When asked how she saved the bakery from certain disaster, Derpy Hooves claims there was "Muffin to it!"',
          "Try new smile-powered Muffins today!",
          'Mayor held hostage by crazed Doctor, who demands that a muffin factory be built "for the sake of all ponykind!"',
          'Derpy and Troubleshoes get married! Ponyville does not survive the wedding.',
          'Scientists investigate whether excessive muffin consumption can lead to long, overbearing plots.',
          'Rarity to design new fashion line for plus sized mares, claiming “Muffin tops are in fashion this season”.',
          "Rainbow Dash to host new midnight release party for AK Yearling’s latest novel, ‘Daring Do and the Muffin Man of Azkaban’.",
          "Fluttershy cancels bi-weekly critter picnic in exchange for new Muffin Social. Critters could not be reached for comment.",
          "Applejack introduces apple-spice muffins, in attempt to reignite declining produce sales.",
          "Twilight Sparkle under house arrest for magically mammal manipulation, for trying to cross a mouse with a muffin.",
          "Pinkie Pie launches new re-branding of cupcakes as ‘dessert muffins’, meets with mixed results.",
          "Discord caught eating 40 muffins in one sitting, that’s as many as four 10’s, and that’s terrible.",
          "Princess Celestia has eaten at least 37 muffins this year, when reached for comment, Princess Luna responded with ‘In a row?’.",
          "Princess Cadence Announces that all muffins produced in the Crystal Empire now come with ‘Free Shipping’.  Her Highness then winked suggestively.",
          "As muffin craze sweeps Equestria, Sapphire Shores to star in new musical, ‘My Little Muffin, Baked-goods are Magic’.",
          "Diamond Tiara insists that her father has a bigger muffin collection than you, no matter how improbable that sounds.",
          "New Poll from the Foal Free Press reveals that no food makes a young filly smile as much as a muffin."
        );
      }
      if(Game.muffins > 100) {
        news.push('Derpy crashes into giant muffin. Irony is not amused.');
      }
    }

    return news[GetRandNum(0, news.length)];
  }
  var newsnum = 0,
      newswait = 15000,
      lastNews,
      $board = $('#ponyboard'),
      $news = $board.children('.newsactive');

  function UpdateNews() {
    var n2 = (newsnum + 1) % 2;
    $news.children()
      .last().prependTo($news).css('opacity',0).html(GetNews()).fadeTo(500,1)
      .next().fadeTo(500,0);
  }
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
  function PrettyNum(x, fixed) {
    switch(Game.settings.numDisplay)
    {
    case 0:
      var d = Math.floor(Math.log10(x));
      if(d<6) return NumCommas(x);
      x = Math.floor(x/Math.pow(10,d-(d%3)-3));
      var n = Math.floor((d-3)/3) - 1;
      if(n >= number_names.length) return "Infinity";
      return (fixed?(x/1000).toFixed(3):(x/1000)) + " " + number_names[n];
    case 1:
      return NumCommas(Math.floor(x));
    case 2:
      return (x<=999999)?NumCommas(x):(x.toExponential(3).replace("e+","&times;10<sup>")+'</sup>');
    }
  }
  function Pluralize(n, s, fixed) { return PrettyNum(n, fixed) + s + ((n==1)?'':'s'); }

  function basic_upgrade(sps, item, p, m) { sps[item] = (sps[item]+p)*(m+1); return sps; }
  function global_upgrade(sps, p, m) { for(var i = 0; i < sps.length; ++i) { sps[i] = (sps[i]+p)*(m+1); } return sps; }
  function gen_upgradetype1(item, pSPS, mSPS) { return function(sps, store) { var c = store[item]; return basic_upgrade(sps, item, pSPS*c, mSPS*c); } }
  function gen_upgradetype2(sps, count, pSPS, mSPS) { Game.SPC+=(pSPS*count); Game.SPC*=(1+mSPS); return sps; }
  function gen_muffinupgrade(pSPS, mSPS) { return function(sps, store) { return global_upgrade(sps, pSPS, mSPS*Game.muffins); } }
  function gen_totalsps(sps, store) { var total = 0; for(var i = 0; i < sps.length; ++i) { total += sps[i]*store[i]; } return total; }

  var upgradeList = [ {cost:0, name:"UNDEFINED", desc:"ERROR", fn:null},
    {cost:700, name:"Booping Assistants", desc: "Booping gets +1 SPC for every pony you have.", fn:function(sps,store){return gen_upgradetype2(sps, store[0], 1, 0);} },
    {cost:7000, name:"Friendship is Booping", desc: "Booping gets +1 SPC for every friendship you have.", fn:function(sps,store){return gen_upgradetype2(sps, store[1], 1, 0);} },
    {cost:70000, name:"Ticklish Cursors", desc: "Booping gets 1% of your SPS.", fn:function(sps,store){return gen_upgradetype2(sps, gen_totalsps(sps, store), 0.01, 0); }},
    {cost:700000, name:"Feathered Cursors", desc: "Booping gets 2% of your SPS.", fn:function(sps,store){return gen_upgradetype2(sps, gen_totalsps(sps, store), 0.02, 0); }},
    {cost:8000000, name:"Advanced Tickle-fu", desc: "Booping gets 3% of your SPS.", fn:function(sps,store){return gen_upgradetype2(sps, gen_totalsps(sps, store), 0.03, 0); }},
    {cost:90000000, name:"Happiness Injection", desc: "Booping gets 4% of your SPS.", fn:function(sps,store){return gen_upgradetype2(sps, gen_totalsps(sps, store), 0.04, 0); }},
    {cost:10000, name:"Friendship Is Magic", desc: "Friendships generate +1 SPS for every other friendship.", fn:gen_upgradetype1(1, 1, 0) },
    {cost:1000000, name:"Friendship Is Spellcraft", desc: "Friendships generate +10 SPS for every other friendship.", fn:gen_upgradetype1(1, 10, 0) },
    {cost:100000000, name:"Friendship Is Sorcery", desc: "Friendships generate +100 SPS for every other friendship.", fn:gen_upgradetype1(1, 100, 0) },
    {cost:10000000000, name:"Friendship Is Witchcraft", desc: "Friendships generate +1000 SPS for every other friendship.", fn:gen_upgradetype1(1, 1000, 0) },
    {cost:1000000000000, name:"Friendship Is Benefits", desc: "Friendships generate +10000 SPS for every other friendship.", fn:gen_upgradetype1(1, 10000, 0) },
    {cost:7777777, name:"I just don't know what went wrong!", desc: "You gain +0.1% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.001) },
    {cost:777777777, name:"That one mailmare", desc: "You gain +0.2% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.002) },
    {cost:77777777777, name:"Derpy Delivery Service", desc: "You gain +0.3% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.003) },
    {cost:7777777777777, name:"Blueberry Muffins", desc: "You gain +0.4% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.004) },
    {cost:777777777777777, name:"Chocolate-chip Muffins", desc: "You gain +0.5% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.005) },
    {cost:77777777777777777, name:"Lemon Muffins", desc: "You gain +0.6% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.006) },
    {cost:7777777777777777777, name:"Poppy seed Muffins", desc: "You gain +0.7% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.007) },
    {cost:777777777777777777777, name:"Muffin Bakeries", desc: "You gain +0.8% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.008) },
    {cost:77777777777777777777777, name:"Designer Muffins", desc: "You gain +0.9% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.009) },
    {cost:7777777777777777777777777, name:"Muffin Factories", desc: "You gain +1% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.01) },
    //{cost:50000, name:"Upgrade 3", desc: "Parties generate +1 SPS for every other party.", fn:gen_upgradetype1(2, 1, 0) }
  ];

  for(var i = 0; i < upgradeList.length; ++i) {
    upgradeList[i].id = i;
  }
  $upgrades_total.html((upgradeList.length-1).toFixed(0)); //-1 for the error one at 0

  var curUpgradeList = [];

  var achievementList = {
    '1': { name:"Participation Award", desc: "You moved the mouse!", muffins:0},
    '2': { name:"Hi there!", desc: "Boop a pony <b>once</b>.", muffins:0, cond:function(){ return Game.clicks > 0; } },
    '200': { name:"Cautious", desc: "Manually save the game.", muffins:1},
    '201': { name:"Paranoid", desc: "Export a save.", muffins:1},
    '202': { name:"Time Machine", desc: "Import a save.", muffins:1},
    '203': { name:"Narcissism!", desc: "Click the image of Cloud Hop on the credits page.", muffins:1},
    '204': { name:"Music Makes Everything Better", desc: "Listen to the smile song.", muffins:1},
    '205': { name:"You Monster", desc: "Sell a friendship.", muffins:1},
    '206': { name:"No Booping Allowed", desc: "Get <b>"+PrettyNum(1000000000000)+"</b> smiles with only 35 pony boops.", muffins:1, cond:function() { return Game.clicks <= 35 && Game.totalsmiles >= 1000000000000; } },
    '207': { name:"Wheel of Friendship", desc: "Spin the ponies.", muffins:1, cond:function() { return vangle>0.05; } },
    '208': { name:"Centrifuge of Friendship", desc: "Spin the ponies <b>really fast</b>.", muffins:2, cond:function() { return vangle>3; } },
    '255': { name:"Completionist", desc: "Get all the achievements.", muffins:100}
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
    ["That tickles!", "Tickle War", "Tickle War II: The Retickling", "It's Over Nine Thousand!", "This Can't Be Healthy", "Carpal Tunnel Syndrome", "Wrist In Pieces"],
    [10,100,1000,9001,25000,50000,100000],
    function(n) { return "Boop a pony <b>"+PrettyNum(n)+"</b> times."; },
    function(n) { return function() { return Game.clicks >= n; }; });
  achievements_clicks.push(2);

  var achievements_smiles = genAchievements(
    ["Joy", "Glee", "Bliss", "Nirvana", "Ecstasy", "Pursuit of Happyness", "You Can Stop Now", "This Is Ridiculous", "Go Read A Book", "How?!"],
    [100,10000,1000000,100000000,10000000000,1000000000000,100000000000000,10000000000000000,1000000000000000000,100000000000000000000],
    function(n) { return "Get <b>"+PrettyNum(n)+"</b> smiles."; },
    function(n) { return function() { return Game.totalsmiles >= n; }; });
  achievements_smiles.push(206); // Add "No Booping Allowed".

  function genShopCond(item) {
    return function(n) { return function() { return Game.store[item]>=n; }; };
  }

  var achievements_shop = [], $achievements_total = $('#achievements_total');
  function genShopAchievements(item, names) {
    return genAchievements(
    names,
    [1, 50, 100, 150, 200],
    function(n) { return "Buy <b>"+Pluralize(n, "</b> " + Store[item].name.toLowerCase()) + "."; },
    genShopCond(item));
  }

  achievements_shop = achievements_shop.concat(genShopAchievements(2, ["Hobbyist", "Street Musician", "Performer", "Multi-instrumentalist", "Conductor"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(3, ["Extrovert", "Socialite", "Party Cannon", "Life Of The Party", "Pinkie Pie"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(4, ["Float Attendee", "Giant Floating Rainbow Dash", "Way Too Much Confetti", "Mane Attraction", "Mayor Mare"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(5, ["Piano Solo", "String Quartet", "Chamber Choir", "70 Piece Orchestra", "Octavia"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(6, ["Summer Sun Celebration", "Running Of The Leaves", "Winter Wrap Up", "Hearth's Warming Eve", "Rite Of Spring"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(7, ["Enthusiast", "Headbanger", "Glowsticks For Everypony!", "Bass Pumper", "DJ Pon3"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(8, ["Best Night Ever", "Aristocracy", "Ballroom Dance", "YOU'RE GOING TO LOVE ME!", "Really Boring"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(9, ["Princess Twilight", "Prince Shining Armor", "Princess Big Mac", "Princess Derpy", "Everypony's a Princess!"]));
  achievements_shop = achievements_shop.concat(genShopAchievements(10, ["Nightmare Night", "Mother's Day", "Farmer's Day", "Rainbow Dash Is Awesome Day", "National Butt Day"]));
  achievements_shop = achievements_shop.concat(genAchievements(
    ["Loyalty", "By Your Powers Combined", "Honesty", "Laughter", "Generosity", "Kindness"],
    [1, 6, 20, 40, 80, 160],
    function(n) { return "Buy <b>"+Pluralize(n, "</b> " + Store[11].name.toLowerCase()) + "."; },
    genShopCond(11)));

  achievementCount += extraAchievements; // for our special ones at the end
  $achievements_total.html(achievementCount.toFixed(0));

  var $menu = $('#menu'),
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
      $stat_achievementmuffins = $stats.find('.achievementmuffins'),
      $achievements_owned = $('#achievements_owned'),
      $upgrades_owned = $('#upgrades_owned'),
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
      $storewrapper = $('#storewrapper');

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
            ?'<strong>'+dynFontSize(achievementList[prop].name)+'</strong><i>[achievement]</i><hr><p>'+achievementList[prop].desc+'</p>'
            :'<strong>'+dynFontSize(upgradeList[prop].name)+'</strong><i>[upgrade]</i><hr><p>'+upgradeList[prop].desc+'</p>'
          )
          .appendTo($ach);

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

  var pbg = $('#ponybg')[0],
      pb = $board[0];
  function ResizeCanvas() {
    canvas.width  = pbg.offsetWidth;
    canvas.height = pb.offsetHeight;
  }
  $w.on('resize',ResizeCanvas);


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
        'Too expensive!':
          (NeedsMorePonies()?
          'Not enough ponies!':
          'Too expensive!')
        ,0,-40);
      }
    });
  }
    
  // Generate store HTML
  $store.empty();
  for(var i = 0; i < Store.length; ++i) {
    var $item = $(document.createElement('li'))
          .attr('id','buy'+i)
          .addClass('disable')
          .html(Store[i].name.toLowerCase() + '<br>'),
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

  function Click(id) {
      var amount = Math.floor(Game.SPC);
      Earn(amount);
      Game.clicks += 1;
      $stat_clicks.html(PrettyNum(Game.clicks));
      ShowMouseText('+' + PrettyNum(amount), 2, -40);
      CheckAchievements(achievements_clicks);
  }
  function triangular(n) {
    return (n*(n-1))/2; // number of edges in a complete graph of n nodes
  }
  function inv_triangular(n) {
    return 0.5*(Math.sqrt(8*n + 1) + 1); // Returns the triangular number that would produce this many edges
  }
  function fbnext(x) {
    return x + 1 + (x>>1) + (x>>3) - (x>>7) + (x>>10) - (x>>13);
  }

  // The game's difficulty is modelled using a series of curves defined by these values
  function fn_ratio(init,curve) { return function(n) { return init*Math.pow(curve,n); }; }
  var fcurve = 1.3; // Friendship curve
  var fcurve_init = 20;
  var rcurve = 1.13; // cost ratio curve
  var rcurve_init = 32; // Initial cost ratio (for a party)
  var fn_rratio = fn_ratio(rcurve_init,rcurve); // gets the SPS ratio for a store of level n

  // The fundamental curve is the cost of friendships. This forms a simple recurrence relation f_n = a*f_n-1, which has a closed-form solution of f_n = f_0*a^n
  var fn_cost1 = fn_ratio(fcurve_init, fcurve);
  Store[1].initcost = fcurve_init;
  Store[1].costcurve = fcurve;

  // The cost of ponies is based on the cost of buying k+1 friendships, where k is the number of edges in a complete graph of n-nodes, which is just a triangular number. So, we take the current number of ponies, find the corresponding triangular number, add one and plug that into the friendship cost function.
  var fn_cost0 = function(n) { return (n<2)?15:fn_cost1(triangular(n)+1); };

  function default_cost(i, n) { return Store[i].initcost*Math.pow(Store[i].costcurve,n) }
  function inv_cost(i, cost) { return Math.floor(Math.log(cost/Store[i].initcost)/Math.log(Store[i].costcurve)) }

  Store[0].fn_SPS = function(P,F,B) { return 0; };
  Store[1].fn_SPS = function(P,F,B) { return 1.0; };
  Store[2].fn_SPS = function(P,F,B) { return P; };
  Store[3].fn_SPS = function(P,F,B) { return F; };
  Store[4].fn_SPS = function(P,F,B) { return (P+F)*2.0; };
  Store[5].fn_SPS = function(P,F,B) { return (P+F+B); };
  Store[6].fn_SPS = function(P,F,B) { return (P*F)*1.5; };
  Store[7].fn_SPS = function(P,F,B) { return (P*(F+B)); };
  Store[8].fn_SPS = function(P,F,B) { return (P*F*(B+1)); };
  Store[9].fn_SPS = function(P,F,B) { return Math.pow(2, P)*F+B; };
  Store[10].fn_SPS = function(P,F,B) { return Math.pow(2, P)*F*(B+1); };
  Store[11].fn_SPS = function(P,F,B) { return factorial_limit(P,5)+(F*B); };
  //Store[12].fn_SPS = function(P,F,B) { return 0; };

  // A store's initial cost is based on the number of friendships you (should) have already bought, or can currently afford, which is then used to calculate how many of everything else you have to generate a SPS and then apply the relevant SPS ratio to derive the appropriate cost

  function initSPS(f,r,b) { return Store[r].fn_SPS(Math.floor(inv_triangular(f)),f,b); }
  function initcost(f,r,b) { return initSPS(f,r,b)*fn_rratio(r-2); }

  function fn_estimatebuildings(cost, max) {
    var b = 0;
    for(var j = 2; j < max; j++)
      b += inv_cost(j, cost);
    return b;
  }
  // Return a curve that results in a cost equal to the new SPS ratio after n buildings are bought.
  /*function fn_costcurve(n,ratio,i,cost) {
    // x is the new cost
    // x = initSPS(inv_cost(1, x), i, fn_estimatebuildings(x, i))*ratio
    // Instead of trying to solve that for x, we just estimate the building count increase.
    // x = initSPS(inv_cost(1, x), i, fn_estimatebuildings(cost, i)+n*i)*ratio
    var b = fn_estimatebuildings(cost, i)+n*i;
    // We can't solve for x because we'd have to solve for x for every single individual building, so we do an iterative solve using cost as an initial guess.
    var x = cost;
    for(var j = 0; j < 1; ++j) {
      x = initSPS(inv_cost(1, x), i, b)*ratio;
    }
    return Math.pow(x/cost, 1.0/n);
  }*/

  var Fvals = [4,12,30,35,45,45,45,70,51,100];

  for(var i = 2; i < 12; ++i) {
    var cost = fn_cost1(Fvals[i-2]);
    var b = fn_estimatebuildings(cost, i);
    Store[i].initcost = initcost(Fvals[i-2],i,b);
    Store[i].costcurve = 1.2 + (i*i*0.0048); //fn_costcurve(5, fn_rratio(i-2)*1.5, i, Store[i].initcost);
  }

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
  //Store[12].cost = function(n) { return 1; };

  function Earn(num) {
    if(num>0) { Game.totalsmiles += num; }
    Game.smiles += num;
    $score.html(Pluralize(Game.smiles, " smile", true));
    $stat_cursmiles.html(PrettyNum(Game.smiles, true));
    $stat_totalsmiles.html(PrettyNum(Game.totalsmiles, true));
    UpdateStore();
    CheckAchievements(achievements_smiles);
  }
  function EarnAchievement(id) {
    if(Game.achievements[id] == null) {
      Game.achievements[id] = achievementList[id].muffins;
      Game.achievementcount++;
      ShowNotice(achievementList[id].name, achievementList[id].desc, "achievement");
      Game.muffins += achievementList[id].muffins;
      Game.achievement_muffins += achievementList[id].muffins;
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
  function NeedsMorePonies() {
    return Game.store[1] >= triangular(Game.store[0]);
  }
  var lastUpgrade = [];
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
  
  function UpdateStore() {
    $ponycost.html("(NEEDS " + Math.ceil(inv_triangular(Game.store[1]+1)) + " PONIES)").hide();
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
      $("#cost" + i).html(PrettyNum(cost));
      $("#count" + i).html(count);
    }
    
    curUpgradeList = [];
    var scopeUpgradeList = []; // we mark whether or not something is disabled by negating it's ID, but we can't put negatives in curUpgradeList.
    var achs = [];
    for(var i = 1; i < upgradeList.length; ++i) { // start at one to skip UNDEFINED upgrade
      if(upgradeList[i].cost < (Game.totalsmiles*0.8) && Game.upgradeHash[i] == null) {
        var hide = upgradeList[i].cost>Game.smiles;
        curUpgradeList.push(i);
        scopeUpgradeList.push(hide?-i:i);
        var $ach = $(document.createElement('div'))
          .addClass('achievement'+(hide?' hidden':''))
          .css('background-image','url(upgrades.png)');

        (function($el,index){ $el.on('click',function(){ BuyUpgrade(index) }); })($ach,i);

        achs.push($ach);
      }
    }
    if(!arraysEqual(lastUpgrade,scopeUpgradeList)) {
      $storeupgrades.empty().append(achs);
      lastUpgrade = scopeUpgradeList;
    }
    $stat_buildings.html(CountBuildings(Game.store).toFixed(0));
  }
  function CountBuildings(store) {
    var count = 0;
    for(var i = 2; i < store.length; ++i)
      count += store[i];
    return count;
  }
  // Seperating this out lets us make predictions on what a purchase will do to your SPS
  function CalcSPS(store, docache) {
    var res = CalcSPSinit(store);
    var SPC = Game.SPC;

    Game.SPC = 1;
    for(var i = Game.upgrades.length-1; i >= 0; i-=1) {
      res = upgradeList[Game.upgrades[i]].fn(res, store);
      if(!res || !res.length) {
        alert("ILLEGAL UPGRADE: " + Game.upgrades[i]);
      }
    }
    if(!docache) { Game.SPC = SPC; } // HACK to fix SPC exploit

    var SPS = 0;
    for(var i = 0; i < res.length; ++i) {
      if(docache) { Store[i].SPS_cache = res[i]; }
      SPS += res[i]*store[i];
    }
    return SPS;
  }
  function CalcSPSinit(store) {
    var P = store[0];
    var F = store[1];
    var B = CountBuildings(store);
    var result = [];
    for(var i = 0; i < Store.length; ++i) {
      result.push(Store[i].fn_SPS(P,F,B));
    }
    return result;
  }
  function UpdateSPS() {
    Game.SPS = CalcSPS(Game.store, true);
    $stat_SPC.html(PrettyNum(Math.floor(Game.SPC)));
    if(Game.SPS > 0)
      $SPS.html("+" + ((Game.SPS<=999)?Game.SPS.toFixed(1):PrettyNum(Game.SPS)) + " per second").show();
    else $SPS.hide();

    $stat_SPS.html(PrettyNum(Game.SPS));
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
  var lastTime, startTime, lastTick, lastSave, lastSpin;
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
    if(Game.settings.useCanvas && (hasFocus || Game.delta>framelength)) {
      var grd = ctx.createLinearGradient(0,0,0,canvas.height);
      grd.addColorStop(0,"#d8f6ff");
      grd.addColorStop(1,"#1288e2");
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,canvas.width,canvas.height);

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

  function UpdateOverlay(item, y, mobile) {
    if(item == null)
      item = $overlay.attr('data-item');
    else if(item != $overlay.attr('data-item'))
    {
      $overlay.attr('data-item', item);
  
      if(item < 0) return $overlay.hide();
  
      var x = Store[item],
          xcount = Game.store[item],
          xcost = x.cost(xcount),
          $title = $(document.createElement('div'))
            .addClass('title')
            .append('<p>'+x.name+'</p><span>'+smilethumb+PrettyNum(xcost)+'</span>');
  
      if(xcount > 0) $title.append('<div>['+PrettyNum(xcount)+' owned]</div>');
      $overlay.empty().append($title, '<hr><p>'+x.desc+'</p>');//<ul>
      var $ul = $(document.createElement('ul'));
  
      if(x.formula) $ul.append('<li class="formula">'+x.formula+'</li>');
      if(x.SPS_cache > 0 || item==1) $ul.append('<li>Each '+x.name.toLowerCase()+' generates <b>'+Pluralize(x.SPS_cache, ' smile')+'</b> per second</li>');
      if(xcount > 0 && x.SPS_cache > 0) $ul.append('<li><b>'+PrettyNum(xcount)+'</b> '+x.plural.toLowerCase()+' generating <b>'+Pluralize(xcount*x.SPS_cache, ' smile')+'</b> per second</li>');
  
      var nstore = Game.store.slice();
      nstore[item]+=1;
      var nSPS = CalcSPS(nstore, false),
          sps_increase = nSPS - Game.SPS,
          payPerSmile = xcost/(nSPS - Game.SPS),
          increaseText = sps_increase > 0 ? 'will increase your SPS by <b>'+PrettyNum(sps_increase)+'</b>' : "<b>won't</b> increase your SPS",
          payPerSmileText = isFinite(payPerSmile) ? '<i>You pay <b>'+Pluralize(payPerSmile, ' smile') + '</b> per +1 SPS</i>' : '';
  
      $ul.append('<li>Buying one '+x.name.toLowerCase()+' '+increaseText+payPerSmileText+'</li>');
  
      // Display buy/sell information
      var helpStr = '<li><kbd>Shift + Click</kbd> to buy 10';
      if (xcount > 0 && item>0) helpStr += ', <kbd>Right click</kbd> to sell 1'; // you can't sell ponies
      $ul.append(helpStr+'</li>');
      
      $overlay.append('<hr>',$ul).show();
    }
    
    if(y != null && item >= 0)
      $overlay.css('top',function(){ return Math.min(Math.max(y-(mobile?(16+this.offsetHeight):40),0),window.innerHeight-this.offsetHeight); });
  }
  function UpdateUpgradeOverlay(item, x, y) {
    if(item != null && item >= curUpgradeList.length) item = -1;

    if(y != null && item >= 0) {
      if(y > ($storeupgrades.get(0).offsetHeight + $storeupgrades.offset().top)) item = -1;
    }
    if(item == null)
      item = $upgradeoverlay.attr('data-item');
    else if(item != $upgradeoverlay.attr('data-item'))
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
  function ProcessSPS(delta) {
    Earn(Game.SPS*(delta/1000.0));
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
      ShowNotice(Store[id].name, "Purchased <b>" + numPurchase + " " + Store[id].plural + "</b> for <b>" + Pluralize(totalCost, " smile") + "</b>");

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
      ShowNotice(Store[id].name, "Sold <b>" + numSell + " " + Store[id].plural + "</b> for <b>" + Pluralize(totalCost, " smile") + "</b>");
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

  var setShiftDown = function(event){
      if(event.keyCode === 16 || event.charCode === 16){
          Game.shiftDown = true;
      }
  };

  var setShiftUp = function(event){
      if(event.keyCode === 16 || event.charCode === 16){
          Game.shiftDown = false;
      }
  };
  function aniEndFunc() {
    $(this).remove();
  }
  var $mousetexts = $('#mousetexts');
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
  var $notices = $('#notices');
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

  var $showmenu = $('#showmenu').on('click',function(){ ShowMenu(true) }),
      $hidemenu = $('#hidemenu').on('click',function(){ ShowMenu(false) }),
      $exportWindow = $('#exportwindow'),
      $credits = $('#credits');
  $('#showecredits').on('click',function(){
    $credits.show();
  });
  $credits.children('button').on('click',function(){
    $credits.hide();
  });
  $credits.find('.cloudhop').on('click',function(){
    EarnAchievement(203);
  });
  $('#wipeall').on('click',function(){
    if (window.confirm('This will irreversibly wipe ALL your data, including all settings and all achievements! Are you certain you want to do this?'))
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
    var x = window.prompt('Paste your exported game data here to import it. WARNING: This will overwrite your current game, even if the data is corrupt! Be sure you export your current game if you don\'t want to lose anything!');
    if(x!==null) ImportGame(x);
  });

  $('#manualsave').on('click',function(){
    EarnAchievement(200);
    SaveGame();
  });
  $menu.find('label').children().on('click',GetSettings);

  $('#mandatory-fun').on('click',function(){
    EarnAchievement(204);
  });
  
  var curangle = 0;
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
  
  // doOnLoad equivalent
  $w.on('load',function(){
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
});
