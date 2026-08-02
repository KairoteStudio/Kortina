import type { Plugin, PluginManifest } from '../index';
const KORTINA_VERSION = '26.V5.0';
export function getKortinaVersion(): string {
  return KORTINA_VERSION;
}
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
export function validatePluginVersion(manifest: PluginManifest): {
  valid: boolean;
  error?: string;
} {
  const compatibility = manifest.compatibility;
  if (!compatibility) return {
    valid: true
  };
  const minVersion = compatibility.minVersion;
  const maxVersion = compatibility.maxVersion;
  if (minVersion && compareVersions(KORTINA_VERSION, minVersion) < 0) {
    return {
      valid: false,
      error: `Plugin requires Kortina >= ${minVersion}, current version is ${KORTINA_VERSION}`
    };
  }
  if (maxVersion && compareVersions(KORTINA_VERSION, maxVersion) > 0) {
    return {
      valid: false,
      error: `Plugin requires Kortina <= ${maxVersion}, current version is ${KORTINA_VERSION}`
    };
  }
  return {
    valid: true
  };
}
export function validateDependencies(manifest: PluginManifest, plugins: Map<string, Plugin>): {
  valid: boolean;
  missing: Record<string, string>;
  incompatible: Record<string, string>;
} {
  const missing: Record<string, string> = {};
  const incompatible: Record<string, string> = {};
  if (!manifest.dependencies) {
    return {
      valid: true,
      missing,
      incompatible
    };
  }
  for (const [depId, versionRange] of Object.entries(manifest.dependencies)) {
    const depPlugin = plugins.get(depId);
    if (!depPlugin) {
      missing[depId] = versionRange;
      continue;
    }
    const depVersion = depPlugin.manifest.version;
    if (versionRange.startsWith('^')) {
      const minVer = versionRange.slice(1);
      if (compareVersions(depVersion, minVer) < 0) {
        incompatible[depId] = `Need ^${minVer}, found ${depVersion}`;
      }
    } else if (versionRange.startsWith('>=')) {
      const minVer = versionRange.slice(2);
      if (compareVersions(depVersion, minVer) < 0) {
        incompatible[depId] = `Need >=${minVer}, found ${depVersion}`;
      }
    }
  }
  const valid = Object.keys(missing).length === 0 && Object.keys(incompatible).length === 0;
  return {
    valid,
    missing,
    incompatible
  };
}