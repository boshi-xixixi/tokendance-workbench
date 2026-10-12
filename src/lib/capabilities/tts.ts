import { TD } from '../config'
import { requestJson } from '../gateway'
import type { Capability, RunInput, RunOutput } from './types'

interface TtsResponse {
  data?: { audio?: string }
  extra_info?: { usage_characters?: number }
  base_resp?: { status_code?: number; status_msg?: string }
}

function hexToUrl(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
}

async function run(input: RunInput): Promise<RunOutput> {
  const { data, meta } = await requestJson<TtsResponse>({
    base: TD.minimax,
    path: '/t2a_v2',
    method: 'POST',
    key: input.key,
    appUrl: input.appUrl,
    signal: input.signal,
    body: {
      model: input.model,
      text: input.values.text,
      voice_setting: {
        voice_id: input.values.voice_id || 'male-qn-qingse',
        speed: Number(input.values.speed || '1'),
        vol: 1,
        pitch: 0,
      },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
    },
  })
  if (data.base_resp?.status_code) {
    throw new Error(`合成失败：${data.base_resp.status_msg ?? data.base_resp.status_code}`)
  }
  if (!data.data?.audio) throw new Error('响应里没有音频数据')
  return { audio: { url: hexToUrl(data.data.audio), label: `${input.values.text.slice(0, 12)}…` }, meta }
}

export const tts: Capability = {
  id: 'tts',
  label: '语音合成',
  protocol: 'minimax:t2a_v2',
  hint: '同步返回 mp3。音色 ID 目前只验证了 male-qn-qingse，换别的得先确认 MiniMax 侧存在。',
  icon: 'audio',
  examples: ['今天是不是很开心呀，当然了！', '把这段话读成新闻播报的感觉。'],
  fields: [
    { name: 'text', label: '要读的文本', kind: 'textarea', placeholder: '今天天气真好，适合出门走走。' },
    { name: 'voice_id', label: '音色 ID', kind: 'text', default: 'male-qn-qingse' },
    { name: 'speed', label: '语速', kind: 'text', default: '1' },
  ],
  run,
}
