export type Theme = 'light' | 'dark' | 'system'

const KEY = 'td.theme'

export function readTheme(): Theme {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : 'system'
}

export function saveTheme(t: Theme): void {
  localStorage.setItem(KEY, t)
}

export function systemPrefersDark(): boolean {
  return matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(t: Theme): void {
  document.documentElement.classList.toggle('dark', t === 'dark' || (t === 'system' && systemPrefersDark()))
}

export function nextTheme(t: Theme): Theme {
  return t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light'
}

export const THEME_LABEL: Record<Theme, string> = { light: '浅色', dark: '深色', system: '跟随系统' }
