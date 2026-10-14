'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const LEVELS = [
    { name: 'Beginner', icon: '🌱', tier: 0, seconds: 14, base: 40, description: 'Small words. Big beginnings.', words: 'cat dog sun hat cup bed red fox pen box pig bus map jam top pot egg bag ant bat run sit hop get fun hot log ten lip wet big cow bug sky day toy six win net ink nut' },
    { name: 'Explorer', icon: '🧭', tier: 1400, seconds: 13, base: 50, description: 'Find your rhythm with 4-letter words.', words: 'home frog moon star tree leaf fish bird rain book cake milk play warm kind jump blue pink gold kite duck bear boat nest seed soft cozy paws tail word fire snow love wave wind hill camp lamp drum' },
    { name: 'Adventurer', icon: '🍃', tier: 4000, seconds: 12, base: 60, description: 'A little stretch. A little adventure.', words: 'happy plant smile cloud dream beach brave house green bloom light music dance laugh sweet sunny water quiet apple peach magic river forest pocket little kitten garden typing cookie gentle yellow window flower feather puzzle' },
    { name: 'Wordsmith', icon: '✍️', tier: 7500, seconds: 12, base: 65, description: 'Longer words, lovely little victories.', words: 'morning blanket sparkle sunshine playful curious rainbow whisper journey cushion meadow adventure mountain careful kindness treasure glowing peaceful twinkle welcome colorful balance explore autumn curious picture weekend imagine lantern blossom practice planet' },
    { name: 'Trailblazer', icon: '🔥', tier: 12000, seconds: 11, base: 75, description: 'Build confidence with tricky letter patterns.', words: 'butterfly wonderful delighted chocolate friendship telescope waterfall fantastic pineapple sunflower mysterious celebrate confidence discovery delicious beautiful creativity happiness beginning attention rhythm squirrel flourish courageous knowledge biscuit tomorrow surprise strength scissors exercise' },
    { name: 'Expert', icon: '💎', tier: 18000, seconds: 11, base: 85, description: 'Precision, patience, and a few surprises.', words: 'extraordinary imagination kaleidoscope encyclopedia enthusiastic mischievous opportunity perseverance pronunciation constellation appreciation comfortable environment temperature spectacular adventurous independent architecture magnificent accomplishment responsibility breathtaking unforgettable conversation photograph generosity determination experience silhouette magnificent' },
    { name: 'Master', icon: '👑', tier: 26000, seconds: 10, base: 95, description: 'Take on words with serious personality.', words: 'onomatopoeia quintessential synchronization idiosyncratic conscientious simultaneously rehabilitation extraterrestrial metamorphosis entrepreneurial reconnaissance philosophical sophistication transcendental indistinguishable disproportionate characterization incomprehensible electromagnetic interdisciplinary susceptibility inconsequential juxtaposition bureaucratic comprehensive authenticity extraordinary abbreviation phenomenological crystallization' },
    { name: 'Legend', icon: '🌟', tier: 36000, seconds: 10, base: 100, description: 'The ultimate finger gymnastics. You got this.', words: 'electroencephalogram counterrevolutionary indistinguishability compartmentalization institutionalization internationalization uncharacteristically incomprehensibility psychophysiological multidisciplinary telecommunications disproportionateness crystallographically acknowledgement susceptibility conscientiousness misinterpretation entrepreneurship anthropomorphization deoxyribonucleic photosynthesis thermodynamics epistemological synchronization quintessential extracurricular serendipitous incontrovertible unconventionally discombobulation' }
  ].map(level => ({ ...level, words: [...new Set(level.words.split(' '))] }));

  const ITEMS = [
    { id: 'bow', name: 'Sunday bow', desc: 'A fancy little neck hug.', price: 300, category: 'pet', slot: 'bow', art: '🎀' },
    { id: 'glasses', name: 'Cool cat shades', desc: 'For extremely important cat business.', price: 600, category: 'pet', slot: 'glasses', art: '🕶️' },
    { id: 'party', name: 'Party hat', desc: 'Every little win is a party.', price: 500, category: 'pet', slot: 'hat', art: '🎉' },
    { id: 'crown', name: 'Tiny crown', desc: 'Royal ruler of the sofa.', price: 1800, category: 'pet', slot: 'hat', art: '👑' },
    { id: 'wizard', name: 'Wizard hat', desc: 'Purr-haps a little magic?', price: 1200, category: 'pet', slot: 'hat', art: '🧙' },
    { id: 'beret', name: 'Artist beret', desc: 'A very cultured little cat.', price: 900, category: 'pet', slot: 'hat', art: '🎨' },
    { id: 'plant', name: 'Leafy friend', desc: 'A little green goes a long way.', price: 400, category: 'room', slot: 'plant', art: '🪴' },
    { id: 'art', name: 'Mountain print', desc: 'A tiny view of a bigger world.', price: 650, category: 'room', slot: 'art', art: '🖼️' },
    { id: 'lamp', name: 'Golden glow lamp', desc: 'Warm light for cozy evenings.', price: 800, category: 'room', slot: 'lamp', art: '💡' },
    { id: 'bunting', name: 'Happy bunting', desc: 'Good vibes, on a string.', price: 900, category: 'room', slot: 'bunting', art: '🚩' },
    { id: 'ball', name: 'Minty yarn ball', desc: 'A very tempting tangle.', price: 350, category: 'room', slot: 'ball', art: '🧶' },
    { id: 'stars', name: 'Wall sparkles', desc: 'For dreaming a little bigger.', price: 1600, category: 'room', slot: 'stars', art: '✨' },
    { id: 'rug-rose', name: 'Rose-colored rug', desc: 'Soft paws. Softer landings.', price: 1100, category: 'room', slot: 'rug', art: '🌸' },
    { id: 'rug-mint', name: 'Meadow rug', desc: 'Bring a little outdoors in.', price: 1100, category: 'room', slot: 'rug', art: '🍀' },
    { id: 'wall-peach', name: 'Peachy walls', desc: 'A fresh coat of happy.', price: 1500, category: 'room', slot: 'wall', art: '🍑' },
    { id: 'wall-blue', name: 'Daydream walls', desc: 'As calm as a clear sky.', price: 1500, category: 'room', slot: 'wall', art: '☁️' }
  ];
  const HATS = {
    party: '<path d="M-29 -51L0 -111L29 -51Z" fill="#e4b775"/><path d="M-20 -69L19 -72M-9 -91L9 -91" stroke="#c78778" stroke-width="9"/><circle cy="-114" r="8" fill="#d8937a"/><ellipse cy="-51" rx="34" ry="7" fill="#edc791"/>',
    crown: '<path d="M-31 -58L-38 -91L-17 -78L0 -101L17 -78L38 -91L31 -58Z" fill="#e4be69" stroke="#b7934e" stroke-width="2"/><path d="M-30 -61H30" stroke="#f8dd91" stroke-width="5"/><circle cy="-72" r="5" fill="#c68478"/>',
    wizard: '<path d="M-28 -54L-8 -116Q10 -111 17 -99L11 -88L30 -54Z" fill="#7f88af"/><ellipse cy="-52" rx="43" ry="10" fill="#949cc1"/><path d="M1 -88L4 -82L11 -81L5 -76L6 -69L0 -72L-6 -69L-5 -76L-11 -81L-4 -82Z" fill="#f6d79a"/>',
    beret: '<ellipse cx="0" cy="-63" rx="40" ry="17" fill="#b66d63" transform="rotate(-10 0 -63)"/><path d="M-24 -54H27" stroke="#8e544b" stroke-width="7" stroke-linecap="round"/><path d="M1 -76L-2 -84" stroke="#8e544b" stroke-width="5" stroke-linecap="round"/>'
  };
  const SAVE_KEY = 'type-and-tails-v1';
  const defaults = () => ({ xp: 0, coins: 0, owned: [], equipped: {}, selected: 0, rounds: 0, bestWpm: 0, music: true, sound: true });
  let state = defaults();
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (data && typeof data === 'object') {
      for (const key of ['xp', 'coins', 'rounds', 'bestWpm']) if (Number.isFinite(data[key]) && data[key] >= 0) state[key] = Math.floor(data[key]);
      state.owned = Array.isArray(data.owned) ? data.owned.filter(id => ITEMS.some(item => item.id === id)) : [];
      if (data.equipped && typeof data.equipped === 'object') for (const [slot, id] of Object.entries(data.equipped)) if (ITEMS.some(item => item.id === id && item.slot === slot) && state.owned.includes(id)) state.equipped[slot] = id;
      for (const key of ['music', 'sound']) if (typeof data[key] === 'boolean') state[key] = data[key];
      if (Number.isInteger(data.selected) && data.selected >= 0 && data.selected < LEVELS.length && state.xp >= LEVELS[data.selected].tier) state.selected = data.selected;
    }
  } catch (_) { /* Browser storage may be unavailable; the game still runs. */ }
  let round = null, frame = 0, shopCategory = 'pet', toastTimer, reactionTimer, bubbleTimer, advanceTimer;
  let wordStarted = 0, wordDeadline = 0, pauseStarted = 0, remainingOnPause = 0;
  let inputHistory = '', composing = false;
  const fmt = number => number.toLocaleString();
  const unlocked = () => LEVELS.reduce((highest, level, index) => state.xp >= level.tier ? index : highest, 0);
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
    const highest = unlocked(), rank = LEVELS[highest], next = LEVELS[highest + 1];
    $('wallet').textContent = fmt(state.coins); $('shop-wallet').textContent = fmt(state.coins);
    $('rank-icon').textContent = rank.icon; $('rank-name').textContent = rank.name; $('rank-caption').textContent = rank.description;
    $('xp-value').textContent = fmt(state.xp) + (next ? ' / ' + fmt(next.tier) : ' XP');
    $('xp-fill').style.width = (next ? Math.min(100, 100 * (state.xp - rank.tier) / (next.tier - rank.tier)) : 100) + '%';
    $('next-level').textContent = next ? fmt(next.tier - state.xp) + ' points to unlock ' + next.name : 'Every level unlocked. Keep making little wins!';
    const selected = round ? round.level : state.selected;
    $('level-select').replaceChildren(...LEVELS.map((level, index) => {
      const option = document.createElement('option'); option.value = index;
      option.textContent = (index > highest ? '🔒 ' : level.icon + ' ') + level.name + (index > highest ? ' — ' + fmt(level.tier) + ' pts' : '');
      option.disabled = index > highest; return option;
    }));
    $('level-select').value = selected;
    const level = LEVELS[selected];
    $('level-details').textContent = level.description + ' ' + level.seconds + ' seconds per word.';
  }
  function applyDecorations() {
    const equipped = state.equipped;
    for (const slot of ['plant', 'art', 'lamp', 'bunting', 'ball', 'stars']) $('decor-' + slot).style.display = equipped[slot] ? '' : 'none';
    $('pet-bow').style.display = equipped.bow ? '' : 'none'; $('pet-glasses').style.display = equipped.glasses ? '' : 'none';
    $('pet-hat').style.display = equipped.hat ? '' : 'none'; $('pet-hat').innerHTML = HATS[equipped.hat] || '';
    $('wall-fill').setAttribute('fill', equipped.wall === 'wall-peach' ? '#edddce' : equipped.wall === 'wall-blue' ? '#d6e3e6' : '#dce7d8');
    $('rug-fill').setAttribute('fill', equipped.rug === 'rug-rose' ? '#cfa49d' : equipped.rug === 'rug-mint' ? '#a6bda3' : '#c7b59c');
  }

  // All music and effects are synthesized here; no audio downloads are required.
  const audio = {
    context: null, master: null, musicGain: null, effectsGain: null, loop: null, note: 0, nextNote: 0, unavailable: false,
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
    schedule() {
      if (!this.context || !state.music || document.hidden) return;
      const melody = [64,67,71,67,62,66,69,66,60,64,67,64,62,66,69,67,64,67,72,71,67,64,62,66,60,64,67,69,67,64,62,null];
      const chords = [[48,52,55],[50,54,57],[45,48,52],[47,50,55]];
      if (this.nextNote < this.context.currentTime) this.nextNote = this.context.currentTime + .05;
      while (this.nextNote < this.context.currentTime + .45) {
        const index = this.note % melody.length, midi = melody[index];
        if (midi !== null) {
          const frequency = 440 * 2 ** ((midi - 69) / 12);
          this.tone(frequency, this.nextNote, .85, .32, 'sine', true);
          this.tone(frequency * 2, this.nextNote, .3, .035, 'sine', true);
        }
        if (index % 8 === 0) for (const chordNote of chords[Math.floor(index / 8)]) this.tone(440 * 2 ** ((chordNote - 69) / 12), this.nextNote, 2.2, .11, 'triangle', true);
        this.nextNote += .39; this.note++;
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
    ['bounce','Boing! Certified bouncy cat.'], ['wiggle','The victory wiggle!'],
    ['spin','Pip.exe is spinning…'], ['flip','Did someone say plot twist?'],
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
    say(boop ? 'Boop received. Friendship increased. ♡' : line);
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
  $('pet-button').addEventListener('click', () => { petReaction(true); audio.effect('boop'); if (round && !round.paused) $('typing-input').focus(); });

  function shuffle(words) {
    const copy = words.slice();
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i],copy[j]] = [copy[j],copy[i]]; }
    return copy;
  }
  function setPlaying(playing) {
    $('typing-area').hidden = !playing; $('welcome-card').hidden = playing;
    $('timer-panel').hidden = !playing; $('round-stats').hidden = !playing;
    $('pause-button').hidden = !playing; $('room-mode').hidden = playing;
    $('start-button').disabled = playing; $('level-select').disabled = playing;
    $('shop-button').disabled = playing;
    $('start-button').innerHTML = playing ? 'Round in progress <span>✦</span>' : "Let's practice <span>↗</span>";
    $('room-label').textContent = playing ? LEVELS[round.level].name + ' · find your flow' : "Pip's happy place";
    $('start-footnote').textContent = playing ? 'Press Esc or Pause for a little breather.' : 'A few minutes for a happier, faster you.';
  }
  function startRound() {
    if (round || state.selected > unlocked()) return;
    audio.init(); audio.effect('start');
    const now = performance.now();
    round = { level: state.selected, words: shuffle(LEVELS[state.selected].words).slice(0,20), index: 0, correct: 0, score: 0, streak: 0, bestStreak: 0, chars: 0, typed: 0, mistakes: 0, startXp: state.xp, started: now, pausedMs: 0, paused: false, transitioning: false, typedSeconds: 0 };
    setPlaying(true); $('round-score').textContent = '0'; $('round-correct').textContent = '0 / 20';
    say("I'll handle the cheering. You handle the typing!",4000);
    showWord(); cancelAnimationFrame(frame); frame = requestAnimationFrame(tick);
    if (window.innerWidth < 780) $('room-scene').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
  }
  function showWord() {
    if (!round) return;
    if (round.index >= 20) { finishRound(); return; }
    clearTimeout(advanceTimer); round.transitioning = false;
    const level = LEVELS[round.level], target = round.words[round.index];
    wordStarted = performance.now(); wordDeadline = wordStarted + level.seconds * 1000;
    inputHistory = ''; $('typing-input').value = ''; $('typing-input').disabled = false;
    $('typing-input').classList.remove('has-error'); $('typing-input').focus({ preventScroll: true });
    $('round-progress').textContent = 'WORD ' + String(round.index + 1).padStart(2,'0') + ' / 20';
    $('combo-display').textContent = round.streak >= 2 ? '✦ ' + round.streak + ' word streak' : '✦ You got this';
    $('target-word').classList.toggle('long', target.length >= 13); renderWord(); fitWord();
    $('input-hint').textContent = 'No enter key needed. Just type!';
    $('time-left').textContent = level.seconds.toFixed(1) + 's'; $('timer-fill').style.width = '100%'; $('timer-fill').classList.remove('urgent');
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
    if (!round.paused && !round.transitioning) {
      const remaining = Math.max(0, wordDeadline - now), fraction = remaining / (LEVELS[round.level].seconds * 1000);
      $('timer-fill').style.width = (fraction * 100) + '%';
      $('timer-fill').classList.toggle('urgent', fraction < .25);
      $('time-left').textContent = (remaining / 1000).toFixed(1) + 's';
      if (remaining <= 0) expireWord();
    }
    if (round) frame = requestAnimationFrame(tick);
  }
  function settleWord(correct) {
    if (!round || round.paused || round.transitioning) return;
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
    if (!round || round.paused || round.transitioning || composing || event.isComposing) return;
    if (performance.now() >= wordDeadline) { expireWord(); return; }
    const target = round.words[round.index], value = $('typing-input').value.toLowerCase();
    // A pasted/dropped word should not award speed points. Typing remains the game.
    if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') { $('typing-input').value = inputHistory; toast('Give your fingers the practice — type this one yourself!'); return; }
    if (value.length > inputHistory.length) {
      const added = value.length - inputHistory.length; round.typed += added;
      for (let index = inputHistory.length; index < value.length; index++) if (value[index] !== target[index]) round.mistakes++;
    }
    inputHistory = value; renderWord();
    if (value === target) settleWord(true);
    else $('input-hint').textContent = target.startsWith(value) ? 'No enter key needed. Just type!' : 'A little typo — backspace and try again.';
  }
  $('typing-input').addEventListener('input',handleTyping);
  $('typing-input').addEventListener('compositionstart',() => { composing = true; });
  $('typing-input').addEventListener('compositionend',() => { composing = false; handleTyping({}); });
  for (const name of ['paste','drop']) $('typing-input').addEventListener(name,event => { event.preventDefault(); toast('Give your fingers the practice — type this one yourself!'); });
  $('typing-input').addEventListener('keydown',event => { if (event.key === 'Enter') event.preventDefault(); });

  function pauseRound() {
    if (!round || round.paused) return;
    if (!round.transitioning && performance.now() >= wordDeadline) expireWord();
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
    if (round.transitioning) showWord();
    else { wordStarted += duration; wordDeadline = now + remainingOnPause; $('typing-input').disabled = false; $('typing-input').focus({ preventScroll: true }); }
  }
  function finishRound(early = false) {
    if (!round) return;
    clearTimeout(advanceTimer); cancelAnimationFrame(frame);
    if (round.paused) { round.pausedMs += performance.now() - pauseStarted; $('pause-dialog').close(); }
    const result = round;
    const priorLevel = LEVELS.reduce((highest,level,index) => result.startXp >= level.tier ? index : highest,0);
    const currentLevel = unlocked();
    // Standard typing speed: correct characters / five / active typing minutes.
    const wpm = result.typedSeconds > 0 ? Math.round((result.chars / 5) / (result.typedSeconds / 60)) : 0;
    const accuracy = result.typed ? Math.max(0,Math.round((1 - result.mistakes / result.typed) * 100)) : 0;
    if (!early) state.rounds++;
    state.bestWpm = Math.max(state.bestWpm,wpm);
    round = null; $('room-card').classList.remove('paused'); setPlaying(false); updateProgress(); save();
    $('summary-title').textContent = early ? 'Every little bit counts.' : result.correct === 20 ? 'A perfect little round!' : result.correct >= 12 ? 'Look at you go!' : 'Practice makes progress.';
    $('summary-copy').textContent = early ? 'You finished early. Your points and coins are saved.' : LEVELS[result.level].name + ' complete · ' + accuracy + '% typing accuracy · best streak: ' + result.bestStreak;
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
    if (event.key === 'Escape' && round && !round.paused && !$('pause-dialog').open) { event.preventDefault(); pauseRound(); }
  });
  document.addEventListener('visibilitychange',() => { if (document.hidden && round && !round.paused) pauseRound(); audio.sync(); });
  window.addEventListener('pagehide',save);

  function renderShop() {
    $('shop-wallet').textContent = fmt(state.coins);
    const grid = $('shop-grid'); grid.replaceChildren(); grid.setAttribute('aria-labelledby','tab-' + shopCategory);
    for (const item of ITEMS.filter(item => item.category === shopCategory)) {
      const owned = state.owned.includes(item.id), equipped = state.equipped[item.slot] === item.id;
      const card = document.createElement('article'); card.className = 'shop-item' + (equipped ? ' equipped' : '');
      const art = document.createElement('div'); art.className = 'item-art'; art.setAttribute('aria-hidden','true');
      if (item.slot === 'hat') art.innerHTML = '<svg viewBox="-60 -130 120 110">' + HATS[item.id] + '</svg>';
      else art.textContent = item.art;
      const details = document.createElement('div'); details.className = 'item-details';
      const title = document.createElement('h3'); title.textContent = item.name;
      const description = document.createElement('p'); description.textContent = item.desc;
      const button = document.createElement('button'); button.className = 'item-button' + (equipped ? ' equipped' : '');
      button.textContent = equipped ? '✓ Equipped · put away' : owned ? 'Equip item' : '✦ ' + fmt(item.price) + ' · Buy';
      button.disabled = !owned && state.coins < item.price;
      button.setAttribute('aria-label',(equipped ? 'Put away ' : owned ? 'Equip ' : 'Buy ') + item.name + (owned ? '' : ' for ' + item.price + ' coins'));
      if (button.disabled) button.title = 'Earn ' + fmt(item.price - state.coins) + ' more coins';
      button.addEventListener('click',() => {
        if (round) return;
        if (!state.owned.includes(item.id)) {
          if (state.coins < item.price) return;
          state.coins -= item.price; state.owned.push(item.id); state.equipped[item.slot] = item.id;
          audio.effect('buy'); toast(item.name + ' is yours!');
        } else if (state.equipped[item.slot] === item.id) { delete state.equipped[item.slot]; audio.effect('equip'); }
        else { state.equipped[item.slot] = item.id; audio.effect('equip'); }
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
  updateAudioButtons(); updateProgress(); applyDecorations();
})();
