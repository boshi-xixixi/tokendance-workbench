export const TD = {
  site: 'https://tokendance.space',
  gateway: 'https://tokendance.space/gateway/v1',
  portal: 'https://tokendance.space/portal/api/v1',
  auth: 'https://tokendance.space/auth',
  /** 各家原生协议挂在各自的网关前缀下，不在 /gateway/v1 里。 */
  ark: 'https://tokendance.space/gateway/ark/v3',
  minimax: 'https://tokendance.space/gateway/minimax/v1',
  bocha: 'https://tokendance.space/gateway/bocha/v1',
} as const

/**
 * 归因标识。申请 TokenPay 后不可变更，换仓库/换域名前要一次性定死。
 */
export const DEFAULT_APP_URL = 'app://tokendance-workbench'

export const KEY_NAME = 'tokendance-workbench'

/** 1 元 = 1,000,000 微元，平台所有额度字段的单位。 */
export const MICRO_PER_YUAN = 1_000_000

export function formatYuan(micro: number): string {
  return (micro / MICRO_PER_YUAN).toFixed(4).replace(/\.?0+$/, '')
}
