type Task<T, R> = {
  data: T
  resolve: (value: R) => void
  reject: (reason?: Error) => void
}

export class WorkerPool<T, R> {
  private workers: Worker[]
  private idles: Worker[]
  private taskQueue: Task<T, R>[]

  constructor(workers: Worker[]) {
    this.workers = workers
    this.idles = [...this.workers]
    this.taskQueue = []
  }

  private submit = (data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      const task: Task<T, R> = {
        data,
        resolve,
        reject,
      }

      this.taskQueue.push(task)
      this.next()
    })
  }

  private next() {
    if (this.taskQueue.length === 0 || this.idles.length === 0) return

    const worker = this.idles.shift()!
    const task = this.taskQueue.shift()!

    worker.onmessage = (e: MessageEvent<R>) => {
      this.idles.push(worker)
      task.resolve(e.data)
      this.next()
    }

    worker.postMessage(task.data)
  }

  public terminate() {
    this.workers.forEach((worker) => worker.terminate)
  }

  public map(data: T[]): Promise<R>[] {
    return data.map(this.submit)
  }
}
