import type { Capability, RunInput, PollResult } from './types'
import { expiresAt, queryTask, submitTask } from '../tasks'

/**
 * 文档明确要求：first_frame / last_frame 与 reference_* 不能混在同一请求里。
 * 这里按素材张数决定任务形态：0 张文生视频，1 张首帧，2 张首尾帧。
 */
function buildBody(input: RunInput) {
  const frames = input.media.frames ?? []
  const content: unknown[] = [{ type: 'text', text: input.values.prompt }]
  if (frames.length === 1) {
    content.push({ type: 'image_url', image_url: { url: frames[0] }, role: 'first_frame' })
  }
  if (frames.length >= 2) {
    content.push({ type: 'image_url', image_url: { url: frames[0] }, role: 'first_frame' })
    content.push({ type: 'image_url', image_url: { url: frames[1] }, role: 'last_frame' })
  }
  return {
    model: input.model,
    content,
    resolution: input.values.resolution || '720p',
    // 带首帧时画幅由素材决定，固定 ratio 容易触发任务类型约束错误或画面拉伸。
    ratio: frames.length > 0 ? 'adaptive' : input.values.ratio || '16:9',
    duration: Number(input.values.duration || '5'),
  }
}

async function poll(key: string, taskId: string): Promise<PollResult> {
  const t = await queryTask(key, taskId)
  if (t.status === 'succeeded') {
    if (!t.videoUrl) return { done: true, error: '任务成功但响应里没有视频链接' }
    return { done: true, output: { video: { url: t.videoUrl, expiresAt: expiresAt() }, meta: { status: 200, traceId: null, requestId: null } } }
  }
  if (t.status === 'failed') return { done: true, error: t.error ?? '任务失败' }
  return { done: false }
}

export const video: Capability = {
  id: 'video',
  label: '视频生成',
  protocol: 'seedance:generations',
  hint: '异步任务，通常要等几十秒到几分钟。产物链接 24 小时过期，成功后会自动存到本机。',
  icon: 'video',
  examples: ['猫咪朝镜头挥爪，镜头缓慢推进，画面稳定。'],
  fields: [
    { name: 'prompt', label: '画面与动作描述', kind: 'textarea', placeholder: '夜空中的烟花倒映在湖面，镜头缓慢上升' },
    { name: 'frames', label: '首帧/尾帧', kind: 'media', accept: 'image', multiple: true },
    { name: 'duration', label: '时长（秒）', kind: 'number', default: '5' },
    { name: 'resolution', label: '分辨率', kind: 'text', default: '720p' },
    { name: 'ratio', label: '画幅（纯文生时）', kind: 'text', default: '16:9' },
  ],
  submit: (input) => submitTask(input.key, input.appUrl, buildBody(input)),
  poll,
}
