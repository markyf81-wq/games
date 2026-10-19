/* Two-deck local music playback. Keep playlist overlap separate from game state. */
window.FKMusicPlayer = class MusicPlayer {
  constructor(getSettings) {
    this.getSettings = getSettings;
    this.scene = 'lobby';
    this.activated = false;
    const channel = (files, finished = false) => ({
      files,
      index: 0,
      finished,
      failed: new Set(),
      current: null,
      next: null,
      voices: new Set(),
      blocked: false
    });
    this.channels = {
      battle: channel(['balefire.mp3', 'legionnaire.mp3']),
      lobby: channel(['chronicle.mp3']),
      result: channel([], true)
    };
  }
  get active() {
    return this.channels[this.scene];
  }
  eligible(channel) {
    const settings = this.getSettings();
    return (
      this.activated &&
      !document.hidden &&
      !settings.muted &&
      settings.music &&
      settings.musicVolume > 0 &&
      !channel.finished &&
      channel === this.active
    );
  }
  volume(channel) {
    return this.getSettings().musicVolume * (channel === this.channels.result ? 0.95 : 0.8);
  }
  dispose(voice) {
    if (!voice.channel.voices.has(voice)) return;
    clearInterval(voice.fade);
    voice.request++;
    voice.audio.pause();
    voice.audio.removeAttribute('src');
    voice.audio.load();
    voice.channel.voices.delete(voice);
    if (voice.channel.next === voice) voice.channel.next = null;
  }
  fade(voice, target, duration = 1600) {
    if (duration !== 0 && voice.fade && voice.target === target) return;
    clearInterval(voice.fade);
    voice.fade = null;
    voice.target = target;
    const from = voice.audio.volume,
      start = performance.now();
    const finish = () => {
      clearInterval(voice.fade);
      voice.fade = null;
      voice.audio.volume = target;
      if (target === 0) {
        voice.audio.pause();
        if (voice.channel.current !== voice) this.dispose(voice);
      }
    };
    if (!duration || Math.abs(from - target) < 0.001) return finish();
    voice.fade = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      // Equal-power overlap avoids a dip halfway between two recordings.
      voice.audio.volume = Math.sqrt(from * from * (1 - progress) + target * target * progress);
      if (progress === 1) finish();
    }, 25);
  }
  createVoice(channel, index) {
    const audio = new Audio();
    const voice = { audio, channel, index, fade: null, target: 0, request: 0, pending: false };
    channel.voices.add(voice);
    audio.volume = 0;
    audio.preload = 'none';
    audio.src = 'assets/music/' + channel.files[index];
    audio.addEventListener('timeupdate', () => {
      if (channel.current !== voice || channel === this.channels.result || !this.eligible(channel)) return;
      const remaining = audio.duration - audio.currentTime;
      // Only buffer the next track near the end, rather than loading the library.
      if (Number.isFinite(remaining) && remaining <= 10) this.prepareNext(channel);
      if (Number.isFinite(remaining) && remaining <= 4) this.playNext(channel);
    });
    audio.addEventListener('ended', () => {
      if (channel.current !== voice) return this.dispose(voice);
      if (channel === this.channels.result) {
        channel.finished = true;
        this.fade(voice, 0, 0);
      } else if (this.eligible(channel)) this.playNext(channel);
    });
    audio.addEventListener('error', () => {
      if (!channel.voices.has(voice)) return;
      channel.failed.add(index);
      const wasCurrent = channel.current === voice;
      if (wasCurrent) channel.current = null;
      this.dispose(voice);
      if (channel === this.channels.result) channel.finished = true;
      else if (wasCurrent && this.eligible(channel)) this.playNext(channel);
    });
    return voice;
  }
  prepareNext(channel) {
    if (channel.next || channel.blocked || channel.failed.size >= channel.files.length) return;
    let index = channel.index;
    do {
      index = (index + 1) % channel.files.length;
    } while (channel.failed.has(index));
    channel.next = this.createVoice(channel, index);
    channel.next.audio.preload = 'auto';
    channel.next.audio.load();
  }
  playNext(channel) {
    if (!this.eligible(channel)) return;
    this.prepareNext(channel);
    if (channel.next) this.playVoice(channel, channel.next, 4000);
  }
  fadeOthers(voice, duration) {
    for (const channel of Object.values(this.channels)) {
      for (const old of channel.voices) {
        if (old !== voice && old !== channel.next) this.fade(old, 0, duration);
      }
    }
  }
  playVoice(channel, voice, duration = 1600) {
    if (voice.pending || channel.blocked || !this.eligible(channel)) return;
    if (!voice.audio.paused && !voice.audio.ended && channel.current === voice) {
      this.fadeOthers(voice, duration);
      this.fade(voice, this.volume(channel), duration);
      return;
    }
    const request = ++voice.request;
    voice.pending = true;
    const finish = () => {
      if (voice.request !== request) return;
      voice.pending = false;
      if (!this.eligible(channel)) return this.fade(voice, 0, 0);
      if (channel.next === voice) {
        channel.current = voice;
        channel.index = voice.index;
        channel.next = null;
      }
      if (channel.current !== voice) return this.fade(voice, 0, 0);
      // Begin fading the outgoing audio only after the incoming player can play.
      this.fadeOthers(voice, duration);
      this.fade(voice, this.volume(channel), duration);
    };
    const reject = () => {
      if (voice.request !== request) return;
      voice.pending = false;
      channel.blocked = true;
      if (channel.next === voice) this.dispose(voice);
    };
    try {
      Promise.resolve(voice.audio.play()).then(finish, reject);
    } catch (_) {
      reject();
    }
  }
  pauseChannel(channel, immediate = false) {
    if (channel.next) this.dispose(channel.next);
    for (const voice of channel.voices) {
      voice.request++;
      voice.pending = false;
      this.fade(voice, 0, immediate ? 0 : 700);
    }
  }
  pause(immediate = false) {
    for (const channel of Object.values(this.channels)) this.pauseChannel(channel, immediate);
  }
  resume() {
    const channel = this.active;
    if (!this.eligible(channel)) return this.pause(this.getSettings().muted || document.hidden);
    if (channel.failed.size >= channel.files.length) return;
    if (!channel.current) {
      while (channel.failed.has(channel.index)) channel.index = (channel.index + 1) % channel.files.length;
      channel.current = this.createVoice(channel, channel.index);
    }
    this.playVoice(channel, channel.current, channel === this.channels.result ? 350 : 1600);
  }
  unlock() {
    this.activated = true;
    for (const channel of Object.values(this.channels)) channel.blocked = false;
    this.resume();
  }
  setScene(scene) {
    const next = scene === 'battle' || scene === 'result' ? scene : 'lobby';
    if (next === this.scene) return;
    this.scene = next;
    // Fade into the result pause; the fanfare starts with the result dialog.
    if (next === 'result') this.pause();
    else this.resume();
  }
  playResult(outcome) {
    if (this.scene !== 'result' || !['victory', 'defeat', 'draw'].includes(outcome)) return;
    const channel = this.channels.result;
    for (const voice of [...channel.voices]) this.dispose(voice);
    channel.current = null;
    channel.finished = false;
    channel.blocked = false;
    channel.failed.clear();
    channel.index = 0;
    channel.files = [outcome === 'draw' ? 'result-draw.mp3' : `result-${outcome}-fanfare.mp3`];
    this.resume();
  }
  reset() {
    for (const channel of Object.values(this.channels)) {
      if (channel.next) this.dispose(channel.next);
      channel.current = null;
      for (const voice of [...channel.voices]) this.fade(voice, 0, 1200);
      channel.index = 0;
      channel.blocked = false;
      channel.failed.clear();
    }
    this.channels.result.finished = true;
    this.scene = 'lobby';
    this.resume();
  }
};
