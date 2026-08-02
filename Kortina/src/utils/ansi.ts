export interface AnsiSegment {
  text: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  underline?: boolean;
}
const ANSI_COLOR_MAP: Record<string, string> = {
  '30': '#000000',
  '31': '#dc3545',
  '32': '#28a745',
  '33': '#ffc107',
  '34': '#007bff',
  '35': '#e83e8c',
  '36': '#17a2b8',
  '37': '#f8f9fa',
  '90': '#6c757d',
  '91': '#f8d7da',
  '92': '#d4edda',
  '93': '#fff3cd',
  '94': '#d1ecf1',
  '95': '#f8d7da',
  '96': '#d1ecf1',
  '97': '#ffffff'
};
const BRIGHT_COLOR_MAP: Record<string, string> = {
  '90': '#6c757d',
  '91': '#f8d7da',
  '92': '#d4edda',
  '93': '#fff3cd',
  '94': '#d1ecf1',
  '95': '#f8d7da',
  '96': '#d1ecf1',
  '97': '#ffffff'
};
const get256Color = (code: string): string => {
  const num = parseInt(code, 10);
  if (num < 16) {
    const basic: Record<number, string> = {
      0: '#000000',
      1: '#800000',
      2: '#008000',
      3: '#808000',
      4: '#000080',
      5: '#800080',
      6: '#008080',
      7: '#c0c0c0',
      8: '#808080',
      9: '#ff0000',
      10: '#00ff00',
      11: '#ffff00',
      12: '#0000ff',
      13: '#ff00ff',
      14: '#00ffff',
      15: '#ffffff'
    };
    return basic[num] || '#ffffff';
  } else if (num < 232) {
    const n = num - 16;
    const r = Math.floor(n / 36) * 51;
    const g = Math.floor(n % 36 / 6) * 51;
    const b = n % 6 * 51;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const gray = 8 + (num - 232) * 10;
    return `rgb(${gray}, ${gray}, ${gray})`;
  }
};
export const parseAnsiText = (text: string): AnsiSegment[] => {
  const ansiRegex = /\x1b\[([0-9;]*)([mHfABCDJKST])/g;
  const parts: AnsiSegment[] = [];
  let lastIndex = 0;
  let currentColor: string | undefined;
  let currentBgColor: string | undefined;
  let currentBold = false;
  let currentUnderline = false;
  let match;
  while ((match = ansiRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textPart = text.substring(lastIndex, match.index);
      if (textPart) {
        parts.push({
          text: textPart,
          color: currentColor,
          bgColor: currentBgColor,
          bold: currentBold,
          underline: currentUnderline
        });
      }
    }
    const command = match[2];
    const params = match[1];
    if (command === 'm') {
      const codes = params.split(';').map(code => code.trim());
      codes.forEach(code => {
        if (code === '0') {
          currentColor = undefined;
          currentBgColor = undefined;
          currentBold = false;
          currentUnderline = false;
        } else if (code === '1') {
          currentBold = true;
        } else if (code === '4') {
          currentUnderline = true;
        } else if (code === '22') {
          currentBold = false;
        } else if (code === '24') {
          currentUnderline = false;
        } else if (code === '39') {
          currentColor = undefined;
        } else if (code === '49') {
          currentBgColor = undefined;
        } else if (code >= '30' && code <= '37') {
          currentColor = ANSI_COLOR_MAP[code];
        } else if (code >= '40' && code <= '47') {
          const fgCode = (parseInt(code, 10) - 40 + 30).toString();
          currentBgColor = ANSI_COLOR_MAP[fgCode];
        } else if (code >= '90' && code <= '97') {
          currentColor = BRIGHT_COLOR_MAP[code];
        } else if (code >= '100' && code <= '107') {
          const fgCode = (parseInt(code, 10) - 100 + 90).toString();
          currentBgColor = BRIGHT_COLOR_MAP[fgCode];
        } else if (code.startsWith('38;5;')) {
          const colorCode = code.slice(5);
          currentColor = get256Color(colorCode);
        } else if (code.startsWith('48;5;')) {
          const colorCode = code.slice(5);
          currentBgColor = get256Color(colorCode);
        } else if (code.startsWith('38;2;')) {
          const rgb = code.slice(5).split(';');
          if (rgb.length === 3) {
            currentColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          }
        } else if (code.startsWith('48;2;')) {
          const rgb = code.slice(5).split(';');
          if (rgb.length === 3) {
            currentBgColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          }
        }
      });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    const textPart = text.substring(lastIndex);
    if (textPart) {
      parts.push({
        text: textPart,
        color: currentColor,
        bgColor: currentBgColor,
        bold: currentBold,
        underline: currentUnderline
      });
    }
  }
  if (parts.length === 0) {
    return [{
      text,
      color: undefined,
      bgColor: undefined,
      bold: false,
      underline: false
    }];
  }
  return parts;
};