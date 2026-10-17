/* Hidden-information search. Input is a public view, never the real opposing hand. */
window.FKCPU = (() => {
  'use strict';
  const E = window.FKEngine,
    { cards: C, rows: ROWS } = window.FKCards;
  const levels = {
    casual: { samples: 2, depth: 2, candidates: 8, noise: 9 },
    tactician: { samples: 5, depth: 4, candidates: 12, noise: 0.8 },
    strategist: { samples: 10, depth: 6, candidates: 18, noise: 0 }
  };
  const sigmoid = (n) => Math.tanh(n);
  function cardValue(s, p, id) {
    const c = C[id];
    let value = 8;
    if (c.type === 'unit') {
      value += c.power * 0.34;
      if (c.ability === 'infiltration') value += s.deck.length ? 8 : -9;
      if (c.ability === 'restoration') value += s.players[p].grave.some((x) => C[x].row === c.row) ? 8 : 1;
      if (c.ability === 'shielded') value += E.rowUnits(s, p, 'siege').length * 1.5;
      if (c.ability === 'deathGaze') value += 7;
      if (c.ability === 'convert') value += 7;
    } else if (c.effect === 'patience') value = 3;
    else if (c.effect === 'decoy') value = 10;
    else if (c.effect === 'catastrophe') value = 15;
    else if (c.type === 'spell') value = 12;
    else value = 11;
    return value;
  }
  function value(s, p) {
    const me = s.players[p],
      foe = s.players[1 - p];
    const wins = me.wins - foe.wins;
    const material =
      me.hand.reduce((n, id) => n + cardValue(s, p, id), 0) -
      foe.hand.reduce((n, id) => n + cardValue(s, 1 - p, id), 0);
    if (s.phase === 'gameOver') {
      const outcome = me.wins >= 2 && foe.wins >= 2 ? 0 : me.wins >= 2 ? 1 : -1;
      return outcome * 4000 + material * 0.2;
    }
    if (s.phase === 'roundEnd') return wins * 145 + material * 0.95;
    const margin = E.score(s, p) - E.score(s, 1 - p);
    let result = wins * 145 + material * 0.9 + sigmoid(margin / 22) * 37;
    if (me.passed && !foe.passed) {
      const potential = foe.hand.reduce(
        (n, id) => n + (C[id].type === 'unit' && C[id].ability !== 'infiltration' ? C[id].power : 6),
        0
      );
      result += margin < 0 ? -70 : margin > potential ? 42 : -35 + Math.min(margin, 60) * 0.45;
    }
    if (foe.passed && !me.passed && margin <= 0) result -= 16;
    return result;
  }
  function sample(view, p) {
    const s = E.clone(view);
    const known = new Set([...s.players[p].hand, ...s.weather.map((w) => w.id)]);
    for (const player of s.players) {
      player.grave.forEach((id) => known.add(id));
      ROWS.forEach((row) => player.rows[row].forEach((id) => known.add(id)));
    }
    const revealedHand = [...new Set(s.knownHands?.[1 - p] || [])];
    revealedHand.forEach((id) => known.add(id));
    const unknown = E.shuffle(E.cardPool(s.options).filter((id) => !known.has(id)));
    s.players[1 - p].hand = [
      ...revealedHand,
      ...unknown.splice(0, Math.max(0, view.hiddenHandCount - revealedHand.length))
    ];
    s.deck = unknown;
    delete s.hiddenHandCount;
    delete s.deckCount;
    return s;
  }
  function ranked(s, p, limit) {
    return E.actions(s, p, 5)
      .map((move) => ({ move, state: E.play(s, p, move) }))
      .map((item) => ({ ...item, value: value(item.state, p) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }
  function rollout(s, depth) {
    let state = s;
    for (let i = 0; i < depth && state.phase === 'playing'; i++) {
      const choices = ranked(state, state.turn, 1);
      if (!choices.length) break;
      state = choices[0].state;
    }
    return state;
  }
  async function choose(view, level = 'tactician', yieldWork = () => Promise.resolve()) {
    const p = 1,
      foe = 0,
      config = levels[level] || levels.tactician;
    if (!view.players[p].hand.length || (view.players[foe].passed && E.score(view, p) > E.score(view, foe)))
      return { move: { pass: true }, samples: 0 };
    const baseline = sample(view, p);
    const all = ranked(baseline, p, 1000);
    let candidates = all.slice(0, config.candidates);
    const passing = all.find((item) => item.move.pass);
    if (passing && !candidates.includes(passing)) candidates.push(passing);
    // Keep tactically distinct card choices even when row variants crowd the shortlist.
    const included = new Set(candidates.map((item) => item.move.card));
    for (const item of all)
      if (!item.move.pass && !included.has(item.move.card)) {
        candidates.push(item);
        included.add(item.move.card);
      }
    const gap = E.score(view, foe) - E.score(view, p);
    const bestSwing = Math.max(
      0,
      ...all
        .filter((item) => !item.move.pass)
        .map((item) => E.score(item.state, p) - E.score(item.state, foe) + gap)
    );
    if (
      !view.players[foe].passed &&
      view.players[foe].wins === 0 &&
      gap > 24 &&
      E.units(view, p).length >= 3 &&
      bestSwing < gap * 0.55 &&
      view.players[p].hand.length >= view.hiddenHandCount
    )
      return { move: { pass: true }, samples: 0 };
    // Every candidate sees the same possible hidden deals for a fair comparison.
    const samples = Array.from({ length: config.samples }, () => sample(view, p));
    let best = null,
      bestValue = -Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const move = candidates[i].move;
      let total = 0;
      for (const deal of samples) {
        const after = E.play(deal, p, move);
        const future = rollout(after, config.depth);
        total += value(future, p) * 0.8 + value(after, p) * 0.2;
      }
      const rating = total / samples.length + (Math.random() - 0.5) * config.noise;
      if (rating > bestValue) {
        best = move;
        bestValue = rating;
      }
      if (i % 2 === 0) await yieldWork();
    }
    return { move: best || { pass: true }, samples: samples.length };
  }
  return Object.freeze({ choose });
})();
