import { chat } from './chat'
import { embeddings } from './embeddings'
import { image } from './image'
import { imageArk } from './imageArk'
import { search } from './search'
import { tts } from './tts'
import { video } from './video'
import { vision } from './vision'
import type { Capability } from './types'

export type { Capability, Field, LinkResult, PollResult, RunInput, RunOutput } from './types'
export { modelsFor } from './types'

/**
 * 社区扩展就改这一个数组：push 一个 Capability 对象，输入框的模式菜单会自动多出这个入口。
 * protocol 必须与 /gateway/v1/models 返回的 supported_protocols 字面量一致。
 */
export const capabilities: Capability[] = [chat, image, imageArk, vision, video, tts, search, embeddings]

export function findCapability(id: string): Capability {
  return capabilities.find((c) => c.id === id) ?? capabilities[0]
}
