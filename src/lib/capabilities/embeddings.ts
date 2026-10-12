import { TD } from '../config'
import { requestJson } from '../gateway'
import type { Capability, RunInput, RunOutput } from './types'

interface EmbeddingsResponse {
  data?: { embedding: number[] }[]
}

async function run(input: RunInput): Promise<RunOutput> {
  const { data, meta } = await requestJson<EmbeddingsResponse>({
    base: TD.gateway,
    path: '/embeddings',
    method: 'POST',
    key: input.key,
    appUrl: input.appUrl,
    signal: input.signal,
    body: { model: input.model, input: input.values.input },
  })
  const rows = data.data ?? []
  if (rows.length === 0) throw new Error('响应里没有向量')
  return {
    vector: { dims: rows[0].embedding.length, preview: rows[0].embedding.slice(0, 6), count: rows.length },
    meta,
  }
}

export const embeddings: Capability = {
  id: 'embeddings',
  label: '向量化',
  protocol: 'openai:embeddings',
  hint: '把文本转成向量，返回维度和前几维数值',
  icon: 'embed',
  examples: ['词元跳动是一个多模型网关'],
  fields: [{ name: 'input', label: '文本', kind: 'textarea', placeholder: '要向量化的文本' }],
  run,
}
