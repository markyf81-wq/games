'use strict';
self.window = self;
importScripts('cards.js?v=refactor45', 'engine.js?v=weakest-link51', 'cpu.js?v=kids46');
self.onmessage = async (event) => {
  try {
    const result = await self.FKCPU.choose(event.data.view, event.data.level);
    self.postMessage({ job: event.data.job, result });
  } catch (error) {
    self.postMessage({ job: event.data.job, error: error.message });
  }
};
