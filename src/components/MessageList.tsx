import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { AlertCircle, Coins, Download } from 'lucide-react'
import { capIcon } from './capIcons'
import { loadBlobUrl } from '../lib/artifacts'
import type { Capability } from '../lib/capabilities'
import { tSlow, vRoot, vRise } from '../lib/motion'
import type { Msg } from '../lib/conversation'

export default function MessageList({
  messages,
  caps,
  onPick,
}: {
  messages: Msg[]
  caps: Capability[]
  onPick: (id: string, example?: string) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const last = messages[messages.length - 1]

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [last?.text, last?.images?.length, messages.length])

  if (messages.length === 0) {
    return (
      <motion.div
        variants={vRoot}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-5 py-10"
      >
        <motion.h2 variants={vRise} className="text-[1.75rem] font-semibold tracking-tight">
          今天想做点什么？
        </motion.h2>
        <motion.p variants={vRise} className="mt-1.5 text-sm text-muted">
          换能力、换模型，每次调用花了多少钱会跟着回答显示。
        </motion.p>
        <motion.div variants={vRise} className="mt-7 flex flex-wrap gap-2.5">
          {caps.map((c) => {
            const Icon = capIcon(c.icon)
            return (
              <button
                key={c.id}
                onClick={() => onPick(c.id, c.examples?.[0])}
                className="group flex cursor-pointer items-center gap-2.5 rounded-full border border-line bg-surface py-2.5 pr-4 pl-3.5 text-sm text-ink shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-ink"
              >
                <Icon className="size-4 text-faint transition-colors group-hover:text-brand" strokeWidth={1.9} />
                {c.label}
              </button>
            )
          })}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex max-w-[760px] flex-col gap-7 px-5 py-8">
        {messages.map((m) => (
          <Message key={m.id} m={m} caps={caps} />
        ))}
      </div>
    </div>
  )
}

function Message({ m, caps }: { m: Msg; caps: Capability[] }) {
  const cap = caps.find((c) => c.id === m.capId)
  const Icon = capIcon(cap?.icon ?? 'sparkles')

  if (m.role === 'user') {
    return (
      <motion.div {...rise} className="flex flex-col items-end gap-2">
        {m.attachments && m.attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {m.attachments.slice(0, 4).map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`附件 ${i + 1}`}
                className="size-20 rounded-control border border-line object-cover"
              />
            ))}
            {m.attachments.length > 4 && (
              <span className="num self-end text-[10px] text-faint">+{m.attachments.length - 4}</span>
            )}
          </div>
        )}
        <p className="max-w-[80%] rounded-card bg-brand-soft px-4 py-2.5 text-[0.9375rem] leading-7 whitespace-pre-wrap">
          {m.text}
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div {...rise} className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-[11px] text-faint">
        <Icon className="size-3.5" strokeWidth={1.9} />
        <span>{cap?.label ?? m.capId}</span>
        <span className="num opacity-70">{m.model}</span>
        {m.spent && (
          <span className="flex items-center gap-1 rounded-full bg-sunken px-2 py-0.5">
            <Coins className="size-3" />
            {m.spent}
          </span>
        )}
      </div>

      {m.error && (
        <p className="flex items-start gap-2 text-sm text-bad">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {m.error}
        </p>
      )}

      {m.text && (
        <p className="text-[0.9375rem] leading-7 break-words whitespace-pre-wrap">
          {m.text}
          {m.running && <span className="ml-0.5 inline-block size-3.5 translate-y-0.5 animate-pulse rounded-sm bg-brand" />}
        </p>
      )}

      {!m.text && m.running && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-faint"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </span>
          {m.pending ? '任务已提交，正在生成，通常要几十秒到几分钟' : '等待首个字节'}
        </p>
      )}

      {m.video && <VideoBlock video={m.video} />}

      {m.images && m.images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {m.images.map((src, i) => (
            <figure key={src + i} className="group overflow-hidden rounded-control border border-line">
              <img
                src={src}
                alt={`第 ${i + 1} 张生成结果`}
                className="w-full transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <figcaption className="border-t border-line px-3 py-1.5">
                <a
                  href={src}
                  download
                  className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-brand-ink"
                >
                  <Download className="size-3" />
                  下载
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {m.links && m.links.length > 0 && (
        <div className="flex flex-col gap-2">
          {m.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer rounded-control border border-line bg-surface px-4 py-3 transition-all duration-200 hover:border-brand hover:shadow-card"
            >
              <p className="truncate text-sm font-medium">{l.title}</p>
              {l.snippet && <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{l.snippet}</p>}
              <p className="num mt-1.5 truncate text-[10px] text-faint">{l.url}</p>
            </a>
          ))}
        </div>
      )}

      {m.audio &&
        (m.audio.live && m.audio.url ? (
          <audio controls src={m.audio.url} className="w-full max-w-sm" />
        ) : (
          <p className="text-xs text-faint">音频只在本次页面里有效，重新运行可再生成。</p>
        ))}

      {m.vector && (
        <div className="num rounded-control border border-line bg-sunken px-4 py-3 text-xs leading-6">
          {m.vector.count} 条向量 · 每条 {m.vector.dims} 维
          <br />
          <span className="text-faint">[{m.vector.preview.map((n) => n.toFixed(4)).join(', ')}, …]</span>
        </div>
      )}
    </motion.div>
  )
}

const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: tSlow }

/** 产物链接 24 小时过期，所以优先播本机 IndexedDB 里存过的那份。 */
function VideoBlock({ video }: { video: NonNullable<Msg['video']> }) {
  const [src, setSrc] = useState<string | null>(null)
  const [fromStore, setFromStore] = useState(false)

  useEffect(() => {
    if (!video.storedKey) return
    let alive = true
    loadBlobUrl(video.storedKey).then((url) => {
      if (!alive || !url) return
      setSrc(url)
      setFromStore(true)
    })
    return () => {
      alive = false
    }
  }, [video.storedKey])

  const playable = src ?? video.url
  const hoursLeft = Math.max(0, Math.round((video.expiresAt - Date.now()) / 3_600_000))

  return (
    <div className="flex flex-col gap-2">
      <video controls src={playable} className="w-full max-w-md rounded-control border border-line" />
      <div className="flex items-center gap-3 text-[11px] text-faint">
        <a
          href={playable}
          download="tokendance.mp4"
          className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-brand-ink"
        >
          <Download className="size-3" />
          下载
        </a>
        <span>{fromStore ? '已存到本机，不再依赖平台链接' : `平台链接约 ${hoursLeft} 小时后过期`}</span>
      </div>
    </div>
  )
}
