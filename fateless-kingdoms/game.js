(() => {
  'use strict';
  const E = window.FKEngine, { cards: C, ids: IDS, rows: ROWS } = window.FKCards;
  const $ = id => document.getElementById(id);
  const SAVE_KEY = 'fateless-kingdoms.match.v1';
  const FX = window.FKEffects, audio = window.FKAudio;
  const RULES_URL = 'https://docs.google.com/document/d/1_rJXssMNrrnKWMbWg0otcn4MHUxq_NDlfLKYHsIC2Lc/edit';
  let state, level = 'tactician', selected = null, inspected = null, selections = {}, picked = [], busy = false, worker = null, job = 0, saveAvailable = true;
  let lobbyOpen = true, animating = false, presentation = 0, coinStarter = null, coinTimer = null;
  let loaded = false;
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (E.validState(saved?.state)) { state = saved.state; loaded = true; if (['casual', 'tactician', 'strategist'].includes(saved.level)) level = saved.level; }
  } catch (_) { /* A blocked or corrupt save must not prevent a fresh match. */ }
  if (!state) state = E.newMatch(0);
  function node(tag, className, text) { const n = document.createElement(tag); if (className) n.className = className; if (text !== undefined) n.textContent = text; return n; }
  function button(text, className, action) { const n = node('button', className, text); if (action) n.dataset.action = action; return n; }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ state, level })); }
    catch (_) { saveAvailable = false; }
    $('save-note').textContent = saveAvailable ? 'Your match saves on this browser.' : 'Browser storage is unavailable. Keep this tab open to keep your match.';
  }
  const myTurn = () => !lobbyOpen && !animating && state.phase === 'playing' && state.turn === 0 && !busy && !state.players[0].passed;
  const currentPrompt = () => selected && myTurn() ? E.prompt(state, 0, selected, selections) : null;
  const canChoose = value => currentPrompt()?.kind === 'choice' && currentPrompt().options.some(o => o.value === value);
  function selectChoice(value) {
    const q = currentPrompt();
    if (!q || q.kind !== 'choice' || !q.options.some(o => o.value === value)) return;
    if (q.count === 1) { selections[q.key] = [value]; picked = []; }
    else {
      if (picked.includes(value)) picked = picked.filter(x => x !== value);
      else if (picked.length < q.count) picked.push(value);
    }
    render();
  }
  function resetSelection() { selected = null; selections = {}; picked = []; }
  function mobileFocus(id) {
    if (window.matchMedia('(max-width: 980px)').matches) $(id).scrollIntoView({ behavior: FX.reduced() ? 'auto' : 'smooth', block: 'start' });
  }
  function cardButton(id, context = 'board', p = null) {
    const c = C[id], n = button('', `card ${context}-card ${c.type}`, null);
    n.dataset.card = id; n.dataset.context = context; n.dataset.focus = `${context}-${id}`;
    const current = context === 'board' && c.type === 'unit' ? E.power(state, id) : c.power;
    n.setAttribute('aria-label', `${c.name}${c.type === 'unit' ? `, ${current} power, ${c.row}` : `, ${c.type}`}${c.abilityName ? `, ${c.abilityName}` : ''}${context === 'hand' ? ', select to play' : ', inspect card'}`);
    n.title = `${c.name}${c.type === 'unit' ? ` · ${current} power` : ''}`;
    const img = node('img'); img.src = c.image; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; n.append(img);
    if (c.type === 'unit' && context !== 'hand') {
      const value = node('span', `power-badge ${current > c.power ? 'boosted' : current < c.power ? 'reduced' : ''}`, String(current));
      value.setAttribute('aria-hidden', 'true'); n.append(value);
    }
    if (context === 'hand') {
      if (selected === id) n.classList.add('selected');
      if (myTurn() && E.prompt(state, 0, id).kind === 'blocked') n.classList.add('unplayable');
      n.append(node('span', 'card-caption', c.name));
    }
    if (canChoose(id)) n.classList.add('targetable');
    if (picked.includes(id)) n.classList.add('target-picked');
    if (context === 'board' && c.type === 'unit') {
      if (E.protectedFrom(state, id, true)) { n.classList.add('protected-card'); n.append(node('span', 'protection-mark', '◇')); }
      if (p !== null && state.players[p].rows[c.row].includes('omen-ironward')) n.classList.add('omen-protected');
    }
    if (p !== null) n.dataset.side = String(p);
    return n;
  }
  function renderRow(p, row) {
    const rowNode = node('div', `battle-row row-${row}${E.blocked(state, p, row) ? ' blocked-row' : ''}`);
    const rowCards = state.players[p].rows[row], effects = node('div', 'row-effects'); effects.setAttribute('aria-hidden', 'true');
    const warded = rowCards.includes('omen-ironward');
    if (!warded) state.weather.filter(w => C[w.id].weather === row).forEach(w => effects.append(node('span', `row-effect effect-${C[w.id].effect}`)));
    ['dread', 'war-chant', 'ironward', 'sanctuary'].forEach(effect => { if (rowCards.includes(`omen-${effect}`) && !(warded && effect === 'war-chant')) effects.append(node('span', `row-effect effect-${effect}`)); });
    if (rowCards.includes('siege-0')) effects.append(node('span', 'row-effect effect-shielded'));
    rowNode.append(effects);
    const meta = node('div', 'row-meta');
    meta.append(node('span', 'row-icon', { combat: '⚔', ranged: '➶', siege: '♜' }[row]), node('span', 'row-name', row), node('strong', 'row-score', String(E.rowScore(state, p, row))));
    rowNode.append(meta);
    const lane = node('div', 'row-cards');
    const cards = state.players[p].rows[row];
    const chooseRow = canChoose(`${p}:${row}`);
    if (chooseRow) { const b = button(`Place ${C[selected].name} here`, 'row-target'); b.dataset.choice = `${p}:${row}`; lane.append(b); rowNode.classList.add('target-row'); }
    if (!cards.length && !chooseRow) lane.append(node('span', 'empty-row', E.blocked(state, p, row) ? 'Sealed by Dread' : '—'));
    cards.forEach(id => lane.append(cardButton(id, 'board', p)));
    rowNode.append(lane);
    const status = node('div', 'row-status');
    if (E.blocked(state, p, row)) status.append(node('span', 'row-tag dread-tag', 'Dread'));
    if (cards.includes('omen-ironward')) status.append(node('span', 'row-tag', 'Omen ward'));
    if (cards.includes('omen-sanctuary')) status.append(node('span', 'row-tag', 'Spell ward'));
    if (cards.includes('siege-0')) status.append(node('span', 'row-tag', 'Shielded'));
    if (!cards.includes('omen-ironward') && state.weather.some(w => C[w.id].weather === row)) { rowNode.classList.add('weathered'); status.append(node('span', 'row-tag weather-tag', 'Weather')); }
    rowNode.append(status);
    return rowNode;
  }
  function renderField() {
    const field = $('battlefield'); field.replaceChildren();
    const enemy = node('div', 'field-half enemy-half'); enemy.setAttribute('aria-label', 'Rival field');
    [...ROWS].reverse().forEach(row => enemy.append(renderRow(1, row))); field.append(enemy);
    const middle = node('div', 'weather-strip'); middle.setAttribute('aria-label', 'Battlefield Omens affecting both players');
    const weatherLabel = node('div', 'weather-heading'); weatherLabel.append(node('span', 'weather-label', 'BATTLEFIELD OMENS'), node('span', 'weather-subtitle', 'Affects both kingdoms')); middle.append(weatherLabel);
    const weatherCards = node('div', 'weather-cards');
    if (state.weather.length) for (const w of state.weather) { const b = cardButton(w.id, 'weather', w.owner); b.append(node('span', 'weather-card-name', C[w.id].name)); weatherCards.append(b); }
    else weatherCards.append(node('span', 'weather-empty', '✦ Clear skies'));
    middle.append(weatherCards);
    field.append(middle);
    const own = node('div', 'field-half own-half'); own.setAttribute('aria-label', 'Your field');
    ROWS.forEach(row => own.append(renderRow(0, row))); field.append(own);
  }
  function winnerText() {
    const a = state.players[0].wins, b = state.players[1].wins;
    if (state.phase === 'gameOver') return a >= 2 && b >= 2 ? 'Two kingdoms. One shared victory.' : a >= 2 ? 'The kingdom is yours.' : 'The rival takes the kingdom.';
    const r = state.rounds[state.rounds.length - 1];
    return r.winner === null ? 'A draw. Both kingdoms gain a win.' : r.winner === 0 ? 'This battle is yours.' : 'The rival wins this battle.';
  }
  function renderInspector() {
    const root = $('inspector'); root.replaceChildren();
    if (state.phase !== 'playing') {
      root.classList.add('result-panel');
      root.append(node('div', 'result-crest', state.phase === 'gameOver' ? '♛' : '⚔'), node('span', 'eyebrow', state.phase === 'gameOver' ? 'Match complete' : `Round ${state.round} complete`), node('h2', '', winnerText()));
      const rounds = node('div', 'round-summary');
      state.rounds.forEach(r => { const line = node('div'); line.append(node('span', '', `Round ${r.round}`), node('b', '', `${r.scores[0]} — ${r.scores[1]}`)); rounds.append(line); }); root.append(rounds);
      root.append(node('p', 'result-note', state.phase === 'roundEnd' ? `Your remaining ${state.players[0].hand.length} cards carry forward. No new cards are dealt.` : 'Every pass, every sacrifice, every card held back. Ready for another?'));
      root.append(button(state.phase === 'roundEnd' ? 'Next round →' : 'Play again →', 'primary', state.phase === 'roundEnd' ? 'next-round' : 'new-match'));
      return;
    }
    root.classList.remove('result-panel');
    const id = selected || inspected || state.lastCard?.id;
    if (!id) {
      root.append(node('span', 'eyebrow', 'The art of restraint'), node('div', 'idle-crest', '♜'), node('h2', '', 'Outthink. Outlast.'), node('p', 'inspector-copy', 'Select a card in your hand to read its ability. Choose your targets, then commit your play.'), node('p', 'inspector-tip', 'You have the same hand across all rounds. A narrow win can be worth more than a glorious one.'));
      return;
    }
    const c = C[id];
    const heading = node('div', 'section-label'); heading.append(node('span', '', selected ? 'Your next move' : 'Card details'), node('span', '', c.type === 'unit' ? c.row : c.type)); root.append(heading);
    const art = button('', 'inspect-art'); art.dataset.zoom = id; art.setAttribute('aria-label', `Enlarge ${c.name}`);
    const img = node('img'); img.src = c.image; img.alt = c.name; art.append(img); root.append(art);
    root.append(node('h2', '', c.name));
    if (c.abilityName) root.append(node('span', 'ability-label', c.abilityName));
    root.append(node('p', 'inspector-copy', c.text));
    const q = currentPrompt();
    if (selected && q) {
      if (q.kind === 'blocked') root.append(node('p', 'warning-message', q.message));
      if (q.kind === 'choice') {
        root.append(node('h3', 'choice-title', q.title));
        if (q.count > 1) root.append(node('p', 'choice-progress', `${picked.length} of ${q.count} selected`));
        const list = node('div', 'choice-list');
        q.options.forEach(o => { const b = button(o.label, `choice-button${picked.includes(o.value) ? ' chosen' : ''}`); b.dataset.choice = o.value; b.setAttribute('aria-pressed', String(picked.includes(o.value))); if (o.card) { const im = node('img'); im.src = C[o.card].image; im.alt = ''; b.prepend(im); } list.append(b); }); root.append(list);
        if (q.count > 1) { const b = button('Confirm targets →', 'primary', 'confirm-targets'); b.disabled = picked.length !== q.count; root.append(b); }
      } else if (q.kind === 'ready') {
        const a = q.action;
        const targets = [...new Set(['restore', 'kill', 'convert', 'decoy', 'sacrifice', 'recover', 'weakest'].flatMap(k => a[k] || []))];
        if (a.row?.length) { const [p, row] = a.row[0].split(':'); root.append(node('p', 'target-summary', `Place on ${p === '0' ? 'your' : 'the rival’s'} ${row} row.`)); }
        else if (targets.length) root.append(node('p', 'target-summary', `Targets: ${targets.map(t => C[t].name).join(', ')}.`));
        else if (c.type === 'unit') root.append(node('p', 'target-summary', `Play on ${a.destination === 0 ? 'your' : 'the rival’s'} ${c.row} row.`));
        else root.append(node('p', 'target-summary', c.effect === 'patience' ? 'Spend this turn without passing.' : c.type === 'omen' ? 'Affects both kingdoms.' : 'Resolve all available effects, then return this Spell to the bottom of the deck.'));
        root.append(button(`Play ${c.name} →`, 'primary', 'play-card'));
      }
      root.append(button('Cancel selection', 'text-button cancel-selection', 'cancel-selection'));
    } else if (state.players[0].hand.includes(id) && myTurn()) { const b = button('Select this card →', 'primary'); b.dataset.select = id; root.append(b); }
  }
  function render() {
    const focus = document.activeElement?.dataset.focus;
    $('round-label').textContent = `Round ${['I', 'II', 'III'][state.round - 1]} / III`;
    $('deck-count').textContent = `${state.deck.length} in shared deck`;
    [0, 1].forEach(p => {
      const prefix = p === 0 ? 'human' : 'cpu', player = state.players[p];
      $(`${prefix}-score`).textContent = E.score(state, p);
      $(`${prefix}-meta`).textContent = `${player.hand.length} cards in hand${player.passed ? ' · Passed' : ''}`;
      const wins = $(`${prefix}-wins`); wins.replaceChildren(); wins.setAttribute('aria-label', `${player.wins} of 2 round wins`);
      for (let i = 0; i < 2; i++) wins.append(node('span', i < player.wins ? 'won' : '', '◆'));
    });
    let banner;
    if (lobbyOpen) banner = 'Begin a game to flip the coin and take your seat.';
    else if (animating) banner = 'Resolving the play…';
    else if (state.phase !== 'playing') banner = winnerText();
    else if (busy || state.turn === 1) banner = 'The rival is considering its next move…';
    else if (selected) banner = currentPrompt()?.kind === 'choice' ? 'Choose the highlighted targets or use the card panel.' : 'Review your card, then commit your play.';
    else banner = state.players[1].passed ? 'The rival has passed. Play on, or pass to settle the round.' : 'Your move. Play one card, or pass.';
    $('turn-banner').textContent = banner; $('turn-banner').classList.toggle('cpu-thinking', busy);
    renderField();
    const hand = $('hand'), scroll = hand.scrollLeft, sort = $('sort-hand').value;
    hand.replaceChildren();
    const sorted = state.players[0].hand.slice().sort((a, b) => {
      if (sort === 'power') return (C[b].power ?? -1) - (C[a].power ?? -1) || C[a].name.localeCompare(C[b].name);
      const rank = c => c.type === 'unit' ? ROWS.indexOf(c.row) : c.type === 'spell' ? 3 : 4;
      return rank(C[a]) - rank(C[b]) || (sort === 'type' ? C[a].name.localeCompare(C[b].name) : (C[b].power || 0) - (C[a].power || 0));
    });
    const cardWidth = parseFloat(getComputedStyle(hand).getPropertyValue('--hand-card-width')) || 110;
    const overlap = sorted.length > 1 ? Math.min(cardWidth - 34, Math.max(30, (sorted.length * cardWidth - hand.clientWidth + 48) / (sorted.length - 1))) : 0;
    hand.style.setProperty('--hand-overlap', `${overlap}px`);
    sorted.forEach((id, index) => { const b = cardButton(id, 'hand'); const offset = index - (sorted.length - 1) / 2; b.style.setProperty('--fan-angle', `${Math.max(-7, Math.min(7, offset * .8))}deg`); b.style.setProperty('--fan-y', `${Math.abs(offset) * .65}px`); b.style.zIndex = String(index + 1); hand.append(b); });
    if (!sorted.length) hand.append(node('p', 'empty-hand', 'Your hand is empty. Pass to end your part in this round.'));
    hand.scrollLeft = scroll;
    $('hand-count').textContent = `(${sorted.length})`;
    const pass = $('pass-button'); pass.disabled = !myTurn(); pass.textContent = state.players[0].passed ? 'You have passed' : 'Pass this round →'; pass.dataset.focus = 'pass';
    [0, 1].forEach(p => {
      const pile = $(p === 0 ? 'human-grave' : 'cpu-grave'), grave = state.players[p].grave, top = grave[grave.length - 1];
      pile.setAttribute('aria-label', `${p === 0 ? 'Your' : 'Rival'} destroyed pile, ${grave.length} cards. Click to browse.`);
      pile.querySelector('.pile-count').textContent = String(grave.length);
      pile.classList.toggle('empty-pile', !top);
      const image = pile.querySelector('img'); image.hidden = !top; if (top) image.src = C[top].image; else image.removeAttribute('src');
    });
    renderInspector();
    const history = $('history'); history.replaceChildren();
    publicChronicle(state.log).slice(-7).reverse().forEach(entry => { const item = node('li'); item.append(node('span', 'history-round', `R${entry.round}`), node('span', '', entry.text)); history.append(item); });
    if (focus) document.querySelector(`[data-focus="${focus}"]`)?.focus({ preventScroll: true });
  }
  function publicChronicle(entries) {
    let actor = null;
    return entries.map(entry => {
      if (/^The CPU plays /.test(entry.text)) actor = 1;
      if (/^You play /.test(entry.text)) actor = 0;
      if ((actor !== 0 && /returns?.*hand/.test(entry.text) && !/^The CPU returns /.test(entry.text) && !/your hand/.test(entry.text)) || /returns? to the CPU.s hand/.test(entry.text)) return { ...entry, text: 'The CPU returns cards to its hand.' };
      return entry;
    });
  }
  async function presentMove(actor, move) {
    const before = state, snapshot = FX.capture(), next = E.play(state, actor, move), ticket = ++presentation;
    animating = true; state = next; resetSelection(); inspected = state.lastCard?.id; save(); render();
    try { await FX.transition(before, next, snapshot, actor, move); } catch (_) { FX.cancel(); }
    if (ticket !== presentation) return;
    animating = false; busy = false; render(); if (actor === 0) mobileFocus('turn-banner'); tick();
  }
  function commit(move) {
    if (!myTurn()) return;
    presentMove(0, move).catch(error => { animating = false; render(); $('turn-banner').textContent = error.message; });
  }
  async function fallbackCPU(view, token) {
    try {
      const result = await window.FKCPU.choose(view, level, () => new Promise(resolve => setTimeout(resolve, 0)));
      completeCPU(token, result.move);
    } catch (_) { completeCPU(token, { pass: true }); }
  }
  function completeCPU(token, move) {
    if (token !== job || state.phase !== 'playing' || state.turn !== 1) return;
    presentMove(1, move).catch(() => { animating = false; busy = false; if (state.phase === 'playing' && state.turn === 1) presentMove(1, { pass: true }); else { render(); tick(); } });
  }
  function tick() {
    if (lobbyOpen || animating || busy || state.phase !== 'playing' || state.turn !== 1) return;
    busy = true; render(); const token = ++job, view = E.publicView(state, 1);
    setTimeout(() => {
      if (token !== job) return;
      // file:// commonly disallows workers. The yielding local fallback needs no server.
      if (location.protocol === 'file:' || typeof Worker === 'undefined') { fallbackCPU(view, token); return; }
      try {
        if (!worker) {
          worker = new Worker('cpu-worker.js');
          worker.onmessage = event => {
            if (event.data.job !== job) return;
            if (event.data.error) { worker.terminate(); worker = null; fallbackCPU(E.publicView(state, 1), job); }
            else completeCPU(event.data.job, event.data.result.move);
          };
          worker.onerror = () => { worker?.terminate(); worker = null; if (busy && state.turn === 1) fallbackCPU(E.publicView(state, 1), job); };
        }
        worker.postMessage({ job: token, view, level });
      } catch (_) { fallbackCPU(view, token); }
    }, 350);
  }
  function newMatch() {
    job++; presentation++; FX.cancel(); worker?.terminate(); worker = null; busy = false; animating = false;
    state = E.newMatch(0); resetSelection(); inspected = null; render(); showLobby(false);
  }
  function showLobby(resume) {
    lobbyOpen = true; $('begin-button').disabled = false; $('resume-button').disabled = false; $('resume-button').hidden = !resume; $('welcome-music').checked = audio.getSettings().music;
    if (resume) $('resume-button').textContent = `Resume saved match · Round ${state.round}`;
    render(); $('welcome-dialog').showModal();
  }
  async function flipCoin() {
    if (!lobbyOpen || $('begin-button').disabled) return;
    $('begin-button').disabled = true; $('resume-button').disabled = true;
    await audio.configure({ music: $('welcome-music').checked }); audio.play('coin');
    $('welcome-dialog').close(); coinStarter = Math.random() < .5 ? 0 : 1;
    const coin = $('coin'); coin.classList.remove('flipping', 'settled'); coin.style.setProperty('--coin-turn', `${1800 + (coinStarter === 1 ? 180 : 0)}deg`);
    $('coin-result').textContent = 'Flipping the coin…'; $('start-round-button').disabled = true; $('coin-dialog').showModal();
    void coin.offsetWidth; coin.classList.add('flipping');
    clearTimeout(coinTimer); coinTimer = setTimeout(() => { coin.classList.add('settled'); $('coin-result').textContent = coinStarter === 0 ? 'Heads. Your kingdom goes first.' : 'Tails. The rival kingdom goes first.'; $('start-round-button').disabled = false; audio.play('sanctuary'); }, FX.reduced() ? 0 : 2100);
  }
  function openDialog(title) { $('content-title').textContent = title; $('content-body').replaceChildren(); if (!$('content-dialog').open) $('content-dialog').showModal(); return $('content-body'); }
  function showCard(id, returnTo = null) {
    const root = openDialog(C[id].name);
    if (returnTo === 'collection') root.append(button('← All cards', 'text-button', 'collection'));
    else if (returnTo !== null) { const b = button('← Back to destroyed pile', 'text-button', 'back-grave'); b.dataset.player = String(returnTo); root.append(b); }
    const layout = node('div', 'zoom-layout'), img = node('img'); img.src = C[id].image; img.alt = `${C[id].name} printed card`; layout.append(img);
    const copy = node('div'); copy.append(node('span', 'eyebrow', C[id].type === 'unit' ? `${C[id].row} · ${C[id].power} base power` : C[id].type), node('h3', '', C[id].abilityName || C[id].name), node('p', '', C[id].text));
    if (E.locate(state, id) && C[id].type === 'unit') copy.append(node('p', 'live-power', `Current power: ${E.power(state, id)}`));
    layout.append(copy); root.append(layout);
  }
  function showCollection() {
    const root = openDialog('The 62 cards');
    root.append(node('p', 'dialog-intro', 'One copy of every card in one shared deck. Select a card to read its printed artwork and rulings.'));
    const search = node('input', 'collection-search'); search.type = 'search'; search.placeholder = 'Find a card, ability or row…'; search.setAttribute('aria-label', 'Search the card collection'); root.append(search);
    const grid = node('div', 'collection-grid'); root.append(grid);
    const populate = () => { grid.replaceChildren(); const query = search.value.toLowerCase().trim(); IDS.filter(id => `${C[id].name} ${C[id].abilityName || ''} ${C[id].row || ''} ${C[id].type}`.toLowerCase().includes(query)).forEach(id => { const b = cardButton(id, 'collection'); b.dataset.collectionCard = id; grid.append(b); }); if (!grid.children.length) grid.append(node('p', '', 'No matching cards.')); };
    search.addEventListener('input', populate); populate();
  }
  function showGrave(p) {
    const root = openDialog(p === 0 ? 'Your destroyed pile' : 'Rival destroyed pile');
    const tabs = node('div', 'grave-tabs'); [0, 1].forEach(player => { const b = button(`${player === 0 ? 'Your pile' : 'Rival pile'} · ${state.players[player].grave.length}`, `quiet${p === player ? ' active' : ''}`, 'back-grave'); b.dataset.player = String(player); b.setAttribute('aria-pressed', String(p === player)); tabs.append(b); }); root.append(tabs);
    root.append(node('p', 'dialog-intro', 'Browse these face-up cards before deciding your play. Closing this window keeps your card selection and targets. Restoration and Sacrifice recover units from your own pile.'));
    const search = node('input', 'collection-search'); search.type = 'search'; search.placeholder = 'Search this destroyed pile…'; search.setAttribute('aria-label', 'Search destroyed pile'); root.append(search);
    const grid = node('div', 'collection-grid'); root.append(grid);
    const populate = () => { grid.replaceChildren(); const query = search.value.toLowerCase().trim(); state.players[p].grave.slice().reverse().filter(id => `${C[id].name} ${C[id].row || ''} ${C[id].abilityName || ''} ${C[id].type}`.toLowerCase().includes(query)).forEach(id => { const b = cardButton(id, 'collection'); b.dataset.collectionCard = id; b.dataset.graveOwner = String(p); grid.append(b); }); if (!grid.children.length) grid.append(node('p', 'empty-grave', state.players[p].grave.length ? 'No matching cards.' : 'No destroyed cards yet. Cards will stack here when destroyed or cleared at round end.')); };
    search.addEventListener('input', populate); populate();
  }
  function showRules() {
    const root = openDialog('How to play');
    const blocks = [
      ['Win the match', 'Win two rounds. There are up to three rounds. Highest field power wins a round after both players pass. A tie awards both players a round win; reaching two together draws the match.'],
      ['One deck. Fifteen cards.', 'The shared deck has one copy of each of the 62 cards. Each player starts with 15. Your hand carries across rounds; there is no between-round draw. Starting player is random, then alternates each round.'],
      ['Play or pass', 'Play one card on your turn, or pass. Passing ends your participation for that entire round. Your opponent may continue playing until they also pass. Patience spends one turn without passing.'],
      ['Three rows', 'Units enter their matching Combat, Ranged or Siege row. Infiltration units enter the enemy’s matching row and draw two cards for the player who played them. This includes Assassin, The Spy and Mechanical Men.'],
      ['Spells, Omens & destruction', 'Spells resolve immediately and go to the bottom of the shared deck. Omens remain on their chosen row or in the middle as weather. Destroyed cards go to the pile of the field they were on. Middle Omens go to the player who played them. All remaining field cards clear at round end, including protected cards.'],
      ['Power & weather', 'Recalculate unit abilities after every turn, then apply weather, then War Chant. Weather plus War Chant means 3 power, regardless of play order. Ironward makes units ignore all Omens, including beneficial War Chant.'],
      ['Ties & protected targets', 'Death Gaze and Convert choose one tied target. Weakest Link chooses between ties to destroy at most three unprotected units on each side. Pridefall destroys the highest-power unprotected units on each side, including all ties. Protection is checked before a destruction event removes any cards.'],
      ['Printed cards take priority', 'Target counts every friendly Ranged unit, including itself. Stone Wall protects all friendly Siege units, including itself. Sacrifice destroys one friendly unit and returns up to two destroyed units to your hand; it does not swap a unit into play or trigger its ability. Dread blocks cards entering its row, including moves through Convert.'],
      ['No targets', 'Resolve as much of a card as possible. No-target effects do nothing. You may play a Spell or unit whose ability has no target, but Dread still prevents adding a card to a blocked row. If the shared deck is empty, draw nothing.'],
      ['Controls & saving', 'Choose Begin game and flip the coin to decide who starts. A saved match can be resumed without another flip. Hover or focus a hand card to lift it; select it, choose targets and click Play. Pass opens a confirmation window. Click the visible destroyed-card stacks to browse either pile without losing your selection. Weather cards appear between the two fields. Audio controls offer optional music and sound effects. Escape closes dialogs or cancels card selection. Matches save automatically when storage is available.']
    ];
    blocks.forEach(([title, text]) => { const section = node('section', 'rule-block'); section.append(node('h3', '', title), node('p', '', text)); root.append(section); });
    const link = node('a', 'rules-doc', 'Open the full rules document ↗'); link.href = RULES_URL; link.target = '_blank'; link.rel = 'noopener'; root.append(link);
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button'); if (!target) return;
    if (target.dataset.choice) { selectChoice(target.dataset.choice); return; }
    if (target.dataset.collectionCard) { showCard(target.dataset.collectionCard, target.dataset.graveOwner === undefined ? 'collection' : Number(target.dataset.graveOwner)); return; }
    if (target.dataset.zoom) { showCard(target.dataset.zoom); return; }
    if (target.dataset.inspect) { inspected = target.dataset.inspect; resetSelection(); render(); return; }
    if (target.dataset.select) { selected = target.dataset.select; selections = {}; picked = []; audio.play('select'); render(); mobileFocus('inspector'); return; }
    if (target.dataset.card) {
      const id = target.dataset.card;
      if (canChoose(id)) { selectChoice(id); return; }
      inspected = id;
      if (target.dataset.context === 'hand' && myTurn()) { selected = id; selections = {}; picked = []; audio.play('select'); }
      else resetSelection();
      render(); mobileFocus('inspector'); return;
    }
    switch (target.dataset.action) {
      case 'cancel-selection': resetSelection(); render(); break;
      case 'confirm-targets': { const q = currentPrompt(); if (q?.kind === 'choice' && picked.length === q.count) { selections[q.key] = picked.slice(); picked = []; render(); } break; }
      case 'play-card': { const q = currentPrompt(); if (q?.kind === 'ready') commit(q.action); break; }
      case 'next-round': state = E.nextRound(state); resetSelection(); inspected = null; save(); render(); tick(); break;
      case 'new-match': newMatch(); break;
      case 'collection': showCollection(); break;
      case 'back-grave': showGrave(Number(target.dataset.player)); break;
    }
  });
  $('pass-button').addEventListener('click', () => { if (!myTurn()) return; $('pass-summary').textContent = `Your power: ${E.score(state, 0)}. Rival power: ${E.score(state, 1)}.${state.players[1].passed ? ' The rival has already passed, so this will settle the round.' : ''}`; $('pass-dialog').showModal(); });
  $('cancel-pass').addEventListener('click', () => $('pass-dialog').close());
  $('confirm-pass').addEventListener('click', () => { $('pass-dialog').close(); commit({ pass: true }); });
  $('sort-hand').addEventListener('change', render);
  $('difficulty').value = level;
  $('difficulty').addEventListener('change', () => { level = $('difficulty').value; save(); });
  $('rules-button').addEventListener('click', showRules);
  $('collection-button').addEventListener('click', showCollection);
  $('human-grave').addEventListener('click', () => showGrave(0));
  $('cpu-grave').addEventListener('click', () => showGrave(1));
  $('browse-own-pile').addEventListener('click', () => showGrave(0));
  $('new-button').addEventListener('click', () => $('confirm-dialog').showModal());
  $('cancel-new').addEventListener('click', () => $('confirm-dialog').close());
  $('confirm-new').addEventListener('click', () => { $('confirm-dialog').close(); newMatch(); });
  $('close-content').addEventListener('click', () => $('content-dialog').close());
  $('begin-button').addEventListener('click', flipCoin);
  $('resume-button').addEventListener('click', () => { lobbyOpen = false; $('welcome-dialog').close(); audio.unlock(); render(); tick(); });
  $('start-round-button').addEventListener('click', () => { if (coinStarter === null || $('start-round-button').disabled) return; state = E.newMatch(coinStarter); coinStarter = null; lobbyOpen = false; $('coin-dialog').close(); resetSelection(); inspected = null; save(); render(); tick(); });
  $('welcome-dialog').addEventListener('cancel', event => event.preventDefault());
  $('coin-dialog').addEventListener('cancel', event => event.preventDefault());
  function syncAudio() {
    const settings = audio.getSettings();
    $('music-enabled').checked = settings.music; $('effects-enabled').checked = settings.effects;
    $('music-volume').value = Math.round(settings.musicVolume * 100); $('effects-volume').value = Math.round(settings.effectsVolume * 100);
    $('music-volume-value').textContent = `${$('music-volume').value}%`; $('effects-volume-value').textContent = `${$('effects-volume').value}%`;
    if (!audio.available) { $('audio-note').textContent = 'This browser does not provide Web Audio. You can still play with sound off.'; ['music-enabled', 'effects-enabled', 'music-volume', 'effects-volume', 'preview-audio'].forEach(id => $(id).disabled = true); }
  }
  $('audio-button').addEventListener('click', () => { syncAudio(); $('audio-dialog').showModal(); });
  $('close-audio').addEventListener('click', () => $('audio-dialog').close());
  $('music-enabled').addEventListener('change', () => audio.configure({ music: $('music-enabled').checked }));
  $('effects-enabled').addEventListener('change', () => audio.configure({ effects: $('effects-enabled').checked }));
  $('music-volume').addEventListener('input', () => { $('music-volume-value').textContent = `${$('music-volume').value}%`; audio.configure({ musicVolume: Number($('music-volume').value) / 100 }); });
  $('effects-volume').addEventListener('input', () => { $('effects-volume-value').textContent = `${$('effects-volume').value}%`; audio.configure({ effectsVolume: Number($('effects-volume').value) / 100 }); });
  $('preview-audio').addEventListener('click', async () => { await audio.unlock(); audio.play('sanctuary'); });
  document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { resetSelection(); render(); } });
  render(); showLobby(loaded && state.phase !== 'gameOver');
})();
