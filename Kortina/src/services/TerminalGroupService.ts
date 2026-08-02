import { TerminalInstance, ITerminalInstance } from './TerminalInstance';
import { TerminalGroup, ITerminalGroup } from './TerminalGroup';
import { terminalService } from './TerminalService';
import { ShellType } from './TerminalService';
import { getEffectiveDefaultShellType } from './terminal-profiles';
import { Emitter, Event } from './terminal-events';
import { isTauri } from '../utils/environment';
export interface IInstanceLocation {
  group: ITerminalGroup;
  groupIndex: number;
  instance: ITerminalInstance;
  instanceIndex: number;
}
export class TerminalGroupService {
  private _groups: ITerminalGroup[] = [];
  private _activeGroupIndex = -1;
  private _defaultShellType: ShellType;
  private _isCreating = false;
  readonly groups: ReadonlyArray<ITerminalGroup> = this._groups;
  private readonly _onDidChangeActiveGroup = new Emitter<ITerminalGroup | undefined>();
  readonly onDidChangeActiveGroup: Event<ITerminalGroup | undefined> = this._onDidChangeActiveGroup.event;
  private readonly _onDidChangeGroups = new Emitter<void>();
  readonly onDidChangeGroups: Event<void> = this._onDidChangeGroups.event;
  private readonly _onDidDisposeGroup = new Emitter<ITerminalGroup>();
  readonly onDidDisposeGroup: Event<ITerminalGroup> = this._onDidDisposeGroup.event;
  private readonly _onDidDisposeInstance = new Emitter<ITerminalInstance>();
  readonly onDidDisposeInstance: Event<ITerminalInstance> = this._onDidDisposeInstance.event;
  private readonly _onDidFocusInstance = new Emitter<ITerminalInstance>();
  readonly onDidFocusInstance: Event<ITerminalInstance> = this._onDidFocusInstance.event;
  private readonly _onDidChangeActiveInstance = new Emitter<ITerminalInstance | undefined>();
  readonly onDidChangeActiveInstance: Event<ITerminalInstance | undefined> = this._onDidChangeActiveInstance.event;
  private readonly _onDidChangeInstances = new Emitter<void>();
  readonly onDidChangeInstances: Event<void> = this._onDidChangeInstances.event;
  constructor() {
    this._defaultShellType = getEffectiveDefaultShellType();
  }
  get instances(): ITerminalInstance[] {
    return this._groups.reduce((p, c) => p.concat(c.terminalInstances), [] as ITerminalInstance[]);
  }
  get activeGroup(): ITerminalGroup | undefined {
    if (this._activeGroupIndex < 0 || this._activeGroupIndex >= this._groups.length) {
      return undefined;
    }
    return this._groups[this._activeGroupIndex];
  }
  get activeGroupIndex(): number {
    return this._activeGroupIndex;
  }
  get activeInstance(): ITerminalInstance | undefined {
    return this.activeGroup?.activeInstance;
  }
  get defaultShellType(): ShellType {
    return this._defaultShellType;
  }
  get isCreating(): boolean {
    return this._isCreating;
  }
  setDefaultShellType(type: ShellType): void {
    this._defaultShellType = type;
    this._onDidChangeInstances.fire();
  }
  createGroup(instance?: ITerminalInstance): ITerminalGroup {
    const group = new TerminalGroup();
    group.onDisposed(() => this._removeGroup(group));
    group.onInstancesChanged(() => this._onDidChangeInstances.fire());
    group.onDidChangeActiveInstance(instance => {
      if (group === this.activeGroup) {
        this._onDidChangeActiveInstance.fire(instance);
      }
    });
    group.onDidDisposeInstance(instance => this._onDidDisposeInstance.fire(instance));
    this._groups.push(group);
    if (instance) {
      group.addInstance(instance);
    }
    if (this.instances.length === 1) {
      this.setActiveInstanceByIndex(0);
    }
    this._onDidChangeGroups.fire();
    return group;
  }
  async createTerminal(shellType?: ShellType): Promise<ITerminalInstance | undefined> {
    if (this._isCreating) return undefined;
    if (!isTauri()) {
      console.warn('[TerminalGroupService] Terminal creation requires Tauri desktop environment');
      return undefined;
    }
    const type = shellType ?? this._defaultShellType;
    this._isCreating = true;
    this._onDidChangeInstances.fire();
    try {
      const {
        useProjectStore
      } = await import('../stores/ProjectStore');
      const projectPath = useProjectStore.getState().currentProjectPath;
      const session = await terminalService.createSession(type, projectPath ?? undefined);
      const instance = new TerminalInstance(session);
      let group = this.activeGroup;
      if (!group) {
        group = this.createGroup();
      }
      group.addInstance(instance);
      this.setActiveInstance(instance);
      return instance;
    } catch (error) {
      console.error('[TerminalGroupService] Failed to create terminal:', error);
      return undefined;
    } finally {
      this._isCreating = false;
      this._onDidChangeInstances.fire();
    }
  }
  setActiveInstance(instance: ITerminalInstance): void {
    const location = this._getInstanceLocation(instance);
    if (!location) return;
    if (this._activeGroupIndex !== location.groupIndex) {
      const oldActiveGroup = this.activeGroup;
      this._activeGroupIndex = location.groupIndex;
      if (oldActiveGroup !== this.activeGroup) {
        this._onDidChangeActiveGroup.fire(this.activeGroup);
      }
    }
    location.group.setActiveInstance(instance);
  }
  setActiveInstanceByIndex(index: number): void {
    const location = this._getInstanceLocationByFlatIndex(index);
    if (!location) return;
    this.setActiveInstance(location.instance);
  }
  setActiveGroupByIndex(index: number): void {
    if (index < 0 || index >= this._groups.length) return;
    const oldActiveGroup = this.activeGroup;
    this._activeGroupIndex = index;
    if (oldActiveGroup !== this.activeGroup) {
      this._onDidChangeActiveGroup.fire(this.activeGroup);
      this._onDidChangeActiveInstance.fire(this.activeInstance);
      this._onDidChangeInstances.fire();
    }
  }
  focusPreviousInstance(): void {
    const activeGroup = this.activeGroup;
    if (!activeGroup) return;
    activeGroup.focusPreviousInstance();
  }
  focusNextInstance(): void {
    const activeGroup = this.activeGroup;
    if (!activeGroup) return;
    activeGroup.focusNextInstance();
  }
  async closeInstance(instance: ITerminalInstance): Promise<void> {
    const location = this._getInstanceLocation(instance);
    if (!location) return;
    location.group.removeInstance(instance);
    instance.dispose();
    this._onDidChangeInstances.fire();
  }
  async closeActiveInstance(): Promise<void> {
    const activeInstance = this.activeInstance;
    if (activeInstance) {
      await this.closeInstance(activeInstance);
    }
  }
  async closeAllInstances(): Promise<void> {
    const instances = this.instances.slice();
    instances.forEach(instance => instance.dispose());
    const groups = this._groups.slice();
    groups.forEach(group => group.dispose());
    this._groups = [];
    this._activeGroupIndex = -1;
    this._onDidChangeActiveGroup.fire(undefined);
    this._onDidChangeActiveInstance.fire(undefined);
    this._onDidChangeInstances.fire();
    this._onDidChangeGroups.fire();
  }
  private _getInstanceLocation(instance: ITerminalInstance): IInstanceLocation | undefined {
    for (let groupIndex = 0; groupIndex < this._groups.length; groupIndex++) {
      const group = this._groups[groupIndex];
      const instanceIndex = group.terminalInstances.indexOf(instance);
      if (instanceIndex !== -1) {
        return {
          group,
          groupIndex,
          instance,
          instanceIndex
        };
      }
    }
    return undefined;
  }
  private _getInstanceLocationByFlatIndex(index: number): IInstanceLocation | undefined {
    let currentGroupIndex = 0;
    let currentIndex = index;
    while (currentGroupIndex < this._groups.length) {
      const group = this._groups[currentGroupIndex];
      const count = group.terminalInstances.length;
      if (currentIndex < count) {
        return {
          group,
          groupIndex: currentGroupIndex,
          instance: group.terminalInstances[currentIndex],
          instanceIndex: currentIndex
        };
      }
      currentIndex -= count;
      currentGroupIndex++;
    }
    return undefined;
  }
  private _removeGroup(group: ITerminalGroup): void {
    const wasActiveGroup = group === this.activeGroup;
    const index = this._groups.indexOf(group);
    if (index === -1) return;
    this._groups.splice(index, 1);
    this._onDidChangeGroups.fire();
    if (wasActiveGroup) {
      if (this._groups.length > 0) {
        const newIndex = index < this._groups.length ? index : this._groups.length - 1;
        this.setActiveGroupByIndex(newIndex);
        this.activeInstance?.focus();
      } else {
        this._activeGroupIndex = -1;
        this._onDidChangeActiveGroup.fire(undefined);
        this._onDidChangeActiveInstance.fire(undefined);
      }
    } else if (this._activeGroupIndex > index) {
      this._activeGroupIndex--;
    }
    if (this._activeGroupIndex >= this._groups.length) {
      this._activeGroupIndex = this._groups.length - 1;
    }
    this._onDidChangeInstances.fire();
    this._onDidDisposeGroup.fire(group);
  }
}
export const terminalGroupService = new TerminalGroupService();