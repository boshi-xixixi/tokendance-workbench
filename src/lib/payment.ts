import { TD } from './config'
import { requestJson } from './gateway'

export interface PaySession {
  id: string
  amount: number
  status: string
  payment_url: string
  alipay_url?: string
  status_url: string
  expired_at: number
  created_at: number
}

export function createSession(key: string, amount: number): Promise<PaySession> {
  return requestJson<{ session: PaySession }>({
    base: TD.portal,
    path: '/payment/sessions',
    method: 'POST',
    key,
    body: { amount },
  }).then((r) => r.data.session)
}

export function fetchSession(key: string, session: PaySession): Promise<PaySession> {
  return requestJson<{ session: PaySession }>({
    base: session.status_url,
    path: '',
    key,
  }).then((r) => r.data.session)
}
