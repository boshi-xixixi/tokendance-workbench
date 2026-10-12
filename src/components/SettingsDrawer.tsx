import { useState } from 'react'
import { KeyRound, Link2, Trash2 } from 'lucide-react'
import { exchangeCode, headlessAuthorizeUrl } from '../lib/oauth'

export default function SettingsDrawer({
  appUrl,
  hasKey,
  keyTail,
  onSaveAppUrl,
  onPasteKey,
  onDisconnect,
}: {
  appUrl: string
  hasKey: boolean
  keyTail: string
  onSaveAppUrl: (v: string) => void
  onPasteKey: (k: string) => Promise<void>
  onDisconnect: () => void
}) {
  const [draft, setDraft] = useState(appUrl)
  const [code, setCode] = useState('')
  const [raw, setRaw] = useState('')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')

  async function makeLink() {
    setLink(await headlessAuthorizeUrl(draft))
    setNote('打开链接、登录、确认授权，页面会显示一个一次性 code，10 分钟内有效。')
  }

  async function useCode() {
    try {
      await onPasteKey(await exchangeCode(code.trim()))
      setNote('已经换到 Key 了')
      setCode('')
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-6">
        <section>
          <label className="mb-1.5 block text-xs font-medium text-faint">APP URL（归因标识）</label>
          <div className="flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} className="field max-w-md" />
            <button
              onClick={() => onSaveAppUrl(draft)}
              className="cursor-pointer rounded-control border border-line px-4 text-sm text-muted transition-colors duration-200 hover:border-brand hover:text-brand-ink"
            >
              保存
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-warn">
            申请 TokenPay 之后这个值不能改，改了归因就断。上线前一次性定死，别留示例值。
          </p>
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-medium text-faint">
              <Link2 className="size-3.5" />
              无回调授权
            </h3>
            <button
              onClick={makeLink}
              className="w-fit cursor-pointer rounded-full border border-line px-4 py-1.5 text-xs text-muted transition-colors duration-200 hover:border-brand hover:text-brand-ink"
            >
              生成授权链接
            </button>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="num line-clamp-2 text-[11px] break-all text-brand hover:underline"
              >
                {link}
              </a>
            )}
            {link && (
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="粘贴 code"
                  className="field"
                />
                <button
                  onClick={useCode}
                  disabled={!code.trim()}
                  className="shrink-0 cursor-pointer whitespace-nowrap rounded-control bg-brand-deep px-4 text-xs font-medium text-on-brand disabled:opacity-45"
                >
                  交换
                </button>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-medium text-faint">
              <KeyRound className="size-3.5" />
              已有 Key，直接用
            </h3>
            <div className="flex gap-2">
              <input
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="从控制台粘贴 API Key"
                className="field"
              />
              <button
                onClick={() => onPasteKey(raw.trim()).then(() => setRaw(''))}
                disabled={!raw.trim()}
                className="shrink-0 cursor-pointer whitespace-nowrap rounded-control bg-brand-deep px-4 text-xs font-medium text-on-brand disabled:opacity-45"
              >
                保存
              </button>
            </div>
            {hasKey && (
              <button
                onClick={onDisconnect}
                className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-faint transition-colors duration-200 hover:text-bad"
              >
                <Trash2 className="size-3.5" />
                清除本机 Key（····{keyTail}）
              </button>
            )}
          </section>
        </div>

        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
    </div>
  )
}
