/* One owner for worker/fallback search, delayed turns and cancellation. */
window.FKCPUController = class CPUController {
  constructor({ choose, workerUrl = 'cpu-worker.js?v=unit-abilities48', delay = 350 }) {
    this.choose = choose;
    this.workerUrl = workerUrl;
    this.delay = delay;
    this.worker = null;
    this.pending = null;
    this.timer = null;
    this.generation = 0;
  }
  request(view, level, onMove) {
    this.cancel(false);
    const job = { id: this.generation, view, level, onMove, fallbackStarted: false };
    this.pending = job;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.pending !== job) return;
      if (location.protocol === 'file:' || typeof Worker === 'undefined') {
        this.fallback(job);
        return;
      }
      try {
        if (!this.worker) {
          this.worker = new Worker(this.workerUrl);
          this.worker.onmessage = ({ data }) => {
            const current = this.pending;
            if (!current || data.job !== current.id) return;
            if (data.error) this.workerFailed(current);
            else this.finish(current, data.result?.move || { pass: true });
          };
          this.worker.onerror = () => this.workerFailed(this.pending);
        }
        this.worker.postMessage({ job: job.id, view: job.view, level: job.level });
      } catch (_) {
        this.workerFailed(job);
      }
    }, this.delay);
  }
  workerFailed(job) {
    this.stopWorker();
    if (job && this.pending === job) this.fallback(job);
  }
  async fallback(job) {
    if (this.pending !== job || job.fallbackStarted) return;
    job.fallbackStarted = true;
    try {
      const result = await this.choose(job.view, job.level, async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (this.pending !== job) throw new Error('CPU search cancelled.');
      });
      this.finish(job, result.move);
    } catch (_) {
      this.finish(job, { pass: true });
    }
  }
  finish(job, move) {
    if (this.pending !== job) return;
    this.pending = null;
    job.onMove(move);
  }
  stopWorker() {
    if (!this.worker) return;
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.terminate();
    this.worker = null;
  }
  cancel(terminateWorker = true) {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    if (terminateWorker) this.stopWorker();
  }
};
