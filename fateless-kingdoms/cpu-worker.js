'use strict';
self.window = self;
importScripts('cards.js?v=sacrifice20', 'engine.js?v=legal-targets41', 'cpu.js?v=settings1');
self.onmessage = async event => {
  try {
    const result = await self.FKCPU.choose(event.data.view, event.data.level);
    self.postMessage({ job: event.data.job, result });
  } catch (error) {
    self.postMessage({ job: event.data.job, error: error.message });
  }
};
