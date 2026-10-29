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
      this.frames = new Set();
      this.generation = 0;
      this.particleCount = 0;
    }
    clear() {
      this.frames.forEach((frame) => {
        cancelAnimationFrame(frame.id);
        frame.resolve();
      });
      this.frames.clear();
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
    draw(duration, render) {
      if (reduced()) return Promise.resolve();
      return new Promise((resolve) => {
        const frame = { resolve, id: null },
          start = performance.now();
        this.frames.add(frame);
        const tick = (now) => {
          const progress = Math.min(1, (now - start) / duration);
          try {
            render(progress);
          } catch (_) {
            this.frames.delete(frame);
            resolve();
            return;
          }
          if (progress < 1) frame.id = requestAnimationFrame(tick);
          else {
            this.frames.delete(frame);
            resolve();
          }
        };
        frame.id = requestAnimationFrame(tick);
      });
    }
    hide(element) {
      element.classList.add('fx-hidden');
      this.hidden.add(element);
    }
  }
  const cinematicEffects = new Set([
    'catastrophe',
    'purge',
    'pridefall',
    'weakest-link',
    'blizzard',
    'thunderstorm',
    'flood',
    'dread',
    'ironward',
    'sanctuary',
    'war-chant'
  ]);
  const cleaveEffects = new Set(['pridefall', 'weakest-link', 'deathGaze']);
  const resultEffects = new Set(['victory', 'defeat', 'draw']);
  const waveEffects = new Set(['flood', 'catastrophe']);
  const ringEffects = new Set([
    'catastrophe',
    'purge',
    'pridefall',
    'war-chant',
    'boss',
    'ironward',
    'sanctuary',
    'victory',
    'draw'
  ]);
  const crestEffects = new Set([
    'boss',
    'victory',
    'war-chant',
    'ironward',
    'sanctuary',
    'purge',
    'dread',
    'draw'
  ]);
  const risingEffects = new Set(['catastrophe', 'defeat', 'dread']);
  const destructionEffects = new Set(['catastrophe', 'purge', 'pridefall', 'weakest-link']);
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
  async function cinematic(kind, anchor, delay = 0, major = false, cue = kind) {
    const token = session.generation;
    if (delay && !reduced()) await pause(delay);
    if (token !== session.generation) return;
    const soundDelay = reduced() ? 0 : kind === 'thunderstorm' ? 220 : cleaveEffects.has(kind) ? 100 : 0;
    const sound = () => {
      if (cue && token === session.generation) window.FKAudio.play(cue);
    };
    if (soundDelay) pause(soundDelay).then(sound);
    else sound();
    if (reduced()) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-cinematic';
    canvas.setAttribute('aria-hidden', 'true');
    const w = window.innerWidth,
      h = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2000000 / (w * h)));
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    document.body.append(canvas);
    session.overlays.add(canvas);
    const cx = viable(anchor) ? anchor.left + anchor.width / 2 : w / 2;
    const cy = viable(anchor) ? anchor.top + anchor.height / 2 : h * 0.46;
    const span = Math.max(w, h),
      size = Math.min(w, h);
    const color =
      kind === 'victory' || kind === 'boss' || kind === 'pridefall'
        ? '#f4d38c'
        : kind === 'defeat'
          ? '#c76159'
          : colors[kind] || '#c1a2ed';
    const rgb = (hex, alpha) => {
      const value = parseInt(hex.slice(1), 16);
      return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${alpha})`;
    };
    // One canvas and a bounded particle field keep large effects light on phones.
    const particles = Array.from({ length: w <= 600 ? 22 : 44 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 1 + Math.random() * 2.5,
      speed: 0.4 + Math.random(),
      angle: Math.random() * Math.PI * 2
    }));
    const line = (points, stroke, width = 2) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.stroke();
    };
    const duration = resultEffects.has(kind) ? (major ? 2200 : 1600) : 1350;
    await session.draw(duration, (t) => {
      ctx.clearRect(0, 0, w, h);
      const envelope = Math.min(1, t / 0.12) * Math.min(1, (1 - t) / 0.35);
      ctx.globalAlpha = Math.max(0, envelope);
      const dark = ctx.createRadialGradient(cx, cy, 0, cx, cy, span * 0.75);
      dark.addColorStop(0, rgb(color, 0));
      dark.addColorStop(0.6, rgb(color, kind === 'defeat' ? 0.06 : 0.02));
      dark.addColorStop(1, rgb(color, 0.32));
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, w, h);
      if (ringEffects.has(kind)) {
        const radius = size * (0.12 + t * (kind === 'catastrophe' ? 1.8 : 0.85));
        const ring = ctx.createRadialGradient(cx, cy, radius * 0.65, cx, cy, radius);
        ring.addColorStop(0, rgb(color, 0));
        ring.addColorStop(0.78, rgb(color, kind === 'catastrophe' ? 0.3 : 0.13));
        ring.addColorStop(0.93, rgb(color, 0.65));
        ring.addColorStop(1, rgb(color, 0));
        ctx.fillStyle = ring;
        ctx.fillRect(0, 0, w, h);
      }
      if (kind === 'blizzard') {
        // Wind-driven snow and frost, never the filled water-wave shapes used by Flood.
        for (let i = 0; i < 12; i++) {
          const x = (((i * 0.137 + t * 1.4) % 1.3) - 0.15) * w;
          const y = ((i * 0.193 + t * 0.32) % 1) * h;
          const reach = w * (0.045 + (i % 3) * 0.018);
          line(
            [
              [x - reach, y - reach * 0.12],
              [x, y]
            ],
            rgb(color, 0.2),
            1 + (i % 2)
          );
        }
        for (let i = 0; i < 10; i++) {
          const x = w * ((i + 0.5) / 10);
          const y = h * (i % 2 ? 0.06 : 0.94);
          const radius = Math.min(w, h) * (0.025 + t * 0.035);
          for (let arm = 0; arm < 3; arm++) {
            const angle = (arm * Math.PI) / 3;
            const dx = Math.cos(angle) * radius,
              dy = Math.sin(angle) * radius;
            line(
              [
                [x - dx, y - dy],
                [x + dx, y + dy]
              ],
              rgb(color, 0.35),
              1.5
            );
            line(
              [
                [x + dx * 0.55 - dy * 0.2, y + dy * 0.55 + dx * 0.2],
                [x + dx * 0.75, y + dy * 0.75],
                [x + dx * 0.55 + dy * 0.2, y + dy * 0.55 - dx * 0.2]
              ],
              rgb(color, 0.3),
              1
            );
          }
        }
      }
      if (waveEffects.has(kind)) {
        for (let wave = 0; wave < 3; wave++) {
          ctx.beginPath();
          const base = kind === 'catastrophe' ? h * (1.2 - t * 0.7) : h * (0.95 - t * 0.4 + wave * 0.07);
          ctx.moveTo(-w * 0.1, h + 20);
          for (let x = -w * 0.1; x <= w * 1.1; x += w / 40) {
            const y = base + Math.sin((x / w) * Math.PI * 3 + t * 5 + wave) * h * 0.055;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w * 1.1, h + 20);
          ctx.closePath();
          ctx.fillStyle = rgb(color, 0.09);
          ctx.fill();
          ctx.strokeStyle = rgb(color, 0.45 - wave * 0.1);
          ctx.lineWidth = 2 + wave;
          ctx.stroke();
        }
      }
      if (kind === 'thunderstorm') {
        // A single lightning strike and afterglow, without a strobing screen flash.
        const strike = Math.max(0, 1 - Math.abs(t - 0.25) / 0.23);
        ctx.save();
        ctx.globalAlpha *= strike;
        const points = [
          [cx - w * 0.12, -20],
          [cx + w * 0.04, h * 0.18],
          [cx - w * 0.06, h * 0.2],
          [cx + w * 0.08, cy - h * 0.08],
          [cx, cy + h * 0.16]
        ];
        line(points, rgb(color, 0.2), 22);
        line(points, rgb(color, 0.65), 7);
        line(points, '#e7edff', 2);
        line([points[2], [cx - w * 0.18, h * 0.33], [cx - w * 0.12, h * 0.47]], rgb(color, 0.65), 2);
        ctx.restore();
      }
      if (cleaveEffects.has(kind)) {
        const reach = Math.sin((Math.min(1, t * 1.7) * Math.PI) / 2);
        const x = cx - size * 0.5,
          y = cy - size * 0.5;
        for (const offset of kind === 'weakest-link' ? [-0.14, 0, 0.14] : [0]) {
          const points = [
            [x + size * offset, y],
            [x + size * (reach + offset), y + size * reach]
          ];
          line(points, rgb(color, 0.1), 30);
          line(points, rgb(color, 0.75), 3);
        }
      }
      if (crestEffects.has(kind)) {
        ctx.save();
        ctx.translate(cx, cy);
        const radius = size * (major ? 0.25 : 0.2) * (0.8 + t * 0.3);
        ctx.strokeStyle = rgb(color, 0.45);
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, radius * (1 + i * 0.17), 0, Math.PI * 2);
          ctx.stroke();
        }
        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI) / 6 + t * 0.15;
          line(
            [
              [Math.cos(angle) * radius * 1.1, Math.sin(angle) * radius * 1.1],
              [Math.cos(angle) * radius * 1.22, Math.sin(angle) * radius * 1.22]
            ],
            rgb(color, 0.65)
          );
        }
        const r = radius * 0.55;
        if (kind === 'boss' || kind === 'victory')
          line(
            [
              [-r, r * 0.5],
              [-r, -r * 0.4],
              [-r * 0.4, 0],
              [0, -r * 0.8],
              [r * 0.4, 0],
              [r, -r * 0.4],
              [r, r * 0.5],
              [-r, r * 0.5]
            ],
            rgb(color, 0.75),
            3
          );
        else if (kind === 'ironward' || kind === 'sanctuary')
          line(
            [
              [-r, -r * 0.7],
              [0, -r],
              [r, -r * 0.7],
              [r * 0.7, r * 0.45],
              [0, r],
              [-r * 0.7, r * 0.45],
              [-r, -r * 0.7]
            ],
            rgb(color, 0.75),
            3
          );
        else if (kind === 'war-chant') {
          line(
            [
              [-r, r],
              [r, -r]
            ],
            rgb(color, 0.75),
            3
          );
          line(
            [
              [r, r],
              [-r, -r]
            ],
            rgb(color, 0.75),
            3
          );
          line(
            [
              [-r, r * 0.4],
              [-r * 0.4, r]
            ],
            rgb(color, 0.75),
            3
          );
          line(
            [
              [r, r * 0.4],
              [r * 0.4, r]
            ],
            rgb(color, 0.75),
            3
          );
        } else if (kind === 'dread') {
          for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.ellipse(i * r * 0.35, i * r * 0.24, r * 0.23, r * 0.12, 0.6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      if (kind === 'victory' || kind === 'boss') {
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI) / 6 + t * 0.12;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * size * 0.12, Math.sin(angle) * size * 0.12);
          ctx.lineTo(Math.cos(angle - 0.04) * span, Math.sin(angle - 0.04) * span);
          ctx.lineTo(Math.cos(angle + 0.04) * span, Math.sin(angle + 0.04) * span);
          ctx.closePath();
          ctx.fillStyle = rgb(color, 0.045);
          ctx.fill();
        }
        ctx.restore();
      }
      particles.forEach((p) => {
        const wind = kind === 'blizzard' || kind === 'flood';
        const rising = risingEffects.has(kind);
        const x = wind ? ((p.x + t * p.speed * 0.5) % 1) * w : p.x * w + Math.cos(p.angle) * t * 40;
        const y = rising
          ? h - ((p.y + t * p.speed * 0.6) % 1) * h
          : ((p.y + t * p.speed * (wind ? 0.2 : 0.35)) % 1) * h;
        ctx.fillStyle = rgb(color, 0.25 + p.speed * 0.3);
        if (kind === 'blizzard') {
          for (let arm = 0; arm < 3; arm++) {
            const angle = (arm * Math.PI) / 3 + t;
            const xOffset = Math.cos(angle) * p.size * 2,
              yOffset = Math.sin(angle) * p.size * 2;
            line(
              [
                [x - xOffset, y - yOffset],
                [x + xOffset, y + yOffset]
              ],
              rgb(color, 0.65),
              1
            );
          }
        } else if (kind === 'thunderstorm')
          line(
            [
              [x, y],
              [x - 5, y + 18]
            ],
            rgb(color, 0.25),
            1
          );
        else {
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
    canvas.remove();
    session.overlays.delete(canvas);
  }
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
    const boss = C[id].type === 'unit' && C[id].power === 15;
    n.classList.add('reveal-ready');
    await Promise.all([
      pause(reduced() ? 2000 : 1820),
      boss ? cinematic('boss', center, 0, false, `boss-${C[id].row}`) : Promise.resolve()
    ]);
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
  async function fly(id, from, to, destination, back = false, delay = 0, onArrival = null) {
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
    if (token === session.generation) onArrival?.();
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
      card = C[move.card],
      effect = card?.effect || card?.ability,
      boss = card?.type === 'unit' && card.power === 15;
    const cinematicEffect =
      cinematicEffects.has(effect) ||
      (effect === 'deathGaze' && [...snapshot.field.keys()].some((id) => !next.field.has(id)));
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
    let landed = false;
    const land = () => {
      if (landed || token !== session.generation) return;
      landed = true;
      window.FKAudio.play('land');
      // Cinematics and bosses own their own sound; remaining abilities follow field arrival.
      if (effect && !cinematicEffect && !boss) window.FKAudio.play(effect);
    };
    if (card && !reduced()) {
      const source =
        snapshot.played ||
        (actor === 0 ? snapshot.hand.get(card.id)?.rect : snapshot.cpu && cardRect(snapshot.cpu, 90));
      const dest = next.field.get(card.id);
      if (dest) later.push(fly(card.id, source, dest.rect, dest.element, false, 0, land).then(land));
      else if (card.type === 'spell') {
        const deck = next.deck;
        if (deck) later.push(fly(card.id, source, cardRect(deck, 38), null, false, 0, land).then(land));
        else land();
      } else land();
    } else if (card) land();
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
    if (card) {
      if (cinematicEffect) {
        const loc = E.locate(after, card.id);
        const anchor = loc
          ? bounds(
              document.querySelector(`.${loc.p === 0 ? 'own' : 'enemy'}-half .row-${loc.row} .row-cards`)
            )
          : bounds(document.getElementById('battlefield'));
        later.push(cinematic(effect, anchor, 300));
      }
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
        else if (destructionEffects.has(effect))
          later.push(rowBurst(document.getElementById('battlefield'), color, 280));
      }
    }
    // Resolution sounds share the session's cancellable timing instead of a second timer/fallback path.
    later.push(
      pause(reduced() ? 0 : 370).then(() => {
        if (token !== session.generation) return;
        if (destroyed && effect !== 'catastrophe' && effect !== 'sacrifice') window.FKAudio.play('burn');
        if (newHand.length || cpuGains) window.FKAudio.play('draw');
      }),
      feedback(before, after, next, reduced() ? 0 : 570)
    );
    try {
      await Promise.all(later);
    } finally {
      if (token === session.generation) clearEffects();
    }
  }
  async function result(outcome, finished = false) {
    cancel();
    const token = session.generation;
    await cinematic(outcome, null, 0, finished, `result-${outcome}`);
    if (token === session.generation) clearEffects();
  }
  return Object.freeze({ capture, showPlayed, transition, result, cancel, reduced });
})();
