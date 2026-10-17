/* Shared rules engine: the UI and CPU both submit choices through prompt/play. */
window.FKEngine = (() => {
  'use strict';
  const { cards: C, ids: IDS, rows: ROWS } = window.FKCards;
  const VERSION = 1;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const emptyRows = () => ({ combat: [], ranged: [], siege: [] });
  const other = (p) => 1 - p;
  const unit = (id) => C[id]?.type === 'unit';
  const onRow = (s, p, row) => s.players[p].rows[row];
  const rowUnits = (s, p, row) => onRow(s, p, row).filter(unit);
  const units = (s, p) => ROWS.flatMap((row) => rowUnits(s, p, row));
  const has = (s, p, row, id) => onRow(s, p, row).includes(id);
  const blocked = (s, p, row) => has(s, p, row, 'omen-dread');
  const locate = (s, id) => {
    for (let p = 0; p < 2; p++) for (const row of ROWS) if (onRow(s, p, row).includes(id)) return { p, row };
    return null;
  };
  function abilityBonus(s, c, p) {
    if (c.ability === 'accuracy') return rowUnits(s, p, 'ranged').length;
    if (c.ability === 'bloodRage') return rowUnits(s, other(p), 'combat').length;
    if (c.ability === 'fortified') return rowUnits(s, p, 'siege').length - 1;
    return 0;
  }
  const weatherAffects = (s, p, row) =>
    !has(s, p, row, 'omen-ironward') && s.weather.some((w) => C[w.id].weather === row);
  function power(s, id) {
    const c = C[id],
      loc = locate(s, id);
    if (!c || !unit(id)) return 0;
    if (!loc) return c.power;
    const { p, row } = loc;
    let value = c.power + abilityBonus(s, c, p);
    if (!has(s, p, row, 'omen-ironward')) {
      if (weatherAffects(s, p, row)) value = 1;
      if (has(s, p, row, 'omen-war-chant')) value += 2;
    }
    return value;
  }
  function powerSources(s, id) {
    const c = C[id],
      loc = locate(s, id);
    if (!unit(id) || !loc) return null;
    const { p, row } = loc,
      weathered = weatherAffects(s, p, row),
      sources = [];
    const amount = weathered ? 0 : abilityBonus(s, c, p);
    if (amount > 0) sources.push({ name: c.abilityName, amount });
    if (!has(s, p, row, 'omen-ironward') && has(s, p, row, 'omen-war-chant'))
      sources.push({ name: C['omen-war-chant'].name, amount: 2 });
    return sources.length ? { sources, weathered } : null;
  }
  const rowScore = (s, p, row) => rowUnits(s, p, row).reduce((n, id) => n + power(s, id), 0);
  const score = (s, p) => ROWS.reduce((n, row) => n + rowScore(s, p, row), 0);
  function protectedFrom(s, id, spell = false) {
    const loc = locate(s, id);
    if (!loc || !unit(id)) return false;
    return (
      (loc.row === 'siege' && has(s, loc.p, 'siege', 'siege-0')) ||
      (spell && has(s, loc.p, loc.row, 'omen-sanctuary'))
    );
  }
  function log(s, text) {
    s.log.push({ round: s.round, text });
    if (s.log.length > 80) s.log.shift();
  }
  function shuffle(list, random = Math.random) {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function cardPool(options = {}) {
    return IDS.filter(
      (id) =>
        (options.includeOmens !== false || C[id].type !== 'omen') &&
        (options.includeSpells !== false || C[id].type !== 'spell')
    );
  }
  function matchOptions(options = {}) {
    const includeOmens = options.includeOmens !== false,
      includeSpells = options.includeSpells !== false;
    const pool = cardPool({ includeOmens, includeSpells });
    const guaranteedStart = options.guaranteedStart === true && (includeOmens || includeSpells);
    const minimum = guaranteedStart ? 3 : 1;
    const maximum = guaranteedStart
      ? Math.floor(pool.filter(unit).length / 2) + 3
      : Math.floor(pool.length / 2);
    return {
      handSize: Math.max(
        minimum,
        Math.min(maximum, Number.isInteger(options.handSize) ? options.handSize : 15)
      ),
      includeOmens,
      includeSpells,
      guaranteedStart
    };
  }
  function newMatch(starter = Math.random() < 0.5 ? 0 : 1, settings = {}) {
    const options = matchOptions(settings);
    let deck = shuffle(cardPool(options));
    const players = [0, 1].map(() => ({ hand: [], rows: emptyRows(), grave: [], wins: 0, passed: false }));
    if (options.guaranteedStart) {
      const specialCards = deck.filter((id) => !unit(id)),
        unitCards = deck.filter(unit);
      players.forEach((player) => {
        player.hand = shuffle([...specialCards.splice(0, 3), ...unitCards.splice(0, options.handSize - 3)]);
      });
      // Unused Spells/Omens remain available for draws from the shared deck.
      deck = shuffle([...specialCards, ...unitCards]);
    } else
      players.forEach((player) => {
        player.hand = deck.splice(0, options.handSize);
      });
    const s = {
      version: VERSION,
      rules: 'printed-v1',
      options,
      players,
      deck,
      weather: [],
      knownHands: [[], []],
      round: 1,
      starter,
      turn: starter,
      phase: 'playing',
      rounds: [],
      log: [],
      lastCard: null
    };
    log(s, `One shared deck. ${options.handSize} cards each. First to two round wins.`);
    if (options.guaranteedStart)
      log(
        s,
        'Each player starts with exactly 3 random Spell/Omen cards. All other starting cards are units.'
      );
    log(s, `${starter === 0 ? 'You take' : 'The CPU takes'} the first turn.`);
    return s;
  }
  function removeField(s, id) {
    const loc = locate(s, id);
    if (loc) s.players[loc.p].rows[loc.row] = onRow(s, loc.p, loc.row).filter((x) => x !== id);
    return loc;
  }
  function destroy(s, targets, spell) {
    // Determine protection for the whole event before removing any protection sources.
    const victims = [...new Set(targets)].filter((id) => !protectedFrom(s, id, spell));
    for (const id of victims) {
      const loc = removeField(s, id);
      if (loc) s.players[loc.p].grave.push(id);
      else {
        const weather = s.weather.find((w) => w.id === id);
        if (weather) {
          s.players[weather.owner].grave.push(id);
          s.weather = s.weather.filter((w) => w.id !== id);
        }
      }
    }
    return victims;
  }
  function finishTurn(s, actor) {
    s.turn = s.players[other(actor)].passed ? actor : other(actor);
    return settleEmptyHands(s);
  }
  function settleEmptyHands(s) {
    for (let p = 0; p < 2; p++) {
      if (!s.players[p].passed && s.players[p].hand.length === 0) {
        s.players[p].passed = true;
        log(
          s,
          `${p === 0 ? 'You automatically pass' : 'The CPU automatically passes'}: no cards remain in hand.`
        );
      }
    }
    if (s.players.every((p) => p.passed)) return endRound(s);
    if (s.players[s.turn].passed) s.turn = other(s.turn);
    return s;
  }
  function autoPassEmptyHands(state) {
    if (state.phase !== 'playing' || !state.players.some((p) => !p.passed && p.hand.length === 0))
      return state;
    return settleEmptyHands(clone(state));
  }
  function endRound(s) {
    const scores = [score(s, 0), score(s, 1)];
    if (scores[0] >= scores[1]) s.players[0].wins++;
    if (scores[1] >= scores[0]) s.players[1].wins++;
    const winner = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
    s.rounds.push({ round: s.round, scores, winner });
    log(
      s,
      `Round ${s.round}: ${scores[0]}–${scores[1]}. ${winner === null ? 'Draw; both gain a round win.' : winner === 0 ? 'You win the round.' : 'The CPU wins the round.'}`
    );
    // Leave the final field visible until the player continues. Cleanup ignores protections.
    s.phase = s.players.some((p) => p.wins >= 2) ? 'gameOver' : 'roundEnd';
    return s;
  }
  function nextRound(state) {
    if (state.phase !== 'roundEnd') return state;
    const s = clone(state);
    for (const p of s.players) {
      for (const row of ROWS) {
        p.grave.push(...p.rows[row]);
        p.rows[row] = [];
      }
      p.passed = false;
    }
    for (const w of s.weather) s.players[w.owner].grave.push(w.id);
    s.weather = [];
    s.round++;
    s.starter = other(s.starter);
    s.turn = s.starter;
    s.phase = 'playing';
    s.lastCard = null;
    log(s, `Round ${s.round}. No new cards are dealt. ${s.turn === 0 ? 'You' : 'The CPU'} start.`);
    return settleEmptyHands(s);
  }
  const option = (id) => ({ value: id, card: id, label: C[id].name });
  function destructionTargets(s, effect) {
    const eligible = (p) => units(s, p).filter((id) => !protectedFrom(s, id, true));
    if (effect === 'pridefall')
      return [0, 1].flatMap((p) => {
        const targets = eligible(p),
          highest = Math.max(...targets.map((id) => power(s, id)));
        return targets.filter((id) => power(s, id) === highest);
      });
    if (effect === 'weakest-link') return [0, 1].flatMap(eligible);
    const field = ROWS.flatMap((row) => [0, 1].flatMap((p) => onRow(s, p, row)));
    const targets = effect === 'purge' ? field.filter((id) => C[id].type === 'omen') : field;
    return [...targets, ...s.weather.map((w) => w.id)].filter((id) => !protectedFrom(s, id, true));
  }
  function prompt(state, actor, cardId, selections = {}) {
    const c = C[cardId];
    if (
      state.phase !== 'playing' ||
      state.turn !== actor ||
      state.players[actor].passed ||
      !state.players[actor].hand.includes(cardId) ||
      !c
    )
      return { kind: 'blocked', message: 'This card cannot be played now.' };
    const a = { card: cardId, selections: clone(selections) };
    let waiting = null;
    function pick(key, opts, count, title, noTargets = `There are no valid targets for ${c.name}.`) {
      count = Math.min(count, opts.length);
      if (count === 0) {
        waiting = { kind: 'blocked', message: noTargets };
        return null;
      }
      // Nonempty selection steps always need an explicit choice, even if forced.
      const values = selections[key];
      if (
        Array.isArray(values) &&
        values.length === count &&
        new Set(values).size === count &&
        values.every((v) => opts.some((o) => o.value === v))
      )
        return values;
      waiting = { kind: 'choice', key, title, options: opts, count };
      return null;
    }
    if (
      ['pridefall', 'weakest-link', 'catastrophe', 'purge'].includes(c.effect) &&
      !destructionTargets(state, c.effect).length
    ) {
      return {
        kind: 'blocked',
        message:
          c.effect === 'purge'
            ? 'There are no Omens in play to destroy.'
            : `There are no unprotected targets for ${c.name} to destroy.`
      };
    }
    if (c.type === 'unit') {
      const dest = c.ability === 'infiltration' ? other(actor) : actor;
      if (blocked(state, dest, c.row))
        return { kind: 'blocked', message: `Dread blocks the ${c.row} row this unit must enter.` };
      if (c.ability === 'infiltration' && (state.deckCount ?? state.deck.length) === 0)
        return { kind: 'blocked', message: 'The shared deck is empty. Infiltration has no cards to draw.' };
      const temp = clone(state);
      temp.players[actor].hand = temp.players[actor].hand.filter((id) => id !== cardId);
      onRow(temp, dest, c.row).push(cardId);
      if (c.ability === 'restoration') {
        a.restore = pick(
          'restore',
          temp.players[actor].grave.filter((id) => unit(id) && C[id].row === c.row).map(option),
          1,
          `Return a ${c.row} unit to your hand`,
          `Your destroyed pile has no ${c.row} units to return.`
        );
      } else if (c.ability === 'deathGaze') {
        const targets = rowUnits(temp, other(actor), 'ranged').filter((id) => !protectedFrom(temp, id));
        const highest = Math.max(...targets.map((id) => power(temp, id)));
        a.kill = pick(
          'kill',
          targets.filter((id) => power(temp, id) === highest).map(option),
          1,
          'Choose a highest-power enemy Ranged unit',
          'There are no unprotected enemy Ranged units for Death Gaze to destroy.'
        );
      } else if (c.ability === 'convert') {
        if (blocked(temp, other(actor), 'combat'))
          return {
            kind: 'blocked',
            message: 'Dread blocks the enemy Combat row, so Mimic cannot trade places.'
          };
        const targets = rowUnits(temp, other(actor), 'combat');
        const lowest = Math.min(...targets.map((id) => power(temp, id)));
        a.convert = pick(
          'convert',
          targets.filter((id) => power(temp, id) === lowest).map(option),
          1,
          'Choose a lowest-power enemy Combat unit',
          'There are no enemy Combat units for Mimic to trade places with.'
        );
      }
      if (waiting) return waiting;
      a.destination = dest;
    } else if (c.type === 'omen' && !c.weather) {
      const dest = c.effect === 'dread' ? other(actor) : actor;
      const opts = ROWS.filter((row) => !blocked(state, dest, row)).map((row) => ({
        value: `${dest}:${row}`,
        row,
        side: dest,
        label: `${dest === actor ? 'Friendly' : 'Enemy'} ${row} row`
      }));
      if (!opts.length) return { kind: 'blocked', message: 'Dread blocks every row this Omen could enter.' };
      a.row = pick('row', opts, 1, `Choose ${c.effect === 'dread' ? 'an enemy' : 'a friendly'} row`);
      if (waiting) return waiting;
    } else if (c.effect === 'decoy') {
      a.decoy = pick(
        'decoy',
        units(state, actor)
          .filter((id) => !has(state, actor, C[id].row, 'omen-sanctuary'))
          .map(option),
        1,
        'Return one of your units to your hand',
        'There are no friendly units that Decoy can return. Sanctuary blocks this Spell.'
      );
      if (waiting) return waiting;
    } else if (c.effect === 'sacrifice') {
      // Recovery uses the pile before this play; its sacrifice cannot immediately return.
      const grave = state.players[actor].grave.filter(unit);
      if (!grave.length)
        return {
          kind: 'blocked',
          message:
            'Your destroyed pile has no units to recover. The unit sacrificed in this play cannot be recovered.'
        };
      a.sacrifice = pick(
        'sacrifice',
        units(state, actor)
          .filter((id) => !protectedFrom(state, id, true))
          .map(option),
        1,
        'Step 1: Choose a friendly unit to destroy',
        'There are no unprotected friendly units to sacrifice.'
      );
      if (waiting) return waiting;
      a.recover = pick(
        'recover',
        grave.map(option),
        2,
        'Step 2: Choose up to two previously destroyed units to return to your hand'
      );
      if (waiting) return waiting;
    } else if (c.effect === 'weakest-link') {
      a.weakest = [];
      for (let p = 0; p < 2; p++) {
        const targets = units(state, p)
          .filter((id) => !protectedFrom(state, id, true))
          .sort((x, y) => power(state, x) - power(state, y));
        const count = Math.min(3, targets.length);
        if (!count) continue;
        const cutoff = power(state, targets[count - 1]);
        const fixed = targets.filter((id) => power(state, id) < cutoff);
        const tied = targets.filter((id) => power(state, id) === cutoff);
        const picked = pick(
          `weakest${p}`,
          tied.map(option),
          count - fixed.length,
          `Choose ${count - fixed.length} ${p === actor ? 'friendly' : 'enemy'} unit${count - fixed.length === 1 ? '' : 's'} to destroy`
        );
        if (waiting) return waiting;
        a.weakest.push(...fixed, ...picked);
      }
    }
    return { kind: 'ready', action: a };
  }
  function play(state, actor, proposal) {
    if (state.phase !== 'playing' || state.turn !== actor || state.players[actor].passed)
      throw new Error('It is not this player’s turn.');
    const s = clone(state);
    if (proposal.pass) {
      s.players[actor].passed = true;
      log(
        s,
        s.players[actor].hand.length === 0
          ? `${actor === 0 ? 'You automatically pass' : 'The CPU automatically passes'}: no cards remain in hand.`
          : `${actor === 0 ? 'You pass' : 'The CPU passes'} at ${score(s, actor)} power.`
      );
      return finishTurn(s, actor);
    }
    const q = prompt(state, actor, proposal.card, proposal.selections);
    if (q.kind !== 'ready') throw new Error(q.message || 'Choose the required targets first.');
    const a = q.action,
      c = C[a.card],
      name = actor === 0 ? 'You' : 'The CPU';
    s.knownHands ||= [[], []];
    s.knownHands[actor] = s.knownHands[actor].filter((id) => id !== c.id);
    s.players[actor].hand = s.players[actor].hand.filter((id) => id !== c.id);
    s.lastCard = { id: c.id, actor };
    log(s, `${name} ${actor === 0 ? 'play' : 'plays'} ${c.name}.`);
    if (c.type === 'unit') {
      onRow(s, a.destination, c.row).push(c.id);
      if (c.ability === 'infiltration') {
        const drawn = s.deck.splice(0, 2);
        s.players[actor].hand.push(...drawn);
        log(
          s,
          `${c.name} joins the enemy. ${name} ${actor === 0 ? 'draw' : 'draws'} ${drawn.length} card${drawn.length === 1 ? '' : 's'}.`
        );
      }
      if (a.restore?.length) {
        const id = a.restore[0];
        s.players[actor].grave = s.players[actor].grave.filter((x) => x !== id);
        s.players[actor].hand.push(id);
        s.knownHands[actor].push(id);
        log(s, actor === 0 ? `${C[id].name} returns to your hand.` : 'The CPU returns 1 unit to its hand.');
      }
      if (a.kill?.length) {
        destroy(s, a.kill, false);
        log(s, `${c.name} destroys ${C[a.kill[0]].name}.`);
      }
      if (a.convert?.length) {
        const id = a.convert[0];
        removeField(s, c.id);
        removeField(s, id);
        onRow(s, actor, 'combat').push(id);
        onRow(s, other(actor), 'combat').push(c.id);
        log(s, `Mimic trades places with ${C[id].name}.`);
      }
    } else if (c.type === 'omen') {
      if (c.weather) s.weather.push({ id: c.id, owner: actor });
      else {
        const [p, row] = a.row[0].split(':');
        onRow(s, Number(p), row).push(c.id);
      }
    } else {
      let victims = [];
      if (c.effect === 'decoy' && a.decoy.length) {
        const id = a.decoy[0];
        removeField(s, id);
        s.players[actor].hand.push(id);
        s.knownHands[actor].push(id);
        log(s, actor === 0 ? `${C[id].name} returns to your hand.` : 'The CPU returns 1 unit to its hand.');
      }
      if (c.effect === 'sacrifice') {
        victims = destroy(s, a.sacrifice, true);
        for (const id of a.recover) {
          s.players[actor].grave = s.players[actor].grave.filter((x) => x !== id);
          s.players[actor].hand.push(id);
          s.knownHands[actor].push(id);
        }
        if (a.recover.length)
          log(
            s,
            actor === 0
              ? `${a.recover.map((id) => C[id].name).join(' and ')} return to your hand.`
              : `The CPU returns ${a.recover.length} unit${a.recover.length === 1 ? '' : 's'} to its hand.`
          );
      }
      if (['pridefall', 'catastrophe', 'purge'].includes(c.effect))
        victims = destroy(s, destructionTargets(s, c.effect), true);
      if (c.effect === 'weakest-link') victims = destroy(s, a.weakest, true);
      if (victims.length) log(s, `Destroyed: ${victims.map((id) => C[id].name).join(', ')}.`);
      s.deck.push(c.id); // Spells return to the bottom, never the destroyed pile.
    }
    return finishTurn(s, actor);
  }
  function combinations(values, count, limit) {
    const result = [];
    function visit(start, chosen) {
      if (result.length >= limit) return;
      if (chosen.length === count) {
        result.push(chosen);
        return;
      }
      for (let i = start; i <= values.length - (count - chosen.length); i++)
        visit(i + 1, [...chosen, values[i]]);
    }
    visit(0, []);
    return result;
  }
  function actions(state, actor, perCard = 16) {
    if (state.phase !== 'playing' || state.turn !== actor || state.players[actor].passed) return [];
    const result = [{ pass: true }];
    for (const card of state.players[actor].hand) {
      let added = 0;
      function expand(selections) {
        if (added >= perCard) return;
        const q = prompt(state, actor, card, selections);
        if (q.kind === 'ready') {
          result.push(q.action);
          added++;
        } else if (q.kind === 'choice') {
          const opts = q.options.slice().sort((a, b) => (C[b.card]?.power || 0) - (C[a.card]?.power || 0));
          const branches = combinations(
            opts.map((o) => o.value),
            q.count,
            perCard
          );
          // Include the opposite end of ties as well, so capped CPU search is varied.
          if (branches.length >= perCard && opts.length > q.count)
            branches[branches.length - 1] = opts.slice(-q.count).map((o) => o.value);
          for (const values of branches) expand({ ...selections, [q.key]: values });
        }
      }
      expand({});
    }
    return result;
  }
  function publicView(state, actor) {
    const s = clone(state);
    s.hiddenHandCount = s.players[other(actor)].hand.length;
    s.players[other(actor)].hand = [];
    s.deckCount = s.deck.length;
    s.deck = [];
    return s;
  }
  function validState(s) {
    if (
      s?.version !== VERSION ||
      s.rules !== 'printed-v1' ||
      !['playing', 'roundEnd', 'gameOver'].includes(s.phase) ||
      ![0, 1].includes(s.turn) ||
      ![0, 1].includes(s.starter) ||
      !Number.isInteger(s.round) ||
      s.round < 1 ||
      s.round > 3 ||
      !Array.isArray(s.players) ||
      s.players.length !== 2 ||
      !Array.isArray(s.weather) ||
      !Array.isArray(s.deck) ||
      !Array.isArray(s.log) ||
      !Array.isArray(s.rounds)
    )
      return false;
    if (
      s.options !== undefined &&
      (!s.options ||
        typeof s.options.includeOmens !== 'boolean' ||
        typeof s.options.includeSpells !== 'boolean' ||
        !Number.isInteger(s.options.handSize) ||
        s.options.handSize < 1 ||
        s.options.handSize > Math.floor(cardPool(s.options).length / 2))
    )
      return false;
    if (
      s.options?.guaranteedStart !== undefined &&
      (typeof s.options.guaranteedStart !== 'boolean' ||
        s.options.guaranteedStart !== matchOptions(s.options).guaranteedStart ||
        s.options.handSize !== matchOptions(s.options).handSize)
    )
      return false;
    if (
      s.log.length > 80 ||
      s.log.some(
        (entry) =>
          !entry ||
          typeof entry.text !== 'string' ||
          !Number.isInteger(entry.round) ||
          entry.round < 1 ||
          entry.round > s.round
      )
    )
      return false;
    if (
      s.lastCard !== null &&
      s.lastCard !== undefined &&
      (!IDS.includes(s.lastCard.id) || ![0, 1].includes(s.lastCard.actor))
    )
      return false;
    const resultCount = s.phase === 'playing' ? s.round - 1 : s.round;
    if (
      s.rounds.length !== resultCount ||
      s.rounds.some((result, index) => {
        if (
          !result ||
          result.round !== index + 1 ||
          !Array.isArray(result.scores) ||
          result.scores.length !== 2 ||
          result.scores.some((n) => !Number.isInteger(n) || n < 0)
        )
          return true;
        const [a, b] = result.scores;
        return result.winner !== (a === b ? null : a > b ? 0 : 1);
      })
    )
      return false;
    const all = s.deck.slice();
    for (const p of s.players) {
      if (
        !p ||
        !Array.isArray(p.hand) ||
        !Array.isArray(p.grave) ||
        !p.rows ||
        !Number.isInteger(p.wins) ||
        p.wins < 0 ||
        p.wins > 2 ||
        typeof p.passed !== 'boolean'
      )
        return false;
      if (p.grave.some((id) => !C[id] || C[id].type === 'spell')) return false;
      all.push(...p.hand, ...p.grave);
      for (const row of ROWS) {
        if (
          !Array.isArray(p.rows[row]) ||
          p.rows[row].some(
            (id) => !C[id] || (unit(id) ? C[id].row !== row : C[id].type !== 'omen' || C[id].weather)
          )
        )
          return false;
        all.push(...p.rows[row]);
      }
    }
    if (
      s.knownHands !== undefined &&
      (!Array.isArray(s.knownHands) ||
        s.knownHands.length !== 2 ||
        s.knownHands.some(
          (hand, p) =>
            !Array.isArray(hand) ||
            new Set(hand).size !== hand.length ||
            hand.some((id) => !s.players[p].hand.includes(id))
        ))
    )
      return false;
    if (s.weather.some((w) => !w || !C[w.id]?.weather || ![0, 1].includes(w.owner))) return false;
    if (
      s.players.some(
        (player, p) =>
          player.wins !== s.rounds.filter((result) => result.winner === null || result.winner === p).length
      )
    )
      return false;
    if ((s.phase === 'gameOver') !== s.players.some((player) => player.wins >= 2)) return false;
    if (s.phase === 'playing' && s.players[s.turn].passed) return false;
    all.push(...s.weather.map((w) => w.id));
    const pool = cardPool(s.options),
      allowed = new Set(pool);
    return (
      all.length === pool.length && new Set(all).size === pool.length && all.every((id) => allowed.has(id))
    );
  }
  return Object.freeze({
    VERSION,
    clone,
    cardPool,
    matchOptions,
    newMatch,
    nextRound,
    autoPassEmptyHands,
    prompt,
    play,
    actions,
    publicView,
    validState,
    score,
    rowScore,
    power,
    powerSources,
    protectedFrom,
    blocked,
    locate,
    units,
    rowUnits,
    shuffle
  });
})();
