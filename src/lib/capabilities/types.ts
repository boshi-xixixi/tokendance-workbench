import type { CallMeta, Model } from '../gateway'

export type FieldKind = 'textarea' | 'text' | 'number' | 'media'

export interface Field {
  name: string
  label: string
  kind: FieldKind
  default?: string
  placeholder?: string
  /** media 字段用：收图片还是视频，能否多个。 */
  accept?: 'image' | 'video' | 'both'
  multiple?: boolean
}

export interface RunInput {
  model: string
  values: Record<string, string>
  /** media 字段的值，data URL 列表，不塞进 values 以免被当字符串处理。 */
  media: Record<string, string[]>
  key: string
  appUrl: string
  signal: AbortSignal
  /** 同一会话里的历史，只有对话类能力会用。 */
  history: { role: 'user' | 'assistant'; text: string }[]
  /** 流式能力逐段回调，非流式能力不调用。 */
  onDelta: (text: string) => void
}

export interface LinkResult {
  title: string
  url: string
  snippet?: string
}

export interface RunOutput {
  text?: string
  images?: string[]
  audio?: { url: string; label: string }
  links?: LinkResult[]
  vector?: { dims: number; preview: number[]; count: number }
  video?: { url: string; storedKey?: string; expiresAt: number }
  meta: CallMeta
}

export interface PollResult {
  done: boolean
  output?: RunOutput
  error?: string
}

/**
 * 扩展点：新增一个能力 = 在 index.ts 里加一项，输入框的模式菜单会自动多出这个入口。
 * protocol 必须与 /gateway/v1/models 返回的 supported_protocols 字面量一致。
 * 同步能力实现 run；异步能力实现 submit + poll，App 负责轮询和产物落盘。
 */
export interface Capability {
  id: string
  label: string
  protocol: string
  hint: string
  /** 决定左栏图标，未登记的名字会落到默认图标。 */
  icon: 'chat' | 'image' | 'video' | 'audio' | 'search' | 'embed' | 'vision' | 'sparkles'
  /** 空状态里可点的示例，点一下填进第一个字段。 */
  examples?: string[]
  /** 协议本身不标注能力差异时，用它把模型池收窄到确认过的几个。 */
  modelIds?: string[]
  fields: Field[]
  run?: (input: RunInput) => Promise<RunOutput>
  submit?: (input: RunInput) => Promise<string>
  poll?: (key: string, taskId: string) => Promise<PollResult>
}

export function modelsFor(models: Model[], protocol: string, only?: string[]): Model[] {
  const byProtocol = models.filter((m) => m.supported_protocols.includes(protocol))
  if (!only) return byProtocol
  const pinned = byProtocol.filter((m) => only.includes(m.id))
  return pinned.length ? pinned : byProtocol
}
