/* Local orchestral music and sampled battle foley.
   Sources/licences: assets/music/CREDITS.md and assets/sounds/CREDITS.md. */
window.FKAudio = (() => {
  'use strict';
  const storage = window.FKStorage;
  const MUSIC_REVISION = 2;
  const defaults = { music: true, effects: true, musicVolume: 0.25, effectsVolume: 0.6, muted: false };
  function normalizeSettings(patch, base) {
    const normalized = { ...base };
    if (!patch || typeof patch !== 'object') return normalized;
    for (const [key, value] of Object.entries(base)) {
      if (typeof value === 'boolean' && typeof patch[key] === 'boolean') normalized[key] = patch[key];
      if (typeof value === 'number' && Number.isFinite(patch[key]))
        normalized[key] = Math.max(0, Math.min(1, patch[key]));
    }
    return normalized;
  }
  const saved = storage.read('audio');
  let settings = normalizeSettings(saved, defaults);
  // Enable the new battle score once for existing players; later mute choices persist.
  if (saved?.musicRevision !== MUSIC_REVISION) {
    settings.music = true;
    storage.write('audio', { ...settings, musicRevision: MUSIC_REVISION });
  }
  let ctx = null,
    effectsBus,
    effectsGeneration = 0;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const available = typeof window.Audio === 'function';
  const music = new window.FKMusicPlayer(() => settings);
  const decoded = new Map(),
    voices = new Set(),
    lastCues = new Map();
  const effectsVolume = () => (settings.muted || !settings.effects ? 0 : settings.effectsVolume * 0.9);
  const layer = (samples, gain = 1, rate = 1, delay = 0, variation = 0.02) => ({
    samples,
    gain,
    rate,
    delay,
    variation
  });
  // Weather retains the recording's pitch; small foley variations avoid identical repeats.
  const natural = (sample, gain = 1) => layer([sample], gain, 1, 0, 0);
  const cues = {
    hover: [layer(['page1', 'page2'], 0.3, 1.12)],
    select: [layer(['cloth1', 'cloth2'], 0.28)],
    'spell-play': [natural('chime', 0.75)],
    'omen-play': [layer(['shield'], 0.45), layer(['spell'], 0.4), layer(['drum'], 0.2, 1, 0.08)],
    'ability-play': [layer(['page2'], 0.3), layer(['spell'], 0.35, 1.04, 0.04)],
    fly: [layer(['swish'], 0.3)],
    land: [layer(['leather'], 0.6)],
    'boss-combat': [layer(['drum'], 0.8), layer(['blade2'], 0.8, 1, 0.08), layer(['dragon'], 0.95, 1, 0.08)],
    'boss-ranged': [natural('serpent', 0.95), layer(['spell'], 0.4), layer(['blade1'], 0.35, 1, 0.16)],
    'boss-siege': [
      layer(['drum'], 0.85, 0.95),
      layer(['stone'], 0.8, 1, 0.08),
      layer(['chain'], 0.55, 1, 0.2)
    ],
    'result-victory': [layer(['shield'], 0.4), layer(['coin1'], 0.4, 1, 0.12)],
    'result-defeat': [layer(['drum'], 0.6, 0.9), layer(['chain'], 0.4, 0.96, 0.12)],
    'result-draw': [layer(['wood1'], 0.45), layer(['shield'], 0.3, 1, 0.08)],
    burn: [layer(['blade1', 'blade2'], 0.6), layer(['fire1', 'fire2'], 0.8, 1, 0.06)],
    catastrophe: [natural('thunder', 0.8), layer(['fire2'], 0.8, 1, 0.12), layer(['stone'], 0.7, 1, 0.2)],
    blizzard: [natural('wind', 0.85), layer(['ice'], 0.45, 1, 0.1, 0)],
    thunderstorm: [natural('thunder', 0.95)],
    flood: [natural('water', 0.95)],
    dread: [
      natural('ominous', 0.75),
      layer(['chain'], 0.85, 0.95),
      layer(['whisper'], 0.7, 0.9, 0.08),
      layer(['drum'], 0.3, 0.92)
    ],
    pass: [layer(['leather'], 0.5), layer(['cloth2'], 0.25, 1, 0.05)],
    coin: [natural('coinFlip', 0.8)],
    'coin-land': [natural('coinLand', 0.75)],
    deathGaze: [layer(['swish'], 0.65), layer(['blade2'], 0.8, 1, 0.08)],
    convert: [layer(['cloth1'], 0.4), layer(['spell'], 0.65, 1, 0.04)],
    draw: [layer(['page1', 'page2'], 0.55), layer(['cloth1'], 0.25, 1, 0.12)],
    decoy: [natural('vanish', 0.9), layer(['swish'], 0.6, 1, 0.08), layer(['leather'], 0.45, 1, 0.15)],
    restoration: [natural('revive', 0.95), layer(['vanish'], 0.3), layer(['page2'], 0.35, 1, 0.18)],
    infiltration: [layer(['cloth1', 'cloth2'], 0.8, 0.95), layer(['swish'], 0.45, 0.9, 0.06)],
    sacrifice: [layer(['blade2'], 0.8), layer(['fire1'], 0.65, 1, 0.08)],
    'war-chant': [layer(['drum'], 0.85), layer(['drum'], 0.55, 1.04, 0.28), layer(['blade1'], 0.45, 1, 0.42)],
    ironward: [layer(['shield'], 0.65), layer(['chain'], 0.4, 1, 0.08)],
    shielded: [layer(['stone'], 0.5), layer(['shield'], 0.55, 1, 0.05)],
    sanctuary: [layer(['shield'], 0.4), layer(['spell'], 0.55, 1, 0.08)],
    accuracy: [layer(['swish'], 0.5), layer(['wood1'], 0.35, 1, 0.07)],
    purge: [layer(['spell'], 0.65), layer(['shield'], 0.45, 1, 0.08)],
    pridefall: [layer(['swish'], 0.65), layer(['metal2'], 0.75, 1, 0.1)],
    'weakest-link': [
      layer(['blade1'], 0.7),
      layer(['metal2'], 0.65, 1, 0.08),
      layer(['blade2'], 0.6, 1.02, 0.19),
      layer(['metal1'], 0.4, 1, 0.3)
    ],
    patience: [natural('clock', 0.9), layer(['leather'], 0.3)]
  };
  function decodeSample(name) {
    if (decoded.has(name)) return decoded.get(name);
    const encoded = window.FKSoundSamples?.[name];
    if (!ctx || !encoded) return Promise.resolve(null);
    const result = new Promise((resolve) => {
      try {
        const binary = atob(encoded),
          bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        // Callback form also works on older Web Audio implementations.
        ctx.decodeAudioData(bytes.buffer, resolve, () => resolve(null));
      } catch (_) {
        resolve(null);
      }
    });
    decoded.set(name, result);
    return result;
  }
  function stopEffects() {
    effectsGeneration++;
    lastCues.clear();
    for (const voice of voices) {
      try {
        voice.source.stop();
      } catch (_) {
        /* Already ended. */
      }
      voice.source.disconnect();
      voice.amp.disconnect();
    }
    voices.clear();
  }
  function playSample(buffer, spec) {
    if (voices.size >= 12) return;
    const source = ctx.createBufferSource(),
      amp = ctx.createGain();
    const voice = { source, amp };
    source.buffer = buffer;
    source.playbackRate.value = spec.rate * (1 + (Math.random() * 2 - 1) * spec.variation);
    amp.gain.value = spec.gain;
    source.connect(amp);
    amp.connect(effectsBus);
    source.onended = () => {
      voices.delete(voice);
      source.disconnect();
      amp.disconnect();
    };
    voices.add(voice);
    source.start(ctx.currentTime + spec.delay);
  }
  async function unlock() {
    if (!available) return false;
    music.unlock();
    // Sound effects retain their independent Web Audio volume and processing.
    try {
      if (!ctx && AudioContext) {
        ctx = new AudioContext();
        effectsBus = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 5;
        effectsBus.connect(compressor);
        compressor.connect(ctx.destination);
        effectsBus.gain.value = effectsVolume();
      }
      if (ctx?.state === 'suspended') await ctx.resume();
      if (ctx && settings.effects && !settings.muted)
        Object.keys(window.FKSoundSamples || {}).forEach(decodeSample);
    } catch (_) {
      /* Music can still play when Web Audio effects are unavailable. */
    }
    return true;
  }
  async function configure(patch) {
    settings = normalizeSettings(patch, settings);
    storage.write('audio', { ...settings, musicRevision: MUSIC_REVISION });
    if (settings.muted || !settings.effects || settings.effectsVolume === 0) stopEffects();
    if (settings.muted) music.pause(true);
    await unlock();
    if (ctx && effectsBus) effectsBus.gain.setTargetAtTime(effectsVolume(), ctx.currentTime, 0.025);
    music.resume();
    return { ...settings };
  }
  function canPlayEffects() {
    return (
      !!ctx &&
      ctx.state === 'running' &&
      !document.hidden &&
      !settings.muted &&
      settings.effects &&
      settings.effectsVolume > 0
    );
  }
  function playActivation(card) {
    if (!card) return;
    const cue =
      card.type === 'spell'
        ? 'spell-play'
        : card.type === 'omen'
          ? 'omen-play'
          : card.ability
            ? 'ability-play'
            : 'select';
    play(cue);
  }
  function play(name) {
    if (!canPlayEffects()) return;
    const requested = performance.now(),
      generation = effectsGeneration;
    const cooldown = name === 'fly' ? 140 : name === 'hover' ? 110 : 70;
    if (requested - (lastCues.get(name) ?? -Infinity) < cooldown) return;
    lastCues.set(name, requested);
    const layers = cues[name] || cues.land;
    const chosen = layers.map((spec) => ({
      spec,
      buffer: decodeSample(spec.samples[Math.floor(Math.random() * spec.samples.length)])
    }));
    Promise.all(chosen.map((part) => part.buffer)).then((buffers) => {
      // Never play a stale decoded cue after mute, a new game or returning to the tab.
      if (generation !== effectsGeneration || performance.now() - requested > 300 || !canPlayEffects())
        return;
      buffers.forEach((buffer, index) => {
        if (buffer) playSample(buffer, chosen[index].spec);
      });
    });
  }
  function resetMusic() {
    stopEffects();
    music.reset();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      music.pause(true);
      stopEffects();
      if (ctx?.state === 'running') ctx.suspend().catch(() => {});
    } else if (music.activated) unlock();
  });
  window.addEventListener('pagehide', () => {
    music.pause(true);
    stopEffects();
  });
  return Object.freeze({
    available,
    unlock,
    configure,
    setScene: (scene) => music.setScene(scene),
    playResult: (outcome) => music.playResult(outcome),
    resetMusic,
    getTrack: () => music.getTrack(),
    restoreTrack: (file) => music.restoreTrack(file),
    play,
    playActivation,
    getSettings: () => ({ ...settings })
  });
})();
