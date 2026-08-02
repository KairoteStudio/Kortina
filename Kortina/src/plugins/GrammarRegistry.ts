import type { languages } from 'monaco-editor';
import { pluginManager } from './PluginManager';
import { GrammarContribution } from './index';
const registeredGrammars = new Set<string>();
const registeredProviders = new Map<string, {
  dispose: () => void;
}>();
export async function registerGrammarWithMonaco(grammar: GrammarContribution): Promise<boolean> {
  if (registeredGrammars.has(grammar.language)) {
    console.log(`[GrammarRegistry] Grammar for "${grammar.language}" already registered, skipping`);
    return true;
  }
  try {
    const monaco = await import('monaco-editor');
    const existingLanguages = monaco.languages.getLanguages();
    if (!existingLanguages.some(l => l.id === grammar.language)) {
      monaco.languages.register({
        id: grammar.language,
        extensions: [`.${grammar.language}`],
        aliases: [grammar.language.charAt(0).toUpperCase() + grammar.language.slice(1)]
      });
      console.log(`[GrammarRegistry] Registered language: ${grammar.language}`);
    }
    if (grammar.path) {
      try {
        const grammarDef = await loadGrammarDefinition(grammar.path);
        if (grammarDef) {
          const provider = monaco.languages.setMonarchTokensProvider(grammar.language, grammarDef as languages.IMonarchLanguage);
          registeredProviders.set(grammar.language, provider);
          console.log(`[GrammarRegistry] Registered Monarch tokens for: ${grammar.language}`);
        }
      } catch (error) {
        console.warn(`[GrammarRegistry] Failed to load grammar definition from ${grammar.path}:`, error);
      }
    }
    const config = getLanguageConfig(grammar.language);
    if (config) {
      const configDisposable = monaco.languages.setLanguageConfiguration(grammar.language, config as languages.LanguageConfiguration);
      registeredProviders.set(`${grammar.language}-config`, configDisposable);
    }
    registeredGrammars.add(grammar.language);
    return true;
  } catch (error) {
    console.error(`[GrammarRegistry] Failed to register grammar for "${grammar.language}":`, error);
    return false;
  }
}
async function loadGrammarDefinition(path: string): Promise<any | null> {
  try {
    const {
      readFile
    } = await import('../utils/fileSystem');
    const result = await readFile(path);
    if (result.content) {
      return JSON.parse(result.content);
    }
  } catch (error) {
    console.warn(`[GrammarRegistry] Failed to load grammar from ${path}:`, error);
  }
  return null;
}
function getLanguageConfig(language: string): any {
  const configs: Record<string, any> = {
    'python': {
      comments: {
        lineComment: '#',
        blockComment: ['"""', '"""']
      },
      brackets: [['{', '}'], ['[', ']'], ['(', ')']],
      autoClosingPairs: [{
        open: '{',
        close: '}'
      }, {
        open: '[',
        close: ']'
      }, {
        open: '(',
        close: ')'
      }, {
        open: '"',
        close: '"'
      }, {
        open: "'",
        close: "'"
      }],
      surroundingPairs: [{
        open: '{',
        close: '}'
      }, {
        open: '[',
        close: ']'
      }, {
        open: '(',
        close: ')'
      }, {
        open: '"',
        close: '"'
      }, {
        open: "'",
        close: "'"
      }],
      folding: {
        offSide: true,
        markers: {
          start: /^\s*#region\b/,
          end: /^\s*#endregion\b/
        }
      }
    },
    'javascript': {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [['{', '}'], ['[', ']'], ['(', ')']],
      autoClosingPairs: [{
        open: '{',
        close: '}'
      }, {
        open: '[',
        close: ']'
      }, {
        open: '(',
        close: ')'
      }, {
        open: '"',
        close: '"'
      }, {
        open: "'",
        close: "'"
      }, {
        open: '`',
        close: '`'
      }],
      surroundingPairs: [{
        open: '{',
        close: '}'
      }, {
        open: '[',
        close: ']'
      }, {
        open: '(',
        close: ')'
      }, {
        open: '"',
        close: '"'
      }, {
        open: "'",
        close: "'"
      }, {
        open: '`',
        close: '`'
      }],
      folding: {
        offSide: false
      }
    }
  };
  return configs[language] || null;
}
export function unregisterGrammar(language: string): void {
  registeredGrammars.delete(language);
  const provider = registeredProviders.get(language);
  if (provider) {
    provider.dispose();
    registeredProviders.delete(language);
  }
  const configProvider = registeredProviders.get(`${language}-config`);
  if (configProvider) {
    configProvider.dispose();
    registeredProviders.delete(`${language}-config`);
  }
  console.log(`[GrammarRegistry] Unregistered grammar for: ${language}`);
}
export function isGrammarRegistered(language: string): boolean {
  return registeredGrammars.has(language);
}
export function initializeGrammarRegistry(): void {
  const renderer = pluginManager.getContributionRenderer();
  renderer.onGrammarRegistered(async grammar => {
    await registerGrammarWithMonaco(grammar);
  });
  const existingGrammars = renderer.getGrammarContributions();
  existingGrammars.forEach(async grammar => {
    await registerGrammarWithMonaco(grammar);
  });
  pluginManager.getEvents().on('plugin-deactivated', ({
    pluginId
  }) => {
    const plugin = pluginManager.getPlugin(pluginId);
    if (plugin?.manifest.contributions?.grammars) {
      plugin.manifest.contributions.grammars.forEach(grammar => {
        unregisterGrammar(grammar.language);
      });
    }
  });
  console.log('[GrammarRegistry] Initialized grammar registration system');
}
export function getRegisteredLanguages(): string[] {
  return Array.from(registeredGrammars);
}