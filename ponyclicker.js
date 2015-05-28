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
        alert('Unrecognized version! Game not loaded.');
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
    {cost:function(n) {},name:"Pony", plural: "ponies", desc: "This is a pony. Ponies need friendships to generate smiles.", img: function(n){ return 'ponies/'+PonyList[Game.ponyList[n]]+'.svg'; }},
    {cost:function(n) {},name:"Friendship", plural: "friendships", desc: "A friendship between two ponies. You can't buy a friendship if everypony is friends with everypony else!", img: function(n){ return 'store/hoofbump.svg'; } },
    {cost:function(n) {},name:"Recital", plural: "recitals", desc: "A small recital for everypony you know.", formula: "Generates one smile per pony.<i>SPS = P</i>", img: function(n){ return 'store/cello.svg'; }}, // P
    {cost:function(n) {},name:"Party", plural: "parties", desc: "Throw a party for all your friends!", formula: "Generates one smile per friendship.<i>SPS = F</i>", img: function(n){ return 'store/balloon.svg'; }}, // F
    {cost:function(n) {},name:"Parade", plural: "parades", desc: "Throw a big parade for everypony and all their friends!", formula: "Generates one smile for each friendship and each pony.<i>SPS = P&plus;F</i>", img: function(n){ return 'store/trixie_wagon.svg'; }}, // P+F
    {cost:function(n) {},name:"Concert", plural: "concerts", desc: "Throw a concert for the whole town!", formula: "Generates one smile for every pony, friendship, recital, party, and parade you have.<i>SPS = P&plus;F&plus;Recitals&plus;Parties&plus;Parades</i>", img: function(n){ return 'store/octavia_cutiemark.svg'; }}, // P+F+Recitals+Parties+Parades
    {cost:function(n) {},name:"Festival", plural: "festivals", desc: "Celebrate a festival for a whole weekend!", formula: "Generates one smile for every pony you have, times the number of friendships you have.<i>SPS = P&times;F</i>", img: function(n){ return 'store/stage.png'; }}, // P*F
    {cost:function(n) {},name:"Rave", plural: "raves", desc: "Throw a gigantic rave party in Canterlot!", formula: "Generates one smile for every pony, times the number of friendships, times the number of concerts.<i>SPS = P&times;F&times;Concerts</i>", img: function(n){ return 'store/turntable.png'; }}, // P*F*Concerts
    {cost:function(n) {},name:"Grand Galloping Gala", plural: "grand galloping galas", desc: "Celebrate the Grand Galloping Gala with ponies from all over Equestria!", formula: "Generates one smile for every pony you have, times the number of friendships you have, times the number of parties and parades you have.<i>SPS = P&times;F&times;(Parties&plus;Parades)</i>", img: function(n){ return 'store/redhat.svg'; }}, //P*F*(Parties + Parades)
    {cost:function(n) {},name:"Coronation", plural: "coronations", desc: "Make some random pony a princess so you have an excuse to party all night!", formula: "Generates one smile per pony, times your friendships, times your concerts, times your raves.<i>SPS = P&times;F&times;Concerts&times;Raves</i>", img: function(n){ return 'store/twilicorn_crown.svg'; }}, //P*F*Concerts*Raves
    {cost:function(n) {},name:"National Holiday", plural: "national holidays", desc: "Declare a national holiday so everypony in equestria can party with you instead of being productive!", formula: "Generates one smile per pony, times your friendships, times your parades, times your festivals, times your coronations.<i>SPS = P&times;F&times;Parades&times;Festivals&times;Coronations</i>", img: function(n){ return 'store/calendar.svg'; }}, //P*F*Parades*Festivals*Coronations
    {cost:function(n) {},name:"Elements Of Harmony", plural: "Elements of Harmony", desc: "Use a giant rainbow friendship beam to solve all your problems!", formula: "Generates one smile per pony, times the number of friendships you have, times an exponential function of the fourth root of your friendships times the number of buildings you have.<i>SPS = P&times;F&times;exp((F*B)<sup>&frac14</sup>)</i>", img: function(n){ return 'store/'+ElementList[n%ElementList.length]+'.svg'; }}, //P*F*exp((F*B)^1/4)
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
    ShowNotice("Game Reset", "Muffin prestige has been temporarily disabled, sorry!");
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
      news.push("Ponyville citizens diagnosed with chronic happiness! Doctors unsure if it's actually a problem or not!");
    } else if(Game.totalsmiles < 1000000000000000000) {
      news.push("Scientists split friendship and discover a runaway chain reaction! Nuclear friendship bomb proposed by military!");
    } else {
      news.push("New system of physics suggests all matter in universe composed of different kinds of smiles!");
    }

    // After 10000 smiles we start putting in most of the standard news messages into rotation.
    if(Game.totalsmiles > 10000) {
      news.push(
        'Twilight found shipping Rainbow Dash with everything in the universe! Riots erupt all across Equestria!',
        'Lyra and BonBon revealed as "just friends"! Ponies everywhere faint in shock! Octavia and Vinyl Scratch refuse to comment.',
        "Celestia's insatiable desire for cake causes caketastrophe in the Royal Kitchen! A memorial service for the lost chocolate chips to be held on Monday.",
        "Pink menace at Sugarcube corner goes batty, takes 15 muffins hostage!",
        "Citizens of Ponyville vote to create a public library instead of relying on a private collection organized by a crazed purple mare!",
        "Small colt finds lost Apple barn floating in space. Rainbow Dash claims she has no idea how it got up there.",
        "Rarity joins environmentalists, declares she will no longer go to the spa. Ponyville's spa immediately goes bankrupt.",
        "Following an incident involving mislabeled sodium and an exploding toilet, Celestia orders Sweetie Bot to register herself as a lethal weapon.",
        "Rainbow Dash reportedly investing in the Cloud. Pegasi everywhere confused by what this means.",
        "Princess Twilight discovers that ponies are actually tiny nuclear reactors! \"That explains why I never need to go to the bathroom,\" says Rainbow Dash.",
        "Pony pony Pony pony pony pony Pony pony!",
        "Princess Twilight Sparkle dating a peach! The peach has no comment on the matter.",
        'Doctor Whooves bumps into himself. Ponyville citizens worried that there will be "No more."',
        'Big Mac and Smarty Pants have deep philosophical conversations. When asked what he sounds like, Smarty Pants refused to comment.',
        'Apple Bloom found in shock on the edge of the Everfree Forest; says she visited a village of ponies with no Cutie Marks.',
        'Applejack finds golden apple. Looks away awkwardly and quickly changes the subject when asked how she found it.',
        'Pinkie Pie found running around Ponyville, proclaiming "Our lives aren\'t reality and that we\'re just a bunch of animated characters on a TV show meant for the entertainment of others!"'
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
          "Twilight Sparkle under house arrest for magical mammal manipulation, for trying to cross a mouse with a muffin.",
          "Pinkie Pie launches new re-branding of cupcakes as ‘dessert muffins’, meets with mixed results."
        );
      }
      if(Game.muffins > 100) {
        news.push('Derpy crashes into giant muffin. Irony is not amused.',
        "Discord caught eating 40 muffins in one sitting, that’s as many as four 10’s, and that’s terrible.",
          "Princess Celestia has eaten at least 37 muffins this year, when reached for comment, Princess Luna responded with ‘In a row?’.",
          "Princess Cadence Announces that all muffins produced in the Crystal Empire now come with ‘Free Shipping’.  Her Highness then winked suggestively.",
          "As muffin craze sweeps Equestria, Sapphire Shores to star in new musical, ‘My Little Muffin, Baked-goods are Magic’.",
          "Diamond Tiara insists that her father has a bigger muffin collection than you, no matter how improbable that sounds.",
          "New Poll from the Foal Free Press reveals that no food makes a young filly smile as much as a muffin.",
          'Sugarcube Corner hold muffin bake sale. Ponyville mourns the loss of many ponies during the ensuring muffin frenzy.',
          "Chrysalis returns! Says she's just buying muffins."
          );
      }
      if(Game.muffins > 200) {
        news.push('Send help. Trapped in Equestria, being forced to write silly news messages.'
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
  
  function PrettyNumStatic(x, fixed, display) {
    switch(display)
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
    if (t[0] > 100) return "Centuries"; // more than 100 years
    for (var i = 3; i <= 4; i++) if (t[i] < 10) t[i] = "0" + t[i];
    var output = (t[2]>0?(t[2] + ":"):"") + t[3] + ":" + t[4];
    if (t[1]) output = t[1] + " days and " + output;
    if (t[0]) output = t[0] + " years, " + output;
    return output;
  }
  function Pluralize2(n, s, s2, fixed, display) { return PrettyNumStatic(n, fixed, display) + ((n==1)?s:s2); }
  function Pluralize(n, s, fixed) { return Pluralize2(n, s, s + 's', fixed, Game.settings.numDisplay); }
  
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
    '1':{id:1, cost:600, name:"Booping Assistants", desc: "Booping gets +1 SPB for every pony you have.", fn:gen_upgradetype2(0, 1, 0), cond:defcond, flavor: 'Here Comes The Booping Squad.'},
    '2':{id:2, cost:7000, name:"Friendship is Booping", desc: "Booping gets +1 SPB for every friendship you have.", fn:gen_upgradetype2(1, 1, 0), cond:defcond },
    '3':{id:3, cost:80000, name:"Ticklish Cursors", desc: "Booping gets 1% of your SPS.", fn:gen_upgradetype2(0, 0, 0.01), cond:defcond},
    '4':{id:4, cost:900000, name:"Feathered Cursors", desc: "Booping gets an additional 2% of your SPS.", fn:gen_upgradetype2(0, 0, 0.02), cond:defcond},
    '5':{id:5, cost:10000000, name:"Advanced Tickle-fu", desc: "Booping gets an additional 3% of your SPS.", fn:gen_upgradetype2(0, 0, 0.03), cond:defcond},
    '6':{id:6, cost:110000000, name:"Happiness Injection", desc: "Booping gets an additional 4% of your SPS.", fn:gen_upgradetype2(0, 0, 0.04), cond:defcond},
    '7':{id:7, cost:700000, name:"Friendship Is Magic", desc: "Friendships generate +1 SPS for every other friendship.", fn:gen_upgradetype1(1, 1, 0), cond:defcond },
    '8':{id:8, cost:10000000, name:"Friendship Is Spellcraft", desc: "Friendships generate +10 SPS for every other friendship.", fn:gen_upgradetype1(1, 10, 0), cond:defcond },
    '9':{id:9, cost:500000000, name:"Friendship Is Sorcery", desc: "Friendships generate +100 SPS for every other friendship.", fn:gen_upgradetype1(1, 100, 0), cond:defcond },
    '10':{id:10, cost:10000000000, name:"Friendship Is Witchcraft", desc: "Friendships generate +1000 SPS for every other friendship.", fn:gen_upgradetype1(1, 1000, 0), cond:defcond },
    '11':{id:11, cost:300000000000, name:"Friendship Is Benefits", desc: "Friendships generate +10000 SPS for every other friendship.", fn:gen_upgradetype1(1, 10000, 0), cond:defcond },
    '12':{id:12, cost:3800000000000, name:"Friendship Is Rainbows", desc: "Friendships generate +100000 SPS for every other friendship.", fn:gen_upgradetype1(1, 100000, 0), cond:defcond },
    '13':{id:13, cost:7777777, name:"I just don't know what went wrong!", desc: "You gain +1% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.01), cond:defcond },
    '14':{id:14, cost:7777777777, name:"That one mailmare", desc: "You gain an additional +2% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.02), cond:defcond },
    '15':{id:15, cost:7777777777777, name:"Derpy Delivery Service", desc: "You gain an additional +3% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.03), cond:defcond },
    '16':{id:16, cost:7777777777777777, name:"Blueberry Muffins", desc: "You gain an additional +4% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.04), cond:defcond },
    '17':{id:17, cost:7777777777777777777, name:"Chocolate-chip Muffins", desc: "You gain an additional +5% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.05), cond:defcond },
    '18':{id:18, cost:7777777777777777777777, name:"Lemon Muffins", desc: "You gain an additional +6% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.06), cond:defcond },
    '19':{id:19, cost:7777777777777777777777777, name:"Poppy seed Muffins", desc: "You gain an additional +7% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.07), cond:defcond },
    '20':{id:20, cost:7777777777777777777777777777, name:"Muffin Bakeries", desc: "You gain an additional +8% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.08), cond:defcond },
    '21':{id:21, cost:7777777777777777777777777777777, name:"Designer Muffins", desc: "You gain an additional +9% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.09), cond:defcond },
    '22':{id:22, cost:7777777777777777777777777777777777, name:"Muffin Factories", desc: "You gain an additional +10% SPS for every muffin you have.", fn:gen_muffinupgrade(0, 0.1), cond:defcond },
    '23':{id:23, cost:320000, name:"Row Row Your Boat", desc: "Recitals generate +1 SPS for every other recital.", fn:gen_upgradetype1(2, 1, 0), cond:defcond },
    '24':{id:24, cost:9000000, name:"Fur Elise", desc: "Recitals generate +10 SPS for every other recital.", fn:gen_upgradetype1(2, 10, 0), cond:defcond },
    '25':{id:25, cost:350000000, name:"Moonlight Sonata", desc: "Recitals generate +100 SPS for every other recital.", fn:gen_upgradetype1(2, 100, 0), cond:defcond },
    '26':{id:26, cost:12000000000, name:"Tocatta In D Minor", desc: "Recitals generate +1000 SPS for every other recital.", fn:gen_upgradetype1(2, 1000, 0), cond:defcond },
    '27':{id:27, cost:200000000000, name:"Nocturne", desc: "Recitals generate +10000 SPS for every other recital.", fn:gen_upgradetype1(2, 10000, 0), cond:defcond },
    '28':{id:28, cost:660000, name:"Welcome Party", desc: "Parties generate +2 SPS for every other party.", fn:gen_upgradetype1(3, 2, 0), cond:defcond },
    '29':{id:29, cost:50000000, name:"Birthday Party", desc: "Parties generate +20 SPS for every other party.", fn:gen_upgradetype1(3, 20, 0), cond:defcond },
    '30':{id:30, cost:1000000000, name:"Cider Weekend", desc: "Parties generate +200 SPS for every other party.", fn:gen_upgradetype1(3, 200, 0), cond:defcond },
    '31':{id:31, cost:20000000000, name:"Wedding", desc: "Parties generate +2000 SPS for every other party.", fn:gen_upgradetype1(3, 2000, 0), cond:defcond },
    '32':{id:32, cost:320000000000, name:"Anniversary", desc: "Parties generate +20000 SPS for every other party.", fn:gen_upgradetype1(3, 20000, 0), cond:defcond },
    '33':{id:33, cost:900000, name:"Mayor Day", desc: "Parades generate +4 SPS for every other parade.", fn:gen_upgradetype1(4, 4, 0), cond:defcond },
    '34':{id:34, cost:100000000, name:"Celestia Day", desc: "Parades generate +40 SPS for every other parade.", fn:gen_upgradetype1(4, 40, 0), cond:defcond },
    '35':{id:35, cost:2000000000, name:"Parade Day", desc: "Parades generate +400 SPS for every other parade.", fn:gen_upgradetype1(4, 400, 0), cond:defcond },
    '36':{id:36, cost:40000000000, name:"Night Day ...?", desc: "Parades generate +4000 SPS for every other parade.", fn:gen_upgradetype1(4, 4000, 0), cond:defcond },
    '37':{id:37, cost:850000000000, name:"Day Day ???", desc: "Parades generate +40000 SPS for every other parade.", fn:gen_upgradetype1(4, 40000, 0), cond:defcond },
    '38':{id:38, cost:1000000, name:"Canon In D Major", desc: "Concerts generate +8 SPS for every other concert.", fn:gen_upgradetype1(5, 8, 0), cond:defcond, flavor: "It follows you everywhere. There is no escape." },
    '39':{id:39, cost:100000000, name:"Four Seasons", desc: "Concerts generate +80 SPS for every other concert.", fn:gen_upgradetype1(5, 80, 0), cond:defcond },
    '40':{id:40, cost:1750000000, name:"The Nutcracker", desc: "Concerts generate +800 SPS for every other concert.", fn:gen_upgradetype1(5, 800, 0), cond:defcond },
    '41':{id:41, cost:80000000000, name:"Beethooven's Ninth", desc: "Concerts generate +8000 SPS for every other concert.", fn:gen_upgradetype1(5, 8000, 0), cond:defcond },
    '42':{id:42, cost:1000000000000, name:"Requiem In D Minor", desc: "Concerts generate +80000 SPS for every other concert.", fn:gen_upgradetype1(5, 80000, 0), cond:defcond },
    '43':{id:43, cost:1500000000, name:"Festive Festivities", desc: "Festivals generate twice as many smiles.", fn:gen_upgradetype1(6, 0, 1.0), cond:defcond },
    '44':{id:44, cost:15000000000, name:"Flower Festival", desc: "Festivals smile generation doubled, again.", fn:gen_upgradetype1(6, 0, 1.0), cond:defcond },
    //'45':{id:45, cost:150000000000, name:"Upgrade 6", desc: "Festivals smile generation doubled, again.", fn:gen_upgradetype1(6, 0, 1.0), cond:defcond },
    //'46':{id:46, cost:1500000000000, name:"Upgrade 6", desc: "Festivals smile generation doubled, again.", fn:gen_upgradetype1(6, 0, 1.0), cond:defcond },
    //'47':{id:47, cost:15000000000000, name:"Upgrade 6", desc: "Festivals smile generation doubled, again.", fn:gen_upgradetype1(6, 0, 1.0), cond:defcond },
    '48':{id:48, cost:8000000, name:"DJ Pon-3", desc: "Raves generate +32 SPS for every other rave.", fn:gen_upgradetype1(7, 32, 0), cond:defcond },
    '49':{id:49, cost:800000000, name:"Glaze", desc: "Raves generate +320 SPS for every other rave.", fn:gen_upgradetype1(7, 320, 0), cond:defcond },
    '50':{id:50, cost:11000000000, name:"Glowsticks", desc: "Raves generate +3200 SPS for every other rave.", fn:gen_upgradetype1(7, 3200, 0), cond:defcond },
    '51':{id:51, cost:160000000000, name:"Extra Glowsticks", desc: "Raves generate +32000 SPS for every other rave.", fn:gen_upgradetype1(7, 32000, 0), cond:defcond },
    '52':{id:52, cost:2300000000000, name:"Subwoofers", desc: "Raves generate +320000 SPS for every other rave.", fn:gen_upgradetype1(7, 320000, 0), cond:defcond },
    '53':{id:53, cost:16000000, name:"Two-bit Dress", desc: "Grand Galloping Galas generate +64 SPS for every other Grand Galloping Gala.", fn:gen_upgradetype1(8, 64, 0), cond:defcond },
    '54':{id:54, cost:400000000, name:"Formal Attire", desc: "Grand Galloping Galas generate +640 SPS for every other Grand Galloping Gala.", fn:gen_upgradetype1(8, 640, 0), cond:defcond },
    '55':{id:55, cost:6000000000, name:"Tailored Suit", desc: "Grand Galloping Galas generate +6400 SPS for every other Grand Galloping Gala.", fn:gen_upgradetype1(8, 6400, 0), cond:defcond },
    '56':{id:56, cost:120000000000, name:"Rarity's Finest", desc: "Grand Galloping Galas generate +64000 SPS for every other Grand Galloping Gala.", fn:gen_upgradetype1(8, 64000, 0), cond:defcond },
    '57':{id:57, cost:3000000000000, name:"Hats", desc: "Grand Galloping Galas generate +640000 SPS for every other Grand Galloping Gala.", fn:gen_upgradetype1(8, 640000, 0), cond:defcond },
    '58':{id:58, cost:32000000, name:"Princess Twilight", desc: "Coronations generate +128 SPS for every other Coronation.", fn:gen_upgradetype1(9, 128, 0), cond:defcond },
    '59':{id:59, cost:1500000000, name:"Princess Cadance", desc: "Coronations generate +1280 SPS for every other Coronation.", fn:gen_upgradetype1(9, 1280, 0), cond:defcond },
    '60':{id:60, cost:22000000000, name:"Princess Derpy", desc: "Coronations generate +12800 SPS for every other Coronation.", fn:gen_upgradetype1(9, 12800, 0), cond:defcond },
    '61':{id:61, cost:340000000000, name:"Princess Big Mac", desc: "Coronations generate +128000 SPS for every other Coronation.", fn:gen_upgradetype1(9, 128000, 0), cond:defcond },
    '62':{id:62, cost:8000000000000, name:"Fausticorn", desc: "Coronations generate +1280000 SPS for every other Coronation.", fn:gen_upgradetype1(9, 1280000, 0), cond:defcond },
    '63':{id:63, cost:64000000, name:"Three Day Weekend", desc: "National holidays generate +256 SPS for every other national holiday.", fn:gen_upgradetype1(10, 256, 0), cond:defcond },
    '64':{id:64, cost:1500000000, name:"Extra Day Off", desc: "National holidays generate +2560 SPS for every other national holiday.", fn:gen_upgradetype1(10, 2560, 0), cond:defcond },
    '65':{id:65, cost:22000000000, name:"Four Day Weekend", desc: "National holidays generate +25600 SPS for every other national holiday.", fn:gen_upgradetype1(10, 25600, 0), cond:defcond },
    '66':{id:66, cost:300000000000, name:"Bonus Vacation Time", desc: "National holidays generate +256000 SPS for every other national holiday.", fn:gen_upgradetype1(10, 256000, 0), cond:defcond },
    '67':{id:67, cost:900000000000, name:"Week-long Sabbatical", desc: "National holidays generate +2560000 SPS for every other national holiday.", fn:gen_upgradetype1(10, 2560000, 0), cond:defcond },
    '68':{id:68, cost:100000, name:"Plain Bagels", desc: "+1% smiles per second", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '69':{id:69, cost:1000000, name:"Poppyseed Bagels", desc: "+1% smiles per second", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '70':{id:70, cost:10000000, name:"Blueberry Bagels", desc: "+1% smiles per second", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '71':{id:71, cost:100000000, name:"Onion Bagels", desc: "+1% smiles per second", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '72':{id:72, cost:1000000000, name:"Cinnamon Raisin Bagels", desc: "+1% smiles per second", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '73':{id:73, cost:10000000000, name:"French Toast Bagels", desc: "+1% smiles per second", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '74':{id:74, cost:100000000000, name:"Banana Bread Bagels", desc: "+1% smiles per second", fn:gen_upgradetype3(0, 0.01), cond:defcond },
    '75':{id:75, cost:1000000000000, name:"Cheese Pastry", desc: "+5% smiles per second", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '76':{id:76, cost:1500000000000, name:"Chocolate Pastry", desc: "+5% smiles per second", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '77':{id:77, cost:2000000000000, name:"Cherry Pastry", desc: "+5% smiles per second", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '78':{id:78, cost:2500000000000, name:"Strawberry Pastry", desc: "+5% smiles per second", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '79':{id:79, cost:3000000000000, name:"Blueberry Pastry", desc: "+5% smiles per second", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '80':{id:80, cost:3500000000000, name:"Raspberry Pastry", desc: "+5% smiles per second", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '81':{id:81, cost:4000000000000, name:"Blackberry Pastry", desc: "+5% smiles per second", fn:gen_upgradetype3(0, 0.05), cond:defcond },
    '82':{id:82, cost:100000000000, name:"Friendship Is Friendly", desc: "Friendships gain +1% SPS.", fn:gen_upgradetype1(1, 0, 0.01), cond:defcond },
    '83':{id:83, cost:30000000000, name:"Friendship Is Recitals", desc: "Recitals gain +1% SPS.", fn:gen_upgradetype1(2, 0, 0.01), cond:defcond },
    '84':{id:84, cost:100000000000, name:"Friendship Is Parties", desc: "Parties gain +1% SPS.", fn:gen_upgradetype1(3, 0, 0.01), cond:defcond },
    '85':{id:85, cost:200000000000, name:"Friendship Is Parades", desc: "Parades gain +1% SPS.", fn:gen_upgradetype1(4, 0, 0.01), cond:defcond },
    '86':{id:86, cost:500000000000, name:"Friendship Is Concerts", desc: "Concerts gain +1% SPS.", fn:gen_upgradetype1(5, 0, 0.01), cond:defcond },
    '87':{id:87, cost:1000000000000, name:"Friendship Is Festivals", desc: "Festivals gain +1% SPS.", fn:gen_upgradetype1(6, 0, 0.01), cond:defcond },
    '88':{id:88, cost:2000000000000, name:"Friendship Is Raves", desc: "Raves gain +1% SPS.", fn:gen_upgradetype1(7, 0, 0.01), cond:defcond },
    '89':{id:89, cost:10000000000000000, name:"Mirror Pool", desc: "Everything gets +0.01% SPS for everything else.", fn:gen_finalupgrade(0.0001), cond:defcond },
    '90':{id:90, cost:40000000000000000, name:"Mirror Mirror Pool", desc: "Everything gets +0.02% SPS for everything else.", fn:gen_finalupgrade(0.0002), cond:genprecond(89) },
    '91':{id:91, cost:800000000000000000, name:"Super Mirror Pool", desc: "Everything gets +0.04% SPS for everything else.", fn:gen_finalupgrade(0.0004), cond:genprecond(90) },
    '92':{id:92, cost:1600000000000000000, name:"Duper Mirror Pool", desc: "Everything gets +0.07% SPS for everything else.", fn:gen_finalupgrade(0.0007), cond:genprecond(91) },
    '93':{id:93, cost:3200000000000000000, name:"Hyper Mirror Pool", desc: "Everything gets +0.1% SPS for everything else.", fn:gen_finalupgrade(0.001), cond:genprecond(92) },
    '94':{id:94, cost:9000000000000000000, name:"Ascended Mirror Pool", desc: "Everything gets +0.2% SPS for everything else.", fn:gen_finalupgrade(0.002), cond:genprecond(93) },
    '95':{id:95, cost:50000000000000000000, name:"Mega Mirror Pool", desc: "Everything gets +0.4% SPS for everything else.", fn:gen_finalupgrade(0.004), cond:genprecond(94) },
    '96':{id:96, cost:250000000000000000000, name:"Giga Mirror Pool", desc: "Everything gets +0.7% SPS for everything else.", fn:gen_finalupgrade(0.007), cond:genprecond(95) },
    '97':{id:97, cost:1000000000000000000000, name:"Ultra Mirror Pool", desc: "Everything gets +1% SPS for everything else.", fn:gen_finalupgrade(0.01), cond:genprecond(96) },
    '98':{id:98, cost:4000000000000000000000, name:"Master Mirror Pool", desc: "Everything gets +2% SPS for everything else.", fn:gen_finalupgrade(0.02), cond:genprecond(97) },
    '99':{id:99, cost:12000000000000000000000, name:"Ultimate Mirror Pool", desc: "Everything gets +4% SPS for everything else.", fn:gen_finalupgrade(0.04), cond:genprecond(98) },
    '100':{id:100, cost:24000000000000000000000, name:"Über Mirror Pool", desc: "Everything gets +7% SPS for everything else.", fn:gen_finalupgrade(0.07), cond:genprecond(99) },
    '101':{id:101, cost:50000000000000000000000, name:"Omni Mirror Pool", desc: "Everything gets +10% SPS for everything else.", fn:gen_finalupgrade(0.1), cond:genprecond(100) },
    '102':{id:102, cost:100000000000000000000000, name:"Supreme Mirror Pool", desc: "Everything gets +20% SPS for everything else.", fn:gen_finalupgrade(0.2), cond:genprecond(101) },
    '103':{id:103, cost:200000000000000000000000, name:"Neo Mirror Pool", desc: "Everything gets +30% SPS for everything else.", fn:gen_finalupgrade(0.3), cond:genprecond(102) },
    '104':{id:104, cost:500000000000000000000000, name:"Epic Mirror Pool", desc: "Everything gets +40% SPS for everything else.", fn:gen_finalupgrade(0.4), cond:genprecond(103) },
    '105':{id:105, cost:1000000000000000000000000, name:"Global Mirror Pool", desc: "Everything gets +50% SPS for everything else.", fn:gen_finalupgrade(0.5), cond:genprecond(104) },
    '106':{id:106, cost:2000000000000000000000000, name:"Solar Mirror Pool", desc: "Everything gets +60% SPS for everything else.", fn:gen_finalupgrade(0.6), cond:genprecond(105) },
    '107':{id:107, cost:4000000000000000000000000, name:"Galactic Mirror Pool", desc: "Everything gets +70% SPS for everything else.", fn:gen_finalupgrade(0.7), cond:genprecond(106) },
    '108':{id:108, cost:8000000000000000000000000, name:"Universal Mirror Pool", desc: "Everything gets +80% SPS for everything else.", fn:gen_finalupgrade(0.8), cond:genprecond(107) },
    '109':{id:109, cost:15000000000000000000000000, name:"Cosmic Mirror Pool", desc: "Everything gets +90% SPS for everything else.", fn:gen_finalupgrade(0.9), cond:genprecond(108) },
    '110':{id:110, cost:30000000000000000000000000, name:"Immortal Mirror Pool", desc: "Everything gets +100% SPS for everything else.", fn:gen_finalupgrade(1), cond:genprecond(109) },
    '111':{id:111, cost:1000000000000000000000000000, name:"Forever Mirror Pool", desc: "Everything gets +1000% SPS for everything else.", fn:gen_finalupgrade(10), cond:genprecond(110) },
    '112':{id:112, cost:100000000000000000000000000000, name:"Eternal Mirror Pool", desc: "Everything gets +10000% SPS for everything else.", fn:gen_finalupgrade(100), cond:genprecond(111) },
    '113':{id:113, cost:100000000000000000000000000000000, name:"Final Mirror Pool", desc: "Everything gets +100000% SPS for everything else.", fn:gen_finalupgrade(1000), cond:genprecond(112) },
  };

  var curUpgradeList = [];

  //
  // -------------------------------- Achievement Generation --------------------------------
  //
  var achievementList = {
    '1': { name:"Participation Award", desc: "You moved the mouse!", muffins:0},
    '2': { name:"Hi there!", desc: "Boop a pony <b>once</b>.", muffins:0, cond:function(){ return Game.clicks > 0; } },
    '200': { name:"Cautious", desc: "Manually save the game.", muffins:1},
    '201': { name:"Paranoid", desc: "Export a save.", muffins:1},
    '202': { name:"Time Machine", desc: "Import a save.", muffins:1},
    '203': { name:"Narcissism!", desc: "Click the image of Cloud Hop on the credits page.", muffins:1},
    '204': { name:"Music Makes Everything Better", desc: "Listen to the smile song.", muffins:1},
    '205': { name:"You Monster", desc: "Sell a friendship.", muffins:1},
    '206': { name:"No Booping Allowed", desc: "Get <b>"+PrettyNumStatic(1000000000000, false, 0)+"</b> smiles with only 35 pony boops.", muffins:1, cond:function() { return Game.clicks <= 35 && Game.totalsmiles >= 1000000000000; } },
    '207': { name:"Wheel of Friendship", desc: "Spin the ponies.", muffins:1, cond:function() { return Math.abs(vangle)>0.05; } },
    //'208': { name:"Centrifuge of Friendship", desc: "Spin the ponies <b>really fast</b>.", muffins:2, cond:function() { return Math.abs(vangle)>3; } },
    '209': { name:"Obliviate", desc: "Reset the game <b>once</b>.", muffins:1, cond:function() { return Game.resets>0; } },
    '210': { name:"Zeeky Boogy Doog", desc: "Reset the game <b>10 times</b>.", muffins:2, cond:function() { return Game.resets>=10; } },
    '211': { name:"September", desc: "Reset the game <b>20 times</b>.", muffins:3, cond:function() { return Game.resets>=20; } },
    '212': { name:"Zero", desc: "Reset the game with <b>"+PrettyNumStatic(1000000000, false, 0)+" smiles</b>.", muffins:1 },
    '213': { name:"Nada", desc: "Reset the game with <b>"+PrettyNumStatic(1000000000000, false, 0)+" smiles</b>.", muffins:2 },
    '214': { name:"Zilch", desc: "Reset the game with <b>"+PrettyNumStatic(1000000000000000, false, 0)+" smiles</b>.", muffins:3 },
    '215': { name:"Nil", desc: "Reset the game with <b>"+PrettyNumStatic(1000000000000000000, false, 0)+" smiles</b>.", muffins:4 },
    '216': { name:"Null", desc: "Reset the game with <b>"+PrettyNumStatic(1000000000000000000000, false, 0)+" smiles</b>.", muffins:5 },
    '217': { name:"Nothing", desc: "Reset the game with <b>"+PrettyNumStatic(1000000000000000000000000, false, 0)+" smiles</b>.", muffins:6 },
    '218': { name:"Oblivion", desc: "Reset the game with <b>"+PrettyNumStatic(1000000000000000000000000000, false, 0)+" smiles</b>.", muffins:7 },
    '219': { name:"Nevermore", desc: "Reset the game with <b>"+PrettyNumStatic(1000000000000000000000000000000, false, 0)+" smiles</b>.", muffins:8 },
    
    //'229': { name:"Prepare For The End", desc: "Find the secret song reference.", muffins:1 },
    '230': { name:"What Have You Done", desc: "Buy the mirror pool.", muffins:5, cond:function() { return (Game.upgradeHash['89'] !== undefined); } },
    '231': { name:"Too Many Pinkie Pies", desc: "Pop <b>10 pinkie clones</b>.", muffins:1, cond:function() { return Game.clonespopped>=10; } },
    '232': { name:"Look, a Birdie!", desc: "Pop <b>100 pinkie clones</b>", muffins:2, cond:function() { return Game.clonespopped>=100; } },
    '233': { name:"Reviewing Is Magic 5", desc: "Pop <b>400 pinkie clones</b>.", muffins:3, cond:function() { return Game.clonespopped>=400; } },
    '234': { name:"Fixer Upper", desc: "Buy all the upgrades.", muffins:1, cond:function() { return Game.upgrades.length==Object.keys(upgradeList).length; }},
    
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
    ["That tickles!", "Tickle War", "Tickle War II: The Retickling", "This Can't Be Healthy", "Carpal Tunnel Syndrome", "Wrist In Pieces", "It's Over Nine Thousand!"],
    [10,100,500,1000,2500,5000,9001],
    function(n) { return "Boop a pony <b>"+PrettyNumStatic(n, false, 0)+"</b> times."; },
    function(n) { return function() { return Game.clicks >= n; }; });
  achievements_clicks.push(2);

  var achievements_smiles = genAchievements(
    ["Joy", "Glee", "Bliss", "Nirvana", "Ecstasy", "Pursuit of Happyness", "You Can Stop Now", "This Is Ridiculous", "Go Read A Book", "How?!"],
    [100,10000,1000000,100000000,10000000000,1000000000000,100000000000000,10000000000000000,1000000000000000000,100000000000000000000],
    function(n) { return "Get <b>"+PrettyNumStatic(n, false, 0)+"</b> smiles."; },
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
    function(n) { return "Buy <b>"+Pluralize2(n, "</b> " + Store[item].name.toLowerCase(), "</b> " + Store[item].plural.toLowerCase(), false, 0) + "."; },
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
    function(n) { return "Buy <b>"+Pluralize2(n, "</b> " + Store[11].name.toLowerCase(), "</b> " + Store[11].plural.toLowerCase(), false, 0) + "."; },
    genShopCond(11)));
  
  achievements_shop = achievements_shop.concat(genAchievements(
    ["Best Buds", "Camaraderie Crusaders", "Inner Circle", "Friend-Of-The-Month Club", "No Pony Left Behind", "Reference Chart Not Optional"],
    [2,3,6,12,18,24],
    function(n) { return 'Have at least <b>'+n+' ponies</b> and a completed friendship graph.'; },
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
        'Too expensive!':
          (NeedsMorePonies()?
          'Not enough ponies!':
          'Too expensive!')
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
    CheckApocalypse();
  }
  var MAX_PINKIES = 50;
  
  function CheckApocalypse() {
    if(Game.upgradeHash['89'] !== undefined && apocalypseTime == -1) {
      apocalypseTime = new Date().getTime();
      $('#apocalypse')[0].style.opacity = 1;
      $('#mandatory-fun')[0].href = 'https://www.youtube.com/watch?v=19G0I7xHQBM';
      $('#mandatory-fun').html('The end is nigh.');
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
    $('#mandatory-fun').html('The smile song is mandatory while playing this.');
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
    Game.clonespopped += 1;
    CheckAchievements(['231','232','233']);
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
            ?'<strong>'+dynFontSize(achievementList[prop].name)+'</strong><i>[achievement]</i><hr><p>'+achievementList[prop].desc+'</p>'
            :'<strong>'+dynFontSize(upgradeList[prop].name)+'</strong><i>[upgrade]</i><hr><p>'+upgradeList[prop].desc+'</p>'
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
        $SPS.html("+" + ((nsps<=999)?nsps.toFixed(1):PrettyNum(nsps)) + ' per second <span style="color:#900">(-'+(wither*100).toFixed(1)+'% lost)</span>').show();
      } else {
        $SPS.html("+" + ((Game.SPS<=999)?Game.SPS.toFixed(1):PrettyNum(Game.SPS)) + " per second").show();
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
    return (time <= 0)?'<b>now</b>':('in <b>' + PrintTime(time)+'</b>');
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
  
      if(xcount > 0) $title.append('<div>['+PrettyNum(xcount)+' owned]</div>');
      $overlay.empty().append($title, '<hr><p>'+x.desc+'</p>');//<ul>
      var $ul = $(document.createElement('ul'));
  
      if(x.formula) $ul.append('<li class="formula">'+x.formula+'</li>');
      if(x.SPS_cache > 0 || item==1) $ul.append('<li>Each '+x.name.toLowerCase()+' generates <b>'+Pluralize(x.SPS_cache, ' smile')+'</b> per second</li>');
      if(xcount > 0 && x.SPS_cache > 0) $ul.append('<li><b>'+PrettyNum(xcount)+'</b> '+x.plural.toLowerCase()+' generating <b>'+Pluralize(xcount*x.SPS_cache, ' smile')+'</b> per second</li>');
      var lowerbound = Game.SPS/140737488355328; // this is Game.SPS / 2^47, which gives us about 5 bits of meaningful precision before the double falls apart.
      for(var i = 0; i < Store.length; ++i) { updateoverlay_nstore[i] = 0+Game.store[i]; } //ensure javascript isn't passing references around for some insane reason

      updateoverlay_nstore[item]+=1;
      var nSPS = CalcSPS(updateoverlay_nstore, Game.upgrades, false),
          sps_increase = nSPS - Game.SPS,
          payPerSmile = xcost/(nSPS - Game.SPS),
          increaseText = sps_increase > 0 ? 'will increase your SPS by <b>'+(sps_increase > lowerbound ? PrettyNum(sps_increase) : 'almost nothing')+'</b>' : "<b>won't</b> increase your SPS",
          payPerSmileText = isFinite(payPerSmile) ? '<i>You pay <b>'+(sps_increase > lowerbound ? Pluralize(payPerSmile, ' smile') : 'way too many smiles') + '</b> per +1 SPS</i>' : '';
  
      $ul.append('<li>Buying one '+x.name.toLowerCase()+' '+increaseText+payPerSmileText+'</li>');
      if(xcost>Game.smiles && Game.SPS > 0) $ul.append('<li>This can be purchased <span id="overlaytime" data-item="'+item+'">' + CalcTimeItem(item) + '</span></li>');
      
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
  $upgrades_total.html((Object.keys(upgradeList).length).toFixed(0));
  
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
  $('#resetbtn').on('click',function(){
    if(window.confirm("This will delete all your smiles, buildings, and upgrades, but you'll keep you're achievements, muffins, and any cupcakes you earned from previous resets. Are you sure you want to do this?")) { 
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
