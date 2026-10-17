/* Browser storage is optional. Preserve the existing keys and never throw into UI code. */
window.FKStorage = (() => {
  const keys = Object.freeze({
    match: 'fateless-kingdoms.match.v1',
    settings: 'fateless-kingdoms.settings.v1',
    audio: 'fateless-kingdoms.audio.v1'
  });
  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(keys[key]));
    } catch (_) {
      return null;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(keys[key], JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }
  function remove(key) {
    try {
      localStorage.removeItem(keys[key]);
      return true;
    } catch (_) {
      return false;
    }
  }
  return Object.freeze({ read, write, remove });
})();
