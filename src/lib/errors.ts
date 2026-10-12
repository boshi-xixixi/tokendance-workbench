export type RecoveryAction = 'top_up_balance' | 'reauthorize_api_key' | 'api_key_quota'

export class GatewayError extends Error {
  status: number
  code: string
  traceId: string | null
  requestId: string | null
  recovery: RecoveryAction | null

  constructor(init: {
    status: number
    code: string
    message: string
    traceId?: string | null
    requestId?: string | null
    recovery?: RecoveryAction | null
  }) {
    super(init.message)
    this.name = 'GatewayError'
    this.status = init.status
    this.code = init.code
    this.traceId = init.traceId ?? null
    this.requestId = init.requestId ?? null
    // 文档承诺 401 会带 reauthorize_api_key，实测非法 Key 时该头并不出现，
    // 所以下面的兜底分支不能省。
    this.recovery = init.recovery ?? (init.status === 401 ? 'reauthorize_api_key' : null)
  }
}

const RECOVERY_VALUES: RecoveryAction[] = ['top_up_balance', 'reauthorize_api_key', 'api_key_quota']

export function recoveryFrom(res: Response): RecoveryAction | null {
  const raw = res.headers.get('TokenDance-Recovery-Action')
  return raw && (RECOVERY_VALUES as string[]).includes(raw) ? (raw as RecoveryAction) : null
}

export async function toError(res: Response): Promise<GatewayError> {
  let code = 'http_error'
  let message = `请求失败（HTTP ${res.status}）`
  try {
    const body = await res.json()
    const err = body?.error ?? body
    if (typeof err?.message === 'string') message = err.message
    if (typeof err?.code === 'string') code = err.code
  } catch {
    // 非 JSON 错误体，保留默认文案
  }
  return new GatewayError({
    status: res.status,
    code,
    message,
    traceId: res.headers.get('X-Trace-Id'),
    requestId: res.headers.get('X-Request-Id'),
    recovery: recoveryFrom(res),
  })
}

export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
