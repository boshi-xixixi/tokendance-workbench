import { DEFAULT_APP_URL } from './config'

const API_KEY = 'td.api_key'
const APP_URL = 'td.app_url'
const PERSIST = 'td.persist_key'

export interface Settings {
  apiKey: string
  appUrl: string
  persistKey: boolean
}

export function readSettings(): Settings {
  return {
    apiKey: sessionStorage.getItem(API_KEY) ?? localStorage.getItem(API_KEY) ?? '',
    appUrl: localStorage.getItem(APP_URL) || DEFAULT_APP_URL,
    persistKey: localStorage.getItem(PERSIST) === '1',
  }
}

/**
 * 默认只存 sessionStorage：关掉标签页就没了。持久化到 localStorage 需要用户显式勾选，
 * 因为浏览器里的明文 Key 会被同源的任意脚本和扩展读到。
 */
export function saveApiKey(key: string, persist: boolean): void {
  if (!key) {
    localStorage.removeItem(API_KEY)
    sessionStorage.removeItem(API_KEY)
    return
  }
  localStorage.removeItem(API_KEY)
  sessionStorage.removeItem(API_KEY)
  ;(persist ? localStorage : sessionStorage).setItem(API_KEY, key)
  localStorage.setItem(PERSIST, persist ? '1' : '0')
}

export function saveAppUrl(appUrl: string): void {
  localStorage.setItem(APP_URL, appUrl)
}
