/**
 * [파일 안내] 밝기(mode)와 색상(color)을 독립적으로 저장하는 테마 저장소입니다.
 * 하나의 JSON 키로 저장하여 다른 탭에도 두 선택이 함께 전달됩니다.
 * 예전 문자열(purple 등)은 같은 색상의 화이트 모드로 해석하여 기존 취향을 유지합니다.
 */
export type Theme = 'light' | 'dark' | 'system';
export type ThemeColor = 'default' | 'purple' | 'yellow' | 'red';
export type ThemePreferences = { theme: Theme; color: ThemeColor };
export type ThemeSnapshot = ThemePreferences & { resolved: 'light' | 'dark' };
export const THEME_KEY = 'theme';
export const THEME_QUERY = '(prefers-color-scheme: dark)';
export const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: '화이트' }, { value: 'dark', label: '다크' }, { value: 'system', label: '시스템' },
];
export const COLOR_OPTIONS: { value: ThemeColor; label: string; light: string; dark: string; ink: string }[] = [
  { value: 'default', label: '기본', light: '#f5f5f7', dark: '#181a24', ink: '#2563eb' },
  { value: 'purple', label: '퍼플', light: '#eee6fa', dark: '#20162e', ink: '#a78bfa' },
  { value: 'yellow', label: '옐로우', light: '#fff4cd', dark: '#272115', ink: '#e7bd58' },
  { value: 'red', label: '레드', light: '#fbe5e8', dark: '#2b171e', ink: '#f393ab' },
];

/** 저장 데이터는 신뢰하지 않습니다. 잘못된 JSON/값은 기본 시스템 테마로 복구합니다. */
export function parsePreferences(raw: string | null): ThemePreferences {
  const fallback: ThemePreferences = { theme: 'system', color: 'default' };
  if (!raw) return fallback;
  if (raw === 'purple' || raw === 'yellow' || raw === 'red') return { theme: 'light', color: raw };
  if (raw === 'light' || raw === 'dark' || raw === 'system') return { theme: raw, color: 'default' };
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') return fallback;
    const theme = value.theme === 'light' || value.theme === 'dark' ? value.theme : 'system';
    const color = value.color === 'purple' || value.color === 'yellow' || value.color === 'red' ? value.color : 'default';
    return { theme, color };
  } catch { return fallback; }
}
export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  return theme === 'dark' || (theme === 'system' && prefersDark) ? 'dark' : 'light';
}

const serverSnapshot: ThemeSnapshot = { theme: 'system', color: 'default', resolved: 'light' };
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();
export const getThemeSnapshot = () => snapshot;
export const getServerThemeSnapshot = () => serverSnapshot;

function readPreferences(): ThemePreferences {
  try { return parsePreferences(window.localStorage.getItem(THEME_KEY)); }
  catch { return { theme: 'system', color: 'default' }; }
}
function applyTheme(preferences: ThemePreferences) {
  const resolved = resolveTheme(preferences.theme, window.matchMedia(THEME_QUERY).matches);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
  document.documentElement.dataset.theme = preferences.color;
  if (snapshot.theme !== preferences.theme || snapshot.color !== preferences.color || snapshot.resolved !== resolved) {
    snapshot = { ...preferences, resolved };
    listeners.forEach(listener => listener());
  }
}
function savePreferences(preferences: ThemePreferences) {
  const stored = readPreferences();
  if (snapshot.theme === preferences.theme && snapshot.color === preferences.color &&
      stored.theme === preferences.theme && stored.color === preferences.color) return;
  // 저장 실패 시 현재 화면을 바꾸지 않고 호출한 UI에 예외를 전달합니다.
  window.localStorage.setItem(THEME_KEY, JSON.stringify(preferences));
  applyTheme(preferences);
}
/** 밝기만 변경합니다. 선택한 색상은 보존합니다. */
export function setTheme(theme: Theme) { savePreferences({ theme, color: snapshot.color }); }
/** 색상만 변경합니다. 시스템/화이트/다크 선택은 보존합니다. */
export function setThemeColor(color: ThemeColor) { savePreferences({ theme: snapshot.theme, color }); }
/** 보드 빠른 전환도 색상은 유지합니다. */
export function toggleTheme() { setTheme(snapshot.resolved === 'dark' ? 'light' : 'dark'); }

let cleanup: (() => void) | undefined;
export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const media = window.matchMedia(THEME_QUERY);
    const onSystemChange = () => { if (snapshot.theme === 'system') applyTheme(snapshot); };
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && (event.key === THEME_KEY || event.key === null)) applyTheme(readPreferences());
    };
    media.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    cleanup = () => {
      media.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
    applyTheme(readPreferences());
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { cleanup?.(); cleanup = undefined; }
  };
}

// 최초 HTML과 React가 같은 함수를 사용해 새로고침 때 다른 색이 잠깐 보이지 않게 합니다.
export const themeBootstrapScript = `(() => {
  const parsePreferences = ${parsePreferences.toString()};
  const resolveTheme = ${resolveTheme.toString()};
  let stored = null;
  try { stored = localStorage.getItem(${JSON.stringify(THEME_KEY)}); } catch {}
  const preferences = parsePreferences(stored);
  const resolved = resolveTheme(preferences.theme, window.matchMedia(${JSON.stringify(THEME_QUERY)}).matches);
  document.documentElement.dataset.theme = preferences.color;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
})();`;
