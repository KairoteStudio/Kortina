import { ITerminalInstance } from './TerminalInstance';
import { Emitter, Event } from './terminal-events';
export interface ITerminalGroup {
  readonly terminalInstances: ITerminalInstance[];
  readonly activeInstance: ITerminalInstance | undefined;
  readonly activeInstanceIndex: number;
  readonly isDisposed: boolean;
  readonly onDidDisposeInstance: Event<ITerminalInstance>;
  readonly onDidFocusInstance: Event<ITerminalInstance>;
  readonly onDidChangeActiveInstance: Event<ITerminalInstance | undefined>;
  readonly onInstancesChanged: Event<void>;
  readonly onDisposed: Event<void>;
  addInstance(instance: ITerminalInstance): void;
  removeInstance(instance: ITerminalInstance): void;
  setActiveInstance(instance: ITerminalInstance): void;
  setActiveInstanceByIndex(index: number): void;
  focusPreviousInstance(): void;
  focusNextInstance(): void;
  dispose(): void;
}
export class TerminalGroup implements ITerminalGroup {
  private _terminalInstances: ITerminalInstance[] = [];
  private _activeInstanceIndex = -1;
  private _instanceDisposables = new Map<number, (() => void)[]>();
  private _disposed = false;
  get terminalInstances(): ITerminalInstance[] {
    return this._terminalInstances;
  }
  get activeInstance(): ITerminalInstance | undefined {
    if (this._activeInstanceIndex < 0 || this._activeInstanceIndex >= this._terminalInstances.length) {
      return undefined;
    }
    return this._terminalInstances[this._activeInstanceIndex];
  }
  get activeInstanceIndex(): number {
    return this._activeInstanceIndex;
  }
  get isDisposed(): boolean {
    return this._disposed;
  }
  private readonly _onDidDisposeInstance = new Emitter<ITerminalInstance>();
  readonly onDidDisposeInstance: Event<ITerminalInstance> = this._onDidDisposeInstance.event;
  private readonly _onDidFocusInstance = new Emitter<ITerminalInstance>();
  readonly onDidFocusInstance: Event<ITerminalInstance> = this._onDidFocusInstance.event;
  private readonly _onDidChangeActiveInstance = new Emitter<ITerminalInstance | undefined>();
  readonly onDidChangeActiveInstance: Event<ITerminalInstance | undefined> = this._onDidChangeActiveInstance.event;
  private readonly _onInstancesChanged = new Emitter<void>();
  readonly onInstancesChanged: Event<void> = this._onInstancesChanged.event;
  private readonly _onDisposed = new Emitter<void>();
  readonly onDisposed: Event<void> = this._onDisposed.event;
  addInstance(instance: ITerminalInstance): void {
    if (this._disposed) return;
    if (this._terminalInstances.length === 0) {
      this._terminalInstances.push(instance);
      this._activeInstanceIndex = 0;
    } else {
      const insertIndex = this._activeInstanceIndex + 1;
      this._terminalInstances.splice(insertIndex, 0, instance);
    }
    this._initInstanceListeners(instance);
    if (this._terminalInstances.length === 1) {
      this._onDidChangeActiveInstance.fire(this.activeInstance);
    }
    this._onInstancesChanged.fire();
  }
  private _initInstanceListeners(instance: ITerminalInstance): void {
    const disposables: (() => void)[] = [];
    disposables.push(instance.onDisposed(disposedInstance => {
      this._onDidDisposeInstance.fire(disposedInstance);
      this._removeInstance(disposedInstance);
    }));
    disposables.push(instance.onTitleChanged(() => {
      this._onInstancesChanged.fire();
    }));
    disposables.push(instance.onData(() => {
      this._onInstancesChanged.fire();
    }));
    this._instanceDisposables.set(instance.instanceId, disposables);
  }
  removeInstance(instance: ITerminalInstance): void {
    this._removeInstance(instance);
  }
  private _removeInstance(instance: ITerminalInstance): void {
    if (this._disposed) return;
    const index = this._terminalInstances.indexOf(instance);
    if (index === -1) return;
    const wasActiveInstance = instance === this.activeInstance;
    this._terminalInstances.splice(index, 1);
    const disposables = this._instanceDisposables.get(instance.instanceId);
    if (disposables) {
      disposables.forEach(d => d());
      this._instanceDisposables.delete(instance.instanceId);
    }
    if (wasActiveInstance && this._terminalInstances.length > 0) {
      const newIndex = index < this._terminalInstances.length ? index : this._terminalInstances.length - 1;
      this.setActiveInstanceByIndex(newIndex);
      this.activeInstance?.focus();
    } else if (index < this._activeInstanceIndex) {
      this._activeInstanceIndex--;
    }
    this._onInstancesChanged.fire();
    if (this._terminalInstances.length === 0) {
      this.dispose();
    }
  }
  setActiveInstance(instance: ITerminalInstance): void {
    if (this._disposed) return;
    const index = this._terminalInstances.indexOf(instance);
    if (index !== -1) {
      this.setActiveInstanceByIndex(index);
    }
  }
  setActiveInstanceByIndex(index: number): void {
    if (this._disposed) return;
    if (index < 0 || index >= this._terminalInstances.length) {
      if (this._activeInstanceIndex !== -1) {
        this._activeInstanceIndex = -1;
        this._onDidChangeActiveInstance.fire(undefined);
        this._onInstancesChanged.fire();
      }
      return;
    }
    const oldActiveInstance = this.activeInstance;
    this._activeInstanceIndex = index;
    if (oldActiveInstance !== this.activeInstance) {
      this._onDidChangeActiveInstance.fire(this.activeInstance);
      this._onInstancesChanged.fire();
    }
  }
  focusPreviousInstance(): void {
    if (this._terminalInstances.length === 0) return;
    const newIndex = this._activeInstanceIndex === 0 ? this._terminalInstances.length - 1 : this._activeInstanceIndex - 1;
    this.setActiveInstanceByIndex(newIndex);
    this.activeInstance?.focus();
  }
  focusNextInstance(): void {
    if (this._terminalInstances.length === 0) return;
    const newIndex = this._activeInstanceIndex === this._terminalInstances.length - 1 ? 0 : this._activeInstanceIndex + 1;
    this.setActiveInstanceByIndex(newIndex);
    this.activeInstance?.focus();
  }
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    for (const [, disposables] of this._instanceDisposables) {
      disposables.forEach(d => d());
    }
    this._instanceDisposables.clear();
    this._terminalInstances = [];
    this._activeInstanceIndex = -1;
    this._onDisposed.fire();
    this._onDidDisposeInstance.dispose();
    this._onDidFocusInstance.dispose();
    this._onDidChangeActiveInstance.dispose();
    this._onInstancesChanged.dispose();
    this._onDisposed.dispose();
  }
}