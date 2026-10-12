import { TD } from './config'
import { GatewayError, toError } from './errors'

export interface Model {
  id: string
  name: string
  created: number
  description: string
  context_length: number
  supported_protocols: string[]
}

export interface Balance {
  credits: number
  creditsUsed: number
  balance: number
}

export interface CallMeta {
  traceId: string | null
  requestId: string | null
  status: number
}

export interface WithMeta<T> {
  data: T
  meta: CallMeta
}

interface RequestSpec {
  base: string
  path: string
  method?: 'GET' | 'POST'
  key?: string
  appUrl?: string
  body?: unknown
  signal?: AbortSignal
  accept?: string
}

function metaOf(res: Response): CallMeta {
  return {
    traceId: res.headers.get('X-Trace-Id'),
    requestId: res.headers.get('X-Request-Id'),
    status: res.status,
  }
}

async function send(spec: RequestSpec): Promise<Response> {
  const headers: Record<string, string> = { Accept: spec.accept ?? 'application/json' }
  if (spec.key) headers.Authorization = `Bearer ${spec.key}`
  // 归因头只能加在 /gateway 上：/portal 的预检不放行 X-App-URL，带上会被浏览器整个拦掉。
  if (spec.appUrl) headers['X-App-URL'] = spec.appUrl
  if (spec.body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${spec.base}${spec.path}`, {
    method: spec.method ?? (spec.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
    signal: spec.signal,
  })
  if (!res.ok) throw await toError(res)
  return res
}

export async function requestJson<T>(spec: RequestSpec): Promise<WithMeta<T>> {
  const res = await send(spec)
  return { data: (await res.json()) as T, meta: metaOf(res) }
}

export async function openStream(spec: RequestSpec): Promise<{ res: Response; meta: CallMeta }> {
  const res = await send({ ...spec, accept: 'text/event-stream' })
  return { res, meta: metaOf(res) }
}

export function listModels(): Promise<Model[]> {
  return requestJson<{ data: Model[] }>({ base: TD.gateway, path: '/models' }).then((r) => r.data.data)
}

export function getBalance(key: string): Promise<Balance> {
  return requestJson<{ balance: { credits: number; credits_used: number; balance: number } }>({
    base: TD.portal,
    path: '/user/balance',
    key,
  }).then((r) => ({
    credits: r.data.balance.credits,
    creditsUsed: r.data.balance.credits_used,
    balance: r.data.balance.balance,
  }))
}

/** 余额结算有延迟，第一次取不到差值时补查，最多三次。 */
export async function balanceAfterCall(
  key: string,
  before: number,
): Promise<{ balance: Balance; spent: number | null }> {
  let balance = await getBalance(key)
  for (let i = 0; i < 3 && before - balance.balance <= 0; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    balance = await getBalance(key)
  }
  const spent = before - balance.balance
  return { balance, spent: spent > 0 ? spent : null }
}

export async function* readSse(res: Response): AsyncGenerator<unknown> {
  if (!res.body) throw new GatewayError({ status: res.status, code: 'no_body', message: '响应没有可读流' })
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let at = buffer.indexOf('\n\n')
    while (at >= 0) {
      const chunk = buffer.slice(0, at)
      buffer = buffer.slice(at + 2)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload && payload !== '[DONE]') yield JSON.parse(payload)
      }
      at = buffer.indexOf('\n\n')
    }
  }
}
