/* Presentation-only effects. The rules engine remains the sole authority on moves. */
window.FKEffects = (() => {
  'use strict';
  const C = window.FKCards.cards,
    E = window.FKEngine;
  class EffectSession {
    constructor() {
      this.animations = new Set();
      this.overlays = new Set();
      this.hidden = new Set();
      this.waits = new Set();
      this.generation = 0;
      this.particleCount = 0;
    }
    clear() {
      this.animations.forEach((animation) => animation.cancel());
      this.animations.clear();
      this.overlays.forEach((element) => element.remove());
      this.overlays.clear();
      this.hidden.forEach((element) => element.classList.remove('fx-hidden'));
      this.hidden.clear();
      this.particleCount = 0;
    }
    cancel() {
      this.generation++;
      this.waits.forEach((wait) => {
        clearTimeout(wait.timer);
        wait.resolve();
      });
      this.waits.clear();
      this.clear();
    }
    animate(element, frames, options) {
      if (!element?.animate || reduced()) return Promise.resolve();
      const animation = element.animate(frames, { fill: 'forwards', ...options });
      this.animations.add(animation);
      return animation.finished.catch(() => {}).finally(() => this.animations.delete(animation));
    }
    pause(duration) {
      return new Promise((resolve) => {
        const wait = { resolve };
        wait.timer = setTimeout(() => {
          this.waits.delete(wait);
          resolve();
        }, duration);
        this.waits.add(wait);
      });
    }
    hide(element) {
      element.classList.add('fx-hidden');
      this.hidden.add(element);
    }
  }
  const session = new EffectSession();
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bounds = (element) => element?.getBoundingClientRect();
  const viable = (r) =>
    r &&
    r.width > 0 &&
    r.height > 0 &&
    r.left + r.width > 0 &&
    r.left < window.innerWidth &&
    r.top + r.height > 0 &&
    r.top < window.innerHeight;
  const colors = {
    combat: '#d89580',
    ranged: '#a5d38e',
    siege: '#8ebcdd',
    spell: '#e5bd70',
    omen: '#c49ee6',
    blizzard: '#bee8fa',
    thunderstorm: '#acb5f7',
    flood: '#72cddd',
    'war-chant': '#f2ce75',
    dread: '#d977a0',
    ironward: '#82d6bd',
    sanctuary: '#f1dc9c',
    catastrophe: '#f6a06a',
    purge: '#ccaff4'
  };
  const tone = (card) => colors[card?.effect] || colors[card?.row] || colors[card?.type] || colors.spell;
  function overlay(className, rect, color) {
    const n = document.createElement('div');
    n.className = className;
    n.setAttribute('aria-hidden', 'true');
    if (rect)
      Object.assign(n.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`
      });
    n.style.setProperty('--fx-color', color || colors.spell);
    document.body.append(n);
    session.overlays.add(n);
    return n;
  }
  function capture() {
    const field = new Map(),
      hand = new Map();
    document.querySelectorAll('#battlefield [data-card]').forEach((el) => {
      const rect = bounds(el);
      if (viable(rect)) field.set(el.dataset.card, { rect, element: el });
    });
    document
      .querySelectorAll('#hand [data-card]')
      .forEach((el) => hand.set(el.dataset.card, { rect: bounds(el), element: el }));
    // Portrait tucks the deck/piles/rival hand into Match; fly from/to its visible button.
    const anchor = (id) => {
      const rect = bounds(document.getElementById(id));
      return viable(rect) ? rect : bounds(document.getElementById('portrait-match-button'));
    };
    return {
      field,
      hand,
      cpu: anchor('rival-hand'),
      deck: anchor('deck-count'),
      grave: [anchor('human-grave'), anchor('cpu-grave')]
    };
  }
  const clearEffects = () => session.clear();
  const cancel = () => session.cancel();
  const animate = (element, frames, options) => session.animate(element, frames, options);
  function ghost(id, rect, back = false) {
    const n = overlay(`fx-card${back ? ' card-back' : ''}`, rect, tone(C[id]));
    if (!back) {
      const im = document.createElement('img');
      im.src = C[id].image;
      im.alt = '';
      n.append(im);
    }
    return n;
  }
  function cardRect(anchor, width = 100) {
    return {
      left: anchor.left + anchor.width / 2 - width / 2,
      top: anchor.top + anchor.height / 2 - width * 0.707,
      width,
      height: width / 0.707
    };
  }
  const pause = (duration) => session.pause(duration);
  async function sparks(rect, color, count = 8, delay = 0, rising = false) {
    if (reduced() || !viable(rect)) return;
    const limit = window.innerWidth <= 600 ? 32 : 72;
    count = Math.min(count, Math.max(0, limit - session.particleCount));
    session.particleCount += count;
    await Promise.all(
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / Math.max(1, count),
          distance = 24 + Math.random() * 40;
        const x = rising ? Math.random() * 40 - 20 : Math.cos(angle) * distance;
        const y = rising ? -45 - Math.random() * 65 : Math.sin(angle) * distance;
        const n = overlay(
          `fx-spark${rising ? ' fx-cinder' : ''}`,
          {
            left: rect.left + rect.width * (rising ? Math.random() : 0.5),
            top: rect.top + rect.height * (rising ? 0.6 : 0.5),
            width: 3,
            height: rising ? 6 : 3
          },
          color
        );
        return animate(
          n,
          [
            { opacity: 0, transform: 'translate(0,0) scale(.4)' },
            { opacity: 0.9, offset: 0.15 },
            { opacity: 0, transform: `translate(${x}px,${y}px) scale(.15)` }
          ],
          { duration: rising ? 740 : 540, delay: delay + i * 12, easing: 'cubic-bezier(.1,.65,.25,1)' }
        ).then(() => n.remove());
      })
    );
  }
  async function impact(rect, color, delay = 0) {
    if (reduced() || !viable(rect)) return;
    const size = Math.min(180, Math.max(rect.width * 1.7, 55));
    const ring = overlay(
      'fx-impact',
      {
        left: rect.left + (rect.width - size) / 2,
        top: rect.top + (rect.height - size) / 2,
        width: size,
        height: size
      },
      color
    );
    await Promise.all([
      animate(
        ring,
        [
          { transform: 'scale(.25)', opacity: 0.8 },
          { transform: 'scale(1.12)', opacity: 0 }
        ],
        { duration: 580, delay, easing: 'ease-out' }
      ).then(() => ring.remove()),
      sparks(rect, color, 8, delay)
    ]);
  }
  async function rowBurst(element, color, delay = 0) {
    const rect = bounds(element);
    if (reduced() || !viable(rect)) return;
    const n = overlay('fx-row-burst', rect, color);
    await animate(
      n,
      [
        { opacity: 0, backgroundPosition: '130% 50%' },
        { opacity: 0.6, offset: 0.25 },
        { opacity: 0, backgroundPosition: '-30% 50%' }
      ],
      { duration: 850, delay, easing: 'ease-out' }
    );
    n.remove();
  }
  async function feedback(before, after, next, delay = 0) {
    if (reduced()) return;
    const cues = [];
    for (let p = 0; p < 2; p++) {
      const score = document.getElementById(p === 0 ? 'human-score' : 'cpu-score'),
        difference = E.score(after, p) - E.score(before, p);
      if (difference) {
        const color = difference > 0 ? '#b8e5a0' : '#f0ac98';
        cues.push(
          animate(
            score,
            [
              { color, textShadow: `0 0 20px ${color}` },
              { color: '#f0e9d8', textShadow: '0 0 0 transparent' }
            ],
            { duration: 700, delay, fill: 'none' }
          )
        );
        const rect = bounds(score);
        if (viable(rect)) {
          const n = overlay('fx-score-change', rect, color);
          n.textContent = `${difference > 0 ? '+' : '−'}${Math.abs(difference)}`;
          cues.push(
            animate(
              n,
              [
                { opacity: 0, transform: 'translateY(4px)' },
                { opacity: 1, transform: 'translateY(-10px)', offset: 0.2 },
                { opacity: 0, transform: 'translateY(-30px)' }
              ],
              { duration: 800, delay }
            ).then(() => n.remove())
          );
        }
      }
      if (after.players[p].wins > before.players[p].wins) {
        const badge = document.getElementById(p === 0 ? 'human-wins' : 'cpu-wins');
        cues.push(
          animate(
            badge,
            [
              { filter: 'brightness(1)' },
              { filter: 'brightness(1.7)', offset: 0.3 },
              { filter: 'brightness(1)' }
            ],
            { duration: 650, delay, fill: 'none' }
          )
        );
      }
      for (const row of window.FKCards.rows) {
        if (E.rowScore(before, p, row) === E.rowScore(after, p, row)) continue;
        const label = document.querySelector(`.${p === 0 ? 'own' : 'enemy'}-half .row-${row} .row-score`);
        if (label)
          cues.push(
            animate(
              label,
              [
                { color: colors[row], textShadow: `0 0 14px ${colors[row]}` },
                { color: '#e8e4d2', textShadow: 'none' }
              ],
              { duration: 650, delay, fill: 'none' }
            )
          );
      }
    }
    for (const [id, dest] of next.field) {
      if (!E.locate(before, id) || C[id].type !== 'unit' || E.power(before, id) === E.power(after, id))
        continue;
      const color = E.power(after, id) > E.power(before, id) ? '#b8e5a0' : '#f0ac98';
      cues.push(
        animate(
          dest.element,
          [{ boxShadow: `0 0 0 2px ${color}, 0 0 18px ${color}` }, { boxShadow: '0 3px 7px #0004' }],
          { duration: 700, delay, fill: 'none' }
        )
      );
    }
    await Promise.all(cues);
  }
  async function showPlayed(id, actor, snapshot) {
    cancel();
    const token = session.generation;
    const width = Math.min(220, window.innerWidth * 0.48, (window.innerHeight - 150) / 1.414);
    const center = cardRect({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }, width);
    center.top = Math.max(20, center.top - 20);
    const color = tone(C[id]);
    const shade = overlay('fx-stage', null, color);
    const auraSize = Math.min(center.height * 1.3, window.innerWidth - 16);
    const aura = overlay(
      'fx-reveal-aura',
      {
        left: center.left + (center.width - auraSize) / 2,
        top: center.top + (center.height - auraSize) / 2,
        width: auraSize,
        height: auraSize
      },
      color
    );
    const label = overlay('fx-play-label', null, color);
    label.style.top = `${center.top + center.height + 16}px`;
    const kicker = document.createElement('span');
    kicker.textContent = `${actor === 0 ? 'You play' : 'The rival plays'} · ${C[id].row || C[id].type}`;
    const name = document.createElement('strong');
    name.textContent = C[id].name;
    label.append(kicker, name);
    const source = actor === 0 ? snapshot.hand.get(id)?.rect : snapshot.cpu && cardRect(snapshot.cpu, 80);
    const n = ghost(id, center);
    n.classList.add('showcased-card');
    n.style.transformOrigin = '50% 50%';
    const from = viable(source)
      ? source
      : {
          left: actor === 0 ? center.left : window.innerWidth - 70,
          top: actor === 0 ? window.innerHeight - 70 : 20,
          width: 70,
          height: 99
        };
    window.FKAudio.play('fly');
    await animate(
      n,
      [
        {
          transform: `translate(${from.left + from.width / 2 - center.left - center.width / 2}px,${from.top + from.height / 2 - center.top - center.height / 2}px) scale(${from.width / center.width},${from.height / center.height})`,
          opacity: 0.7
        },
        { transform: 'translate(0,0) scale(1)', opacity: 1 }
      ],
      { duration: 460, easing: 'cubic-bezier(.2,.7,.25,1)' }
    );
    if (token !== session.generation) return null;
    window.FKAudio.play('land');
    n.classList.add('reveal-ready');
    await pause(reduced() ? 2000 : 1820);
    if (token !== session.generation) return null;
    await Promise.all(
      [shade, label, aura].map((element) =>
        animate(element, [{ opacity: element === aura ? 0.2 : 1 }, { opacity: 0 }], { duration: 180 })
      )
    );
    if (token !== session.generation) return null;
    // transition() replaces this overlay with the flight to its final destination.
    return center;
  }
  async function fly(id, from, to, destination, back = false, delay = 0) {
    if (!viable(from) || !to || to.width <= 0 || to.height <= 0 || reduced()) return;
    const token = session.generation;
    const n = ghost(id, from, back);
    if (destination) {
      session.hide(destination);
    }
    const x = to.left - from.left,
      y = to.top - from.top,
      sx = to.width / from.width,
      sy = to.height / from.height;
    await animate(
      n,
      [
        { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1, filter: 'brightness(1.1)' },
        {
          transform: `translate(${x * 0.48}px,${y * 0.42 - 40}px) rotate(4deg) scale(${(sx + 1) / 2},${(sy + 1) / 2})`,
          opacity: 1,
          offset: 0.5
        },
        {
          transform: `translate(${x}px,${y}px) rotate(0) scale(${sx},${sy})`,
          opacity: 1,
          filter: 'brightness(1)'
        }
      ],
      { duration: 570, delay, easing: 'cubic-bezier(.2,.65,.25,1)' }
    );
    if (destination) destination.classList.remove('fx-hidden');
    n.remove();
    if (token === session.generation && destination?.isConnected) await impact(to, tone(C[id]));
  }
  async function burn(id, rect, delay = 0) {
    if (!viable(rect) || reduced()) return;
    const n = ghost(id, rect);
    n.classList.add('burning-card');
    const promises = [
      animate(
        n,
        [
          { opacity: 1, filter: 'brightness(1)', clipPath: 'inset(0 0 0 0)', transform: 'scale(1)' },
          {
            opacity: 1,
            filter: 'brightness(1.6) sepia(.8) saturate(2)',
            clipPath: 'inset(0 0 15% 0)',
            transform: 'scale(1.035)',
            offset: 0.3
          },
          {
            opacity: 0.65,
            filter: 'brightness(.35) sepia(1)',
            clipPath: 'inset(0 0 55% 0)',
            transform: 'translateY(-8px) scale(.98)',
            offset: 0.75
          },
          {
            opacity: 0,
            filter: 'brightness(.2)',
            clipPath: 'inset(0 0 100% 0)',
            transform: 'translateY(-18px) scale(.94)'
          }
        ],
        { duration: 800, delay, easing: 'ease-out' }
      )
    ];
    promises.push(sparks(rect, '#ffbb6f', 7, delay + 80, true));
    await Promise.all(promises);
    n.remove();
  }
  async function transition(before, after, snapshot, actor, move = {}) {
    cancel();
    const token = session.generation,
      later = [],
      next = capture(),
      card = C[move.card];
    if (move.pass) {
      window.FKAudio.play('pass');
      try {
        await feedback(before, after, next);
      } finally {
        if (token === session.generation) clearEffects();
      }
      return;
    }
    window.FKAudio.play('fly');
    if (card && !reduced()) {
      const source =
        snapshot.played ||
        (actor === 0 ? snapshot.hand.get(card.id)?.rect : snapshot.cpu && cardRect(snapshot.cpu, 90));
      const dest = next.field.get(card.id);
      if (dest) later.push(fly(card.id, source, dest.rect, dest.element));
      else if (card.type === 'spell') {
        const deck = next.deck;
        if (deck) later.push(fly(card.id, source, cardRect(deck, 38), null));
      }
    }
    let destroyed = 0;
    for (const [id, old] of snapshot.field) {
      const dest = next.field.get(id);
      if (
        dest &&
        (Math.abs(dest.rect.left - old.rect.left) > 20 || Math.abs(dest.rect.top - old.rect.top) > 20) &&
        id !== move.card &&
        card?.ability === 'convert'
      )
        later.push(fly(id, old.rect, dest.rect, dest.element, false, 180));
      if (!dest) {
        const returning = after.players[0].hand.includes(id) && card?.effect === 'decoy';
        if (returning) {
          const target = next.hand.get(id);
          if (target) later.push(fly(id, old.rect, target.rect, target.element, false, 300));
        } else if (card?.effect === 'decoy' && actor === 1) {
          if (next.cpu) later.push(fly(id, old.rect, cardRect(next.cpu, 70), null, true, 300));
        } else {
          destroyed++;
          later.push(burn(id, old.rect, 340));
        }
      }
    }
    const newHand = after.players[0].hand.filter((id) => !before.players[0].hand.includes(id));
    for (let i = 0; i < newHand.length; i++) {
      const id = newHand[i];
      if (snapshot.field.has(id) && card?.effect === 'decoy') continue;
      const dest = next.hand.get(id);
      const source =
        card?.effect === 'sacrifice' || card?.ability === 'restoration' ? snapshot.grave[0] : snapshot.deck;
      if (dest && source)
        later.push(fly(id, cardRect(source, 70), dest.rect, dest.element, false, 420 + i * 100));
    }
    const cpuGains =
      actor === 1 ? Math.max(0, after.players[1].hand.length - before.players[1].hand.length + 1) : 0;
    // Opponent gains always fly face-down: never reveal hidden draws or recoveries.
    for (let i = 0; i < Math.min(card?.effect === 'decoy' ? 0 : cpuGains, 2); i++)
      if (snapshot.deck && next.cpu)
        later.push(
          fly(
            null,
            cardRect(
              card?.effect === 'sacrifice' || card?.ability === 'restoration'
                ? snapshot.grave[1]
                : snapshot.deck,
              65
            ),
            cardRect(next.cpu, 65),
            null,
            true,
            420 + i * 100
          )
        );
    const cue = card?.effect || card?.ability || (card?.row ? `land-${card.row}` : 'land');
    if (card) {
      const effect = card.effect || card.ability;
      if (effect && !reduced()) {
        const color = tone(card),
          loc = E.locate(after, card.id);
        if (card.weather) {
          for (const half of ['own', 'enemy'])
            later.push(
              rowBurst(document.querySelector(`.${half}-half .row-${card.weather} .row-cards`), color, 500)
            );
        } else if (card.type === 'omen' && loc)
          later.push(
            rowBurst(
              document.querySelector(`.${loc.p === 0 ? 'own' : 'enemy'}-half .row-${loc.row} .row-cards`),
              color,
              500
            )
          );
        else if (['catastrophe', 'purge', 'pridefall', 'weakest-link'].includes(effect))
          later.push(rowBurst(document.getElementById('battlefield'), color, 280));
      }
    }
    let cuePlayed = false;
    const cueTimer = setTimeout(
      () => {
        if (token === session.generation) {
          cuePlayed = true;
          window.FKAudio.play(cue);
          if (destroyed && cue !== 'catastrophe' && cue !== 'sacrifice') window.FKAudio.play('burn');
          if (newHand.length || cpuGains) window.FKAudio.play('draw');
        }
      },
      reduced() ? 0 : 370
    );
    later.push(feedback(before, after, next, reduced() ? 0 : 570));
    try {
      await Promise.all(later);
    } finally {
      clearTimeout(cueTimer);
      if (token === session.generation) {
        if (!cuePlayed) {
          window.FKAudio.play(cue);
          if (destroyed && cue !== 'catastrophe' && cue !== 'sacrifice') window.FKAudio.play('burn');
          if (newHand.length || cpuGains) window.FKAudio.play('draw');
        }
        clearEffects();
      }
    }
  }
  return Object.freeze({ capture, showPlayed, transition, cancel, reduced });
})();
