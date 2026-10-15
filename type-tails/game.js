'use strict';
(() => {
  const $ = id => document.getElementById(id);
  // Randomized QWERTY practice: introduce reaches gradually, then build useful patterns.
  // Each round samples 20 different words from its difficulty's combined focus groups.
  const PRACTICE_LETTERS = ['asdfghjkl','erui','top','qwy','cvbnm','zx','',''];
  const LEVELS = [
    { name: 'Beginner', icon: '🌱', unlockWpm: 0, seconds: 14, base: 40,
      description: 'Home-row foundations. Rest on F and J.', keys: 'A S D F G H J K L',
      lessons: [
        { name: 'Home-row foundations', words: 'a as all ash add adds ad ads ask asks dad dads fad fads sad lad lads lass lasses fall falls half hall halls has had dash dashes flash flashes lash lashes' },
        { name: 'Home-row letter patterns', words: 'gas gag gags sag sags glad flag flags flask flasks gala galas salad salads glass glasses gash gashes hash hashes slash slashes shall sash sashes gall galls alas aha sass' }
      ] },
    { name: 'Explorer', icon: '🧭', unlockWpm: 12, seconds: 13, base: 50,
      description: 'Reach up to E, R, U, and I, then return home.', keys: '+ E R U I',
      lessons: [
        { name: 'First upper-row reaches', words: 'aid aids air airs ear ears are era eras sir sirs ride rides side sides slide slides hide hides idea ideas aide aides fire fires file files life like likes sail sails sale sales seal seals dear dears read reads reader readers lead leads leader leaders red reed reeds freed free fees fee feel feels fear fears fair fairs' },
        { name: 'Home-to-upper-row rhythm', words: 'die dies lied lie lies lid lids led rag rags far jar jars jade jades jail jails rail rails rare rarer rule rules rise rises real hear hears here herd herds heir heirs hire hires hired hill hills fill fills filled skill skills skilled full fuller fulfill fulfilled share shares shared sheer shade shades shake shakes safe safer safeguard' }
      ] },
    { name: 'Adventurer', icon: '🍃', unlockWpm: 18, seconds: 12, base: 60,
      description: 'Add T, O, and P with familiar short words.', keys: '+ T O P',
      lessons: [
        { name: 'Index and right-hand reaches', words: 'it to at top tap tip pet pot put pair pear rope road read tale tile tire tide title trail out our up or oil oils old older sore rose lose loss door doors floor floors poor pool pools proof roof roofs foot feet tooth teeth letter letters little litter pilot pilots hotel hotels' },
        { name: 'Smooth upper-row transitions', words: 'tea eat ate hat hot hit hop hope pile pale pole part sort shop drop trip tree root stood street later latter late latest plate plates paper papers order orders other others their there these those this that three third thirst straight please pleased repeat repeats report reports reporter reporters prepare prepared repair repaired proper spare spares sport sports spider spiders stripe stripes' }
      ] },
    { name: 'Wordsmith', icon: '✍️', unlockWpm: 22, seconds: 12, base: 65,
      description: 'Finish the upper row with Q, W, and Y.', keys: '+ Q W Y',
      lessons: [
        { name: 'Upper-row confidence', words: 'we why way say day dry shy fly try toy row owl low law lay play stay away your quiet you yes yet too two few wet week weeks weed weeds wood woods wool world worlds would wild wider wide yellow yell yells yelled wish wishes whole while white wheat who whose where whether weather water waters wayward weekday weekdays' },
        { name: 'Both hands working together', words: 'was saw wear year yard word work wish with worry easy early sweet towel yellow follow flower square quality queue quieter quietly quite quit quits quill quills quilt quilts query queries weary weekly worried yesterday ready really royal royalty loyalty tidy title style stylus story stories steady quest quests request requests require requires required equal equals equally equality sweater sweaters sweeter sweetly whisper whispers whispered' }
      ] },
    { name: 'Trailblazer', icon: '🔥', unlockWpm: 26, seconds: 11, base: 75,
      description: 'Reach down to C, V, B, N, and M.', keys: '+ C V B N M',
      lessons: [
        { name: 'First lower-row reaches', words: 'can man van cab cap map mat nap net men new now cow come move name main home book calm cat cats dog dogs cows bird birds bunny rabbit mouse mice horse sheep pig pigs goat goats bear bears lion lions tiger frog frogs duck ducks chick chicken homes room rooms names family friend friends number numbers learn learning' },
        { name: 'Lower-row word families', words: 'bed bad bag big bun bus bat bit bind mind mine nice mice milk meal make bake back brick bloom hand hands finger fingers thumb thumbs button buttons carpet curtain curtains cabin bench branch chair couch blanket garden green grass seed seeds plant plants blooms beach ocean sand moon morning night sun sunny rain rainy cloud cloudy music melody coffee cocoa cookie cookies honey bread butter candle' }
      ] },
    { name: 'Expert', icon: '💎', unlockWpm: 30, seconds: 11, base: 85,
      description: 'Complete the letter keys with Z and X.', keys: '+ Z X',
      lessons: [
        { name: 'Z and X without the rush', words: 'zip zips zipped zipping zap zaps zig zag zero zeros zone zones zoom zooms zoo zoos zest zesty size sized sizes prize prizes fizz fizzy buzz buzzy buzzing jazz jazzy box boxes fox foxes wax waxy mix mixes mixed mixing six sixty fix fixes fixed fixing next exit exits extra extras text texts taxi taxis' },
        { name: 'All three rows in motion', words: 'axe axed axle axis oxygen foxglove index pixel pixels pizza dozen hazel zebra blazer bronze breeze frozen freeze freezing freezer example examples examine examined exercise exercises explain explained expert experts explore explored relax relaxed remix amazing maximum minimum complex complexity puzzle puzzles puzzled zipper zippers zigzag zigzags cozy fuzzy dizzy lazy crazy amaze' }
      ] },
    { name: 'Master', icon: '👑', unlockWpm: 35, seconds: 10, base: 95,
      description: 'Build muscle memory for TH, SH, CH, and ST.', keys: 'TH · SH · CH · ST',
      lessons: [
        { name: 'Common TH and SH patterns', words: 'thin then than them they their there these those thing things think thinks thinking thank thanks thankful three third thirty threw throw thrown throws through thought thoughts thick thickness thaw thawed thumb thumbs thunder theme themes thermal thread threads thrill thrills thrive she ship ships shipping shop shops shopping shell shells shelf shelves shine shines shining share shares shared sharing shape shapes short shorts shorter shoot shoots should shower showers shadow shadows shelter shelters shout shouts shouted sharp sharper sheep sheet sheets shoe shoes shake shakes shook shore shrink shrunk' },
        { name: 'Common CH and ST patterns', words: 'chat chats chatting chin chip chips chop chops chair chairs chain chains check checks checked checking chest child children choose chosen choice choices chase chased change changes changed cheese cherry cheer cheers chilly chicken chocolate stop stops stopped step steps stepping star stars stand stands standing start starts started stone stones still stitch stitches story stories store stores street streets string strings strong stronger strength stretch stretched straight stripe stripes steady study studies student students' }
      ] },
    { name: 'Legend', icon: '🌟', unlockWpm: 40, seconds: 10, base: 100,
      description: 'Find a steady flow with everyday word families.', keys: 'ER · ING · ED · FUL',
      lessons: [
        { name: 'Everyday words and endings', words: 'play player players playing played help helper helpers helping helped work worker workers working worked read reader readers reading write writer writers writing wrote type typed types typing learn learner learners learning learned paint painter painters painting painted walk walker walkers walking walked talk talking talked cook cooking cooked bake baker bakers baking baked' },
        { name: 'A confident, comfortable flow', words: 'care careful carefully caring cared hope hopeful hopefully hoping hoped use useful usefully using used move moves moving moved music musical practice practiced practicing progress together confidence comfort comfortable kindness happy happily happiness ready really nearly slowly quickly softly gently loudly quietly brightly safely wonder wonderful joy joyful joyfully beauty beautiful beautifully color colorful helpful playful peaceful thankful friendly friendship' }
      ] }
  ].map((level, index) => {
    const lessons = level.lessons.map(lesson => ({ ...lesson, words: [...new Set(lesson.words.split(' '))] }));
    const allowed = new Set(PRACTICE_LETTERS.slice(0,index + 1).join(''));
    // Combine both focus groups, deduplicate, and keep every word within learned keys.
    const wordPool = [...new Set(lessons.flatMap(lesson => lesson.words))].filter(word => [...word].every(letter => allowed.has(letter)));
    return { ...level, lessons, wordPool };
  });

  const ITEMS = [
    { id: 'bow', name: 'Sunday bow', desc: 'A fancy little neck hug.', price: 300, category: 'pet', art: '🎀' },
    { id: 'glasses', name: 'Cool cat shades', desc: 'For extremely important cat business.', price: 600, category: 'pet', art: '🕶️' },
    { id: 'party', name: 'Party hat', desc: 'Every little win is a party.', price: 500, category: 'pet', art: '🎉' },
    { id: 'medal', name: 'Royal medallion', desc: 'A golden star for a very special cat.', price: 1800, category: 'pet', art: '🥇' },
    { id: 'cape', name: 'Starry cape', desc: 'A little hero with a lot of sparkle.', price: 1200, category: 'pet', art: '🦸' },
    { id: 'socks', name: 'Cozy socks', desc: 'Stripy little socks for both paws.', price: 900, category: 'pet', art: '🧦' },
    { id: 'plant', name: 'Leafy friend', desc: 'A little green goes a long way.', price: 400, category: 'room', art: '🪴' },
    { id: 'art', name: 'Mountain print', desc: 'A tiny view of a bigger world.', price: 650, category: 'room', art: '🖼️' },
    { id: 'lamp', name: 'Golden glow lamp', desc: 'Warm light for cozy evenings.', price: 800, category: 'room', art: '💡' },
    { id: 'bunting', name: 'Happy bunting', desc: 'Good vibes, on a string.', price: 900, category: 'room', art: '🚩' },
    { id: 'ball', name: 'Minty yarn ball', desc: 'A very tempting tangle.', price: 350, category: 'room', art: '🧶' },
    { id: 'stars', name: 'Wall sparkles', desc: 'Three golden twinkles beside the floor lamp.', price: 1600, category: 'room', art: '✨' },
    { id: 'rug-rose', name: 'Rose-colored rug', desc: 'A rosy weave with cream diamonds.', price: 1100, category: 'room', art: '🌸' },
    { id: 'rug-mint', name: 'Meadow mat', desc: 'A leafy side mat beside the little table.', price: 1100, category: 'room', art: '🍀' },
    { id: 'curtains', name: 'Sunset curtains', desc: 'Warm rose drapes with golden ties.', price: 1500, category: 'room', art: '🪟' },
    { id: 'cloud-mobile', name: 'Cloud mobile', desc: 'Little daydreams above the bookshelf.', price: 1500, category: 'room', art: '☁️' }
  ];
  const HATS = {
    party: '<path d="M-29 -51L0 -111L29 -51Z" fill="#e4b775"/><path d="M-20 -69L19 -72M-9 -91L9 -91" stroke="#c78778" stroke-width="9"/><circle cy="-114" r="8" fill="#d8937a"/><ellipse cy="-51" rx="34" ry="7" fill="#edc791"/>',
  };
  const RUG_STYLES = {
    default: { fill: '#c7b59c', border: '#eee1ca', inner: '#eee1ca' },
    'rug-rose': { fill: '#ca8095', border: '#874858', inner: '#ffe7d9' },
    'rug-mint': { fill: '#75a989', border: '#3b7057', inner: '#ecedbd' }
  };
  const LEGACY_ITEM_IDS = { crown: 'medal', wizard: 'cape', beret: 'socks', 'wall-peach': 'curtains', 'wall-blue': 'cloud-mobile' };
  const LEGACY_EXCLUSIVE_ITEMS = new Set(['party','crown','wizard','beret','rug-rose','rug-mint','wall-peach','wall-blue']);
  const normalizeItemId = id => LEGACY_ITEM_IDS[id] || id;
  // Shared face/accessory coordinates keep every outfit compatible with every animal.
  const PETS = [
    { id: 'cat', name: 'Pip', species: 'Cat', colors: ['#d8915d','#dfa06c','#f1c994','#df9f6c','#cd8754','#edb59a'], whiskers: true,
      ears: '<path d="M-45 -14L-44 -67L-16 -47Q0 -54 17 -46L47 -65L46 -13Z" fill="var(--fur)"/><path d="M-38 -48L-37 -29L-23 -39ZM37 -48L25 -39L38 -29Z" fill="#e9b3a0"/>',
      markings: '<path d="M-13 -54L-9 -39M0 -57V-41M13 -54L9 -39" stroke="#b7784b" stroke-width="5" stroke-linecap="round"/>',
      tail: '<path d="M43 49Q96 58 92 19Q88 -2 75 11" fill="none" stroke="#c37d4e" stroke-width="19" stroke-linecap="round"/>' },
    { id: 'dog', name: 'Biscuit', species: 'Dog', colors: ['#c49b72','#dfbd91','#f5dfb8','#c49b72','#ae805c','#e7b3a0'], whiskers: false,
      ears: '<path d="M-29 -49Q-67 -72 -68 -20Q-69 15 -48 9L-31 -21ZM29 -49Q67 -72 68 -20Q69 15 48 9L31 -21Z" fill="#91664e"/>',
      markings: '<ellipse cx="0" cy="5" rx="25" ry="18" fill="#f5dfb8"/><path d="M-8 -57L-6 -31Q0 -25 6 -31L8 -57Z" fill="#f5dfb8"/>',
      tail: '<path d="M42 52Q82 47 77 23" fill="none" stroke="#ae805c" stroke-width="18" stroke-linecap="round"/>' },
    { id: 'rabbit', name: 'Clover', species: 'Rabbit', colors: ['#c8bccb','#ddd2de','#f4eaf0','#cfc0d0','#b5a4ba','#edbdc9'], whiskers: true,
      ears: '<ellipse cx="-36" cy="-69" rx="15" ry="47" transform="rotate(-15 -36 -69)" fill="var(--fur)"/><ellipse cx="36" cy="-69" rx="15" ry="47" transform="rotate(15 36 -69)" fill="var(--fur)"/><ellipse cx="-36" cy="-73" rx="7" ry="31" transform="rotate(-15 -36 -73)" fill="#e8b9c8"/><ellipse cx="36" cy="-73" rx="7" ry="31" transform="rotate(15 36 -73)" fill="#e8b9c8"/>',
      markings: '<ellipse cx="0" cy="6" rx="23" ry="17" fill="#f4eaf0"/><rect x="-5" y="10" width="10" height="9" rx="2" fill="#fffaf2"/>',
      tail: '<circle cx="53" cy="54" r="21" fill="#f4eaf0"/>' },
    { id: 'fox', name: 'Maple', species: 'Fox', colors: ['#ce754a','#e79862','#ffedca','#695149','#8d5742','#efb094'], whiskers: true,
      ears: '<path d="M-47 -18L-51 -84L-16 -51ZM47 -18L51 -84L16 -51Z" fill="#805344"/><path d="M-41 -33L-44 -67L-24 -48ZM41 -33L44 -67L24 -48Z" fill="#eab49b"/>',
      markings: '<path d="M-51 -8Q-32 -9 0 12Q32 -9 51 -8Q43 29 0 29Q-43 29 -51 -8Z" fill="#ffedca"/>',
      tail: '<path d="M36 62Q104 84 105 12Q68 20 64 45Z" fill="#ce754a"/><path d="M105 12Q81 17 73 29L88 39L101 36Q105 25 105 12Z" fill="#ffedca"/>' },
    { id: 'panda', name: 'Mochi', species: 'Panda', colors: ['#eee9db','#f8f1df','#faf4e5','#575957','#575957','#edc3b4'], whiskers: false,
      ears: '<circle cx="-39" cy="-52" r="22" fill="#575957"/><circle cx="39" cy="-52" r="22" fill="#575957"/><circle cx="-39" cy="-52" r="10" fill="#85817d"/><circle cx="39" cy="-52" r="10" fill="#85817d"/>',
      markings: '<ellipse cx="-19" cy="-14" rx="14" ry="18" transform="rotate(25 -19 -14)" fill="#777872"/><ellipse cx="19" cy="-14" rx="14" ry="18" transform="rotate(-25 19 -14)" fill="#777872"/>',
      tail: '<circle cx="48" cy="57" r="15" fill="#575957"/>' }
  ];
  const PET_COLOR_KEYS = ['fur','face','belly','paws','arms','blush'];
  const SAVE_KEY = 'type-and-tails-v1';
  // Used once to preserve difficulties already earned under the old point-based system.
  const LEGACY_POINT_TIERS = [0,1400,4000,7500,12000,18000,26000,36000];
  const defaults = () => ({ xp: 0, coins: 0, owned: [], equipped: [], pet: 'cat', selected: 0, rounds: 0, lessonRounds: LEVELS.map(() => 0), bestWpmByLevel: LEVELS.map(() => 0), unlockedLevel: 0, bestWpm: 0, music: true, sound: true });
  let state = defaults();
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (data && typeof data === 'object') {
      for (const key of ['xp', 'coins', 'rounds', 'bestWpm']) if (Number.isFinite(data[key]) && data[key] >= 0) state[key] = Math.floor(data[key]);
      if (Array.isArray(data.bestWpmByLevel)) state.bestWpmByLevel = LEVELS.map((_, index) => Number.isSafeInteger(data.bestWpmByLevel[index]) && data.bestWpmByLevel[index] >= 0 ? data.bestWpmByLevel[index] : 0);
      if (Number.isInteger(data.unlockedLevel) && data.unlockedLevel >= 0 && data.unlockedLevel < LEVELS.length) state.unlockedLevel = data.unlockedLevel;
      else if (data.unlockedLevel === undefined) state.unlockedLevel = LEGACY_POINT_TIERS.reduce((highest, tier, index) => state.xp >= tier ? index : highest, 0);
      if (Array.isArray(data.lessonRounds)) state.lessonRounds = LEVELS.map((_, index) => Number.isSafeInteger(data.lessonRounds[index]) && data.lessonRounds[index] >= 0 ? data.lessonRounds[index] : 0);
      const previousOwned = Array.isArray(data.owned) ? data.owned : [];
      state.owned = [...new Set(previousOwned.map(normalizeItemId).filter(id => ITEMS.some(item => item.id === id)))];
      if (Array.isArray(data.equipped)) {
        state.equipped = [...new Set(data.equipped.map(normalizeItemId).filter(id => state.owned.includes(id)))];
      } else {
        // Former slot-based saves can now display every formerly conflicting purchase.
        const shown = data.equipped && typeof data.equipped === 'object' ? Object.values(data.equipped) : [];
        const freed = previousOwned.filter(id => LEGACY_EXCLUSIVE_ITEMS.has(id));
        state.equipped = [...new Set([...shown,...freed].map(normalizeItemId).filter(id => state.owned.includes(id)))];
      }
      if (PETS.some(pet => pet.id === data.pet)) state.pet = data.pet;
      for (const key of ['music', 'sound']) if (typeof data[key] === 'boolean') state[key] = data[key];
      if (Number.isInteger(data.selected) && data.selected >= 0 && data.selected < LEVELS.length && data.selected <= unlocked()) state.selected = data.selected;
    }
  } catch (_) { /* Browser storage may be unavailable; the game still runs. */ }
  let round = null, frame = 0, shopCategory = 'pet', toastTimer, reactionTimer, bubbleTimer, advanceTimer;
  let wordStarted = 0, wordDeadline = 0, pauseStarted = 0, remainingOnPause = 0;
  let inputHistory = '', composing = false;
  const fmt = number => number.toLocaleString();
  function unlocked() {
    let highest = state.unlockedLevel;
    while (highest < LEVELS.length - 1 && state.bestWpmByLevel[highest] >= LEVELS[highest + 1].unlockWpm) highest++;
    return highest;
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
    catch (_) { $('save-status').textContent = 'Saving unavailable · keep this page open'; }
  }
  function toast(message) {
    $('toast').textContent = message; $('toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2800);
  }
  function updateProgress() {
    const highest = unlocked(), rank = LEVELS[highest];
    const selected = round ? round.level : state.selected;
    const next = LEVELS[selected + 1], best = state.bestWpmByLevel[selected];
    $('wallet').textContent = fmt(state.coins); $('shop-wallet').textContent = fmt(state.coins);
    $('rank-icon').textContent = rank.icon; $('rank-name').textContent = rank.name; $('rank-caption').textContent = rank.description;
    $('xp-value').textContent = best + (next ? ' / ' + next.unlockWpm : '') + ' WPM';
    $('xp-fill').style.width = (next ? Math.min(100,100 * best / next.unlockWpm) : 100) + '%';
    $('next-level').textContent = !next ? 'All levels unlocked. Keep building your best speed!' : selected < highest ? next.name + ' already unlocked · keep practicing your rhythm.' : 'Finish a round at ' + next.unlockWpm + ' WPM to unlock ' + next.name;
    $('level-select').replaceChildren(...LEVELS.map((level, index) => {
      const option = document.createElement('option'); option.value = index;
      option.textContent = (index > highest ? '🔒 ' : level.icon + ' ') + level.name + (index > highest ? ' — ' + LEVELS[index - 1].name + ' at ' + level.unlockWpm + ' WPM' : '');
      option.disabled = index > highest; return option;
    }));
    $('level-select').value = selected;
    const level = LEVELS[selected];
    $('level-details').textContent = level.description + ' Focus: ' + level.keys + ' · ' + level.seconds + ' seconds per word.';
  }
  function paintRug(rug, itemId) {
    const style = RUG_STYLES[itemId] || RUG_STYLES.default;
    rug.querySelector('.rug-base').setAttribute('fill',style.fill);
    rug.querySelector('.rug-border').setAttribute('stroke',style.border);
    rug.querySelector('.rug-border').setAttribute('stroke-width',itemId ? 6 : 3);
    rug.querySelector('.rug-inner-border').setAttribute('stroke',style.inner);
    rug.querySelector('.rug-inner-border').setAttribute('opacity',itemId ? 1 : .65);
    for (const pattern of rug.querySelectorAll('[data-rug-style]')) pattern.style.display = pattern.dataset.rugStyle === itemId ? '' : 'none';
  }
  function cloneRug() {
    const rug = $('rug').cloneNode(true);
    // Room copies and shop previews must not duplicate the original rug's IDs.
    for (const element of [rug,...rug.querySelectorAll('[id]')]) element.removeAttribute('id');
    return rug;
  }
  function rugPreview(itemId) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','240 478 462 145');
    const rug = cloneRug();
    paintRug(rug,itemId); svg.append(rug);
    return svg;
  }
  function applyDecorations() {
    const visible = id => state.equipped.includes(id);
    for (const id of ['plant','art','lamp','bunting','ball','stars','curtains','cloud-mobile']) $('decor-' + id).style.display = visible(id) ? '' : 'none';
    for (const id of ['bow','glasses','medal','cape','socks']) $('pet-' + id).style.display = visible(id) ? '' : 'none';
    $('pet-hat').style.display = visible('party') ? '' : 'none'; $('pet-hat').innerHTML = HATS.party;
    paintRug($('rug'),visible('rug-rose') ? 'rug-rose' : undefined);
    const sideRug = $('side-rug');
    if (!sideRug.firstElementChild) sideRug.append(cloneRug());
    paintRug(sideRug,'rug-mint');
    sideRug.style.display = visible('rug-mint') ? '' : 'none';
  }

  function currentPet() { return PETS.find(pet => pet.id === state.pet); }
  function colorPet(element, pet) {
    PET_COLOR_KEYS.forEach((key, index) => element.style.setProperty('--' + key, pet.colors[index]));
  }
  function applyPet() {
    const pet = currentPet();
    colorPet($('pet'), pet);
    $('pet-ears').innerHTML = pet.ears;
    $('pet-markings').innerHTML = pet.markings;
    $('pet-tail').innerHTML = pet.tail;
    $('pet-whiskers').style.display = pet.whiskers ? '' : 'none';
    $('pet-name').textContent = pet.name;
    document.querySelector('.room-art').setAttribute('aria-label', 'A sunny room with your playful ' + pet.species.toLowerCase() + ', ' + pet.name);
    if (!round) $('room-label').textContent = pet.name + "'s happy place";
    $('pause-copy').textContent = 'Your timer is paused. ' + pet.name + ' will keep your seat warm.';
  }
  function petPortrait(pet) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','-80 -125 160 165'); svg.setAttribute('aria-hidden','true');
    colorPet(svg,pet);
    svg.innerHTML = pet.ears + '<ellipse cy="-15" rx="52" ry="44" fill="var(--face)"/>' + pet.markings +
      '<ellipse cx="-31" rx="10" ry="6" fill="var(--blush)"/><ellipse cx="31" rx="10" ry="6" fill="var(--blush)"/><ellipse cx="-18" cy="-14" rx="5" ry="7" fill="#4a3a30"/><ellipse cx="18" cy="-14" rx="5" ry="7" fill="#4a3a30"/><path d="M-5 -1Q0 -5 5 -1L0 5Z" fill="#aa695e"/><path d="M0 5V9Q-7 17 -12 9M0 9Q7 17 12 9" fill="none" stroke="#805741" stroke-width="2.5" stroke-linecap="round"/>';
    return svg;
  }
  function renderPets() {
    $('pet-grid').replaceChildren(...PETS.map(pet => {
      const button = document.createElement('button'); button.className = 'pet-choice';
      const selected = state.pet === pet.id;
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', pet.name + ' the ' + pet.species.toLowerCase() + (selected ? ', selected' : ', free'));
      const name = document.createElement('strong'); name.textContent = pet.name;
      const species = document.createElement('small'); species.textContent = pet.species;
      const status = document.createElement('span'); status.className = 'pet-choice-status'; status.textContent = selected ? '✓ Your buddy' : 'Free · choose';
      button.append(petPortrait(pet),name,species,status);
      button.addEventListener('click', () => {
        if (round) return;
        state.pet = pet.id; applyPet(); save(); audio.init(); audio.effect('equip');
        $('pet-dialog').close(); say("Hi, I'm " + pet.name + '. Let’s grow together!', 0);
        $('choose-pet').focus({ preventScroll: true });
      });
      return button;
    }));
  }
  $('choose-pet').addEventListener('click', () => {
    if (round) return;
    renderPets(); $('pet-dialog').showModal();
    $('pet-grid').querySelector('[aria-pressed="true"]').focus();
  });

  // 64 bars / 512 steps: about 3m 35s in the room, or 2m 54s during a level.
  // Four sections have distinct melodies, chord voicings, and a sparser second pass.
  const MUSIC_TEMPO = { room: .42, level: .34 };
  const MUSIC_PHRASES = [
    [64,null,67,69,67,null,64,null], [62,64,65,null,69,67,null,null],
    [60,null,64,67,64,62,60,null], [62,null,65,69,67,null,62,null],
    [67,69,72,null,71,69,67,null], [65,null,69,72,69,67,65,null],
    [64,67,null,71,69,null,67,64], [62,65,69,null,67,65,62,null],
    [60,null,62,null,64,null,67,null], [59,null,62,65,null,62,59,null],
    [57,null,60,64,62,null,60,null], [55,59,null,62,64,62,null,null],
    [72,71,69,null,67,64,null,null], [69,null,67,65,64,null,62,null],
    [67,64,60,null,62,64,67,null], [65,64,62,null,60,null,null,null]
  ];
  const MUSIC_HARMONIES = [
    [48,52,55], [53,57,60], [45,48,52], [43,47,50],
    [50,53,57], [52,55,59], [48,55,60], [53,60,64]
  ];
  const MUSIC_SECTIONS = [
    { phrases: [0,1,2,3,0,2,1,3], chords: [0,1,2,4,6,2,7,3] },
    { phrases: [4,5,6,7,6,4,5,7], chords: [2,1,0,3,5,2,7,3] },
    { phrases: [8,9,10,11,10,8,11,9], chords: [6,4,2,3,1,5,4,3] },
    { phrases: [12,13,14,15,12,14,13,15], chords: [1,3,0,2,7,4,3,6] }
  ];
  const MUSIC_SCORE = [0,1].flatMap(pass => MUSIC_SECTIONS.flatMap((section, sectionIndex) =>
    section.phrases.flatMap((_, bar) => {
      const phrase = MUSIC_PHRASES[section.phrases[(bar + pass * 2) % section.phrases.length]];
      const harmony = MUSIC_HARMONIES[section.chords[bar]];
      return phrase.map((note, beat) => ({
        beat, harmony,
        note: pass === 1 && bar % 2 === 1 && beat === 3 ? null : note,
        chord: beat === 0 ? harmony : null,
        bass: beat === 4 && sectionIndex !== 2 ? harmony[0] - 12 : null,
        soft: sectionIndex === 2 || pass === 1
      }));
    })
  ));

  // All music and effects are synthesized here; no audio downloads are required.
  const audio = {
    context: null, master: null, musicGain: null, effectsGain: null, percussionNoise: null, loop: null, note: 0, nextNote: 0, unavailable: false,
    init() {
      if (this.context) {
        if (this.context.state === 'suspended') this.context.resume().catch(() => {});
        this.sync(); return;
      }
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) { this.unavailable = true; toast('Audio is unavailable in this browser. You can still play!'); return; }
      try {
        this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = .65; this.master.connect(this.context.destination);
        this.musicGain = this.context.createGain(); this.musicGain.connect(this.master);
        this.effectsGain = this.context.createGain(); this.effectsGain.connect(this.master);
        this.percussionNoise = this.context.createBuffer(1,Math.ceil(this.context.sampleRate * .18),this.context.sampleRate);
        const noise = this.percussionNoise.getChannelData(0);
        for (let index = 0; index < noise.length; index++) noise[index] = Math.random() * 2 - 1;
        this.nextNote = this.context.currentTime + .1; this.sync();
        this.context.resume().catch(() => {});
      } catch (_) { this.unavailable = true; toast('Audio could not start. You can still play!'); }
    },
    sync() {
      if (!this.context || !this.musicGain) return;
      const time = this.context.currentTime;
      this.musicGain.gain.setTargetAtTime(state.music && !document.hidden ? .2 : 0, time, .1);
      this.effectsGain.gain.setTargetAtTime(state.sound && !document.hidden ? .55 : 0, time, .02);
      if (state.music && !document.hidden && !this.loop) { this.nextNote = time + .1; this.schedule(); this.loop = setInterval(() => this.schedule(), 180); }
      if ((!state.music || document.hidden) && this.loop) { clearInterval(this.loop); this.loop = null; }
    },
    tone(frequency, start, duration, volume, type = 'sine', music = false) {
      if (!this.context) return;
      const oscillator = this.context.createOscillator(), envelope = this.context.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(0, start); envelope.gain.linearRampToValueAtTime(volume, start + .014);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(envelope); envelope.connect(music ? this.musicGain : this.effectsGain);
      oscillator.start(start); oscillator.stop(start + duration + .03);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    },
    percussion(name, start, soft) {
      if (!this.context || !this.percussionNoise) return;
      const envelope = this.context.createGain();
      let source, filter;
      const duration = name === 'kick' ? .16 : name === 'snare' ? .11 : .035;
      const volume = (name === 'kick' ? .12 : name === 'snare' ? .055 : .026) * (soft ? .65 : 1);
      if (name === 'kick') {
        source = this.context.createOscillator(); source.type = 'sine';
        source.frequency.setValueAtTime(115,start);
        source.frequency.exponentialRampToValueAtTime(48,start + duration);
        source.connect(envelope);
      } else {
        source = this.context.createBufferSource(); source.buffer = this.percussionNoise;
        filter = this.context.createBiquadFilter();
        filter.type = name === 'snare' ? 'bandpass' : 'highpass';
        filter.frequency.value = name === 'snare' ? 1800 : 7000;
        filter.Q.value = .7;
        source.connect(filter); filter.connect(envelope);
      }
      envelope.gain.setValueAtTime(0,start);
      envelope.gain.linearRampToValueAtTime(volume,start + .004);
      envelope.gain.exponentialRampToValueAtTime(.0001,start + duration);
      envelope.connect(this.musicGain); source.start(start); source.stop(start + duration + .02);
      source.onended = () => { source.disconnect(); envelope.disconnect(); if (filter) filter.disconnect(); };
    },
    schedule() {
      if (!this.context || !state.music || document.hidden) return;
      if (this.nextNote < this.context.currentTime) this.nextNote = this.context.currentTime + .05;
      while (this.nextNote < this.context.currentTime + .45) {
        const step = MUSIC_SCORE[this.note % MUSIC_SCORE.length];
        const inLevel = Boolean(round && !round.paused && !round.waiting);
        if (step.note !== null) {
          const frequency = 440 * 2 ** ((step.note - 69) / 12);
          this.tone(frequency, this.nextNote, inLevel ? .46 : step.soft ? 1.1 : .9, step.soft ? .15 : .22, inLevel ? 'triangle' : 'sine', true);
          this.tone(frequency * 2, this.nextNote, inLevel ? .2 : .35, inLevel ? .025 : .015, 'sine', true);
        }
        if (step.chord) for (const [index, note] of step.chord.entries()) {
          // Lightly arpeggiated accompaniment leaves space around the melody.
          this.tone(440 * 2 ** ((note - 69) / 12), this.nextNote + index * (inLevel ? .04 : .06), inLevel ? 1.8 : 3.1, step.soft ? .055 : .075, 'triangle', true);
        }
        if (inLevel) {
          // A light beat and short bass pulses add energy without overpowering typing cues.
          if (step.beat % 2 === 0) {
            this.tone(440 * 2 ** ((step.harmony[0] - 12 - 69) / 12),this.nextNote,.28,.085,'triangle',true);
            this.percussion(step.beat % 4 === 0 ? 'kick' : 'snare',this.nextNote,step.soft);
          } else this.percussion('hat',this.nextNote,step.soft);
        } else if (step.bass !== null) this.tone(440 * 2 ** ((step.bass - 69) / 12), this.nextNote, 1.35, .07, 'sine', true);
        this.nextNote += inLevel ? MUSIC_TEMPO.level : MUSIC_TEMPO.room; this.note++;
      }
    },
    effect(name) {
      if (!state.sound || !this.context || document.hidden) return;
      const start = this.context.currentTime;
      const sequence = {
        correct: [[523,0,.12,.25],[659,.065,.15,.24],[784,.13,.22,.23]],
        buy: [[659,0,.12,.22],[880,.1,.15,.22],[1047,.2,.25,.25]],
        equip: [[523,0,.09,.18],[784,.08,.15,.19]],
        timeout: [[294,0,.15,.15],[220,.13,.24,.13]],
        start: [[392,0,.13,.2],[523,.13,.15,.23],[659,.26,.2,.2]],
        finish: [[523,0,.18,.22],[659,.15,.18,.23],[784,.3,.18,.23],[1047,.48,.45,.23]],
        unlock: [[523,0,.18,.24],[659,.14,.18,.24],[784,.28,.18,.24],[1047,.42,.2,.25],[1319,.62,.5,.23]],
        boop: [[740,0,.06,.17],[988,.06,.13,.16]]
      }[name] || [];
      for (const [frequency, delay, duration, volume] of sequence) this.tone(frequency, start + delay, duration, volume, 'sine');
    }
  };
  function updateAudioButtons() {
    for (const [key, symbol, label] of [['music','♫','background music'],['sound','♪','sound effects']]) {
      const button = $(key + '-button'); button.textContent = symbol;
      button.setAttribute('aria-pressed', String(state[key])); button.setAttribute('aria-label', 'Turn ' + label + (state[key] ? ' off' : ' on'));
      button.title = label[0].toUpperCase() + label.slice(1) + ': ' + (state[key] ? 'on' : 'off');
    }
  }
  // Start audio only after a real user gesture, as browsers require.
  document.addEventListener('pointerdown', () => { if (!audio.unavailable) audio.init(); }, { once: true });
  document.addEventListener('keydown', () => { if (!audio.unavailable) audio.init(); }, { once: true });
  for (const key of ['music','sound']) $(key + '-button').addEventListener('click', () => {
    state[key] = !state[key]; audio.init(); audio.sync(); updateAudioButtons(); save();
    toast((key === 'music' ? 'Background music' : 'Sound effects') + (state[key] ? ' on' : ' off'));
  });

  const reactions = [
    ['bounce','Boing! Certified bouncy buddy.'], ['wiggle','The victory wiggle!'],
    ['spin','{name}.exe is spinning…'], ['flip','Did someone say plot twist?'],
    ['dance','Tiny paws. Big dance moves.'], ['squish','I am a very fluffy pancake.'],
    ['zoom','Zoomies: activated!'], ['wave','High five, typing buddy!'],
    ['celebrate','Paws up! You nailed it.']
  ];
  let previousReaction = -1;
  function say(message, duration = 3500) {
    clearTimeout(bubbleTimer); $('pet-bubble').textContent = message;
    if (duration) bubbleTimer = setTimeout(() => { $('pet-bubble').textContent = round ? 'You type. I supervise. 🐾' : 'Ready for another little adventure?'; }, duration);
  }
  function petReaction(boop = false) {
    let choice;
    do { choice = Math.floor(Math.random() * reactions.length); } while (choice === previousReaction);
    previousReaction = choice;
    const [action, line] = reactions[choice];
    clearTimeout(reactionTimer);
    $('room-scene').className = 'room-scene';
    // Separate frames allow a repeated animation to restart naturally.
    requestAnimationFrame(() => { $('room-scene').classList.add('pet-' + (boop ? 'boop' : action)); });
    say(boop ? 'Boop received. Friendship increased. ♡' : line.replace('{name}', currentPet().name));
    reactionTimer = setTimeout(() => { $('room-scene').className = 'room-scene'; }, 1100);
    if (!reducedMotion) for (let index = 0; index < 6; index++) {
      const particle = document.createElement('span'); particle.className = 'particle';
      particle.textContent = ['✦','♡','✧'][index % 3];
      particle.style.setProperty('--dx', (Math.random() * 180 - 90) + 'px');
      particle.style.setProperty('--dy', (-60 - Math.random() * 90) + 'px');
      particle.style.setProperty('--rot', (Math.random() * 160 - 80) + 'deg');
      $('particles').append(particle); setTimeout(() => particle.remove(), 1100);
    }
  }
  $('pet-button').addEventListener('click', () => { petReaction(true); audio.effect('boop'); focusTypingInput(); });

  function selectRoundWords(level) {
    const words = level.wordPool.slice();
    for (let index = words.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [words[index],words[other]] = [words[other],words[index]];
    }
    return words.slice(0,20);
  }
  function focusTypingInput(select = false) {
    if (!round || round.paused || round.transitioning) return;
    $('typing-input').focus({ preventScroll: true });
    if (select) $('typing-input').select();
  }
  function setPlaying(playing) {
    $('room-card').classList.toggle('is-playing', playing);
    $('typing-area').hidden = !playing; $('welcome-card').hidden = playing;
    if (!playing) { $('ready-start').hidden = true; $('typing-input').readOnly = false; }
    $('timer-panel').hidden = !playing; $('round-stats').hidden = !playing;
    $('pause-button').hidden = !playing; $('room-mode').hidden = playing;
    $('start-button').disabled = playing; $('level-select').disabled = playing;
    $('shop-button').disabled = playing; $('choose-pet').disabled = playing;
    $('start-button').innerHTML = playing ? 'Round in progress <span>✦</span>' : "Let's practice <span>↗</span>";
    $('room-label').textContent = playing ? LEVELS[round.level].name + ' · find your flow' : currentPet().name + "'s happy place";
    $('start-footnote').textContent = playing ? 'Press Esc or Pause for a little breather.' : 'A few minutes for a happier, faster you.';
    audio.sync();
  }
  function startRound() {
    if (round || state.selected > unlocked()) return;
    audio.init();
    const now = performance.now();
    const level = LEVELS[state.selected];
    round = { level: state.selected, words: selectRoundWords(level), index: 0, correct: 0, score: 0, streak: 0, bestStreak: 0, chars: 0, typed: 0, mistakes: 0, startLevel: unlocked(), started: now, pausedMs: 0, paused: false, waiting: true, transitioning: false, typedSeconds: 0 };
    setPlaying(true); $('round-score').textContent = '0'; $('round-correct').textContent = '0 / 20';
    say("I'll handle the cheering. You handle the typing!",4000);
    cancelAnimationFrame(frame);
    inputHistory = ''; $('typing-input').value = ''; $('typing-input').disabled = false;
    $('typing-input').readOnly = true; $('typing-input').classList.remove('has-error');
    $('typing-input').placeholder = 'Get your fingers onto the home row…';
    $('ready-start').hidden = false;
    $('round-progress').textContent = '20 WORDS · READY WHEN YOU ARE';
    $('combo-display').textContent = '✦ Take your time';
    $('practice-cue').textContent = level.name + ' practice';
    $('target-word').style.fontSize = ''; $('target-word').classList.remove('long');
    $('target-word').classList.add('is-ready');
    $('target-word').textContent = 'Ready, paws poised?';
    $('target-word').setAttribute('aria-label', 'Ready, paws poised?');
    $('input-hint').textContent = 'Press space to start. The timer will wait for you.';
    $('timer-caption').textContent = 'READY TO PRACTICE';
    $('time-left').textContent = level.seconds.toFixed(1) + 's';
    $('timer-fill').style.width = '100%'; $('timer-fill').classList.remove('urgent');
    // Focus the ready input now, then restore focus after dialog close/layout.
    focusTypingInput(true);
    requestAnimationFrame(() => focusTypingInput(true));
    if (window.innerWidth < 780) $('room-scene').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
  }
  function beginRound() {
    if (!round || !round.waiting || round.paused) return;
    round.waiting = false; round.started = performance.now();
    $('ready-start').hidden = true; $('typing-input').readOnly = false;
    $('typing-input').placeholder = 'Type the word here…';
    $('target-word').classList.remove('is-ready');
    $('timer-caption').textContent = 'TIME FOR THIS WORD';
    audio.init(); audio.effect('start'); audio.sync();
    showWord(); frame = requestAnimationFrame(tick);
  }
  $('ready-start').addEventListener('click', beginRound);
  function showWord() {
    if (!round) return;
    if (round.index >= 20) { finishRound(); return; }
    clearTimeout(advanceTimer); round.transitioning = false;
    const level = LEVELS[round.level], target = round.words[round.index];
    wordStarted = performance.now(); wordDeadline = wordStarted + level.seconds * 1000;
    inputHistory = ''; $('typing-input').value = ''; $('typing-input').disabled = false;
    $('typing-input').classList.remove('has-error');
    $('round-progress').textContent = 'WORD ' + String(round.index + 1).padStart(2,'0') + ' / 20';
    $('combo-display').textContent = round.streak >= 2 ? '✦ ' + round.streak + ' word streak' : '✦ You got this';
    $('practice-cue').textContent = level.name + ' practice · 20 random words';
    $('target-word').classList.toggle('long', target.length >= 13); renderWord(); fitWord();
    $('input-hint').textContent = 'No enter key needed. Just type!';
    $('time-left').textContent = level.seconds.toFixed(1) + 's'; $('timer-fill').style.width = '100%'; $('timer-fill').classList.remove('urgent');
    focusTypingInput(true);
  }
  function renderWord() {
    if (!round) return;
    const target = round.words[round.index], typed = $('typing-input').value.toLowerCase();
    $('target-word').replaceChildren(...[...target].map((letter,index) => {
      const span = document.createElement('span'); span.textContent = letter;
      if (index < typed.length) span.className = letter === typed[index] ? 'matched' : 'wrong';
      else if (index === typed.length) span.className = 'current';
      return span;
    }));
    $('target-word').setAttribute('aria-label', target);
    $('typing-input').classList.toggle('has-error', !target.startsWith(typed));
  }
  function fitWord() {
    if (!round || round.transitioning) return;
    const element = $('target-word');
    element.style.fontSize = '';
    const textWidth = [...element.children].reduce((width, letter) => width + letter.getBoundingClientRect().width, 0);
    const available = element.clientWidth - 16;
    if (textWidth > available && available > 0) {
      const size = parseFloat(getComputedStyle(element).fontSize);
      element.style.fontSize = Math.max(12, Math.floor(size * available / textWidth)) + 'px';
    }
  }
  window.addEventListener('resize', fitWord);
  function tick(now) {
    if (!round) return;
    if (!round.paused && !round.waiting && !round.transitioning) {
      const remaining = Math.max(0, wordDeadline - now), fraction = remaining / (LEVELS[round.level].seconds * 1000);
      $('timer-fill').style.width = (fraction * 100) + '%';
      $('timer-fill').classList.toggle('urgent', fraction < .25);
      $('time-left').textContent = (remaining / 1000).toFixed(1) + 's';
      if (remaining <= 0) expireWord();
    }
    if (round) frame = requestAnimationFrame(tick);
  }
  function settleWord(correct) {
    if (!round || round.paused || round.waiting || round.transitioning) return;
    round.transitioning = true; $('typing-input').disabled = true;
    const target = round.words[round.index], level = LEVELS[round.level];
    const elapsed = Math.max(.1,(performance.now() - wordStarted) / 1000);
    round.typedSeconds += Math.min(elapsed,level.seconds);
    if (correct) {
      round.correct++; round.streak++; round.bestStreak = Math.max(round.bestStreak,round.streak); round.chars += target.length;
      const speedBonus = Math.round(80 * Math.max(0,1 - elapsed / level.seconds));
      const streakBonus = Math.min(25,Math.max(0,round.streak - 1) * 5);
      const points = level.base + speedBonus + streakBonus;
      round.score += points; state.xp += points; state.coins += points; save();
      $('round-score').textContent = fmt(round.score); $('round-correct').textContent = round.correct + ' / 20';
      $('floating-score').textContent = '+' + points + ' ✦'; $('floating-score').className = 'floating-score';
      requestAnimationFrame(() => $('floating-score').classList.add('show'));
      $('input-hint').textContent = '+' + points + ' points · lovely work!';
      audio.effect('correct'); petReaction(); updateProgress();
    } else {
      round.streak = 0; $('input-hint').textContent = 'Time up — the word was “' + target + '”. Keep going!';
      $('time-left').textContent = '0.0s'; $('timer-fill').style.width = '0%';
      audio.effect('timeout'); say('A little stumble. A fresh start. ♡');
    }
    round.index++;
    advanceTimer = setTimeout(() => { if (!round || round.paused) return; showWord(); }, correct ? 450 : 1600);
  }
  const expireWord = () => settleWord(false);
  function handleTyping(event) {
    if (!round || round.paused || round.waiting || round.transitioning || composing || event.isComposing) return;
    if (performance.now() >= wordDeadline) { expireWord(); return; }
    const input = $('typing-input'), target = round.words[round.index], value = input.value.toLowerCase();
    // A pasted/dropped word should not award speed points. Typing remains the game.
    if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') { input.value = inputHistory; toast('Give your fingers the practice — type this one yourself!'); return; }
    // Identify the edited range so existing accepted letters do not count twice.
    let prefix = 0, suffix = 0;
    while (prefix < inputHistory.length && prefix < value.length && inputHistory[prefix] === value[prefix]) prefix++;
    while (suffix < inputHistory.length - prefix && suffix < value.length - prefix &&
      inputHistory[inputHistory.length - 1 - suffix] === value[value.length - 1 - suffix]) suffix++;
    const inserted = value.slice(prefix, value.length - suffix);
    let accepted = value.slice(0, prefix), mistakes = 0;
    for (const letter of inserted) {
      round.typed++;
      if (letter === target[accepted.length]) accepted += letter;
      else { round.mistakes++; mistakes++; }
    }
    // A deletion or replacement in the middle must still leave a correct prefix.
    for (const letter of value.slice(value.length - suffix)) {
      if (letter !== target[accepted.length]) break;
      accepted += letter;
    }
    input.value = accepted; inputHistory = accepted;
    input.setSelectionRange(accepted.length, accepted.length);
    renderWord();
    if (accepted === target) settleWord(true);
    else $('input-hint').textContent = mistakes ? 'That key was skipped. Keep going — no backspace needed!' : 'No enter key needed. Just type!';
  }
  $('typing-input').addEventListener('input',handleTyping);
  $('typing-input').addEventListener('compositionstart',() => { composing = true; });
  $('typing-input').addEventListener('compositionend',() => { composing = false; handleTyping({}); });
  for (const name of ['paste','drop']) $('typing-input').addEventListener(name,event => { event.preventDefault(); toast('Give your fingers the practice — type this one yourself!'); });
  $('typing-input').addEventListener('keydown',event => { if (event.key === 'Enter') event.preventDefault(); });

  function pauseRound() {
    if (!round || round.paused) return;
    if (!round.waiting && !round.transitioning && performance.now() >= wordDeadline) expireWord();
    clearTimeout(advanceTimer); round.paused = true; pauseStarted = performance.now();
    remainingOnPause = Math.max(0,wordDeadline - pauseStarted);
    $('typing-input').disabled = true; $('room-card').classList.add('paused');
    $('pause-dialog').showModal(); audio.sync();
  }
  function resumeRound() {
    if (!round || !round.paused) return;
    const now = performance.now(), duration = now - pauseStarted;
    round.pausedMs += duration; round.paused = false;
    $('pause-dialog').close(); $('room-card').classList.remove('paused');
    if (round.waiting) { $('typing-input').disabled = false; focusTypingInput(); }
    else if (round.transitioning) showWord();
    else { wordStarted += duration; wordDeadline = now + remainingOnPause; $('typing-input').disabled = false; focusTypingInput(); }
    audio.sync();
  }
  function finishRound(early = false) {
    if (!round) return;
    clearTimeout(advanceTimer); cancelAnimationFrame(frame);
    if (round.paused) { round.pausedMs += performance.now() - pauseStarted; $('pause-dialog').close(); }
    const result = round;
    const priorLevel = result.startLevel;
    // Standard typing speed: correct characters / five / active typing minutes.
    const wpm = result.typedSeconds > 0 ? Math.floor((result.chars / 5) / (result.typedSeconds / 60)) : 0;
    const accuracy = result.typed ? Math.max(0,Math.round((1 - result.mistakes / result.typed) * 100)) : 0;
    if (!early) {
      state.rounds++; state.lessonRounds[result.level]++;
      state.bestWpmByLevel[result.level] = Math.max(state.bestWpmByLevel[result.level],wpm);
      state.unlockedLevel = unlocked();
    }
    const currentLevel = unlocked();
    state.bestWpm = Math.max(state.bestWpm,wpm);
    round = null; $('room-card').classList.remove('paused'); setPlaying(false); updateProgress(); save();
    $('summary-title').textContent = early ? 'Every little bit counts.' : result.correct === 20 ? 'A perfect little round!' : result.correct >= 12 ? 'Look at you go!' : 'Practice makes progress.';
    $('summary-copy').textContent = early ? 'You finished early. Your points and coins are saved.' : LEVELS[result.level].name + ' complete · ' + accuracy + '% typing accuracy · best streak: ' + result.bestStreak;
    const nextGoal = LEVELS[result.level + 1];
    $('summary-goal').textContent = early ? 'Complete all 20 word attempts to record a speed and unlock new levels.' : nextGoal && currentLevel <= result.level ? 'Best completed round: ' + state.bestWpmByLevel[result.level] + ' WPM · reach ' + nextGoal.unlockWpm + ' WPM to unlock ' + nextGoal.name + '.' : 'Best completed round at this difficulty: ' + state.bestWpmByLevel[result.level] + ' WPM.';
    $('summary-points').textContent = fmt(result.score); $('summary-correct').textContent = result.correct + '/20'; $('summary-wpm').textContent = wpm;
    $('unlock-message').hidden = currentLevel <= priorLevel;
    if (currentLevel > priorLevel) {
      const names = LEVELS.slice(priorLevel + 1,currentLevel + 1).map(level => level.name).join(', ');
      $('unlock-message').textContent = '✦ New ' + (currentLevel - priorLevel > 1 ? 'levels' : 'level') + ' unlocked: ' + names + '! Choose from the difficulty menu.';
      audio.effect('unlock'); say('New adventures unlocked! I am so proud. ♡',0);
    } else { audio.effect('finish'); say('A little practice goes a long way. ♡',0); }
    $('summary-dialog').showModal();
  }
  $('start-button').addEventListener('click',startRound);
  $('level-select').addEventListener('change',() => { const index = Number($('level-select').value); if (index <= unlocked()) { state.selected = index; save(); updateProgress(); } });
  $('pause-button').addEventListener('click',pauseRound);
  $('resume-button').addEventListener('click',resumeRound);
  $('leave-button').addEventListener('click',() => finishRound(true));
  $('again-button').addEventListener('click',() => { $('summary-dialog').close(); startRound(); });
  $('pause-dialog').addEventListener('cancel',event => { event.preventDefault(); resumeRound(); });
  document.addEventListener('keydown',event => {
    if (event.code === 'Space' && round && round.waiting && !round.paused && !event.repeat && !document.querySelector('dialog[open]')) {
      event.preventDefault(); beginRound(); return;
    }
    if (event.key === 'Escape' && round && !round.paused && !$('pause-dialog').open) { event.preventDefault(); pauseRound(); }
  });
  document.addEventListener('visibilitychange',() => { if (document.hidden && round && !round.paused) pauseRound(); audio.sync(); });
  window.addEventListener('pagehide',save);

  function renderShop() {
    $('shop-wallet').textContent = fmt(state.coins);
    const grid = $('shop-grid'); grid.replaceChildren(); grid.setAttribute('aria-labelledby','tab-' + shopCategory);
    for (const item of ITEMS.filter(item => item.category === shopCategory)) {
      const owned = state.owned.includes(item.id), equipped = state.equipped.includes(item.id);
      const card = document.createElement('article'); card.className = 'shop-item' + (equipped ? ' equipped' : '');
      const art = document.createElement('div'); art.className = 'item-art'; art.setAttribute('aria-hidden','true');
      if (item.id === 'party') art.innerHTML = '<svg viewBox="-60 -130 120 110">' + HATS.party + '</svg>';
      else if (item.id === 'stars') {
        const preview = document.createElementNS('http://www.w3.org/2000/svg','svg');
        preview.setAttribute('viewBox','845 317 62 128');
        const stars = $('decor-stars').cloneNode(true);
        stars.removeAttribute('id'); stars.style.display = '';
        preview.append(stars); art.append(preview);
      }
      else if (item.id === 'rug-rose' || item.id === 'rug-mint') art.append(rugPreview(item.id));
      else art.textContent = item.art;
      const details = document.createElement('div'); details.className = 'item-details';
      const title = document.createElement('h3'); title.textContent = item.name;
      const description = document.createElement('p'); description.textContent = item.desc;
      const button = document.createElement('button'); button.className = 'item-button' + (equipped ? ' equipped' : '');
      button.textContent = equipped ? '✓ Showing · put away' : owned ? 'Show item' : '✦ ' + fmt(item.price) + ' · Buy';
      button.disabled = !owned && state.coins < item.price;
      button.setAttribute('aria-label',(equipped ? 'Put away ' : owned ? 'Show ' : 'Buy ') + item.name + (owned ? '' : ' for ' + item.price + ' coins'));
      if (button.disabled) button.title = 'Earn ' + fmt(item.price - state.coins) + ' more coins';
      button.addEventListener('click',() => {
        if (round) return;
        if (!state.owned.includes(item.id)) {
          if (state.coins < item.price) return;
          state.coins -= item.price; state.owned.push(item.id); state.equipped.push(item.id);
          audio.effect('buy'); toast(item.name + ' is yours!');
        } else if (state.equipped.includes(item.id)) { state.equipped = state.equipped.filter(id => id !== item.id); audio.effect('equip'); }
        else { state.equipped.push(item.id); audio.effect('equip'); }
        applyDecorations(); save(); updateProgress(); renderShop();
        // Restore focus after the refreshed inventory replaces the clicked card.
        const refreshed = [...grid.querySelectorAll('button')].find(entry => entry.getAttribute('aria-label').includes(item.name));
        if (refreshed) refreshed.focus({ preventScroll: true });
      });
      details.append(title,description,button); card.append(art,details); grid.append(card);
    }
  }
  function openShop() {
    if (round) { toast('Finish your round, then visit the shop.'); return; }
    renderShop(); $('shop-dialog').showModal();
  }
  $('shop-button').addEventListener('click',openShop);
  $('summary-shop').addEventListener('click',() => { $('summary-dialog').close(); openShop(); });
  for (const button of document.querySelectorAll('[data-category]')) button.addEventListener('click',() => {
    shopCategory = button.dataset.category;
    for (const tab of document.querySelectorAll('[data-category]')) { tab.classList.toggle('active',tab === button); tab.setAttribute('aria-selected',String(tab === button)); }
    renderShop();
  });
  $('help-button').addEventListener('click',() => { if (round) { pauseRound(); return; } $('help-dialog').showModal(); });
  for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click',() => $(button.dataset.close).close());
  // Dialogs support Escape and clicking outside their content, except the deliberate pause screen.
  for (const dialog of document.querySelectorAll('dialog:not(#pause-dialog)')) dialog.addEventListener('click',event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  updateAudioButtons(); updateProgress(); applyDecorations(); applyPet(); say("Hi, I'm " + currentPet().name + ". Let’s grow together!", 0); save();
})();
