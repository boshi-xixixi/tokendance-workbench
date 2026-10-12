import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, ChevronDown, Loader2, Paperclip, Pause, SlidersHorizontal, Upload, Wand2, X } from 'lucide-react'
import { capIcon } from './capIcons'
import type { Capability } from '../lib/capabilities'
import type { Model } from '../lib/gateway'
import { tBase, tPop } from '../lib/motion'
import type { Preset } from '../lib/presets'

function Popover({ label, icon, children, wide }: { label: string; icon: ReactNode; children: ReactNode; wide?: boolean }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[190px] cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted transition-colors duration-200 hover:border-brand hover:text-brand-ink"
      >
        {icon}
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3 shrink-0 text-faint" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={tPop}
            className={`absolute bottom-full left-0 mb-2 rounded-card border border-line bg-surface p-1.5 shadow-pop ${wide ? 'w-72' : 'w-52'}`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Composer({
  cap,
  caps,
  models,
  model,
  modelLabel,
  values,
  running,
  ready,
  draft,
  media,
  mediaNote,
  presets,
  onCap,
  onModel,
  onValue,
  onDraft,
  onPreset,
  onPickFiles,
  onClearMedia,
  onSend,
  onStop,
}: {
  cap: Capability
  caps: Capability[]
  models: Model[]
  model: string
  modelLabel: string
  values: Record<string, string>
  running: boolean
  ready: boolean
  draft: string
  media: Record<string, string[]>
  mediaNote: string
  presets: Preset[]
  onCap: (id: string) => void
  onModel: (id: string) => void
  onValue: (name: string, v: string) => void
  onDraft: (v: string) => void
  onPreset: (p: Preset) => void
  onPickFiles: (field: string, files: File[]) => void
  onClearMedia: (field: string) => void
  onSend: (text: string) => void
  onStop: () => void
}) {
  const area = useRef<HTMLTextAreaElement>(null)
  const primary = cap.fields[0]
  const rest = cap.fields.filter((f) => f.kind !== 'media' && f !== primary)
  const slots = cap.fields.filter((f) => f.kind === 'media')

  useEffect(() => {
    area.current?.focus()
  }, [cap.id])

  function submit() {
    const text = draft.trim()
    if (!text || running) return
    onSend(text)
    onDraft('')
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-5">
      <motion.div
        layout
        transition={tBase}
        className="rounded-card border border-line bg-surface p-3 shadow-card transition-shadow duration-200 focus-within:border-brand focus-within:shadow-pop"
      >
        <textarea
          ref={area}
          value={draft}
          rows={2}
          placeholder={primary.placeholder ?? `${cap.label}…`}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          className="max-h-44 w-full resize-none bg-transparent px-1.5 py-1 text-[0.9375rem] leading-7 outline-none"
        />

        {slots.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 px-1.5">
            {slots.map((f) => {
              const n = (media[f.name] ?? []).length
              const accept = f.accept === 'video' ? 'video/*' : f.accept === 'both' ? 'image/*,video/*' : 'image/*'
              return (
                <span
                  key={f.name}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors duration-200 ${
                    n ? 'border-brand/40 bg-brand-soft text-brand-ink' : 'border-line text-muted'
                  }`}
                >
                  <Paperclip className="size-3" />
                  {f.label}
                  {n > 0 ? ` ${n}` : ''}
                  <label className="cursor-pointer text-faint hover:text-ink">
                    <input
                      type="file"
                      accept={accept}
                      multiple={f.multiple}
                      className="hidden"
                      onChange={(e) => {
                        const picked = [...(e.target.files ?? [])]
                        if (picked.length) onPickFiles(f.name, picked)
                        e.target.value = ''
                      }}
                    />
                    <Upload className="size-3.5" />
                  </label>
                  {n > 0 && (
                    <button onClick={() => onClearMedia(f.name)} aria-label={`清除${f.label}`} className="cursor-pointer hover:text-bad">
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              )
            })}
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          {presets.length > 0 && (
            <Popover label="预设" icon={<Wand2 className="size-3.5 shrink-0" />} wide>
              <div className="max-h-80 overflow-auto">
                {presets.map((p, i) => (
                  <div key={p.id}>
                    {(i === 0 || presets[i - 1].group !== p.group) && (
                      <p className="px-2.5 pt-2 pb-1 text-[10px] tracking-widest text-faint">{p.group}</p>
                    )}
                    <button
                      onClick={() => onPreset(p)}
                      className="flex w-full cursor-pointer flex-col gap-0.5 rounded-control px-2.5 py-2 text-left transition-colors duration-150 hover:bg-sunken"
                    >
                      <span className="text-[0.8125rem]">{p.label}</span>
                      <span className="text-[11px] leading-4 text-faint">{p.hint}</span>
                    </button>
                  </div>
                ))}
              </div>
            </Popover>
          )}
          <Popover
            label={cap.label}
            icon={(() => {
              const Icon = capIcon(cap.icon)
              return <Icon className="size-3.5 shrink-0" strokeWidth={1.9} />
            })()}
          >
            <div className="flex flex-col gap-0.5">
              {caps.map((c) => {
                const Icon = capIcon(c.icon)
                const on = c.id === cap.id
                return (
                  <button
                    key={c.id}
                    onClick={() => onCap(c.id)}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-[0.8125rem] transition-colors duration-150 ${
                      on ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-sunken'
                    }`}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.9} />
                    {c.label}
                    <span className="num ml-auto text-[9px] text-faint">{c.protocol.split(':')[0]}</span>
                  </button>
                )
              })}
            </div>
          </Popover>

          <Popover label={modelLabel || '选模型'} icon={<span className="size-1.5 shrink-0 rounded-full bg-brand" />} wide>
            <div className="max-h-72 overflow-auto">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onModel(m.id)}
                  className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-control px-2.5 py-2 text-left transition-colors duration-150 ${
                    m.id === model ? 'bg-brand-soft' : 'hover:bg-sunken'
                  }`}
                >
                  <span className={`text-[0.8125rem] ${m.id === model ? 'font-medium text-brand-ink' : 'text-ink'}`}>
                    {m.name}
                  </span>
                  <span className="num text-[10px] text-faint">{m.id}</span>
                </button>
              ))}
              {models.length === 0 && <p className="px-2.5 py-2 text-xs text-faint">该能力下没有可用模型</p>}
            </div>
          </Popover>

          {rest.length > 0 && (
            <Popover label="参数" icon={<SlidersHorizontal className="size-3.5 shrink-0" />}>
              <div className="flex flex-col gap-2.5 p-1.5">
                {rest.map((f) => (
                  <div key={f.name}>
                    <label className="mb-1 block text-[11px] text-faint">{f.label}</label>
                    <input
                      value={values[f.name] ?? f.default ?? ''}
                      inputMode={f.kind === 'number' ? 'numeric' : 'text'}
                      onChange={(e) => onValue(f.name, e.target.value)}
                      className="field"
                    />
                  </div>
                ))}
              </div>
            </Popover>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!ready && <span className="text-[11px] text-warn">先连接 Token 钱包</span>}
            {running && (
              <button
                onClick={onStop}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors duration-200 hover:text-ink"
              >
                <Pause className="size-3" />
                停止
              </button>
            )}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={submit}
              disabled={!draft.trim() || running || !ready}
              aria-label="发送"
              className="grid size-9 cursor-pointer place-items-center rounded-full bg-brand-deep text-on-brand transition-shadow duration-200 hover:shadow-pop disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-faint"
            >
              {running ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </motion.button>
          </div>
        </div>
      </motion.div>
      {mediaNote ? (
        <p className="mt-2 px-1 text-[11px] text-warn">{mediaNote}</p>
      ) : (
        <p className="mt-2 px-1 text-[11px] text-faint">Enter 发送 · Shift+Enter 换行 · {cap.hint}</p>
      )}
    </div>
  )
}
