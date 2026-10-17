/* Local orchestral recordings (Scott Buckley, CC BY 4.0) and generated sound effects.
   Track sources and licence: assets/music/CREDITS.md. */
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
    noiseBuffer,
    scene = 'lobby',
    activated = false;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const available = typeof window.Audio === 'function';
  const frequency = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  // Native media playback keeps direct-file play working and streams only the current track.
  // Each phase keeps its own player so a new round resumes the battle playlist.
  const createTrack = (files, finished = false) => ({
    files,
    index: 0,
    failed: new Set(),
    audio: null,
    fade: null,
    target: 0,
    pending: false,
    request: 0,
    finished
  });
  const soundtracks = {
    battle: createTrack(['balefire.mp3', 'legionnaire.mp3']),
    ambient: createTrack(['chronicle.mp3']),
    result: createTrack([], true)
  };
  const effectsVolume = () => (settings.muted || !settings.effects ? 0 : settings.effectsVolume * 0.55);
  const currentSoundtrack = () =>
    scene === 'result' ? soundtracks.result : scene === 'battle' ? soundtracks.battle : soundtracks.ambient;
  const shouldPlay = (track) =>
    !track.finished &&
    activated &&
    !settings.muted &&
    settings.music &&
    settings.musicVolume > 0 &&
    !document.hidden &&
    track === currentSoundtrack();

  function fadeMusic(track, target, duration = 700) {
    if (!track.audio || (duration !== 0 && track.fade && track.target === target)) return;
    clearInterval(track.fade);
    track.fade = null;
    track.target = target;
    const audio = track.audio,
      from = audio.volume,
      start = performance.now();
    const finish = () => {
      clearInterval(track.fade);
      track.fade = null;
      audio.volume = target;
      if (target === 0) audio.pause();
    };
    if (duration === 0 || Math.abs(from - target) < 0.001) {
      finish();
      return;
    }
    track.fade = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      audio.volume = from + (target - from) * progress;
      if (progress === 1) finish();
    }, 40);
  }
  function getPlayer(track) {
    if (track.audio) return track.audio;
    const audio = new Audio();
    track.audio = audio;
    audio.preload = 'none';
    audio.volume = 0;
    audio.addEventListener('ended', () => advanceTrack(track));
    audio.addEventListener('error', () => advanceTrack(track, true));
    audio.src = 'assets/music/' + track.files[track.index];
    return audio;
  }
  function advanceTrack(track, failed = false) {
    if (failed) track.failed.add(track.index);
    track.request++;
    track.pending = false;
    fadeMusic(track, 0, 0);
    if (track === soundtracks.result) {
      track.finished = true;
      return;
    }
    if (track.failed.size === track.files.length) return;
    do {
      track.index = (track.index + 1) % track.files.length;
    } while (track.failed.has(track.index));
    // load() also restarts the single-track ambient playlist after its natural ending.
    track.audio.src = 'assets/music/' + track.files[track.index];
    track.audio.load();
    if (shouldPlay(track)) startMusic();
  }
  function startMusic() {
    const track = currentSoundtrack();
    if (!shouldPlay(track)) return;
    Object.values(soundtracks).forEach((other) => {
      if (other !== track) fadeMusic(other, 0);
    });
    if (track.failed.size === track.files.length) return;
    const audio = getPlayer(track);
    if (track.pending) return;
    if (!audio.paused && !audio.ended) {
      fadeMusic(track, settings.musicVolume * 0.8);
      return;
    }
    const request = ++track.request;
    track.pending = true;
    try {
      // Call play() inside the gesture, before awaiting Web Audio's resume promise.
      Promise.resolve(audio.play())
        .then(() => {
          if (request !== track.request) return;
          track.pending = false;
          if (shouldPlay(track)) fadeMusic(track, settings.musicVolume * 0.8);
          else fadeMusic(track, 0);
        })
        .catch(() => {
          if (request === track.request) track.pending = false;
        });
    } catch (_) {
      track.pending = false;
    }
  }
  function stopMusic(immediate = false) {
    Object.values(soundtracks).forEach((track) => {
      if (immediate) {
        track.request++;
        track.pending = false;
      }
      fadeMusic(track, 0, immediate ? 0 : 350);
    });
  }
  function stopResult() {
    const track = soundtracks.result;
    track.request++;
    track.pending = false;
    track.finished = true;
    fadeMusic(track, 0, 0);
  }
  function setScene(next) {
    if (scene === next) return;
    scene = next;
    // Results pause the soundtrack at its exact position; never start the menu theme.
    if (scene === 'result') {
      stopMusic(true);
      return;
    }
    stopResult();
    if (settings.music && settings.musicVolume > 0 && !document.hidden) startMusic();
    else stopMusic();
  }
  function playResult(outcome) {
    if (scene !== 'result' || !['victory', 'defeat', 'draw'].includes(outcome)) return;
    stopResult();
    const track = soundtracks.result;
    track.files = [`result-${outcome}.mp3`];
    track.index = 0;
    track.failed.clear();
    track.finished = false;
    if (track.audio) {
      track.audio.src = 'assets/music/' + track.files[0];
      track.audio.load();
    }
    startMusic();
  }
  function resetMusic() {
    stopMusic(true);
    stopResult();
    [soundtracks.battle, soundtracks.ambient].forEach((track) => {
      track.index = 0;
      track.failed.clear();
      if (track.audio) {
        track.audio.src = 'assets/music/' + track.files[0];
        track.audio.load();
      }
    });
    scene = 'lobby';
    startMusic();
  }
  function tone(freq, start, duration, gain, type = 'sine', bus = effectsBus, endFreq = null) {
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator(),
      amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.025, duration / 5));
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(bus);
    osc.start(start);
    osc.stop(start + duration + 0.025);
    osc.onended = () => {
      osc.disconnect();
      amp.disconnect();
    };
  }
  function noise(start, duration, gain, cutoff = 1000, bus = effectsBus) {
    if (!ctx || !bus) return;
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      amp = ctx.createGain();
    source.buffer = noiseBuffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.linearRampToValueAtTime(gain, start + 0.025);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(bus);
    source.start(start);
    source.stop(start + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      amp.disconnect();
    };
  }
  async function unlock() {
    if (!available) return false;
    activated = true;
    if (settings.music) startMusic();
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
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const samples = noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (ctx?.state === 'suspended') await ctx.resume();
    } catch (_) {
      /* Music can still play when Web Audio effects are unavailable. */
    }
    return true;
  }
  async function configure(patch) {
    settings = normalizeSettings(patch, settings);
    storage.write('audio', { ...settings, musicRevision: MUSIC_REVISION });
    // Master mute silences playing voices too, without changing individual preferences.
    if (settings.muted) {
      stopMusic(true);
      if (ctx && effectsBus) effectsBus.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
    }
    await unlock();
    if (ctx && effectsBus) effectsBus.gain.setTargetAtTime(effectsVolume(), ctx.currentTime, 0.025);
    if (!settings.muted && settings.music && settings.musicVolume > 0) startMusic();
    else stopMusic(settings.muted);
    return { ...settings };
  }
  function play(name) {
    if (settings.muted || !settings.effects || !ctx || ctx.state !== 'running' || document.hidden) return;
    const t = ctx.currentTime;
    if (name === 'select') {
      tone(440, t, 0.08, 0.055, 'triangle', effectsBus, 660);
      return;
    }
    if (name === 'fly') {
      noise(t, 0.3, 0.14, 2500);
      return;
    }
    if (name === 'land') {
      tone(115, t, 0.22, 0.2, 'triangle', effectsBus, 48);
      noise(t, 0.1, 0.07, 500);
      return;
    }
    if (name === 'burn' || name === 'catastrophe') {
      noise(t, name === 'catastrophe' ? 1.1 : 0.65, 0.22, 1400);
      tone(70, t, 0.7, 0.18, 'sine', effectsBus, 30);
      return;
    }
    if (name === 'blizzard') {
      noise(t, 1, 0.17, 3800);
      [95, 102, 107].forEach((n, i) => tone(frequency(n), t + i * 0.12, 0.55, 0.035));
      return;
    }
    if (name === 'thunderstorm') {
      noise(t, 0.9, 0.26, 650);
      tone(52, t, 0.8, 0.24, 'sine', effectsBus, 25);
      return;
    }
    if (name === 'flood') {
      noise(t, 1, 0.18, 850);
      tone(165, t, 0.8, 0.065, 'sine', effectsBus, 65);
      return;
    }
    if (name === 'dread') {
      [55, 58].forEach((f) => tone(f, t, 0.9, 0.12, 'triangle', effectsBus, f / 1.4));
      return;
    }
    if (name === 'pass') {
      tone(300, t, 0.24, 0.09, 'triangle', effectsBus, 150);
      return;
    }
    if (name === 'coin') {
      [1500, 1900, 2400, 1800, 1500].forEach((f, i) => tone(f, t + i * 0.12, 0.13, 0.06));
      return;
    }
    if (name === 'deathGaze' || name === 'convert') {
      tone(800, t, 0.5, 0.09, 'sawtooth', effectsBus, 120);
      noise(t + 0.1, 0.35, 0.09, 1400);
      return;
    }
    if (
      name === 'draw' ||
      name === 'decoy' ||
      name === 'restoration' ||
      name === 'infiltration' ||
      name === 'sacrifice'
    ) {
      [400, 580].forEach((f, i) => {
        noise(t + i * 0.12, 0.12, 0.07, 1800);
        tone(f, t + i * 0.12, 0.16, 0.04, 'triangle');
      });
      return;
    }
    const chord =
      name === 'lose'
        ? [50, 53, 57]
        : name === 'war-chant'
          ? [50, 57, 62]
          : name === 'ironward' || name === 'shielded'
            ? [62, 69, 74]
            : [74, 78, 81];
    chord.forEach((n, i) => tone(frequency(n), t + i * 0.09, name === 'win' ? 1.2 : 0.7, 0.075, 'triangle'));
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopMusic(true);
      if (ctx?.state === 'running') ctx.suspend().catch(() => {});
    } else if (activated) unlock();
  });
  window.addEventListener('pagehide', () => stopMusic(true));
  return Object.freeze({
    available,
    unlock,
    configure,
    setScene,
    playResult,
    resetMusic,
    play,
    getSettings: () => ({ ...settings })
  });
})();
