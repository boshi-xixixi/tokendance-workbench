import { TD } from '../config'
import { requestJson } from '../gateway'
import type { Capability, LinkResult, RunInput, RunOutput } from './types'

const TITLE_KEYS = ['title', 'name', 'siteName', 'sitename']
const URL_KEYS = ['url', 'link', 'displayUrl', 'display_url']
const SNIPPET_KEYS = ['snippet', 'summary', 'description', 'content']

/**
 * 博查的响应结构在文档里没有给出示例，所以这里不假设字段路径，
 * 而是遍历 JSON 找出「带链接又带标题」的对象。找不到时界面会退回原始 JSON。
 */
function extractLinks(node: unknown, depth = 0, seen = new Set<string>(), out: LinkResult[] = []): LinkResult[] {
  if (out.length >= 20 || depth > 6 || node === null) return out
  if (Array.isArray(node)) {
    for (const item of node) extractLinks(item, depth + 1, seen, out)
    return out
  }
  if (typeof node !== 'object') return out
  const obj = node as Record<string, unknown>
  const pick = (keys: string[]) =>
    keys.map((k) => obj[k]).find((v): v is string => typeof v === 'string' && v.trim() !== '')
  const url = pick(URL_KEYS)
  const title = pick(TITLE_KEYS)
  if (url && title && !seen.has(url)) {
    seen.add(url)
    out.push({ title, url, snippet: pick(SNIPPET_KEYS)?.slice(0, 220) })
  }
  for (const v of Object.values(obj)) extractLinks(v, depth + 1, seen, out)
  return out
}

async function run(input: RunInput): Promise<RunOutput> {
  const { data, meta } = await requestJson<unknown>({
    // 该协议只收 query 等字段，文档里没有 model，所以不能塞。
    base: TD.bocha,
    path: '/web-search',
    method: 'POST',
    key: input.key,
    appUrl: input.appUrl,
    signal: input.signal,
    body: {
      query: input.values.query,
      freshness: input.values.freshness || 'noLimit',
      summary: true,
      count: Number(input.values.count || '10'),
    },
  })
  const links = extractLinks(data)
  return {
    links,
    text: links.length ? '' : JSON.stringify(data, null, 2),
    meta,
  }
}

export const search: Capability = {
  id: 'search',
  label: '联网搜索',
  protocol: 'bocha:web-search',
  hint: '返回网页结果列表。平台文档没写响应字段，解析走通用遍历。',
  icon: 'search',
  examples: ['2026 年国庆档电影票房', 'TokenDance 词元跳动 是什么'],
  fields: [
    { name: 'query', label: '搜索词', kind: 'textarea', placeholder: '想查什么' },
    { name: 'count', label: '条数（1-50）', kind: 'number', default: '10' },
    { name: 'freshness', label: '时间范围', kind: 'text', default: 'noLimit' },
  ],
  run,
}
