export class Schedule {
  private delaying: Array<() => Promise<any>>;
  private pending: Array<() => Promise<any>>;
  private running: Array<Promise<any>>;


  constructor() {
    this.pending = [];
    this.running = [];
    this.delaying = [];
  }

  push(priority: 'high' | 'medium' | 'low', task: () => Promise<any>) {
    return new Promise((resolve) => {
      if (priority === 'high') {
        const p = task()
          .then((result) => {
            resolve(result);
          }).finally(() => {

          });

        this.running.push(p);
      }

      if (priority === 'medium') {
        this.pending.push(task);
      }

      if (priority === 'low') {
        this.delaying.push(task);
      }
    });
  }

  check() {
    if (this.running.length === 0) {
      while (this.pending.length) {
        const task = this.pending.shift();

        if (task) this.running.push(task());
      }
    }
  }
}
