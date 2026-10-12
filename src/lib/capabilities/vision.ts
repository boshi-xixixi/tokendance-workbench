import type { Capability, RunInput, RunOutput } from './types'
import { streamMessages } from './chat'

/**
 * 视觉输入走 OpenAI chat 协议的多模态 content 数组。
 * 词元跳动的协议文档只写了文本对话，没写 image_url，这里是按 OpenAI 规范透传，
 * 属于「需要真 Key 跑一次确认」的那类，不要当成已验证事实。
 */
async function run(input: RunInput): Promise<RunOutput> {
  const images = input.media.images ?? []
  if (images.length === 0) throw new Error('先添加图片或视频，再运行')
  const { text, meta } = await streamMessages(
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: input.values.prompt },
          ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
        ],
      },
    ],
    input,
  )
  return { text, meta }
}

export const vision: Capability = {
  id: 'vision',
  label: '图片视频理解',
  protocol: 'openai:chat-completions',
  hint: '收图片；给视频的话浏览器先抽帧再发，原始视频不出本机。',
  icon: 'vision',
  modelIds: [
    'glm-4.6v',
    'glm-5v-turbo',
    'qwen3-vl-plus',
    'qwen3.5-plus',
    'seed-2.0-pro',
    'mimo-v2.5',
    'step-3.7-flash',
    'kimi-k2.5',
  ],
  examples: ['按主体、构图、光线、色彩、材质逐项拆解这张图，并指出最影响还原度的三个锚点。'],
  fields: [
    { name: 'prompt', label: '你要问什么', kind: 'textarea', placeholder: '描述这张图 / 分析这段视频' },
    { name: 'images', label: '图片或视频', kind: 'media', accept: 'both', multiple: true },
  ],
  run,
}
