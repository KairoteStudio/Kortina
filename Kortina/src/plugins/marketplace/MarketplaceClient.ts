import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../../utils/environment';
import type { MarketplaceHealth, MarketplaceLatestResponse, MarketplaceListQuery, MarketplaceListResponse, MarketplacePluginDetail, MarketplacePluginSummary, MarketplaceSource } from './types';
import { MarketplaceApiError } from './types';
const DEFAULT_REMOTE_BASE = String(import.meta.env.VITE_MARKETPLACE_URL || '');
const DEFAULT_FALLBACKS: string[] = [];
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === '') return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}
async function parseJsonResponse<T>(response: Response): Promise<T> {
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new MarketplaceApiError(body?.error || body?.message || `HTTP ${response.status}`, response.status, body?.code, body?.details);
  }
  return body as T;
}
export class MarketplaceClient {
  private remoteBaseUrl: string;
  private fallbackUrls: string[];
  private preferredSource: MarketplaceSource | null = null;
  constructor(options?: {
    remoteBaseUrl?: string;
    fallbackUrls?: string[];
  }) {
    this.remoteBaseUrl = normalizeBaseUrl(options?.remoteBaseUrl ?? DEFAULT_REMOTE_BASE);
    this.fallbackUrls = (options?.fallbackUrls || DEFAULT_FALLBACKS).map(normalizeBaseUrl);
  }
  setRemoteBaseUrl(url: string): void {
    const normalized = normalizeBaseUrl(url.trim());
    if (normalized && !/^https?:\/\//i.test(normalized)) {
      throw new MarketplaceApiError('扩展市场地址必须使用 HTTP(S)', 0, 'INVALID_REMOTE_URL');
    }
    this.remoteBaseUrl = normalized;
  }
  getRemoteBaseUrl(): string {
    return this.remoteBaseUrl;
  }
  async health(): Promise<MarketplaceHealth> {
    if (isTauri()) {
      try {
        const result = await invoke<MarketplaceHealth>('marketplace_health');
        if (result?.ok) {
          this.preferredSource = 'tauri';
          return result;
        }
      } catch (error) {
        console.debug('[Marketplace] tauri health failed:', error);
      }
    }
    const remote = await this.tryRemoteHealth();
    if (remote) {
      this.preferredSource = 'remote';
      return remote;
    }
    this.preferredSource = 'local-fallback';
    const local = this.getLocalFallbackCatalog();
    return {
      ok: true,
      source: 'local-fallback',
      message: '使用内置示例市场目录（远程/后端不可用）',
      catalogVersion: 'local-1',
      pluginCount: local.length
    };
  }
  async list(query: MarketplaceListQuery = {}): Promise<MarketplaceListResponse> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 20));
    if (isTauri() && (this.preferredSource === 'tauri' || this.preferredSource === null)) {
      try {
        const result = await invoke<MarketplaceListResponse>('marketplace_list', {
          query: query.query || null,
          category: query.category || null,
          page,
          pageSize,
          sort: query.sort || 'relevance'
        });
        this.preferredSource = 'tauri';
        return result;
      } catch (error) {
        console.debug('[Marketplace] tauri list failed:', error);
      }
    }
    try {
      const remote = await this.remoteList(query, page, pageSize);
      this.preferredSource = 'remote';
      return remote;
    } catch (error) {
      console.debug('[Marketplace] remote list failed:', error);
    }
    return this.localList(query, page, pageSize);
  }
  async getPlugin(pluginId: string): Promise<MarketplacePluginDetail> {
    if (isTauri()) {
      try {
        return await invoke<MarketplacePluginDetail>('marketplace_get', {
          pluginId
        });
      } catch (error) {
        console.debug('[Marketplace] tauri get failed:', error);
      }
    }
    try {
      const response = await this.remoteFetch(`/plugins/${encodeURIComponent(pluginId)}`);
      return await parseJsonResponse<MarketplacePluginDetail>(response);
    } catch (error) {
      console.debug('[Marketplace] remote get failed:', error);
    }
    const local = this.getLocalFallbackCatalog().find(p => p.id === pluginId);
    if (!local) {
      throw new MarketplaceApiError(`插件不存在: ${pluginId}`, 404, 'NOT_FOUND');
    }
    return local;
  }
  async getLatest(pluginId: string): Promise<MarketplaceLatestResponse> {
    if (isTauri()) {
      try {
        return await invoke<MarketplaceLatestResponse>('marketplace_latest', {
          pluginId
        });
      } catch (error) {
        console.debug('[Marketplace] tauri latest failed:', error);
      }
    }
    try {
      const response = await this.remoteFetch(`/plugins/${encodeURIComponent(pluginId)}/latest`);
      const data = await parseJsonResponse<any>(response);
      return {
        pluginId: data.pluginId || pluginId,
        version: data.version || data.latestVersion,
        downloadUrl: data.downloadUrl,
        releaseNotes: data.releaseNotes,
        publishedAt: data.publishedAt,
        checksum: data.checksum
      };
    } catch (error) {
      console.debug('[Marketplace] remote latest failed:', error);
    }
    const local = this.getLocalFallbackCatalog().find(p => p.id === pluginId);
    if (!local) {
      throw new MarketplaceApiError(`插件不存在: ${pluginId}`, 404, 'NOT_FOUND');
    }
    return {
      pluginId,
      version: local.version,
      downloadUrl: local.downloadUrl || `kortina://marketplace/download/${pluginId}?version=${local.version}`,
      releaseNotes: local.releaseNotes,
      publishedAt: local.updatedAt,
      checksum: local.checksum
    };
  }
  async downloadPackage(pluginId: string, version: string, downloadUrl?: string): Promise<Uint8Array> {
    const url = downloadUrl || `kortina://marketplace/download/${pluginId}?version=${version}`;
    if (url.startsWith('kortina://marketplace/download/') || isTauri()) {
      if (url.startsWith('kortina://marketplace/download/') && isTauri()) {
        const bytes = await invoke<number[]>('marketplace_download', {
          pluginId,
          version
        });
        return new Uint8Array(bytes);
      }
    }
    if (/^https?:\/\//i.test(url)) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new MarketplaceApiError(`下载失败: HTTP ${response.status}`, response.status, 'DOWNLOAD_FAILED');
      }
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    }
    if (isTauri()) {
      const bytes = await invoke<number[]>('marketplace_download', {
        pluginId,
        version
      });
      return new Uint8Array(bytes);
    }
    throw new MarketplaceApiError(`无法下载插件包: ${url}`, 0, 'DOWNLOAD_UNSUPPORTED');
  }
  private async tryRemoteHealth(): Promise<MarketplaceHealth | null> {
    const bases = [this.remoteBaseUrl, ...this.fallbackUrls].filter(Boolean);
    for (const base of bases) {
      try {
        const response = await fetch(`${base}/health`, {
          method: 'GET'
        });
        if (response.ok) {
          this.remoteBaseUrl = base;
          let body: any = null;
          try {
            body = await response.json();
          } catch {
            body = null;
          }
          return {
            ok: true,
            source: 'remote',
            baseUrl: base,
            message: body?.message || '远程市场服务可用',
            catalogVersion: body?.catalogVersion,
            pluginCount: body?.pluginCount
          };
        }
      } catch {}
    }
    return null;
  }
  private async remoteFetch(path: string, init?: RequestInit): Promise<Response> {
    const bases = [this.remoteBaseUrl, ...this.fallbackUrls].filter(Boolean);
    if (bases.length === 0) {
      throw new MarketplaceApiError('未配置远程扩展市场', 0, 'REMOTE_NOT_CONFIGURED');
    }
    let lastError: unknown;
    for (const base of bases) {
      try {
        const response = await fetch(`${base}${path}`, init);
        if (response.ok || response.status < 500) {
          this.remoteBaseUrl = base;
          return response;
        }
        lastError = new MarketplaceApiError(`HTTP ${response.status}`, response.status);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new MarketplaceApiError('远程市场请求失败', 0, 'REMOTE_UNAVAILABLE');
  }
  private async remoteList(query: MarketplaceListQuery, page: number, pageSize: number): Promise<MarketplaceListResponse> {
    const qs = buildQuery({
      query: query.query,
      category: query.category,
      page,
      pageSize,
      sort: query.sort
    });
    const response = await this.remoteFetch(`/plugins${qs}`);
    const data = await parseJsonResponse<any>(response);
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page,
        pageSize,
        source: 'remote'
      };
    }
    return {
      items: data.items || data.plugins || [],
      total: data.total ?? (data.items?.length || 0),
      page: data.page ?? page,
      pageSize: data.pageSize ?? pageSize,
      source: 'remote'
    };
  }
  private getLocalFallbackCatalog(): MarketplacePluginDetail[] {
    return [];
  }
  private localList(query: MarketplaceListQuery, page: number, pageSize: number): MarketplaceListResponse {
    let items: MarketplacePluginSummary[] = this.getLocalFallbackCatalog();
    const q = (query.query || '').trim().toLowerCase();
    if (q) {
      items = items.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q)));
    }
    if (query.category) {
      items = items.filter(p => p.category === query.category);
    }
    switch (query.sort) {
      case 'name':
        items = [...items].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'downloads':
        items = [...items].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        break;
      case 'updated':
        items = [...items].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        break;
      default:
        break;
    }
    const total = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    return {
      items: pageItems,
      total,
      page,
      pageSize,
      source: 'local-fallback'
    };
  }
}
export const marketplaceClient = new MarketplaceClient();