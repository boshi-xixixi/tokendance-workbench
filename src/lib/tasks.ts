import { TD } from './config'
import { requestJson } from './gateway'

export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface TaskSnapshot {
  status: TaskStatus
  videoUrl: string | null
  error: string | null
}

interface RawTask {
  id?: string
  task_id?: string
  status?: string
  content?: { video_url?: string }
  error?: { message?: string; code?: string } | string
}

/** 方舟 v3 任务接口。文档没给提交响应示例，所以 id 的取法做了容错。 */
export async function submitTask(key: string, appUrl: string, body: unknown): Promise<string> {
  const { data } = await requestJson<RawTask>({
    base: `${TD.ark}`,
    path: '/generations/tasks',
    method: 'POST',
    key,
    appUrl,
    body,
  })
  const id = data.id ?? data.task_id
  if (!id) throw new Error(`任务提交后没返回任务 ID，响应是 ${JSON.stringify(data).slice(0, 200)}`)
  return id
}

export async function queryTask(key: string, taskId: string): Promise<TaskSnapshot> {
  const { data } = await requestJson<RawTask>({
    base: `${TD.ark}`,
    path: `/generations/tasks/${encodeURIComponent(taskId)}`,
    key,
  })
  const status = (data.status ?? 'running') as TaskStatus
  const err = typeof data.error === 'string' ? data.error : data.error?.message
  return { status, videoUrl: data.content?.video_url ?? null, error: err ?? null }
}

/** 产物链接 24 小时过期，界面上要能倒着数。 */
export function expiresAt(): number {
  return Date.now() + 24 * 3600 * 1000
}
