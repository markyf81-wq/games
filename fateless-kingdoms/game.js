(() => {
  'use strict';
  const E = window.FKEngine,
    { cards: C, ids: IDS, rows: ROWS } = window.FKCards;
  const $ = (id) => document.getElementById(id);
  const storage = window.FKStorage;
  const LEVEL_NAMES = { casual: 'Beginner', tactician: 'Intermediate', strategist: 'Difficult' };
  const FX = window.FKEffects,
    audio = window.FKAudio;
  let state,
    level = 'tactician',
    selected = null,
    inspected = null,
    selections = {},
    picked = [],
    busy = false,
    saveAvailable = true;
  let lobbyOpen = true,
    animating = false,
    presentation = 0,
    coinStarter = null,
    coinTimer = null;
  let pendingState = null;
  let shownResult = null,
    choosingTargets = false;
  const previews = new window.FKCardPreview({
    hand: $('hand'),
    isAnimating: () => animating,
    onSelect: (id) => selectHandCard(id),
    onGesture: () => audio.unlock()
  });
  let renderedLog = null;
  const portraitLayout = window.matchMedia('(max-width: 980px) and (orientation: portrait)');
  const portraitHomes = [];
  let portraitMounted = false;
  const layout = new window.FKTableLayout({ getState: () => state, onBeforeLayout: () => previews.clear() });
  const cpu = new window.FKCPUController({ choose: window.FKCPU.choose });
  const preferences = storage.read('settings');
  const preferencesLoaded = preferences && typeof preferences === 'object' && !Array.isArray(preferences);
  let nextOptions = E.matchOptions(preferencesLoaded ? preferences.options || {} : {});
  if (preferencesLoaded && LEVEL_NAMES[preferences.level]) level = preferences.level;
  const saved = storage.read('match');
  const loaded = E.validState(saved?.state);
  if (loaded) {
    state = saved.state;
    if (!preferencesLoaded && LEVEL_NAMES[saved.level]) level = saved.level;
  }
  if (!state) state = E.newMatch(0, nextOptions);
  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function button(text, className, action) {
    const n = node('button', className, text);
    if (action) n.dataset.action = action;
    return n;
  }
  function save() {
    saveAvailable = storage.write('match', { state: pendingState || state, level });
    $('storage-note').textContent = saveAvailable
      ? 'Your game and settings save automatically in this browser.'
      : 'Browser storage is unavailable. Keep this tab open to keep your match.';
  }
  const myTurn = () =>
    !lobbyOpen &&
    !animating &&
    state.phase === 'playing' &&
    state.turn === 0 &&
    !busy &&
    !state.players[0].passed;
  const currentPrompt = () => (selected && myTurn() ? E.prompt(state, 0, selected, selections) : null);
  const canChoose = (value) => {
    const q = currentPrompt();
    return q?.kind === 'choice' && q.options.some((o) => o.value === value);
  };
  function selectChoice(value) {
    const q = currentPrompt();
    if (!q || q.kind !== 'choice' || !q.options.some((o) => o.value === value)) return;
    if (q.count === 1) {
      selections[q.key] = [value];
      picked = [];
    } else {
      if (picked.includes(value)) picked = picked.filter((x) => x !== value);
      else if (picked.length < q.count) picked.push(value);
    }
    render();
  }
  function resetSelection() {
    selected = null;
    selections = {};
    picked = [];
    choosingTargets = false;
    $('choice-dialog').close();
  }
  function closePortraitPanel() {
    const dialog = $('portrait-panel');
    if (dialog.open) dialog.close();
    document
      .querySelectorAll('#portrait-tools [data-portrait-panel]')
      .forEach((button) => button.setAttribute('aria-expanded', 'false'));
  }
  function syncPortraitLayout() {
    if (portraitMounted === portraitLayout.matches) return;
    closePortraitPanel();
    clearRowPreview();
    portraitMounted = portraitLayout.matches;
    if (portraitMounted) {
      const move = (element, host) => {
        const marker = document.createComment('portrait panel home');
        element.before(marker);
        portraitHomes.push({ element, marker });
        host.append(element);
      };
      move(document.querySelector('.site-header nav'), $('portrait-pane-menu'));
      move(document.querySelector('.back-link'), $('portrait-pane-menu'));
      move($('mute-button'), $('portrait-tools'));
      move(document.querySelector('.match-bar'), $('portrait-pane-match'));
      move($('round-track'), $('portrait-pane-match'));
      move(document.querySelector('.pile-rail'), $('portrait-pane-match'));
      move(document.querySelector('.history-panel'), $('portrait-pane-chronicle'));
    } else {
      // Move the original nodes back so IDs, listeners and hidden-card boundaries stay intact.
      while (portraitHomes.length) {
        const { element, marker } = portraitHomes.pop();
        marker.replaceWith(element);
      }
    }
  }
  function openPortraitPanel(panel) {
    if (!portraitLayout.matches || !['menu', 'match', 'chronicle'].includes(panel)) return;
    const dialog = $('portrait-panel');
    if (document.querySelector('dialog[open]') && !dialog.open) return;
    clearRowPreview();
    $('portrait-panel-title').textContent = {
      menu: 'Game menu',
      match: 'Match information',
      chronicle: 'Battle Chronicle'
    }[panel];
    document.querySelectorAll('.portrait-pane').forEach((pane) => {
      pane.hidden = pane.id !== `portrait-pane-${panel}`;
    });
    document.querySelectorAll('.portrait-panel-tabs button').forEach((button) => {
      const active = button.dataset.portraitPanel === panel;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document
      .querySelectorAll('#portrait-tools [data-portrait-panel]')
      .forEach((button) =>
        button.setAttribute('aria-expanded', String(button.dataset.portraitPanel === panel))
      );
    if (!dialog.open) dialog.showModal();
    layoutCards();
    document.querySelector('.portrait-panel-body').scrollTop = 0;
  }
  function renderPortraitStatus() {
    $('portrait-match-button').textContent = `R${state.round} ▾`;
    $('portrait-match-button').setAttribute(
      'aria-label',
      `Round ${state.round} of 3. Open match information`
    );
    $('portrait-match-button').title = `Round ${state.round} of 3 · Match information`;
  }
  function selectHandCard(id) {
    if (!state.players[0].hand.includes(id)) return;
    closePortraitPanel();
    clearRowPreview();
    if (!myTurn()) {
      showCard(id);
      return;
    }
    selected = id;
    selections = {};
    picked = [];
    choosingTargets = false;
    audio.play('select');
    render();
  }
  function mobileFocus(id) {
    if (document.querySelector('dialog[open]')) return;
    if (portraitLayout.matches) {
      if (id === 'inspector' && inspected) showCard(inspected);
      return;
    }
    if (window.matchMedia('(max-width: 980px)').matches)
      $(id).scrollIntoView({ behavior: FX.reduced() ? 'auto' : 'smooth', block: 'start' });
  }
  function powerBonus(id) {
    const details = E.powerSources(state, id);
    if (!details) return null;
    const { sources, weathered } = details;
    const label = sources.map((source) => `+${source.amount} ${source.name}`).join(' · ');
    const weatherNote = weathered ? 'Weather sets power to 1 before bonuses.' : '';
    return {
      label,
      weatherNote,
      description: `Active bonuses: ${label}.${weatherNote ? ` ${weatherNote}` : ''}`
    };
  }
  function appendBonusDetails(root, id) {
    const bonus = powerBonus(id);
    if (!bonus) return;
    const detail = node('span', 'live-bonus-copy');
    detail.append(node('strong', 'bonus-sources', `↑ ${bonus.label}`));
    if (bonus.weatherNote) detail.append(node('span', 'bonus-weather-note', bonus.weatherNote));
    root.append(detail);
  }
  function cardButton(id, context = 'board', p = null) {
    const c = C[id],
      n = button('', `card ${context}-card ${c.type}`, null);
    n.dataset.card = id;
    n.dataset.context = context;
    n.dataset.focus = `${context}-${id}`;
    const current = context === 'board' && c.type === 'unit' ? E.power(state, id) : c.power;
    n.setAttribute(
      'aria-label',
      `${c.name}${c.type === 'unit' ? `, ${current} power, ${c.row}` : `, ${c.type}`}${c.abilityName ? `, ${c.abilityName}` : ''}${context === 'hand' ? ', select to play' : ', inspect card'}`
    );
    n.title = `${c.name}${c.type === 'unit' ? ` · ${current} power` : ''}`;
    const bonus = context === 'board' ? powerBonus(id) : null;
    const change = context === 'board' && c.type === 'unit' ? current - c.power : 0;
    const changeLabel = change > 0 ? `+${change}` : `−${Math.abs(change)}`;
    if (change) {
      n.classList.add(change > 0 ? 'bonus-card' : 'reduced-card');
      const description = `${changeLabel} power from base ${c.power}.`;
      n.title += ` · ${description}`;
      n.setAttribute('aria-label', `${n.getAttribute('aria-label')}. ${description}`);
    }
    if (bonus) {
      n.title += ` · ${bonus.description}`;
      n.setAttribute('aria-label', `${n.getAttribute('aria-label')}. ${bonus.description}`);
    }
    const img = node('img');
    img.src = c.image;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    n.append(img);
    if (change) {
      const frame = node('span', 'bonus-outline'),
        mark = node('span', 'bonus-mark', changeLabel);
      frame.setAttribute('aria-hidden', 'true');
      mark.setAttribute('aria-hidden', 'true');
      n.append(frame, mark);
    }
    if (c.type === 'unit' && context !== 'hand' && context !== 'board') {
      const value = node(
        'span',
        `power-badge ${current > c.power ? 'boosted' : current < c.power ? 'reduced' : ''}`,
        String(current)
      );
      value.setAttribute('aria-hidden', 'true');
      n.append(value);
    }
    if (context === 'hand') {
      if (selected === id) n.classList.add('selected');
      if (myTurn() && E.prompt(state, 0, id).kind === 'blocked') n.classList.add('unplayable');
      n.append(node('span', 'card-caption', c.name));
    }
    if (context === 'board' && c.type === 'unit') {
      if (E.protectedFrom(state, id, true)) {
        n.classList.add('protected-card');
        n.append(node('span', 'protection-mark', '◇'));
      }
      if (p !== null && state.players[p].rows[c.row].includes('omen-ironward'))
        n.classList.add('omen-protected');
    }
    if (p !== null) n.dataset.side = String(p);
    return n;
  }
  function renderRow(p, row) {
    const rowNode = node('div', `battle-row row-${row}${E.blocked(state, p, row) ? ' blocked-row' : ''}`);
    const rowCards = state.players[p].rows[row],
      effects = node('div', 'row-effects');
    effects.setAttribute('aria-hidden', 'true');
    const warded = rowCards.includes('omen-ironward');
    if (!warded)
      state.weather
        .filter((w) => C[w.id].weather === row)
        .forEach((w) => effects.append(node('span', `row-effect effect-${C[w.id].effect}`)));
    ['dread', 'war-chant', 'ironward', 'sanctuary'].forEach((effect) => {
      if (rowCards.includes(`omen-${effect}`) && !(warded && effect === 'war-chant'))
        effects.append(node('span', `row-effect effect-${effect}`));
    });
    if (rowCards.includes('siege-0')) effects.append(node('span', 'row-effect effect-shielded'));
    const meta = node('div', 'row-meta');
    meta.append(
      node('span', 'row-name', row),
      node('strong', 'row-score', String(E.rowScore(state, p, row)))
    );
    rowNode.append(meta);
    const lane = node('div', 'row-cards');
    lane.append(effects);
    const cards = state.players[p].rows[row];
    if (!cards.length) lane.append(node('span', 'empty-row', '—'));
    cards.forEach((id) => lane.append(cardButton(id, 'board', p)));
    rowNode.append(lane);
    const activeEffects = [...effects.children].map((effect) =>
      effect.className.split('effect-')[1].replace(/-/g, ' ')
    );
    rowNode.setAttribute(
      'aria-label',
      `${p === 0 ? 'Your' : 'Rival'} ${row} row${activeEffects.length ? `, ${activeEffects.join(', ')}` : ''}`
    );
    if (!warded && state.weather.some((w) => C[w.id].weather === row)) rowNode.classList.add('weathered');
    return rowNode;
  }
  function weatherSlot(row) {
    const slot = node('div', 'weather-slot');
    slot.setAttribute('aria-label', `${row} weather, affects both kingdoms`);
    const weather = state.weather.filter((w) => C[w.id].weather === row);
    weather.forEach((w) => slot.append(cardButton(w.id, 'weather', w.owner)));
    if (!weather.length) {
      slot.classList.add('empty-weather-slot');
      slot.append(node('span', 'weather-empty', '—'));
    }
    return slot;
  }
  function renderField() {
    const field = $('battlefield');
    field.replaceChildren();
    field.classList.toggle('has-weather', state.weather.length > 0);
    const enemy = node('div', 'field-half enemy-half');
    enemy.setAttribute('aria-label', 'Rival field');
    [...ROWS].reverse().forEach((row) => enemy.append(renderRow(1, row)));
    field.append(enemy);
    const middle = node('div', 'weather-strip aligned-weather');
    middle.setAttribute('aria-label', 'Shared weather affecting both kingdoms');
    ROWS.forEach((row) => middle.append(weatherSlot(row)));
    if (!state.weather.length) middle.append(node('span', 'weather-clear-note', '✦ Clear skies'));
    field.append(middle);
    const own = node('div', 'field-half own-half');
    own.setAttribute('aria-label', 'Your field');
    ROWS.forEach((row) => own.append(renderRow(0, row)));
    field.append(own);
  }
  function winnerText() {
    const a = state.players[0].wins,
      b = state.players[1].wins;
    if (state.phase === 'gameOver')
      return a >= 2 && b >= 2
        ? 'Two kingdoms. One shared victory.'
        : a >= 2
          ? 'The kingdom is yours.'
          : 'The rival takes the kingdom.';
    const r = state.rounds[state.rounds.length - 1];
    return r.winner === null
      ? 'A draw. Both kingdoms gain a win.'
      : r.winner === 0
        ? 'This battle is yours.'
        : 'The rival wins this battle.';
  }
  function showResult(force = false) {
    const key = `${state.phase}:${state.round}`;
    if (
      lobbyOpen ||
      animating ||
      !['roundEnd', 'gameOver'].includes(state.phase) ||
      (!force && shownResult === key)
    )
      return;
    const finished = state.phase === 'gameOver',
      lastRound = state.rounds[state.rounds.length - 1];
    const human = state.players[0].wins,
      rival = state.players[1].wins;
    const outcome = finished
      ? human >= 2 && rival >= 2
        ? 'draw'
        : human >= 2
          ? 'victory'
          : 'defeat'
      : lastRound.winner === null
        ? 'draw'
        : lastRound.winner === 0
          ? 'victory'
          : 'defeat';
    closePortraitPanel();
    const dialog = $('match-result-dialog');
    dialog.dataset.outcome = outcome;
    $('match-result-context').textContent = finished ? 'Match complete' : `Round ${state.round} complete`;
    $('match-result-title').textContent = (
      finished
        ? { victory: 'Victory!', defeat: 'Defeat', draw: 'A draw!' }
        : { victory: 'Round won!', defeat: 'Round lost', draw: 'Round drawn' }
    )[outcome];
    $('match-result-crest').textContent = { victory: '♛', defeat: '⚔', draw: '⚖' }[outcome];
    $('match-result-message').textContent = finished
      ? {
          victory: 'You won the match. The kingdom is yours.',
          defeat: 'You lost this match. The rival takes the kingdom.',
          draw: 'Both kingdoms reached two round wins. The match is a draw.'
        }[outcome]
      : `${winnerText()} Your remaining ${state.players[0].hand.length} cards carry forward. No new cards are dealt.`;
    $('replay-match').textContent = finished ? 'Play again →' : 'Continue →';
    $('match-result-human-wins').textContent = String(human);
    $('match-result-cpu-wins').textContent = String(rival);
    const rounds = $('match-result-rounds');
    rounds.replaceChildren();
    state.rounds.forEach((result) => {
      const row = node('tr'),
        heading = node('th', '', `R${result.round}`);
      heading.scope = 'row';
      row.append(
        heading,
        node('td', '', String(result.scores[0])),
        node('td', '', String(result.scores[1])),
        node('td', '', result.winner === null ? 'Draw' : result.winner === 0 ? 'You won' : 'Rival won')
      );
      rounds.append(row);
    });
    if (shownResult !== key) audio.playResult(outcome);
    shownResult = key;
    if (!dialog.open) dialog.showModal();
  }
  function renderInspector() {
    const root = $('inspector');
    root.replaceChildren();
    root.classList.remove('has-blocked-choice');
    if (state.phase !== 'playing') {
      root.classList.add('result-panel');
      root.append(
        node('div', 'result-crest', state.phase === 'gameOver' ? '♛' : '⚔'),
        node(
          'span',
          'eyebrow',
          state.phase === 'gameOver' ? 'Match complete' : `Round ${state.round} complete`
        ),
        node('h2', '', winnerText())
      );
      const rounds = node('div', 'round-summary');
      state.rounds.forEach((r) => {
        const line = node('div');
        line.append(node('span', '', `Round ${r.round}`), node('b', '', `${r.scores[0]} — ${r.scores[1]}`));
        rounds.append(line);
      });
      root.append(rounds);
      root.append(
        node(
          'p',
          'result-note',
          state.phase === 'roundEnd'
            ? `Your remaining ${state.players[0].hand.length} cards carry forward. No new cards are dealt.`
            : 'Every pass, every sacrifice, every card held back. Ready for another?'
        )
      );
      return;
    }
    root.classList.remove('result-panel');
    const id = inspected || state.lastCard?.id;
    if (!id) {
      root.append(
        node('span', 'eyebrow', 'The art of restraint'),
        node('div', 'idle-crest', '♜'),
        node('h2', '', 'Outthink. Outlast.'),
        node(
          'p',
          'inspector-copy',
          'Select a card in your hand to read its ability. Choose your targets, then commit your play.'
        ),
        node(
          'p',
          'inspector-tip',
          'You have the same hand across all rounds. A narrow win can be worth more than a glorious one.'
        )
      );
      return;
    }
    const c = C[id];
    const art = button('', 'inspect-art');
    art.dataset.zoom = id;
    art.setAttribute('aria-label', `Enlarge ${c.name}`);
    const img = node('img');
    img.src = c.image;
    img.alt = c.name;
    art.append(img);
    root.append(art);
    root.append(node('h2', '', c.name));
    if (c.abilityName) root.append(node('span', 'ability-label', c.abilityName));
    const copy = node('p', 'inspector-copy', c.text);
    appendBonusDetails(copy, id);
    root.append(copy);
  }
  function actionSummary(c, a) {
    const parts = [];
    if (a.row?.length) {
      const [p, row] = a.row[0].split(':');
      parts.push(`Place on ${p === '0' ? 'your' : 'the rival’s'} ${row} row.`);
    } else if (c.type === 'unit')
      parts.push(`Play on ${a.destination === 0 ? 'your' : 'the rival’s'} ${c.row} row.`);
    const names = (ids) => ids.map((id) => C[id].name).join(', ');
    for (const [key, verb] of [
      ['restore', 'Return to hand'],
      ['kill', 'Destroy'],
      ['convert', 'Trade places with'],
      ['decoy', 'Return to hand'],
      ['sacrifice', 'Sacrifice'],
      ['recover', 'Recover'],
      ['weakest', 'Destroy']
    ]) {
      if (a[key]?.length) parts.push(`${verb}: ${names(a[key])}.`);
    }
    return (
      parts.join(' ') ||
      (c.effect === 'patience'
        ? 'Spend this turn without passing.'
        : c.type === 'omen'
          ? 'Affects both kingdoms.'
          : 'Resolve all available effects, then return this Spell to the bottom of the deck.')
    );
  }
  function renderChoiceDialog() {
    const dialog = $('choice-dialog'),
      q = currentPrompt();
    if (!q) {
      dialog.close();
      return;
    }
    dialog.dataset.state = q.kind;
    const choosing = choosingTargets && q.kind === 'choice';
    const review = choosingTargets && q.kind === 'ready' && Object.keys(selections).length > 0;
    const opening = !dialog.open,
      step = choosing ? q.key : review ? 'review' : 'details';
    const stepChanged = dialog.dataset.step !== step || dialog.dataset.card !== selected;
    dialog.dataset.step = step;
    dialog.dataset.card = selected;
    dialog.classList.toggle('card-details-dialog', !choosing);
    $('choice-card-name').textContent = C[selected].name;
    const body = $('choice-body'),
      confirm = $('choice-confirm');
    body.replaceChildren();
    confirm.replaceChildren();
    const intro = node('div', 'choice-intro'),
      artwork = node('img');
    artwork.src = C[selected].image;
    artwork.alt = C[selected].name;
    const description = node('div', 'choice-description');
    if (C[selected].abilityName) description.append(node('span', 'ability-label', C[selected].abilityName));
    description.append(node('p', '', C[selected].text));
    intro.append(artwork, description);
    body.append(intro);
    const heading = node(
      'h3',
      'choice-question',
      choosing
        ? q.title
        : q.kind === 'blocked'
          ? 'Cannot play this card'
          : review
            ? 'Ready to play?'
            : 'Your next move'
    );
    heading.tabIndex = -1;
    body.append(heading);
    if (choosing) {
      body.append(
        node(
          'p',
          'choice-help',
          q.count > 1
            ? `Select ${q.count} cards. ${picked.length} selected.`
            : 'Choose one option. You can review your play before committing.'
        )
      );
      const options = node('div', 'modal-choices');
      q.options.forEach((o) => {
        const chosen = picked.includes(o.value),
          b = button('', `modal-choice${chosen ? ' chosen' : ''}${o.card ? ' card-option' : ' row-option'}`);
        b.dataset.choice = o.value;
        b.dataset.focus = `choice-${q.key}-${o.value}`;
        b.setAttribute('aria-pressed', String(chosen));
        if (o.card) {
          const art = node('img');
          art.src = C[o.card].image;
          art.alt = '';
          b.append(art);
          b.append(node('span', 'option-name', o.label));
          const location = E.locate(state, o.card),
            power = location ? E.power(state, o.card) : C[o.card].power;
          b.append(node('span', 'option-detail', `${C[o.card].row} · ${power} power`));
        } else {
          b.append(
            node('span', 'option-row-icon', { combat: '⚔', ranged: '➶', siege: '♜' }[o.row]),
            node('span', 'option-name', o.label)
          );
        }
        options.append(b);
      });
      body.append(options);
      if (q.count > 1) {
        const b = button('Confirm targets →', 'primary', 'confirm-targets');
        b.disabled = picked.length !== q.count;
        confirm.append(b);
      }
    } else if (q.kind === 'blocked') body.append(node('p', 'warning-message', q.message));
    else if (q.kind === 'choice') {
      body.append(node('p', 'choice-review', q.title));
      confirm.append(button('Choose targets →', 'primary', 'open-choices'));
    } else {
      body.append(node('p', 'choice-review', actionSummary(C[selected], q.action)));
      if (review) body.append(button('Choose again', 'text-button', 'restart-choices'));
      confirm.append(button(`Play ${C[selected].name} →`, 'primary', 'play-card'));
    }
    if (opening) {
      closePortraitPanel();
      clearRowPreview();
      dialog.showModal();
    }
    if (opening || stepChanged) {
      body.scrollTop = 0;
      heading.focus({ preventScroll: true });
    }
  }
  function renderRoundTrack() {
    const track = $('round-track');
    track.replaceChildren();
    for (let round = 1; round <= 3; round++) {
      const result = state.rounds.find((r) => r.round === round),
        active = !result && round === state.round && state.phase === 'playing';
      const item = node(
        'li',
        `round-result${result ? (result.winner === null ? ' drawn' : result.winner === 0 ? ' human-won' : ' cpu-won') : active ? ' current' : ''}`
      );
      const outcome = result
        ? result.winner === null
          ? 'Draw · both win'
          : result.winner === 0
            ? 'You won'
            : 'Rival won'
        : active
          ? 'In play'
          : state.phase === 'gameOver'
            ? 'Not played'
            : 'Upcoming';
      item.append(node('span', 'round-number', `R${round}`), node('strong', '', outcome));
      if (result) item.append(node('span', 'round-result-score', `${result.scores[0]}–${result.scores[1]}`));
      item.setAttribute(
        'aria-label',
        `Round ${round}: ${outcome}${result ? `. You ${result.scores[0]}, rival ${result.scores[1]}.` : ''}`
      );
      track.append(item);
    }
  }
  function layoutCards() {
    layout.update();
  }
  function clearRowPreview() {
    previews.clear();
  }
  function render() {
    syncPortraitLayout();
    document.body.dataset.ui = lobbyOpen
      ? 'lobby'
      : animating
        ? 'resolving'
        : state.phase !== 'playing'
          ? 'result'
          : busy || state.turn === 1
            ? 'rival'
            : selected
              ? 'choosing'
              : 'ready';
    const focus = document.activeElement?.dataset.focus;
    $('round-label').textContent = `Round ${['I', 'II', 'III'][state.round - 1]} / III`;
    $('deck-count').textContent = `${state.deck.length} in shared deck`;
    $('current-settings').replaceChildren(
      document.createTextNode(`CPU · ${LEVEL_NAMES[level]}`),
      node('span', '', 'Settings →')
    );
    audio.setScene(lobbyOpen ? 'lobby' : state.phase === 'playing' ? 'battle' : 'result');
    syncMuteButton();
    [0, 1].forEach((p) => {
      const prefix = p === 0 ? 'human' : 'cpu',
        player = state.players[p];
      $(`${prefix}-score`).textContent = E.score(state, p);
      $(`${prefix}-meta`).textContent =
        `${player.hand.length} cards in hand${player.passed ? ' · Passed' : ''}`;
      const panel = document.querySelector(`.player-panel.${p === 0 ? 'human' : 'opponent'}`);
      panel.classList.toggle(
        'active-turn',
        !lobbyOpen && state.phase === 'playing' && state.turn === p && !player.passed
      );
      panel.classList.toggle('has-passed', player.passed);
      const wins = $(`${prefix}-wins`);
      wins.replaceChildren();
      wins.setAttribute('aria-label', `${player.wins} of 2 round wins`);
      const count = node('span', 'win-count');
      count.append(node('span', 'wins-label', 'Wins'), node('b', '', `${player.wins}/2`));
      wins.append(count);
      for (let i = 0; i < 2; i++) {
        const slot = node(
          'span',
          `win-slot${i < player.wins ? ' won' : ''}`,
          i < player.wins ? '✓' : String(i + 1)
        );
        slot.setAttribute('aria-hidden', 'true');
        wins.append(slot);
      }
    });
    renderRoundTrack();
    const rival = $('rival-hand');
    rival.replaceChildren();
    $('rival-hand-label').textContent = `Rival’s hand (${state.players[1].hand.length})`;
    rival.setAttribute('aria-label', `${state.players[1].hand.length} face-down rival cards`);
    // Use only the public count. Never put opponent card IDs or names in this DOM.
    for (let i = 0; i < state.players[1].hand.length; i++) {
      const back = node('span', 'rival-card card-back');
      back.setAttribute('aria-hidden', 'true');
      rival.append(back);
    }
    let banner;
    if (lobbyOpen) banner = 'Begin a game to flip the coin and take your seat.';
    else if (animating) banner = inspected ? `Playing ${C[inspected].name}…` : 'Resolving the play…';
    else if (state.phase !== 'playing') banner = winnerText();
    else if (busy || state.turn === 1) banner = 'The rival is considering its next move…';
    else if (selected)
      banner =
        currentPrompt()?.kind === 'choice'
          ? 'Choose your targets in the window, or cancel this play.'
          : 'Review your card, then commit your play.';
    else
      banner = state.players[1].passed
        ? 'The rival has passed. Play on, or pass to settle the round.'
        : 'Your move. Play one card, or pass.';
    let shortStatus = 'Your move';
    if (lobbyOpen) shortStatus = 'Ready to begin';
    else if (animating) shortStatus = 'Playing…';
    else if (state.phase !== 'playing')
      shortStatus = state.phase === 'gameOver' ? 'Match over' : 'Round over';
    else if (busy || state.turn === 1) shortStatus = 'Rival thinking…';
    else if (selected)
      shortStatus = currentPrompt()?.kind === 'choice' ? 'Choose targets' : 'Review your play';
    else if (state.players[1].passed) shortStatus = 'Rival passed';
    $('turn-banner').textContent = shortStatus;
    $('turn-banner').title = banner;
    $('turn-banner').setAttribute('aria-label', banner);
    $('turn-banner').classList.toggle('cpu-thinking', busy);
    $('turn-banner').classList.toggle('your-turn', myTurn());
    $('turn-banner').classList.toggle(
      'rival-turn',
      !lobbyOpen && state.phase === 'playing' && state.turn === 1
    );
    renderField();
    const hand = $('hand'),
      scroll = hand.scrollLeft,
      sort = $('sort-hand').value;
    hand.replaceChildren();
    const sorted = state.players[0].hand.slice().sort((a, b) => {
      if (sort === 'power')
        return (C[b].power ?? -1) - (C[a].power ?? -1) || C[a].name.localeCompare(C[b].name);
      const rank = (c) => (c.type === 'unit' ? ROWS.indexOf(c.row) : c.type === 'spell' ? 3 : 4);
      return (
        rank(C[a]) - rank(C[b]) ||
        (sort === 'type' ? C[a].name.localeCompare(C[b].name) : (C[b].power || 0) - (C[a].power || 0))
      );
    });
    sorted.forEach((id, index) => {
      const b = cardButton(id, 'hand');
      b.style.zIndex = String(index + 1);
      b.style.setProperty('--hand-stack', String(index + 1));
      hand.append(b);
    });
    if (!sorted.length)
      hand.append(node('p', 'empty-hand', 'Your hand is empty. You automatically pass for this round.'));
    hand.scrollLeft = scroll;
    hand.setAttribute('aria-label', `Your hand, ${sorted.length} cards`);
    const resultAvailable = !lobbyOpen && !animating && ['roundEnd', 'gameOver'].includes(state.phase);
    const pass = $('pass-button');
    pass.disabled = !myTurn() && !resultAvailable;
    pass.textContent = resultAvailable
      ? state.phase === 'roundEnd'
        ? 'Round result →'
        : 'Match result →'
      : state.players[0].passed
        ? 'You have passed'
        : 'Pass this round →';
    pass.dataset.focus = 'pass';
    [0, 1].forEach((p) => {
      const pile = $(p === 0 ? 'human-grave' : 'cpu-grave'),
        grave = state.players[p].grave;
      pile.setAttribute(
        'aria-label',
        `${p === 0 ? 'Your' : 'Rival'} destroyed pile, ${grave.length} cards. ${p === 0 ? 'Click to browse.' : 'Contents hidden.'}`
      );
      pile.querySelector('.pile-count').textContent = String(grave.length);
      pile.classList.toggle('empty-pile', !grave.length);
      if (p === 0) {
        const top = grave[grave.length - 1],
          image = pile.querySelector('img');
        image.hidden = !top;
        if (top) image.src = C[top].image;
        else image.removeAttribute('src');
      }
    });
    renderInspector();
    renderPortraitStatus();
    const history = $('history');
    const historyScroller =
      portraitLayout.matches && $('portrait-panel').open && !$('portrait-pane-chronicle').hidden
        ? document.querySelector('.portrait-panel-body')
        : history;
    const scrollTop = historyScroller.scrollTop,
      scrollHeight = historyScroller.scrollHeight;
    const historyChanged = renderedLog !== state.log;
    if (historyChanged) {
      history.replaceChildren();
      publicChronicle(state.log)
        .reverse()
        .forEach((entry) => {
          const item = node('li');
          item.append(node('span', 'history-round', `R${entry.round}`), node('span', '', entry.text));
          history.append(item);
        });
      renderedLog = state.log;
    }
    renderChoiceDialog();
    layoutCards();
    if (historyChanged)
      historyScroller.scrollTop =
        !lobbyOpen && scrollTop > 0
          ? Math.max(0, scrollTop + historyScroller.scrollHeight - scrollHeight)
          : 0;
    if (focus) document.querySelector(`[data-focus="${focus}"]`)?.focus({ preventScroll: true });
    showResult();
  }
  function publicChronicle(entries) {
    let actor = null;
    return entries.map((entry) => {
      if (/^The CPU plays /.test(entry.text)) actor = 1;
      if (/^You play /.test(entry.text)) actor = 0;
      if (
        (actor !== 0 &&
          /returns?.*hand/.test(entry.text) &&
          !/^The CPU returns /.test(entry.text) &&
          !/your hand/.test(entry.text)) ||
        /returns? to the CPU.s hand/.test(entry.text)
      )
        return { ...entry, text: 'The CPU returns cards to its hand.' };
      return entry;
    });
  }
  async function presentMove(actor, move) {
    const before = state,
      snapshot = FX.capture(),
      next = E.play(state, actor, move),
      ticket = ++presentation;
    // Persist the committed move before its reveal, so refresh cannot undo it.
    pendingState = next;
    save();
    animating = true;
    resetSelection();
    inspected = move.card || state.lastCard?.id;
    render();
    try {
      if (move.card) snapshot.played = await FX.showPlayed(move.card, actor, snapshot);
    } catch (_) {
      FX.cancel();
    }
    if (ticket !== presentation) return;
    state = next;
    pendingState = null;
    save();
    render();
    try {
      await FX.transition(before, next, snapshot, actor, move);
    } catch (_) {
      FX.cancel();
    }
    if (ticket !== presentation) return;
    animating = false;
    busy = false;
    render();
    if (actor === 0) mobileFocus('turn-banner');
    tick();
  }
  function commit(move) {
    if (!myTurn()) return;
    presentMove(0, move).catch((error) => {
      animating = false;
      render();
      $('turn-banner').textContent = error.message;
    });
  }
  function completeCPU(move) {
    if (state.phase !== 'playing' || state.turn !== 1 || !busy) return;
    presentMove(1, move).catch(() => {
      animating = false;
      busy = false;
      if (state.phase === 'playing' && state.turn === 1) presentMove(1, { pass: true });
      else {
        render();
        tick();
      }
    });
  }
  function tick() {
    if (lobbyOpen || animating || busy || state.phase !== 'playing') return;
    const settled = E.autoPassEmptyHands(state);
    if (settled !== state) {
      state = settled;
      resetSelection();
      save();
      render();
    }
    if (state.phase !== 'playing' || state.turn !== 1) return;
    busy = true;
    render();
    cpu.request(E.publicView(state, 1), level, completeCPU);
  }
  function newMatch() {
    closePortraitPanel();
    cpu.cancel();
    presentation++;
    FX.cancel();
    busy = false;
    animating = false;
    pendingState = null;
    clearTimeout(coinTimer);
    coinStarter = null;
    $('match-result-dialog').close();
    shownResult = null;
    saveAvailable = storage.remove('match');
    audio.resetMusic();
    state = E.newMatch(0, nextOptions);
    resetSelection();
    inspected = null;
    showLobby();
  }
  function showLobby() {
    const boss = C[`${ROWS[Math.floor(Math.random() * ROWS.length)]}-15`];
    document.querySelector('.welcome-art').style.setProperty('--welcome-card', `url("${boss.image}")`);
    lobbyOpen = true;
    $('begin-button').disabled = false;
    $('welcome-music').checked = audio.getSettings().music;
    syncWelcome();
    render();
    $('welcome-dialog').showModal();
  }
  function syncWelcome() {
    $('welcome-hand-size').textContent = `${nextOptions.handSize} cards each.`;
    $('welcome-deck-size').textContent = E.cardPool(nextOptions).length;
  }
  async function flipCoin() {
    if (!lobbyOpen || $('begin-button').disabled) return;
    $('begin-button').disabled = true;
    await audio.configure({ music: $('welcome-music').checked });
    audio.play('coin');
    $('welcome-dialog').close();
    coinStarter = Math.random() < 0.5 ? 0 : 1;
    const coin = $('coin');
    coin.classList.remove('flipping', 'settled');
    coin.style.setProperty('--coin-turn', `${1800 + (coinStarter === 1 ? 180 : 0)}deg`);
    coin.style.setProperty('--coin-rest', coinStarter === 1 ? '180deg' : '0deg');
    $('coin-result').textContent = 'Flipping the coin…';
    $('start-round-button').disabled = true;
    $('coin-dialog').showModal();
    void coin.offsetWidth;
    coin.classList.add('flipping');
    clearTimeout(coinTimer);
    coinTimer = setTimeout(
      () => {
        coin.classList.remove('flipping');
        coin.classList.add('settled');
        $('coin-result').textContent =
          coinStarter === 0 ? 'Heads. Your kingdom goes first.' : 'Tails. The rival kingdom goes first.';
        $('start-round-button').disabled = false;
        audio.play('sanctuary');
      },
      FX.reduced() ? 0 : 2100
    );
  }
  function openDialog(title) {
    closePortraitPanel();
    $('content-title').textContent = title;
    $('content-dialog').classList.remove('deck-dialog');
    $('content-body').classList.remove('deck-browser');
    $('content-body').replaceChildren();
    if (!$('content-dialog').open) $('content-dialog').showModal();
    return $('content-body');
  }
  function showCard(id, returnTo = null) {
    const root = openDialog(C[id].name);
    if (returnTo === 'collection') root.append(button('← All cards', 'text-button', 'collection'));
    else if (returnTo === 0) root.append(button('← Back to destroyed pile', 'text-button', 'back-grave'));
    const layout = node('div', 'zoom-layout'),
      img = node('img');
    img.src = C[id].image;
    img.alt = C[id].name;
    layout.append(img);
    const copy = node('div');
    copy.append(
      node(
        'span',
        'eyebrow',
        C[id].type === 'unit' ? `${C[id].row} · ${C[id].power} base power` : C[id].type
      ),
      node('h3', '', C[id].abilityName || C[id].name),
      node('p', '', C[id].text)
    );
    if (E.locate(state, id) && C[id].type === 'unit') {
      const live = node('p', 'live-power', `Current power: ${E.power(state, id)}`);
      appendBonusDetails(live, id);
      copy.append(live);
    }
    layout.append(copy);
    root.append(layout);
  }
  function cardSearchText(id) {
    const card = C[id];
    return `${card.name} ${card.abilityName || ''} ${card.row || ''} ${card.type}`.toLowerCase();
  }
  function renderCardBrowser(
    root,
    { cards, searchLabel, placeholder, emptyText = 'No matching cards.', collection = false }
  ) {
    const search = node('input', 'collection-search');
    search.type = 'search';
    search.placeholder = placeholder;
    search.setAttribute('aria-label', searchLabel);
    root.append(search);
    const count = collection ? node('p', 'deck-result-count') : null;
    if (count) {
      count.setAttribute('role', 'status');
      root.append(count);
    }
    const grid = node('div', 'collection-grid');
    grid.tabIndex = 0;
    grid.setAttribute('aria-label', collection ? 'All available cards' : 'Your destroyed cards');
    root.append(grid);
    const populate = () => {
      const query = search.value.toLowerCase().trim(),
        matches = cards.filter((id) => cardSearchText(id).includes(query));
      grid.replaceChildren();
      if (count) count.textContent = `${matches.length} of ${cards.length} cards`;
      for (const id of matches) {
        const card = cardButton(id, 'collection');
        card.dataset.collectionCard = id;
        if (!collection) card.dataset.graveOwner = '0';
        grid.append(card);
      }
      if (!matches.length)
        grid.append(node('p', 'empty-grave', cards.length ? 'No matching cards.' : emptyText));
      grid.scrollTop = 0;
    };
    search.addEventListener('input', populate);
    populate();
  }
  function showCollection() {
    const root = openDialog(`Full deck · ${IDS.length} cards`);
    $('content-dialog').classList.add('deck-dialog');
    root.classList.add('deck-browser');
    root.append(
      node(
        'p',
        'dialog-intro',
        `Browse all ${IDS.length} cards, including every unit, Spell and Omen. Select a card to enlarge its artwork and read its ability.`
      )
    );
    renderCardBrowser(root, {
      cards: IDS,
      collection: true,
      searchLabel: 'Search the card collection',
      placeholder: 'Find a card, ability or row…'
    });
  }
  function showGrave() {
    const root = openDialog('Your destroyed pile');
    root.append(
      node(
        'p',
        'dialog-intro',
        'Browse these face-up cards before deciding your play. Closing this window keeps your card selection and targets. Restoration and Sacrifice recover units from your own pile.'
      )
    );
    renderCardBrowser(root, {
      cards: state.players[0].grave.slice().reverse(),
      searchLabel: 'Search destroyed pile',
      placeholder: 'Search this destroyed pile…',
      emptyText: 'No destroyed cards yet. Cards will stack here when destroyed or cleared at round end.'
    });
  }
  function showRules() {
    const root = openDialog('How to play');
    const blocks = [
      [
        'Win the match',
        'Win two rounds. There are up to three rounds. Highest field power wins a round after both players pass. A tie awards both players a round win; reaching two together draws the match.'
      ],
      [
        'One deck. One hand.',
        'The default game uses all 62 unique cards and 15 starting cards per player. Settings lets you change the starting hand size and include or exclude Omens and Spells for your next game. An optional setting, off by default, deals exactly three random cards from the included Spell/Omen types to each player, with units filling the rest of each starting hand. Extra Spells/Omens remain in the shared deck for later draws. Your hand carries across rounds; there is no between-round draw. A coin flip chooses the starting player, then the starter alternates each round.'
      ],
      [
        'Play or pass',
        'Play one card on your turn, or pass. Passing ends your participation for that entire round. An empty hand automatically passes after all draw/recovery effects finish. Keeping any cards prevents an automatic pass, even if those cards cannot currently be played. Your opponent may continue playing until they also pass. Patience spends one turn without passing unless it leaves your hand empty.'
      ],
      [
        'Three rows',
        'Units enter their matching Combat, Ranged or Siege row. Infiltration units enter the enemy’s matching row and draw two cards for the player who played them. This includes Assassin, The Spy and Mechanical Men.'
      ],
      [
        'Spells, Omens & destruction',
        'Spells resolve immediately and go to the bottom of the shared deck. Omens remain on their chosen row or in the middle as weather. Destroyed cards go to the pile of the field they were on. Middle Omens go to the player who played them. All remaining field cards clear at round end, including protected cards.'
      ],
      [
        'Power & weather',
        'Recalculate unit abilities after every turn, then apply weather, then War Chant. Weather plus War Chant means 3 power, regardless of play order. Ironward makes units ignore all Omens, including beneficial War Chant. Units use the power printed on their artwork. A top-right marker shows the net power change: green +N for an increase, red −N for a reduction. No marker appears when current and printed power match. Inspect a card to see its current power and active bonus sources.'
      ],
      [
        'Ties & protected targets',
        'Death Gaze and Convert choose one tied target. Weakest Link chooses between ties to destroy at most three unprotected units on each side. Pridefall destroys the highest-power unprotected units on each side, including all ties. Protection is checked before a destruction event removes any cards.'
      ],
      [
        'Card abilities',
        'Target counts every friendly Ranged unit, including itself. Stone Wall protects all friendly Siege units, including itself. Sacrifice destroys one friendly unit and returns up to two units already in your destroyed pile to your hand. The unit sacrificed in this play cannot be returned by the same Sacrifice. It does not swap a unit into play or trigger its ability. Dread blocks cards entering its row, including moves through Convert.'
      ],
      [
        'Legal plays & targets',
        'A card cannot be played when its required ability or Spell has no legal target. Mimic needs an enemy Combat unit; Restoration needs a destroyed unit of its row type; Death Gaze needs an unprotected enemy Ranged unit. Decoy needs an eligible friendly unit. Sacrifice needs an unprotected friendly unit and at least one unit already in your destroyed pile. Destruction Spells need at least one card they can destroy. Infiltration needs at least one card in the shared deck. When fewer targets or draws exist than requested, resolve as many as possible. Ordinary units, passive abilities and Omens can still be placed in legal locations before their bonuses or protections are useful; Patience intentionally spends a turn without another effect. Dread prevents cards entering its blocked rows. With cards still in hand, you choose whether to pass even if every card is blocked.'
      ],
      [
        'Controls & saving',
        'Choose Begin game and flip the coin to decide who starts. Refreshing the page restores your saved match automatically, without another coin flip. Reset game clears the saved match after confirmation and returns to Begin game. Hover or focus a card to preview it. On touch screens, press a hand card and slide your thumb across the hand to preview each card. Release over a hand card to open its details and play controls; release outside the hand to cancel. For battlefield and weather cards, hold to preview and release to close. Tap a hand card to open its artwork and details in a modal. Play or Choose targets and Cancel are inside that modal. Required choices stay in the same window until you confirm the play. Cancel or Escape abandons the play before any cards move. Each played card is revealed in the centre before resolving. The rival’s hand stays face down. Round results remain available in the match history. Each completed round opens the result window; Continue starts the next round, or Play again begins a fresh match after the final result. Review board keeps the field visible, and Round result or Match result beside your hand reopens the window. Pass opens a confirmation window. Click your destroyed-card stack to browse your own pile without losing your selection. The rival’s destroyed pile stays face down and shows only its card count. Weather cards appear between the two fields. Settings includes CPU level, starting hand size, card types, music and sound effects. Music is enabled by default, with a battle theme during play. In portrait mode, the header’s Menu, round number and Log buttons open slide-up panels; scores and Pass stay on the table, with card actions in the card modal. Match information includes the rival hand, round history and destroyed piles. The speaker button in the header mutes or unmutes all audio without changing your individual music/effects preferences. Escape closes dialogs or cancels card selection. Matches save automatically when storage is available.'
      ]
    ];
    blocks.forEach(([title, text]) => {
      const section = node('section', 'rule-block');
      section.append(node('h3', '', title), node('p', '', text));
      root.append(section);
    });
  }
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.portraitPanel) {
      openPortraitPanel(target.dataset.portraitPanel);
      return;
    }
    if (target.dataset.choice) {
      selectChoice(target.dataset.choice);
      return;
    }
    if (target.dataset.collectionCard) {
      showCard(target.dataset.collectionCard, target.dataset.graveOwner === undefined ? 'collection' : 0);
      return;
    }
    if (target.dataset.zoom) {
      showCard(target.dataset.zoom);
      return;
    }
    if (target.dataset.card) {
      const id = target.dataset.card;
      if (canChoose(id)) {
        selectChoice(id);
        return;
      }
      if (target.dataset.context === 'hand') {
        selectHandCard(id);
        return;
      }
      inspected = id;
      resetSelection();
      render();
      mobileFocus('inspector');
      return;
    }
    switch (target.dataset.action) {
      case 'cancel-selection':
        resetSelection();
        render();
        break;
      case 'open-choices':
        choosingTargets = true;
        renderChoiceDialog();
        break;
      case 'restart-choices':
        selections = {};
        picked = [];
        choosingTargets = true;
        render();
        break;
      case 'confirm-targets': {
        const q = currentPrompt();
        if (q?.kind === 'choice' && picked.length === q.count) {
          selections[q.key] = picked.slice();
          picked = [];
          render();
        }
        break;
      }
      case 'play-card': {
        const q = currentPrompt();
        if (q?.kind === 'ready') commit(q.action);
        break;
      }
      case 'new-match':
        newMatch();
        break;
      case 'collection':
        showCollection();
        break;
      case 'back-grave':
        showGrave();
        break;
    }
  });
  $('pass-button').addEventListener('click', () => {
    if (['roundEnd', 'gameOver'].includes(state.phase)) {
      showResult(true);
      return;
    }
    if (!myTurn()) return;
    $('pass-summary').textContent =
      `Your power: ${E.score(state, 0)}. Rival power: ${E.score(state, 1)}.${state.players[1].passed ? ' The rival has already passed, so this will settle the round.' : ''}`;
    $('pass-dialog').showModal();
  });
  $('cancel-pass').addEventListener('click', () => $('pass-dialog').close());
  $('confirm-pass').addEventListener('click', () => {
    $('pass-dialog').close();
    commit({ pass: true });
  });
  $('review-match').addEventListener('click', () => $('match-result-dialog').close());
  $('replay-match').addEventListener('click', () => {
    if (state.phase === 'roundEnd') {
      $('match-result-dialog').close();
      state = E.nextRound(state);
      resetSelection();
      inspected = null;
      save();
      render();
      tick();
    } else if (state.phase === 'gameOver') newMatch();
  });
  $('sort-hand').addEventListener('change', render);
  $('rules-button').addEventListener('click', showRules);
  $('collection-button').addEventListener('click', showCollection);
  $('human-grave').addEventListener('click', showGrave);
  $('new-button').addEventListener('click', () => {
    closePortraitPanel();
    $('confirm-dialog').showModal();
  });
  $('cancel-new').addEventListener('click', () => $('confirm-dialog').close());
  $('confirm-new').addEventListener('click', () => {
    $('confirm-dialog').close();
    newMatch();
  });
  $('close-content').addEventListener('click', () => $('content-dialog').close());
  $('begin-button').addEventListener('click', flipCoin);
  $('start-round-button').addEventListener('click', () => {
    if (coinStarter === null || $('start-round-button').disabled) return;
    state = E.newMatch(coinStarter, nextOptions);
    coinStarter = null;
    lobbyOpen = false;
    $('coin-dialog').close();
    resetSelection();
    inspected = null;
    save();
    render();
    tick();
  });
  $('welcome-dialog').addEventListener('cancel', (event) => event.preventDefault());
  $('coin-dialog').addEventListener('cancel', (event) => event.preventDefault());
  $('choice-dialog').addEventListener('cancel', (event) => {
    event.preventDefault();
    resetSelection();
    render();
  });
  function openSettings() {
    closePortraitPanel();
    const settings = audio.getSettings();
    $('difficulty').value = level;
    $('starting-hand-size').value = nextOptions.handSize;
    $('include-omens').checked = nextOptions.includeOmens;
    $('include-spells').checked = nextOptions.includeSpells;
    $('guaranteed-start').checked = nextOptions.guaranteedStart;
    $('music-enabled').checked = settings.music;
    $('effects-enabled').checked = settings.effects;
    $('mute-all').checked = settings.muted;
    $('music-volume').value = Math.round(settings.musicVolume * 100);
    $('effects-volume').value = Math.round(settings.effectsVolume * 100);
    $('music-volume-value').textContent = `${$('music-volume').value}%`;
    $('effects-volume-value').textContent = `${$('effects-volume').value}%`;
    if (!audio.available) {
      $('audio-note').textContent =
        'This browser does not provide audio playback. You can still play with sound off.';
      ['music-enabled', 'effects-enabled', 'music-volume', 'effects-volume', 'mute-all'].forEach(
        (id) => ($(id).disabled = true)
      );
    }
    syncDeckSettings();
    $('settings-dialog').showModal();
  }
  function syncDeckSettings() {
    const includeOmens = $('include-omens').checked,
      includeSpells = $('include-spells').checked;
    const guarantee = $('guaranteed-start');
    guarantee.disabled = !includeOmens && !includeSpells;
    if (guarantee.disabled) guarantee.checked = false;
    const pool = E.cardPool({ includeOmens, includeSpells });
    const minimum = guarantee.checked ? 3 : 1;
    const maximum = guarantee.checked
      ? Math.floor(pool.filter((id) => C[id].type === 'unit').length / 2) + 3
      : Math.floor(pool.length / 2);
    const input = $('starting-hand-size');
    input.min = minimum;
    input.max = maximum;
    if (input.value !== '' && Number(input.value) < minimum) input.value = minimum;
    if (Number(input.value) > maximum) input.value = maximum;
    const types = includeOmens && includeSpells ? 'Spells/Omens' : includeOmens ? 'Omens' : 'Spells';
    $('starting-card-note').textContent = guarantee.disabled
      ? 'Include Spells or Omens to enable the starting guarantee.'
      : `When enabled, each player starts with exactly 3 random ${types}, with units filling the rest of the hand. Extra Spells/Omens stay in the shared deck.`;
    $('deck-settings-note').textContent =
      `${pool.length} cards in the shared deck. Choose ${minimum}–${maximum} starting cards per player.`;
  }
  ['settings-button', 'current-settings', 'welcome-settings'].forEach((id) =>
    $(id).addEventListener('click', openSettings)
  );
  ['close-settings', 'cancel-settings'].forEach((id) =>
    $(id).addEventListener('click', () => $('settings-dialog').close())
  );
  ['include-omens', 'include-spells', 'guaranteed-start', 'starting-hand-size'].forEach((id) =>
    $(id).addEventListener('change', syncDeckSettings)
  );
  $('music-volume').addEventListener('input', () => {
    $('music-volume-value').textContent = `${$('music-volume').value}%`;
  });
  $('effects-volume').addEventListener('input', () => {
    $('effects-volume-value').textContent = `${$('effects-volume').value}%`;
  });
  $('settings-form').addEventListener('submit', (event) => {
    event.preventDefault();
    nextOptions = E.matchOptions({
      handSize: Number($('starting-hand-size').value),
      includeOmens: $('include-omens').checked,
      includeSpells: $('include-spells').checked,
      guaranteedStart: $('guaranteed-start').checked
    });
    level = $('difficulty').value;
    storage.write('settings', { options: nextOptions, level });
    audio.configure({
      music: $('music-enabled').checked,
      effects: $('effects-enabled').checked,
      muted: $('mute-all').checked,
      musicVolume: Number($('music-volume').value) / 100,
      effectsVolume: Number($('effects-volume').value) / 100
    });
    $('settings-dialog').close();
    $('welcome-music').checked = $('music-enabled').checked;
    syncWelcome();
    if (lobbyOpen) state = E.newMatch(0, nextOptions);
    else save();
    render();
  });
  function syncMuteButton() {
    const muted = audio.getSettings().muted,
      button = $('mute-button');
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? 'Unmute all audio' : 'Mute all audio');
    button.title = muted ? 'Unmute all audio' : 'Mute all audio';
    button.disabled = !audio.available;
  }
  $('close-portrait-panel').addEventListener('click', closePortraitPanel);
  $('portrait-panel').addEventListener('close', () => {
    document
      .querySelectorAll('#portrait-tools [data-portrait-panel]')
      .forEach((button) => button.setAttribute('aria-expanded', 'false'));
  });
  $('portrait-panel').addEventListener('click', (event) => {
    const rect = $('portrait-panel').getBoundingClientRect();
    if (
      event.target === $('portrait-panel') &&
      (event.clientY < rect.top ||
        event.clientY > rect.bottom ||
        event.clientX < rect.left ||
        event.clientX > rect.right)
    )
      closePortraitPanel();
  });
  document.querySelector('.portrait-panel-tabs').addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...event.currentTarget.querySelectorAll('button')],
      current = tabs.indexOf(document.activeElement);
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    openPortraitPanel(tabs[index].dataset.portraitPanel);
    tabs[index].focus();
  });
  const changePortrait = () => {
    closePortraitPanel();
    render();
  };
  if (portraitLayout.addEventListener) portraitLayout.addEventListener('change', changePortrait);
  else portraitLayout.addListener(changePortrait);
  $('mute-button').addEventListener('click', () => {
    audio.configure({ muted: !audio.getSettings().muted });
    syncMuteButton();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
      resetSelection();
      render();
    }
  });
  layout.observe();
  window.addEventListener('pagehide', () => {
    if (!lobbyOpen) save();
  });
  if (loaded) {
    lobbyOpen = false;
    render();
    $('storage-note').textContent =
      'Saved match restored. Your progress saves automatically in this browser.';
    tick();
  } else showLobby();
})();
