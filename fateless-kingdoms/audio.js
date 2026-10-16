/* Original, procedural soundtrack and effects. No remote assets or audio downloads. */
window.FKAudio = (() => {
  'use strict';
  const KEY = 'fateless-kingdoms.audio.v1';
  let settings = { music: false, effects: true, musicVolume: .25, effectsVolume: .6 };
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved) for (const key of Object.keys(settings)) if (typeof saved[key] === typeof settings[key]) settings[key] = typeof saved[key] === 'number' ? Math.max(0, Math.min(1, saved[key])) : saved[key]; } catch (_) {}
  let ctx = null, musicBus, effectsBus, noiseBuffer, timer = null, beat = 0, nextBeat = 0;
  const available = !!(window.AudioContext || window.webkitAudioContext);
  const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);
  function tone(freq, start, duration, gain, type = 'sine', bus = effectsBus, endFreq = null) {
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator(), amp = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    amp.gain.setValueAtTime(.0001, start); amp.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), start + Math.min(.025, duration / 5)); amp.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(amp); amp.connect(bus); osc.start(start); osc.stop(start + duration + .025);
    osc.onended = () => { osc.disconnect(); amp.disconnect(); };
  }
  function noise(start, duration, gain, cutoff = 1000, bus = effectsBus) {
    if (!ctx || !bus) return;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
    source.buffer = noiseBuffer; source.loop = true; filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoff, start);
    amp.gain.setValueAtTime(.0001, start); amp.gain.linearRampToValueAtTime(gain, start + .025); amp.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(amp); amp.connect(bus); source.start(start); source.stop(start + duration + .02);
    source.onended = () => { source.disconnect(); filter.disconnect(); amp.disconnect(); };
  }
  function stopMusic() { if (timer) clearInterval(timer); timer = null; if (ctx && musicBus) musicBus.gain.setTargetAtTime(0, ctx.currentTime, .12); }
  function scheduleMusic() {
    if (!ctx || ctx.state !== 'running') return;
    const chords = [[50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64]], step = 60 / 72 / 2;
    while (nextBeat < ctx.currentTime + .6) {
      const chord = chords[Math.floor(beat / 16) % chords.length], within = beat % 16;
      if (within === 0) {
        chord.slice(0, 3).forEach((note, i) => tone(frequency(note), nextBeat + i * .012, step * 15.5, .035, 'sine', musicBus));
        tone(frequency(chord[0] - 12), nextBeat, step * 8, .065, 'triangle', musicBus);
      }
      if (within % 2 === 0) {
        const pattern = [2, 1, 3, 1, 2, 0, 3, 1], midi = chord[pattern[within / 2]] + 12;
        tone(frequency(midi), nextBeat, 1.3, .085, 'triangle', musicBus);
        tone(frequency(midi + 12), nextBeat + .012, .45, .018, 'sine', musicBus);
      }
      if (within === 4 || within === 12) { tone(72, nextBeat, .2, .07, 'sine', musicBus, 40); noise(nextBeat, .08, .025, 650, musicBus); }
      nextBeat += step; beat++;
    }
  }
  function startMusic() {
    if (!ctx || ctx.state !== 'running' || !settings.music || document.hidden) return;
    musicBus.gain.setTargetAtTime(settings.musicVolume * .65, ctx.currentTime, .12);
    if (timer) return;
    nextBeat = ctx.currentTime + .08; scheduleMusic(); timer = setInterval(scheduleMusic, 150);
  }
  async function unlock() {
    if (!available) return false;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        musicBus = ctx.createGain(); effectsBus = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor(); compressor.threshold.value = -18; compressor.ratio.value = 5;
        musicBus.connect(compressor); effectsBus.connect(compressor); compressor.connect(ctx.destination);
        musicBus.gain.value = 0; effectsBus.gain.value = settings.effectsVolume * .55;
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const samples = noiseBuffer.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') await ctx.resume();
      if (settings.music) startMusic();
      return ctx.state === 'running';
    } catch (_) { return false; }
  }
  async function configure(patch) {
    settings = { ...settings, ...patch };
    settings.musicVolume = Math.max(0, Math.min(1, settings.musicVolume)); settings.effectsVolume = Math.max(0, Math.min(1, settings.effectsVolume));
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {}
    await unlock();
    if (ctx) effectsBus.gain.setTargetAtTime(settings.effectsVolume * .55, ctx.currentTime, .025);
    if (settings.music) startMusic(); else stopMusic();
    return { ...settings };
  }
  function play(name) {
    if (!settings.effects || !ctx || ctx.state !== 'running' || document.hidden) return;
    const t = ctx.currentTime;
    if (name === 'select') { tone(440, t, .08, .055, 'triangle', effectsBus, 660); return; }
    if (name === 'fly') { noise(t, .3, .14, 2500); return; }
    if (name === 'land') { tone(115, t, .22, .2, 'triangle', effectsBus, 48); noise(t, .1, .07, 500); return; }
    if (name === 'burn' || name === 'catastrophe') { noise(t, name === 'catastrophe' ? 1.1 : .65, .22, 1400); tone(70, t, .7, .18, 'sine', effectsBus, 30); return; }
    if (name === 'blizzard') { noise(t, 1, .17, 3800); [95, 102, 107].forEach((n, i) => tone(frequency(n), t + i * .12, .55, .035)); return; }
    if (name === 'thunderstorm') { noise(t, .9, .26, 650); tone(52, t, .8, .24, 'sine', effectsBus, 25); return; }
    if (name === 'flood') { noise(t, 1, .18, 850); tone(165, t, .8, .065, 'sine', effectsBus, 65); return; }
    if (name === 'dread') { [55, 58].forEach(f => tone(f, t, .9, .12, 'triangle', effectsBus, f / 1.4)); return; }
    if (name === 'pass') { tone(300, t, .24, .09, 'triangle', effectsBus, 150); return; }
    if (name === 'coin') { [1500, 1900, 2400, 1800, 1500].forEach((f, i) => tone(f, t + i * .12, .13, .06)); return; }
    if (name === 'deathGaze' || name === 'convert') { tone(800, t, .5, .09, 'sawtooth', effectsBus, 120); noise(t + .1, .35, .09, 1400); return; }
    if (name === 'draw' || name === 'decoy' || name === 'restoration' || name === 'infiltration' || name === 'sacrifice') { [400, 580].forEach((f, i) => { noise(t + i * .12, .12, .07, 1800); tone(f, t + i * .12, .16, .04, 'triangle'); }); return; }
    const chord = name === 'lose' ? [50, 53, 57] : name === 'war-chant' ? [50, 57, 62] : name === 'ironward' || name === 'shielded' ? [62, 69, 74] : [74, 78, 81];
    chord.forEach((n, i) => tone(frequency(n), t + i * .09, name === 'win' ? 1.2 : .7, .075, 'triangle'));
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopMusic(); if (ctx?.state === 'running') ctx.suspend().catch(() => {}); } else if (ctx) unlock(); });
  return Object.freeze({ available, unlock, configure, play, getSettings: () => ({ ...settings }) });
})();
