import { TD } from '../config'
import { requestJson } from '../gateway'
import type { Capability, RunInput, RunOutput } from './types'

interface ImagesResponse {
  data?: { url?: string; b64_json?: string }[]
}

async function run(input: RunInput): Promise<RunOutput> {
  const { data, meta } = await requestJson<ImagesResponse>({
    base: TD.gateway,
    path: '/images/generations',
    method: 'POST',
    key: input.key,
    appUrl: input.appUrl,
    signal: input.signal,
    body: {
      model: input.model,
      prompt: input.values.prompt,
      n: Number(input.values.n || '1'),
      size: input.values.size || '1024x1024',
    },
  })
  const images = (data.data ?? [])
    .map((d) => d.url ?? (d.b64_json ? `data:image/png;base64,${d.b64_json}` : ''))
    .filter(Boolean)
  return { images, text: images.length ? '' : '响应里没有图片链接', meta }
}

export const image: Capability = {
  id: 'image',
  label: '生图',
  protocol: 'openai:image-generations',
  hint: '同步返回图片链接，有时效，记得下载',
  icon: 'image',
  examples: [
    '一只在雪地里追毛线球的猫，柔光，胶片质感',
    '等距视角的太空咖啡馆，粉蓝配色，细节丰富',
    '水墨风格的江南雨巷，留白构图',
  ],
  fields: [
    { name: 'prompt', label: '画面描述', kind: 'textarea', placeholder: '一只在雪地里追球的猫' },
    { name: 'size', label: '尺寸', kind: 'text', default: '1024x1024' },
    { name: 'n', label: '张数', kind: 'number', default: '1' },
  ],
  run,
}
