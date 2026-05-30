/**
 * AsyncQueue provides a promise-based blocking queue similar to FFmpeg's ThreadQueue.
 *
 * Unlike FFmpeg's pthread-based blocking, this uses Promises to achieve
 * non-blocking async behavior while maintaining queue semantics.
 *
 * @example
 * ```typescript
 * const queue = new AsyncQueue<Frame>(8);
 *
 * // Producer
 * await queue.send(frame);  // Blocks if queue full
 *
 * // Consumer
 * const frame = await queue.receive();  // Blocks if queue empty
 *
 * // Cleanup
 * queue.close();
 * ```
 */
export class AsyncQueue<T> {
  private queue: T[] = [];
  private sendWaiters: (() => void)[] = [];
  private receiveWaiters: (() => void)[] = [];
  private maxSize: number;
  private closed = false;
  private error: Error | null = null;
  private disposeItem?: (item: T) => void;

  /**
   * Creates a new AsyncQueue.
   *
   * @param maxSize Maximum number of items in queue before send() blocks
   *
   * @param disposeItem Optional disposer for items still buffered at teardown
   *   (see {@link clear}). Pass `(item) => item.free()` for queues of owned
   *   native resources (Frame/Packet) so aborted pipelines don't leak them.
   */
  constructor(maxSize: number, disposeItem?: (item: T) => void) {
    if (maxSize <= 0) {
      maxSize = 1;
    }
    this.maxSize = maxSize;
    this.disposeItem = disposeItem;
  }

  /**
   * Current number of items in the queue.
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Whether the queue is closed.
   */
  get isClosed(): boolean {
    return this.closed;
  }

  /**
   * Error that caused the queue to close, if any.
   */
  get closedWithError(): Error | null {
    return this.error;
  }

  /**
   * Maximum queue size (from constructor).
   */
  get capacity(): number {
    return this.maxSize;
  }

  /**
   * Number of producers waiting to send (backpressure indicator).
   */
  get waitingSenders(): number {
    return this.sendWaiters.length;
  }

  /**
   * Number of consumers waiting to receive.
   */
  get waitingReceivers(): number {
    return this.receiveWaiters.length;
  }

  /**
   * Sends an item to the queue.
   *
   * If the queue is full, this method blocks (awaits) until space is available.
   * If the queue was closed with an error, throws that error.
   *
   * @param item Item to send
   *
   * @returns Promise that resolves when item is sent
   *
   * @throws {Error} If the queue was closed with an error via closeWithError()
   *
   * @example
   * ```typescript
   * await queue.send(item);
   * ```
   */
  async send(item: T): Promise<void> {
    // If closed with error, throw it
    if (this.error) {
      throw this.error;
    }

    if (this.closed) {
      return;
    }

    // Block if queue full
    while (this.queue.length >= this.maxSize && !this.closed) {
      await new Promise<void>((resolve) => this.sendWaiters.push(resolve));

      // Check for error after waking up
      if (this.error) {
        throw this.error as Error;
      }
    }

    if (this.closed) {
      return;
    }

    this.queue.push(item);

    // Wake up one receiver if waiting (just signal, don't remove item)
    const receiver = this.receiveWaiters.shift();
    if (receiver) {
      receiver(); // Signal that item is available
    }
  }

  /**
   * Receives an item from the queue.
   *
   * If the queue is empty and not closed, this method blocks (awaits) until an item is available.
   * If the queue is closed and empty, returns null.
   * If the queue was closed with an error, throws that error.
   *
   * @returns Next item from queue, or null if closed and empty
   *
   * @throws {Error} If the queue was closed with an error via closeWithError()
   *
   * @example
   * ```typescript
   * const item = await queue.receive();
   * ```
   */
  async receive(): Promise<T | null> {
    // Loop until we get an item or queue is closed
    while (true) {
      // If queue has items, return immediately
      if (this.queue.length > 0) {
        const item = this.queue.shift()!;

        // Wake up one sender if waiting
        const sender = this.sendWaiters.shift();
        if (sender) {
          sender();
        }

        return item;
      }

      // If closed with error, throw it
      if (this.error) {
        throw this.error;
      }

      // If closed and empty, return null
      if (this.closed) {
        return null;
      }

      // Block until signaled
      await new Promise<void>((resolve) => {
        this.receiveWaiters.push(resolve);
      });

      // After waking up, loop back to check queue again
    }
  }

  /**
   * Closes the queue, rejecting any pending sends and resolving pending receives with null.
   *
   * @example
   * ```typescript
   * queue.close();
   * ```
   */
  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // Wake up all waiting senders
    const senders = this.sendWaiters.splice(0);
    for (const sender of senders) {
      sender();
    }

    // Wake up all waiting receivers (they will get null from empty queue check)
    const receivers = this.receiveWaiters.splice(0);
    for (const receiver of receivers) {
      receiver();
    }
  }

  /**
   * Closes the queue with an error.
   *
   * All pending and future receive() calls will throw this error.
   * Use this to propagate errors through the pipeline.
   *
   * @param error - Error to propagate to consumers
   *
   * @example
   * ```typescript
   * try {
   *   await processItem(item);
   * } catch (error) {
   *   queue.closeWithError(error);
   * }
   * ```
   */
  closeWithError(error: Error): void {
    if (this.closed) {
      return;
    }

    this.error = error;
    this.close();
  }

  /**
   * Drop and dispose any items still buffered in the queue.
   *
   * Call during final teardown (a component's `close()`, after the worker and
   * consumer tasks have settled) to deterministically free items that were
   * produced but never consumed - e.g. when a pipeline is aborted before
   * draining. Without this they are only reclaimed by GC, which for hardware
   * frames pins GPU/hwframe memory in the meantime.
   *
   * Items are owned by the queue (the consumer frees what it receives), so
   * disposing buffered items here cannot double-free. Do NOT call this while a
   * consumer may still drain the queue after `close()` (the flush path relies on
   * that) - only at final teardown.
   *
   * @example
   * ```typescript
   * this.outputQueue.close();
   * this.outputQueue.clear(); // free anything left behind on abort
   * ```
   */
  clear(): void {
    if (this.queue.length === 0) {
      return;
    }
    const pending = this.queue.splice(0);
    if (this.disposeItem) {
      for (const item of pending) {
        this.disposeItem(item);
      }
    }
  }
}
