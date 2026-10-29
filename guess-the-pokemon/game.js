'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const SAVE_KEY = 'guess-the-pokemon.progress.v1';
  const ROUND_COUNT = 10;
  const clueNames = ['The measurements', 'An observation', 'The type', 'The family tree', 'The name hint'];
  const progress = { version: 1, best: 0, discovered: [] };
  let expedition = [];
  let round = 0;
  let clue = 0;
  let score = 0;
  let solved = 0;
  let finished = false;
  let guessed = new Set();
  let recap = [];

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    let saved = null;
    try {
      saved = JSON.parse(raw);
    } catch {
      // A damaged save starts fresh without disabling future saves.
    }
    if (saved && saved.version === 1) {
      progress.best = Number.isInteger(saved.best) && saved.best >= 0 && saved.best <= 50 ? saved.best : 0;
      if (Array.isArray(saved.discovered)) {
        progress.discovered = [...new Set(saved.discovered.filter(id => Number.isInteger(id) && id >= 1 && id <= 151))];
      }
    }
  } catch {
    $('storage-note').hidden = false;
  }

  function saveProgress() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
    } catch {
      $('storage-note').hidden = false;
    }
  }

  function normalize(name) {
    return name.toLowerCase().replace(/♀/g, 'female').replace(/♂/g, 'male')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  }

  const answers = new Map();
  for (const pokemon of KANTO_POKEMON) {
    answers.set(normalize(pokemon.name), pokemon.id);
    const option = document.createElement('option');
    option.value = pokemon.name;
    $('pokemon-names').append(option);
  }
  for (const alias of ['nidoranf', 'nidoranfemale', 'femalenidoran']) answers.set(alias, 29);
  for (const alias of ['nidoranm', 'nidoranmale', 'malenidoran']) answers.set(alias, 32);

  function feedback(message, success = false) {
    $('feedback').textContent = message;
    $('feedback').classList.toggle('success', success);
  }

  function updateStats() {
    $('round-stat').replaceChildren(document.createTextNode(String(round + 1).padStart(2, '0') + ' '));
    const total = document.createElement('small');
    total.textContent = '/ ' + ROUND_COUNT;
    $('round-stat').append(total);
    for (const [id, value, suffix] of [
      ['score-stat', score, 'pts'], ['best-stat', progress.best, '/ 50'],
      ['collection-stat', progress.discovered.length, '/ 151']
    ]) {
      const small = document.createElement('small');
      small.textContent = suffix;
      $(id).replaceChildren(document.createTextNode(value + ' '), small);
    }
  }

  function renderClues() {
    const pokemon = expedition[round];
    $('clue-list').replaceChildren();
    for (let i = 0; i < 5; i++) {
      const open = finished || i <= clue;
      const item = document.createElement('li');
      item.className = 'clue ' + (open ? (!finished && i === clue ? 'current' : 'opened') : 'locked');
      if (!finished && i === clue) item.setAttribute('aria-current', 'step');
      const number = document.createElement('span');
      number.className = 'clue-number';
      number.textContent = String(i + 1).padStart(2, '0');
      number.setAttribute('aria-hidden', 'true');
      const content = document.createElement('div');
      const title = document.createElement('span');
      title.className = 'clue-name';
      title.textContent = 'CLUE ' + (i + 1) + ' · ' + (open ? clueNames[i].toUpperCase() : 'LOCKED');
      const text = document.createElement('p');
      text.textContent = open ? pokemon.clues[i] : 'A little easier. A little closer.';
      content.append(title, text);
      item.append(number, content);
      $('clue-list').append(item);
    }
    $('clue-counter').textContent = (finished ? 5 : clue + 1) + ' OF 5 OPENED';
    $('clue-button').disabled = clue === 4;
    $('clue-button').textContent = clue === 4 ? 'Final clue opened' : 'Next clue →';
    if (!finished) {
      const points = document.createElement('strong');
      points.textContent = (5 - clue) + (clue === 4 ? ' point' : ' points');
      $('points-label').replaceChildren(document.createTextNode('Solve this clue for '), points);
    }
  }

  function startRound(focus = false) {
    clue = 0;
    finished = false;
    guessed = new Set();
    $('guess-form').hidden = false;
    $('round-actions').hidden = false;
    $('next-button').hidden = true;
    $('guess-input').value = '';
    $('pokemon-art').hidden = true;
    $('pokemon-art').removeAttribute('src');
    $('pokemon-art').alt = '';
    $('art-fallback').hidden = true;
    $('mystery-ball').hidden = false;
    $('answer-types').hidden = true;
    $('answer-types').replaceChildren();
    $('answer-name').replaceChildren(document.createTextNode('A familiar face.'), document.createElement('br'), document.createTextNode('A hidden identity.'));
    $('specimen-label').textContent = 'UNIDENTIFIED POKÉMON';
    $('specimen-number').textContent = 'NO. ???';
    document.querySelector('.specimen').classList.remove('revealed');
    feedback('');
    renderClues();
    updateStats();
    if (focus) $('guess-input').focus({ preventScroll: true });
  }

  function reveal(correct) {
    if (finished) return;
    finished = true;
    const pokemon = expedition[round];
    const earned = correct ? 5 - clue : 0;
    score += earned;
    if (correct) {
      solved++;
      if (!progress.discovered.includes(pokemon.id)) progress.discovered.push(pokemon.id);
    }
    recap.push({ pokemon, earned });
    if (round === ROUND_COUNT - 1) progress.best = Math.max(progress.best, score);
    saveProgress();
    $('mystery-ball').hidden = true;
    $('pokemon-art').alt = pokemon.name;
    $('pokemon-art').src = 'assets/pokemon/' + pokemon.id + '.png';
    $('pokemon-art').hidden = false;
    document.querySelector('.specimen').classList.add('revealed');
    $('answer-name').textContent = pokemon.name;
    $('specimen-label').textContent = correct ? 'IDENTIFICATION COMPLETE' : 'MYSTERY REVEALED';
    $('specimen-number').textContent = 'NO. ' + String(pokemon.id).padStart(3, '0');
    for (const type of pokemon.types) {
      const badge = document.createElement('span');
      badge.textContent = type;
      $('answer-types').append(badge);
    }
    $('answer-types').hidden = false;
    $('points-label').textContent = correct ? '+' + earned + (earned === 1 ? ' point. ' : ' points. ') + 'Great fieldwork!' : 'A new face for your field notes.';
    $('guess-form').hidden = true;
    $('round-actions').hidden = true;
    $('next-button').hidden = false;
    $('next-button').textContent = round === ROUND_COUNT - 1 ? 'See expedition results →' : 'Next Pokémon →';
    feedback(correct ? 'You got it! It’s ' + pokemon.name + '.' : 'It’s ' + pokemon.name + '. All five clues are now open.', correct);
    renderClues();
    updateStats();
    $('next-button').focus({ preventScroll: true });
  }

  function openClue(message) {
    if (finished || clue >= 4) return;
    clue++;
    $('guess-input').value = '';
    renderClues();
    feedback(message + ' Clue ' + (clue + 1) + ': ' + expedition[round].clues[clue]);
    $('guess-input').focus({ preventScroll: true });
  }

  $('guess-form').addEventListener('submit', event => {
    event.preventDefault();
    if (finished) return;
    const key = normalize($('guess-input').value);
    const id = answers.get(key);
    if (!id) {
      feedback(key === 'nidoran' ? 'Choose Nidoran♀ (F) or Nidoran♂ (M). This guess has not been used.' : 'Pick a Pokémon from the original 151. Check the spelling or choose a suggestion — this guess has not been used.');
      $('guess-input').focus({ preventScroll: true });
      return;
    }
    if (guessed.has(id)) {
      feedback('You already tried that Pokémon. Try another name; this guess has not been used.');
      $('guess-input').select();
      return;
    }
    guessed.add(id);
    if (id === expedition[round].id) reveal(true);
    else if (clue === 4) reveal(false);
    else openClue('Not ' + KANTO_POKEMON.find(pokemon => pokemon.id === id).name + ' — another clue might help.');
  });

  $('clue-button').addEventListener('click', () => openClue('Another page from the field notes.'));
  $('reveal-button').addEventListener('click', () => reveal(false));
  $('pokemon-art').addEventListener('error', () => {
    if (!finished) return;
    $('pokemon-art').hidden = true;
    $('art-fallback').hidden = false;
  });
  $('next-button').addEventListener('click', () => {
    if (!finished) return;
    if (round < ROUND_COUNT - 1) {
      round++;
      startRound(true);
    } else showSummary();
  });

  function showSummary() {
    $('game-layout').hidden = true;
    $('summary').hidden = false;
    $('summary-score').textContent = score + ' / 50';
    $('summary-title').textContent = score >= 40 ? 'A true Kanto expert.' : score >= 20 ? 'Nice detective work.' : 'Every clue is a discovery.';
    $('summary-message').textContent = 'You identified ' + solved + ' of 10 Pokémon. ' + (score === progress.best && score > 0 ? 'That matches your best expedition!' : 'Ready to meet ten more?');
    $('round-recap').replaceChildren();
    for (const { pokemon, earned } of recap) {
      const card = document.createElement('div');
      card.className = 'recap-card';
      const image = document.createElement('img');
      image.src = 'assets/pokemon/' + pokemon.id + '.png';
      image.alt = '';
      image.width = 85;
      image.height = 85;
      const name = document.createElement('strong');
      name.textContent = pokemon.name;
      const points = document.createElement('span');
      points.textContent = earned ? '+' + earned + (earned === 1 ? ' point' : ' points') : 'Revealed';
      card.append(image, name, points);
      $('round-recap').append(card);
    }
    $('summary-title').focus({ preventScroll: true });
    $('summary').scrollIntoView({ block: 'start' });
  }

  function startExpedition(focus = false) {
    const pool = [...KANTO_POKEMON];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    expedition = pool.slice(0, ROUND_COUNT);
    round = 0;
    score = 0;
    solved = 0;
    recap = [];
    $('summary').hidden = true;
    $('game-layout').hidden = false;
    startRound(focus);
  }

  $('play-again').addEventListener('click', () => startExpedition(true));
  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  startExpedition();
})();
