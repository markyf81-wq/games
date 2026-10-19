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
  const effectsVolume = () => (settings.muted || !settings.effects ? 0 : settings.effectsVolume * 0.55);
  const layer = (samples, gain = 1, rate = 1, delay = 0) => ({ samples, gain, rate, delay });
  const cues = {
    select: [layer(['cloth1', 'cloth2'], 0.28)],
    fly: [layer(['page1', 'page2'], 0.45, 0.95)],
    land: [layer(['leather'], 0.75), layer(['wood1', 'wood2'], 0.25, 0.95)],
    'land-combat': [layer(['metal1', 'metal2'], 0.62, 0.94), layer(['leather'], 0.45)],
    'land-ranged': [layer(['wood1', 'wood2'], 0.6), layer(['blade1'], 0.3, 0.95, 0.04)],
    'land-siege': [layer(['stone'], 0.8, 0.82), layer(['wood1', 'wood2'], 0.5, 0.88, 0.07)],
    burn: [layer(['blade1', 'blade2'], 0.55, 0.88), layer(['fire1', 'fire2'], 0.7, 0.88, 0.06)],
    catastrophe: [
      layer(['thunder'], 0.85, 0.82),
      layer(['fire2'], 0.75, 0.82, 0.12),
      layer(['stone'], 0.55, 0.75, 0.2)
    ],
    blizzard: [layer(['wind'], 0.8, 0.86)],
    thunderstorm: [layer(['thunder'], 0.88, 0.94)],
    flood: [layer(['water'], 0.8, 0.94)],
    dread: [layer(['chain'], 0.6, 0.78), layer(['roar'], 0.25, 0.7, 0.12)],
    pass: [layer(['leather'], 0.5, 0.9), layer(['cloth2'], 0.25, 0.88, 0.05)],
    coin: [layer(['coin1', 'coin2'], 0.6, 0.95)],
    deathGaze: [layer(['blade2'], 0.65, 0.85), layer(['fire1'], 0.5, 0.75, 0.08)],
    convert: [layer(['cloth1'], 0.4, 0.85), layer(['spell'], 0.5, 0.78, 0.04)],
    draw: [layer(['page1', 'page2'], 0.55), layer(['cloth1'], 0.25, 1, 0.12)],
    decoy: [layer(['cloth1', 'cloth2'], 0.5, 0.9)],
    restoration: [layer(['page2'], 0.5), layer(['spell'], 0.35, 0.8, 0.06)],
    infiltration: [layer(['cloth2'], 0.5, 0.85), layer(['blade1'], 0.35, 0.92, 0.06)],
    sacrifice: [layer(['blade2'], 0.65, 0.85), layer(['fire1'], 0.55, 0.85, 0.08)],
    'war-chant': [
      layer(['wood1'], 0.8, 0.72),
      layer(['metal1'], 0.5, 0.8, 0.12),
      layer(['wood2'], 0.6, 0.8, 0.26)
    ],
    ironward: [layer(['shield'], 0.7, 0.85), layer(['chain'], 0.3, 0.88, 0.08)],
    shielded: [layer(['stone'], 0.65, 0.8), layer(['shield'], 0.5, 0.88, 0.05)],
    sanctuary: [layer(['shield'], 0.45, 0.88), layer(['spell'], 0.3, 0.72, 0.08)],
    accuracy: [layer(['blade1'], 0.45, 0.98)],
    bloodRage: [layer(['metal1', 'metal2'], 0.65, 0.88)],
    fortified: [layer(['stone'], 0.65, 0.82), layer(['chain'], 0.4, 0.88, 0.06)],
    purge: [layer(['wind'], 0.6, 1.05), layer(['shield'], 0.4, 0.75, 0.08)],
    pridefall: [layer(['blade2'], 0.7, 0.85), layer(['metal2'], 0.55, 0.8, 0.1)],
    'weakest-link': [layer(['blade1'], 0.55, 0.9), layer(['metal1'], 0.55, 0.85, 0.08)],
    patience: [layer(['cloth1'], 0.35, 0.9)]
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
    source.playbackRate.value = spec.rate * (0.97 + Math.random() * 0.06);
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
  function play(name) {
    if (
      settings.muted ||
      !settings.effects ||
      settings.effectsVolume === 0 ||
      !ctx ||
      ctx.state !== 'running' ||
      document.hidden
    )
      return;
    const requested = performance.now(),
      generation = effectsGeneration;
    if (requested - (lastCues.get(name) ?? -Infinity) < (name === 'fly' ? 140 : 70)) return;
    lastCues.set(name, requested);
    const layers = cues[name] || cues.land;
    const chosen = layers.map((spec) => ({
      spec,
      buffer: decodeSample(spec.samples[Math.floor(Math.random() * spec.samples.length)])
    }));
    Promise.all(chosen.map((part) => part.buffer)).then((buffers) => {
      // Never play a stale decoded cue after mute, a new game or returning to the tab.
      if (
        generation !== effectsGeneration ||
        performance.now() - requested > 300 ||
        settings.muted ||
        !settings.effects ||
        !ctx ||
        ctx.state !== 'running' ||
        document.hidden
      )
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
    play,
    getSettings: () => ({ ...settings })
  });
})();
