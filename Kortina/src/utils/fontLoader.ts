const EXTRA_FONT_FAMILIES = new Set(['LitalagicaL Mono NL', 'LitalagicaL Mono Variable']);
let extraFontsPromise: Promise<void> | null = null;
function extractBaseFamily(fontFamily: string): string {
  return fontFamily.split(',')[0].trim().replace(/["']/g, '');
}
export function shouldLoadExtraFonts(fontFamily: string): boolean {
  return EXTRA_FONT_FAMILIES.has(extractBaseFamily(fontFamily));
}
export async function loadExtraFonts(): Promise<void> {
  if (extraFontsPromise) return extraFontsPromise;
  extraFontsPromise = import('../assets/fonts-extra.css').then(() => {});
  return extraFontsPromise;
}
export async function loadFontFamily(fontFamily: string): Promise<void> {
  if (shouldLoadExtraFonts(fontFamily)) {
    return loadExtraFonts();
  }
}