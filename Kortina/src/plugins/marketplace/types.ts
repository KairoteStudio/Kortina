export type MarketplaceSort = 'relevance' | 'downloads' | 'updated' | 'name';
export interface MarketplaceListQuery {
  query?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  sort?: MarketplaceSort;
}
export interface MarketplaceCompatibility {
  minVersion: string;
  maxVersion?: string;
}
export interface MarketplacePluginSummary {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  category?: string;
  tags?: string[];
  iconUrl?: string;
  homepage?: string;
  repository?: string;
  downloads?: number;
  updatedAt?: string;
  compatibility?: MarketplaceCompatibility;
}
export interface MarketplacePluginDetail extends MarketplacePluginSummary {
  readme?: string;
  releaseNotes?: string;
  permissions?: string[];
  downloadUrl?: string;
  checksum?: {
    algorithm: 'sha256' | 'sha1' | 'md5';
    value: string;
  };
  dependencies?: Record<string, string>;
}
export interface MarketplaceLatestResponse {
  pluginId: string;
  version: string;
  downloadUrl: string;
  releaseNotes?: string;
  publishedAt?: string;
  checksum?: MarketplacePluginDetail['checksum'];
}
export interface MarketplaceListResponse {
  items: MarketplacePluginSummary[];
  total: number;
  page: number;
  pageSize: number;
  source: MarketplaceSource;
}
export type MarketplaceSource = 'tauri' | 'remote' | 'local-fallback';
export interface MarketplaceHealth {
  ok: boolean;
  source: MarketplaceSource;
  baseUrl?: string;
  message?: string;
  catalogVersion?: string;
  pluginCount?: number;
}
export interface MarketplaceApiErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}
export class MarketplaceApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  constructor(message: string, status = 0, code?: string, details?: unknown) {
    super(message);
    this.name = 'MarketplaceApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}