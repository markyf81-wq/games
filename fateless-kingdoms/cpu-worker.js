'use strict';
self.window = self;
importScripts('cards.js?v=sacrifice52', 'engine.js?v=sacrifice52', 'cpu.js?v=kids46');
self.onmessage = async (event) => {
  try {
    const result = await self.FKCPU.choose(event.data.view, event.data.level);
    self.postMessage({ job: event.data.job, result });
  } catch (error) {
    self.postMessage({ job: event.data.job, error: error.message });
  }
};
