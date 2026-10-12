import type { LinkResult } from './capabilities'

export interface Msg {
  id: string
  role: 'user' | 'assistant'
  capId: string
  model: string
  text: string
  images?: string[]
  audio?: { url: string; label: string; live: boolean }
  links?: LinkResult[]
  vector?: { dims: number; preview: number[]; count: number }
  video?: { url: string; storedKey?: string; expiresAt: number }
  /** 异步任务提交后还没出结果，刷新页面也能接着轮询。 */
  pending?: { taskId: string; capId: string }
  spent: string | null
  error: string | null
  at: number
  running?: boolean
  /** 发出去的素材缩略图，只在内存里，不写本地存储（data URL 太大）。 */
  attachments?: string[]
}

export interface Thread {
  id: string
  title: string
  createdAt: number
  messages: Msg[]
}

const KEY = 'td.threads'
const MAX_THREADS = 30

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function newThread(): Thread {
  return { id: uid(), title: '新对话', createdAt: Date.now(), messages: [] }
}

/** blob: 音频地址刷新即失效，所以读回来时标成非 live，界面据此提示重新合成。 */
export function loadThreads(): Thread[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.slice(0, MAX_THREADS).map((t: Thread) => ({
      ...t,
      messages: t.messages.map((m) => ({
        ...m,
        running: false,
        attachments: undefined,
        audio: m.audio ? { ...m.audio, live: false, url: '' } : undefined,
      })),
    }))
  } catch {
    return []
  }
}

export function saveThreads(threads: Thread[]): void {
  const trimmed = threads.slice(0, MAX_THREADS).map((t) => ({
    ...t,
    messages: t.messages.map((m) => ({
      ...m,
      attachments: undefined,
      audio: m.audio && !m.audio.live ? undefined : m.audio,
    })),
  }))
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch {
    // 超出配额时放弃持久化，不影响当前会话
  }
}

export function relativeTime(at: number): string {
  const min = Math.floor((Date.now() - at) / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  return `${Math.floor(hour / 24)} 天前`
}
