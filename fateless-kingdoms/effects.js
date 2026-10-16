/* Presentation-only effects. The rules engine remains the sole authority on moves. */
window.FKEffects = (() => {
  'use strict';
  const C = window.FKCards.cards, E = window.FKEngine;
  let running = [], overlays = [], hidden = [], generation = 0;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bounds = element => element?.getBoundingClientRect();
  const viable = r => r && r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
  function capture() {
    const field = new Map(), hand = new Map();
    document.querySelectorAll('#battlefield [data-card]').forEach(el => field.set(el.dataset.card, { rect: bounds(el), element: el }));
    document.querySelectorAll('#hand [data-card]').forEach(el => hand.set(el.dataset.card, { rect: bounds(el), element: el }));
    return { field, hand, cpu: bounds(document.querySelector('.opponent')), deck: bounds(document.getElementById('deck-count')), grave: [bounds(document.getElementById('human-grave')), bounds(document.getElementById('cpu-grave'))] };
  }
  function cancel() {
    generation++; running.forEach(a => a.cancel()); running = [];
    overlays.forEach(n => n.remove()); overlays = [];
    hidden.forEach(n => n.classList.remove('fx-hidden')); hidden = [];
  }
  function animate(el, frames, options) {
    if (!el.animate || reduced()) return Promise.resolve();
    const a = el.animate(frames, { fill: 'forwards', ...options }); running.push(a);
    return a.finished.catch(() => {});
  }
  function ghost(id, rect, back = false) {
    const n = document.createElement('div'); n.className = `fx-card${back ? ' card-back' : ''}`; n.setAttribute('aria-hidden', 'true');
    Object.assign(n.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    if (!back) { const im = document.createElement('img'); im.src = C[id].image; im.alt = ''; n.append(im); }
    document.body.append(n); overlays.push(n); return n;
  }
  function cardRect(anchor, width = 100) { return { left: anchor.left + anchor.width / 2 - width / 2, top: anchor.top + anchor.height / 2 - width * .707, width, height: width / .707 }; }
  async function fly(id, from, to, destination, back = false, delay = 0) {
    if (!viable(from) || !viable(to) || reduced()) return;
    const n = ghost(id, from, back);
    if (destination) { destination.classList.add('fx-hidden'); hidden.push(destination); }
    const x = to.left - from.left, y = to.top - from.top, sx = to.width / from.width, sy = to.height / from.height;
    await animate(n, [
      { transform: 'translate(0,0) rotate(-8deg) scale(1)', opacity: .8, filter: 'brightness(1.1)' },
      { transform: `translate(${x * .48}px,${y * .42 - 40}px) rotate(4deg) scale(${(sx + 1) / 2},${(sy + 1) / 2})`, opacity: 1, offset: .5 },
      { transform: `translate(${x}px,${y}px) rotate(0) scale(${sx},${sy})`, opacity: 1, filter: 'brightness(1)' }
    ], { duration: 570, delay, easing: 'cubic-bezier(.2,.65,.25,1)' });
    if (destination) destination.classList.remove('fx-hidden'); n.remove();
  }
  async function burn(id, rect, delay = 0) {
    if (!viable(rect) || reduced()) return;
    const n = ghost(id, rect); n.classList.add('burning-card');
    const promises = [animate(n, [
      { opacity: 1, filter: 'brightness(1) saturate(1)', transform: 'scale(1)' },
      { opacity: 1, filter: 'brightness(2.5) sepia(1) saturate(5)', transform: 'scale(1.06)', offset: .35 },
      { opacity: .8, filter: 'brightness(.2) sepia(1)', transform: 'translateY(-12px) rotate(6deg) scale(.9)', offset: .7 },
      { opacity: 0, filter: 'brightness(0)', transform: 'translateY(-25px) rotate(12deg) scale(.5)' }
    ], { duration: 800, delay, easing: 'ease-out' })];
    for (let i = 0; i < 7; i++) {
      const ember = document.createElement('i'); ember.className = 'fx-ember'; ember.setAttribute('aria-hidden', 'true');
      ember.style.left = `${rect.left + Math.random() * rect.width}px`; ember.style.top = `${rect.top + rect.height * (.3 + Math.random() * .6)}px`;
      document.body.append(ember); overlays.push(ember);
      promises.push(animate(ember, [{ opacity: 0, transform: 'translate(0,0) scale(.5)' }, { opacity: 1, offset: .2 }, { opacity: 0, transform: `translate(${Math.random() * 60 - 30}px,-${55 + Math.random() * 60}px) scale(0)` }], { duration: 750, delay: delay + i * 35, easing: 'ease-out' }).then(() => ember.remove()));
    }
    await Promise.all(promises); n.remove();
  }
  async function transition(before, after, snapshot, actor, move = {}) {
    cancel(); const token = generation, later = [], next = capture(), card = C[move.card];
    if (move.pass) { window.FKAudio.play('pass'); return; }
    window.FKAudio.play('fly');
    if (card && !reduced()) {
      const source = actor === 0 ? snapshot.hand.get(card.id)?.rect : snapshot.cpu && cardRect(snapshot.cpu, 90);
      const dest = next.field.get(card.id);
      if (dest) later.push(fly(card.id, source, dest.rect, dest.element));
      else if (card.type === 'spell') {
        const field = bounds(document.getElementById('battlefield'));
        if (field) { const center = cardRect(field, 100); center.top = field.top + field.height / 2 - 70; later.push(fly(card.id, source, center, null).then(() => {})); }
      }
    }
    let destroyed = 0;
    for (const [id, old] of snapshot.field) {
      const dest = next.field.get(id);
      if (dest && (Math.abs(dest.rect.left - old.rect.left) > 20 || Math.abs(dest.rect.top - old.rect.top) > 20) && id !== move.card && card?.ability === 'convert') later.push(fly(id, old.rect, dest.rect, dest.element, false, 180));
      if (!dest) {
        const returning = after.players[0].hand.includes(id) && card?.effect === 'decoy';
        if (returning) { const target = next.hand.get(id); if (target) later.push(fly(id, old.rect, target.rect, target.element, false, 300)); }
        else if (card?.effect === 'decoy' && actor === 1) { if (next.cpu) later.push(fly(id, old.rect, cardRect(next.cpu, 70), null, true, 300)); }
        else { destroyed++; later.push(burn(id, old.rect, 340)); }
      }
    }
    const newHand = after.players[0].hand.filter(id => !before.players[0].hand.includes(id));
    for (let i = 0; i < newHand.length; i++) {
      const id = newHand[i]; if (snapshot.field.has(id) && card?.effect === 'decoy') continue;
      const dest = next.hand.get(id); const source = card?.effect === 'sacrifice' || card?.ability === 'restoration' ? snapshot.grave[0] : snapshot.deck;
      if (dest && source) later.push(fly(id, cardRect(source, 70), dest.rect, dest.element, false, 420 + i * 100));
    }
    const cpuGains = actor === 1 ? Math.max(0, after.players[1].hand.length - before.players[1].hand.length + 1) : 0;
    // Opponent gains always fly face-down: never reveal hidden draws or recoveries.
    for (let i = 0; i < Math.min(card?.effect === 'decoy' ? 0 : cpuGains, 2); i++) if (snapshot.deck && next.cpu) later.push(fly(null, cardRect(card?.effect === 'sacrifice' || card?.ability === 'restoration' ? snapshot.grave[1] : snapshot.deck, 65), cardRect(next.cpu, 65), null, true, 420 + i * 100));
    const cue = destroyed ? 'burn' : card?.effect || card?.ability || 'land';
    if (card) {
      const effect = card.effect || card.ability;
      if (effect && document.getElementById('battlefield').animate && !reduced()) {
        const color = { blizzard: '#bfe8ff55', thunderstorm: '#b6baff55', flood: '#68c5e555', 'war-chant': '#f9bd5355', dread: '#ca547b44', ironward: '#72d9c755', sanctuary: '#efd69455', catastrophe: '#ee7e3e66', purge: '#d5b0ff55' }[effect];
        if (color) later.push(animate(document.getElementById('battlefield'), [{ boxShadow: `inset 0 0 65px ${color}` }, { boxShadow: 'inset 0 0 0 transparent' }], { duration: 1100, delay: 300 }));
      }
    }
    let cuePlayed = false;
    const cueTimer = setTimeout(() => { if (token === generation) { cuePlayed = true; window.FKAudio.play(cue); if (newHand.length || cpuGains) window.FKAudio.play('draw'); } }, reduced() ? 0 : 370);
    try { await Promise.all(later); } finally {
      if (token === generation) { clearTimeout(cueTimer); if (!cuePlayed) window.FKAudio.play(cue); running.forEach(a => a.cancel()); running = []; overlays.forEach(n => n.remove()); overlays = []; hidden.forEach(n => n.classList.remove('fx-hidden')); hidden = []; }
    }
    if (before.phase === 'playing' && after.phase !== 'playing') window.FKAudio.play(after.players[0].wins > before.players[0].wins ? 'win' : 'lose');
  }
  return Object.freeze({ capture, transition, cancel, reduced });
})();
