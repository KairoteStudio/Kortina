import { invoke } from '@tauri-apps/api/core';
import { ShellType } from './TerminalService';
export type Platform = 'windows' | 'linux' | 'macos' | 'unknown';
export interface ShellProfile {
  id: ShellType;
  name: string;
  shortName: string;
  description: string;
  command: string;
  platforms: Platform[];
}
interface BackendProfile {
  id: string;
  name: string;
  short_name: string;
  command: string;
}
const SHELL_PROFILES: ShellProfile[] = [{
  id: 'powershell',
  name: 'PowerShell',
  shortName: 'PS',
  description: 'Windows PowerShell',
  command: 'powershell.exe',
  platforms: ['windows']
}, {
  id: 'cmd',
  name: 'Command Prompt',
  shortName: 'CMD',
  description: 'Windows Command Prompt',
  command: 'cmd.exe',
  platforms: ['windows']
}, {
  id: 'wsl',
  name: 'WSL',
  shortName: 'WSL',
  description: 'Windows Subsystem for Linux',
  command: 'wsl.exe',
  platforms: ['windows']
}, {
  id: 'bash',
  name: 'Bash',
  shortName: 'Bash',
  description: 'Bourne Again Shell',
  command: 'bash',
  platforms: ['linux', 'macos', 'windows']
}, {
  id: 'zsh',
  name: 'Zsh',
  shortName: 'Zsh',
  description: 'Z Shell',
  command: 'zsh',
  platforms: ['linux', 'macos']
}, {
  id: 'fish',
  name: 'Fish',
  shortName: 'Fish',
  description: 'Friendly Interactive Shell',
  command: 'fish',
  platforms: ['linux', 'macos']
}, {
  id: 'sh',
  name: 'Shell',
  shortName: 'sh',
  description: 'POSIX Shell',
  command: 'sh',
  platforms: ['linux', 'macos']
}];
const DEFAULT_PROFILE_KEY = 'kortina_terminal_default_profile';
let cachedBackendPlatform: Platform | undefined;
let backendPlatformPromise: Promise<Platform> | undefined;
export function detectPlatformFromUserAgent(): Platform {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac') || userAgent.includes('darwin')) return 'macos';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
}
export async function getBackendPlatform(): Promise<Platform> {
  if (cachedBackendPlatform) return cachedBackendPlatform;
  if (backendPlatformPromise) return backendPlatformPromise;
  backendPlatformPromise = (async () => {
    try {
      const os = await invoke<string>('get_os_type');
      const platform = os as Platform;
      cachedBackendPlatform = platform;
      return platform;
    } catch {
      return detectPlatformFromUserAgent();
    }
  })();
  return backendPlatformPromise;
}
export function getPlatform(): Platform {
  return cachedBackendPlatform ?? detectPlatformFromUserAgent();
}
export function setPlatform(platform: Platform): void {
  cachedBackendPlatform = platform;
}
export async function initializePlatform(): Promise<void> {
  await getBackendPlatform();
}
export function getShellProfilesForPlatform(platform: Platform = getPlatform()): ShellProfile[] {
  return SHELL_PROFILES.filter(profile => profile.platforms.includes(platform));
}
let cachedDetectedProfiles: ShellProfile[] | null = null;
let detectedProfilesPromise: Promise<ShellProfile[]> | null = null;
export async function getShellProfiles(): Promise<ShellProfile[]> {
  if (cachedDetectedProfiles) return cachedDetectedProfiles;
  if (detectedProfilesPromise) return detectedProfilesPromise;
  detectedProfilesPromise = (async () => {
    try {
      const backendProfiles = await invoke<BackendProfile[]>('get_terminal_profiles');
      const platform = getPlatform();
      const profiles = backendProfiles.map(p => ({
        id: p.id as ShellType,
        name: p.name,
        shortName: p.short_name,
        description: p.name,
        command: p.command,
        platforms: [platform]
      }));
      cachedDetectedProfiles = profiles;
      return profiles;
    } catch {
      const fallback = getShellProfilesForPlatform();
      cachedDetectedProfiles = fallback;
      return fallback;
    }
  })();
  return detectedProfilesPromise;
}
export function clearDetectedProfilesCache(): void {
  cachedDetectedProfiles = null;
  detectedProfilesPromise = null;
}
export function getShellProfileById(id: ShellType, platform: Platform = getPlatform()): ShellProfile | undefined {
  return SHELL_PROFILES.find(profile => profile.id === id && profile.platforms.includes(platform));
}
export function getDefaultShellType(platform: Platform = getPlatform()): ShellType {
  switch (platform) {
    case 'windows':
      return 'powershell';
    case 'macos':
      return 'zsh';
    case 'linux':
    default:
      return 'bash';
  }
}
export function getEffectiveDefaultShellType(platform?: Platform): ShellType {
  const resolvedPlatform = platform ?? getPlatform();
  const platformDefault = getDefaultShellType(resolvedPlatform);
  if (typeof window === 'undefined') return platformDefault;
  try {
    const saved = window.localStorage.getItem(DEFAULT_PROFILE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ShellType;
      const available = cachedDetectedProfiles ?? getShellProfilesForPlatform(resolvedPlatform);
      if (available.some(p => p.id === parsed)) {
        return parsed;
      }
    }
  } catch {}
  if (cachedDetectedProfiles && cachedDetectedProfiles.length > 0) {
    if (cachedDetectedProfiles.some(p => p.id === platformDefault)) {
      return platformDefault;
    }
    return cachedDetectedProfiles[0].id;
  }
  return platformDefault;
}
export function setDefaultShellType(shellType: ShellType): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEFAULT_PROFILE_KEY, JSON.stringify(shellType));
  } catch {}
}
export function getFallbackShellType(platform: Platform = getPlatform()): ShellType {
  return getDefaultShellType(platform);
}