import { KEY_NAME, TD } from './config'
import { toError } from './errors'

const VERIFIER_KEY = 'td.oauth_verifier'

function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** code_verifier 需为 43–128 个 [A-Za-z0-9-._~] 字符，两个 uuid 拼起来 72 位。 */
function createVerifier(): string {
  return crypto.randomUUID() + crypto.randomUUID()
}

export async function challengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

function savePendingVerifier(verifier: string): void {
  sessionStorage.setItem(VERIFIER_KEY, verifier)
}

function takePendingVerifier(): string | null {
  const v = sessionStorage.getItem(VERIFIER_KEY)
  if (v) sessionStorage.removeItem(VERIFIER_KEY)
  return v
}

function authorizeUrl(challenge: string, appUrl: string, withCallback: boolean): string {
  const q = new URLSearchParams()
  if (withCallback) q.set('callback_url', `${location.origin}${location.pathname}`)
  q.set('code_challenge', challenge)
  q.set('code_challenge_method', 'S256')
  q.set('app_url', appUrl)
  q.set('key_name', KEY_NAME)
  return `${TD.auth}?${q}`
}

/** 跳转授权页，回来后从 ?code= 读取。verifier 只留在本机 sessionStorage。 */
export async function beginAuthorization(appUrl: string): Promise<void> {
  const verifier = createVerifier()
  savePendingVerifier(verifier)
  location.href = authorizeUrl(await challengeOf(verifier), appUrl, true)
}

/** headless：无 callback_url，授权页显示 10 分钟有效的一次性 code 给用户粘回。 */
export async function headlessAuthorizeUrl(appUrl: string): Promise<string> {
  const verifier = createVerifier()
  savePendingVerifier(verifier)
  return authorizeUrl(await challengeOf(verifier), appUrl, false)
}

/** 用户手粘的 code 没有对应 verifier 时（换浏览器/清过缓存）走无 PKCE 交换。 */
export async function exchangeCode(code: string): Promise<string> {
  const verifier = takePendingVerifier()
  const res = await fetch(`${TD.portal}/auth/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      verifier ? { code, code_verifier: verifier, code_challenge_method: 'S256' } : { code },
    ),
  })
  if (!res.ok) throw await toError(res)
  const body = await res.json()
  if (typeof body?.key !== 'string') throw new Error('授权响应里没有 key 字段')
  return body.key
}

export function codeFromLocation(): string | null {
  return new URLSearchParams(location.search).get('code')
}

export function clearCodeFromUrl(): void {
  history.replaceState(null, '', `${location.pathname}${location.hash}`)
}
