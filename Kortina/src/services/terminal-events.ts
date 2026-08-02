export type EventListener<T> = (data: T) => void;
export interface Event<T> {
  (listener: EventListener<T>): () => void;
}
export class Emitter<T> {
  private _listeners: Set<EventListener<T>> = new Set();
  get event(): Event<T> {
    return (listener: EventListener<T>) => {
      this._listeners.add(listener);
      return () => {
        this._listeners.delete(listener);
      };
    };
  }
  fire(data: T): void {
    for (const listener of Array.from(this._listeners)) {
      try {
        listener(data);
      } catch {}
    }
  }
  dispose(): void {
    this._listeners.clear();
  }
}