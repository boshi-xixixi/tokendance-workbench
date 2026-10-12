import { TD } from '../config'
import { requestJson } from '../gateway'
import type { Capability, RunInput, RunOutput } from './types'

interface ArkImagesResponse {
  data?: { url?: string }[]
}

async function run(input: RunInput): Promise<RunOutput> {
  const refs = input.media.refs ?? []
  const { data, meta } = await requestJson<ArkImagesResponse>({
    base: TD.ark,
    path: '/images/generations',
    method: 'POST',
    key: input.key,
    appUrl: input.appUrl,
    signal: input.signal,
    body: {
      model: input.model,
      prompt: input.values.prompt,
      // 文档：单张传字符串，多参考图传数组，并在提示词里用「图1」「图2」说明各自用途。
      ...(refs.length === 1 ? { image: refs[0] } : refs.length > 1 ? { image: refs } : {}),
      size: input.values.size || '2K',
      output_format: 'png',
      response_format: 'url',
      watermark: false,
    },
  })
  const images = (data.data ?? []).map((d) => d.url ?? '').filter(Boolean)
  if (!images.length) throw new Error('响应里没有图片链接')
  return { images, meta }
}

export const imageArk: Capability = {
  id: 'image-ark',
  label: '参考图生图',
  protocol: 'ark:image-generations',
  hint: 'Seedream 方舟协议。可挂 1 张参考图/草图，也可多张分工；图片以 Data URL 直接提交，不需要先上传到任何地方。',
  icon: 'image',
  examples: ['保留图1 的主体轮廓和构图，只重绘材质与光影，成品是商业摄影质感。'],
  fields: [
    { name: 'prompt', label: '画面描述', kind: 'textarea', placeholder: '想要什么效果' },
    { name: 'refs', label: '参考图', kind: 'media', accept: 'image', multiple: true },
    { name: 'size', label: '尺寸', kind: 'text', default: '2K' },
  ],
  run,
}
