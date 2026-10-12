import { TD } from '../config'
import { openStream, readSse } from '../gateway'
import type { CallMeta } from '../gateway'
import type { Capability, RunInput, RunOutput } from './types'

interface ChatChunk {
  choices?: { delta?: { content?: string } }[]
}

/** 对话和视觉理解共用这条流式通道，只有 messages 内容不同。 */
export async function streamMessages(
  messages: unknown[],
  input: RunInput,
): Promise<{ text: string; meta: CallMeta }> {
  const { res, meta } = await openStream({
    base: TD.gateway,
    path: '/chat/completions',
    method: 'POST',
    key: input.key,
    appUrl: input.appUrl,
    signal: input.signal,
    body: { model: input.model, stream: true, messages },
  })
  let text = ''
  for await (const raw of readSse(res)) {
    const delta = (raw as ChatChunk).choices?.[0]?.delta?.content
    if (delta) {
      text += delta
      input.onDelta(delta)
    }
  }
  return { text, meta }
}

async function run(input: RunInput): Promise<RunOutput> {
  const { text, meta } = await streamMessages(
    [...input.history.filter((h) => h.text.trim()), { role: 'user', content: input.values.prompt }],
    input,
  )
  return { text, meta }
}

export const chat: Capability = {
  id: 'chat',
  label: '对话',
  protocol: 'openai:chat-completions',
  hint: '流式输出，逐字返回',
  icon: 'chat',
  examples: ['用三句话解释一下向量数据库', '帮我把这段文案改得更口语化', 'GLM 5 和 Qwen3 Max 各自擅长什么'],
  fields: [{ name: 'prompt', label: '提示词', kind: 'textarea', placeholder: '想问什么' }],
  run,
}
