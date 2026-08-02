export interface SandboxPluginModule {
  activate: ((context?: any) => Promise<void> | void) | null;
  deactivate: ((context?: any) => Promise<void> | void) | null;
  callExport: (name: string, args: any[]) => Promise<any>;
}
interface SandboxMessage {
  type: 'execute' | 'result' | 'error' | 'call' | 'call-result' | 'call-error' | 'api-call' | 'api-result' | 'api-error' | 'ready' | 'log';
  payload?: any;
  id?: string;
}
interface PendingExecution {
  resolve: (value: SandboxPluginModule) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
interface PendingCall {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}
interface ReadyWaiter {
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
export interface SandboxAPIDescriptor {
  namespaces: string[];
  methods: string[];
}
export type SandboxAPIRequestHandler = (pluginId: string, methodPath: string, args: any[]) => Promise<any>;
export class PluginSandbox {
  private iframe: HTMLIFrameElement | null = null;
  private pendingExecutions = new Map<string, PendingExecution>();
  private pendingCalls = new Map<string, PendingCall>();
  private pluginId: string;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private ready = false;
  private readyWaiters: ReadyWaiter[] = [];
  private apiRequestHandler: SandboxAPIRequestHandler | null = null;
  private apiDescriptor: SandboxAPIDescriptor | null = null;
  private blobUrl: string | null = null;
  private initPromise: Promise<HTMLIFrameElement> | null = null;
  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }
  setAPIRequestHandler(handler: SandboxAPIRequestHandler): void {
    this.apiRequestHandler = handler;
  }
  setAPIDescriptor(descriptor: SandboxAPIDescriptor): void {
    this.apiDescriptor = descriptor;
  }
  private ensureInitialized(): void {
    if (this.messageHandler) return;
    this.messageHandler = (event: MessageEvent) => {
      const data = event.data as SandboxMessage;
      if (!data || !data.type) return;
      const trusted = this.isTrustedSandboxEvent(event);
      if (!trusted) return;
      if (data.type === 'ready') {
        if (data.payload?.pluginId && data.payload.pluginId !== this.pluginId) {
          return;
        }
        this.markReady();
        return;
      }
      if (data.type === 'result' && data.id) {
        const pending = this.pendingExecutions.get(data.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingExecutions.delete(data.id);
          const proxyModule: SandboxPluginModule = {
            activate: data.payload?.hasActivate ? this.createRemoteFunctionProxy('activate') : null,
            deactivate: data.payload?.hasDeactivate ? this.createRemoteFunctionProxy('deactivate') : null,
            callExport: (name: string, args: any[]) => this.callRemoteFunction(name, args)
          };
          pending.resolve(proxyModule);
        }
        return;
      }
      if (data.type === 'error' && data.id) {
        const pending = this.pendingExecutions.get(data.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingExecutions.delete(data.id);
          pending.reject(new Error(data.payload || 'Sandbox execution error'));
        }
        return;
      }
      if (data.type === 'call-result' && data.id) {
        const pending = this.pendingCalls.get(data.id);
        if (pending) {
          this.pendingCalls.delete(data.id);
          pending.resolve(data.payload);
        }
        return;
      }
      if (data.type === 'call-error' && data.id) {
        const pending = this.pendingCalls.get(data.id);
        if (pending) {
          this.pendingCalls.delete(data.id);
          pending.reject(new Error(data.payload || 'Function call error'));
        }
        return;
      }
      if (data.type === 'api-call') {
        void this.handleAPICall(data.id, data.payload);
        return;
      }
      if (data.type === 'log') {
        const {
          level,
          args
        } = data.payload || {};
        const prefix = `[Plugin:${this.pluginId}]`;
        switch (level) {
          case 'error':
            console.error(prefix, ...(args || []));
            break;
          case 'warn':
            console.warn(prefix, ...(args || []));
            break;
          case 'info':
            console.info(prefix, ...(args || []));
            break;
          case 'debug':
            console.debug(prefix, ...(args || []));
            break;
          default:
            console.log(prefix, ...(args || []));
            break;
        }
      }
    };
    window.addEventListener('message', this.messageHandler);
  }
  private isTrustedSandboxEvent(event: MessageEvent): boolean {
    if (!event.data || typeof event.data !== 'object') return false;
    if (this.iframe?.contentWindow && event.source === this.iframe.contentWindow) {
      return true;
    }
    return false;
  }
  private markReady(): void {
    this.ready = true;
    const waiters = this.readyWaiters.splice(0, this.readyWaiters.length);
    for (const waiter of waiters) {
      clearTimeout(waiter.timeout);
      waiter.resolve();
    }
  }
  private async handleAPICall(callId: string | undefined, payload: any): Promise<void> {
    if (!this.iframe?.contentWindow || !callId) return;
    const methodPath = payload?.method as string;
    const args = payload?.args as any[] || [];
    if (!this.apiRequestHandler) {
      this.iframe.contentWindow.postMessage({
        type: 'api-error',
        id: callId,
        payload: 'API handler not registered'
      }, '*');
      return;
    }
    try {
      const result = await this.apiRequestHandler(this.pluginId, methodPath, args);
      this.iframe.contentWindow.postMessage({
        type: 'api-result',
        id: callId,
        payload: result === undefined ? null : result
      }, '*');
    } catch (error) {
      this.iframe.contentWindow.postMessage({
        type: 'api-error',
        id: callId,
        payload: error instanceof Error ? error.message : String(error)
      }, '*');
    }
  }
  private async createIframeAndWaitReady(timeoutMs = 10000): Promise<HTMLIFrameElement> {
    this.ensureInitialized();
    this.ready = false;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('data-kortina-plugin-sandbox', this.pluginId);
    const sandboxHtml = this.getSandboxHtml();
    const blob = new Blob([sandboxHtml], {
      type: 'text/html'
    });
    const blobUrl = URL.createObjectURL(blob);
    this.blobUrl = blobUrl;
    iframe.src = blobUrl;
    if (!document.body) {
      await new Promise<void>(resolve => {
        const check = () => {
          if (document.body) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });
    }
    this.iframe = iframe;
    document.body.appendChild(iframe);
    await this.waitForReady(timeoutMs);
    return iframe;
  }
  private getSandboxHtml(): string {
    const escapedPluginId = this.pluginId.replace(/'/g, "\\'");
    const descriptor = this.apiDescriptor || {
      namespaces: [],
      methods: []
    };
    const descriptorJson = JSON.stringify(descriptor).replace(/'/g, "\\'");
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval';">
</head>
<body>
<script>
(function() {
  'use strict';

  var PLUGIN_ID = '${escapedPluginId}';
  var ORIGIN = '*';
  var API_DESCRIPTOR = JSON.parse('${descriptorJson}');
  var moduleExports = {};
  var pendingAPICalls = {};
  var apiCallId = 0;

  var sandboxConsole = {
    log: function() { window.parent.postMessage({ type: 'log', payload: { level: 'log', args: Array.prototype.slice.call(arguments) } }, ORIGIN); },
    warn: function() { window.parent.postMessage({ type: 'log', payload: { level: 'warn', args: Array.prototype.slice.call(arguments) } }, ORIGIN); },
    error: function() { window.parent.postMessage({ type: 'log', payload: { level: 'error', args: Array.prototype.slice.call(arguments) } }, ORIGIN); },
    info: function() { window.parent.postMessage({ type: 'log', payload: { level: 'info', args: Array.prototype.slice.call(arguments) } }, ORIGIN); },
    debug: function() { window.parent.postMessage({ type: 'log', payload: { level: 'debug', args: Array.prototype.slice.call(arguments) } }, ORIGIN); }
  };

  var originalSetTimeout = window.setTimeout;
  var originalClearTimeout = window.clearTimeout;
  var originalSetInterval = window.setInterval;
  var originalClearInterval = window.clearInterval;

  var activeTimers = {};
  var timerId = 0;

  function sandboxSetTimeout(fn, delay) {
    var id = ++timerId;
    var timerId_ = originalSetTimeout(function() {
      delete activeTimers[id];
      try { fn(); } catch(e) { sandboxConsole.error(String(e)); }
    }, Math.min(delay || 0, 60000));
    activeTimers[id] = timerId_;
    return id;
  }

  function sandboxClearTimeout(id) {
    if (activeTimers[id]) {
      originalClearTimeout(activeTimers[id]);
      delete activeTimers[id];
    }
  }

  function sandboxSetInterval(fn, delay) {
    var id = ++timerId;
    var timerId_ = originalSetInterval(function() {
      try { fn(); } catch(e) { sandboxConsole.error(String(e)); }
    }, Math.max(delay || 1000, 100));
    activeTimers[id] = timerId_;
    return id;
  }

  function sandboxClearInterval(id) {
    if (activeTimers[id]) {
      originalClearInterval(activeTimers[id]);
      delete activeTimers[id];
    }
  }

  function makeAPICall(method, args) {
    return new Promise(function(resolve, reject) {
      var id = 'api-' + Date.now() + '-' + (++apiCallId);
      var timeout = originalSetTimeout(function() {
        delete pendingAPICalls[id];
        reject(new Error('API call "' + method + '" timed out'));
      }, 30000);

      pendingAPICalls[id] = function(success, payload) {
        originalClearTimeout(timeout);
        delete pendingAPICalls[id];
        if (success) resolve(payload);
        else reject(new Error(payload || 'API call failed'));
      };

      window.parent.postMessage({
        type: 'api-call',
        id: id,
        payload: { method: method, args: args || [] }
      }, ORIGIN);
    });
  }

  function createAPIProxy() {
    var namespaces = {};

    API_DESCRIPTOR.namespaces.forEach(function(ns) {
      namespaces[ns] = {};
    });

    API_DESCRIPTOR.methods.forEach(function(methodPath) {
      var parts = methodPath.split('.');
      var methodName = parts.pop();
      var target = namespaces;
      for (var i = 0; i < parts.length; i++) {
        if (!target[parts[i]]) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[methodName] = function() {
        return makeAPICall(methodPath, Array.prototype.slice.call(arguments));
      };
    });

    return namespaces;
  }

  window.addEventListener('message', function(event) {
    if (event.source !== window.parent) return;

    var data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'execute') {
      try {
        moduleExports = {};
        var moduleObj = { exports: moduleExports };

        var execFn = new Function(
          'module', 'exports', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
          data.payload.source
        );
        execFn(
          moduleObj,
          moduleExports,
          sandboxConsole,
          sandboxSetTimeout,
          sandboxClearTimeout,
          sandboxSetInterval,
          sandboxClearInterval
        );

        moduleExports = moduleObj.exports || moduleExports;

        window.parent.postMessage({
          type: 'result',
          id: data.id,
          payload: {
            hasActivate: typeof moduleExports.activate === 'function' || typeof moduleExports.default === 'function',
            hasDeactivate: typeof moduleExports.deactivate === 'function',
            exports: Object.keys(moduleExports || {})
          }
        }, ORIGIN);
      } catch (error) {
        window.parent.postMessage({ type: 'error', id: data.id, payload: String(error) }, ORIGIN);
      }
      return;
    }

    if (data.type === 'call') {
      try {
        var funcName = data.payload.name;
        var funcArgs = data.payload.args || [];
        var func = moduleExports[funcName] || moduleExports[funcName.charAt(0).toUpperCase() + funcName.slice(1)];

        if (typeof func !== 'function') {
          if (funcName === 'activate' && typeof moduleExports.default === 'function') {
            func = moduleExports.default;
          } else {
            window.parent.postMessage({ type: 'call-error', id: data.id, payload: 'Function not found: ' + funcName }, ORIGIN);
            return;
          }
        }

        if (funcArgs.length > 0 && funcArgs[0] && funcArgs[0].__useSandboxApi) {
          funcArgs = [{
            pluginId: funcArgs[0].pluginId || PLUGIN_ID,
            api: window.__kortinaPluginAPI || createAPIProxy(),
            subscriptions: [],
            contributions: funcArgs[0].contributions || {}
          }];
        }

        var result = func.apply(null, funcArgs);

        if (result && typeof result.then === 'function') {
          result.then(
            function(value) {
              window.parent.postMessage({
                type: 'call-result',
                id: data.id,
                payload: value === undefined ? null : serialize(value)
              }, ORIGIN);
            },
            function(err) {
              window.parent.postMessage({ type: 'call-error', id: data.id, payload: String(err) }, ORIGIN);
            }
          );
        } else {
          window.parent.postMessage({
            type: 'call-result',
            id: data.id,
            payload: result === undefined ? null : serialize(result)
          }, ORIGIN);
        }
      } catch (error) {
        window.parent.postMessage({ type: 'call-error', id: data.id, payload: String(error) }, ORIGIN);
      }
      return;
    }

    if (data.type === 'api-result' && data.id && pendingAPICalls[data.id]) {
      pendingAPICalls[data.id](true, data.payload);
      return;
    }

    if (data.type === 'api-error' && data.id && pendingAPICalls[data.id]) {
      pendingAPICalls[data.id](false, data.payload);
      return;
    }
  });

  function serialize(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object' && typeof obj !== 'function') return obj;
    if (obj instanceof Date) return { __type: 'Date', value: obj.toISOString() };
    if (Array.isArray(obj)) return { __type: 'Array', value: obj.map(serialize) };
    if (typeof obj === 'object') {
      var result = { __type: 'Object', value: {} };
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] !== 'function') {
          result.value[key] = serialize(obj[key]);
        }
      }
      return result;
    }
    return null;
  }

  window.__kortinaPluginAPI = createAPIProxy();
  window.__kortinaPluginId = PLUGIN_ID;
  window.__kortinaSandboxReady = true;

  window.parent.postMessage({
    type: 'ready',
    payload: { pluginId: PLUGIN_ID, apiReady: true }
  }, ORIGIN);
})();
</script>
</body>
</html>`;
  }
  private waitForReady(timeoutMs = 10000): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.readyWaiters.findIndex(w => w.resolve === resolve);
        if (idx >= 0) this.readyWaiters.splice(idx, 1);
        reject(new Error(`Sandbox ${this.pluginId} failed to initialize within ${timeoutMs}ms`));
      }, timeoutMs);
      this.readyWaiters.push({
        resolve,
        reject,
        timeout
      });
      if (this.ready) {
        this.markReady();
      }
    });
  }
  private createRemoteFunctionProxy(funcName: string): (context: any) => Promise<void> {
    return async (context: any) => {
      if (!this.iframe?.contentWindow) {
        throw new Error('Sandbox iframe not available');
      }
      await this.waitForReady();
      const sandboxContextPayload = {
        pluginId: this.pluginId,
        contributions: context?.contributions || {},
        __useSandboxApi: true
      };
      await this.callRemoteFunction(funcName, [sandboxContextPayload]);
    };
  }
  private async callRemoteFunction(name: string, args: any[]): Promise<any> {
    await this.waitForReady();
    if (!this.iframe?.contentWindow) {
      throw new Error('Sandbox iframe not available');
    }
    const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(callId);
        reject(new Error(`Function call "${name}" timed out`));
      }, 30000);
      this.pendingCalls.set(callId, {
        resolve: (value: any) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
      this.iframe?.contentWindow?.postMessage({
        type: 'call',
        id: callId,
        payload: {
          name,
          args
        }
      }, '*');
    });
  }
  async execute(source: string): Promise<SandboxPluginModule> {
    this.ensureInitialized();
    if (!this.initPromise) {
      this.initPromise = this.createIframeAndWaitReady().catch(error => {
        this.initPromise = null;
        throw error;
      });
    }
    await this.initPromise;
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingExecutions.delete(executionId);
        reject(new Error(`Plugin ${this.pluginId} execution timed out`));
      }, 30000);
      this.pendingExecutions.set(executionId, {
        resolve,
        reject,
        timeout
      });
      if (!this.iframe?.contentWindow) {
        clearTimeout(timeout);
        this.pendingExecutions.delete(executionId);
        reject(new Error('Sandbox iframe not available'));
        return;
      }
      this.iframe.contentWindow.postMessage({
        type: 'execute',
        id: executionId,
        payload: {
          source
        }
      }, '*');
    });
  }
  destroy(): void {
    this.pendingExecutions.forEach(({
      reject,
      timeout
    }) => {
      clearTimeout(timeout);
      reject(new Error('Sandbox destroyed'));
    });
    this.pendingExecutions.clear();
    this.pendingCalls.forEach(({
      reject
    }) => {
      reject(new Error('Sandbox destroyed'));
    });
    this.pendingCalls.clear();
    const waiters = this.readyWaiters.splice(0, this.readyWaiters.length);
    for (const waiter of waiters) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Sandbox destroyed'));
    }
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.blobUrl) {
      try {
        URL.revokeObjectURL(this.blobUrl);
      } catch {}
      this.blobUrl = null;
    }
    this.ready = false;
    this.initPromise = null;
    this.apiRequestHandler = null;
    this.apiDescriptor = null;
  }
}
const sandboxInstances = new Map<string, PluginSandbox>();
export function getOrCreateSandbox(pluginId: string): PluginSandbox {
  let sandbox = sandboxInstances.get(pluginId);
  if (!sandbox) {
    sandbox = new PluginSandbox(pluginId);
    sandboxInstances.set(pluginId, sandbox);
  }
  return sandbox;
}
export function destroySandbox(pluginId: string): void {
  const sandbox = sandboxInstances.get(pluginId);
  if (sandbox) {
    sandbox.destroy();
    sandboxInstances.delete(pluginId);
  }
}
export function destroyAllSandboxes(): void {
  sandboxInstances.forEach(sandbox => sandbox.destroy());
  sandboxInstances.clear();
}