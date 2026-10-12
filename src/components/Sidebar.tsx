import { motion } from 'motion/react'
import { MessageSquarePlus, Monitor, Moon, Plus, Settings, Sparkles, Sun, Trash2, Wallet } from 'lucide-react'
import NumberTicker from './NumberTicker'
import { MICRO_PER_YUAN } from '../lib/config'
import type { Balance } from '../lib/gateway'
import { vRise } from '../lib/motion'
import type { Thread } from '../lib/conversation'
import { relativeTime } from '../lib/conversation'
import type { Theme } from '../lib/theme'
import { THEME_LABEL } from '../lib/theme'

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } satisfies Record<Theme, typeof Sun>

export default function Sidebar({
  threads,
  currentId,
  balance,
  apiKey,
  theme,
  onNew,
  onPick,
  onDelete,
  onConnect,
  onSettings,
  onCycleTheme,
}: {
  threads: Thread[]
  currentId: string
  balance: Balance | null
  apiKey: string
  theme: Theme
  onNew: () => void
  onPick: (id: string) => void
  onDelete: (id: string) => void
  onConnect: () => void
  onSettings: () => void
  onCycleTheme: () => void
}) {
  const ThemeIcon = THEME_ICON[theme]

  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="grid size-7 place-items-center rounded-[9px] bg-gradient-to-br from-brand to-violet text-on-brand">
          <Sparkles className="size-3.5" strokeWidth={2} />
        </div>
        <span className="text-[0.9375rem] font-semibold tracking-tight">词元工作台</span>
        <button
          onClick={onCycleTheme}
          aria-label={`主题：${THEME_LABEL[theme]}`}
          title={`主题：${THEME_LABEL[theme]}（点击切换）`}
          className="ml-auto grid size-7 cursor-pointer place-items-center rounded-full text-faint transition-colors duration-200 hover:bg-sunken hover:text-ink"
        >
          <ThemeIcon className="size-3.5" />
        </button>
      </div>

      <div className="px-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          className="flex w-full cursor-pointer items-center gap-2 rounded-full bg-brand-deep px-4 py-2.5 text-sm font-medium text-on-brand shadow-card transition-shadow duration-200 hover:shadow-pop"
        >
          <Plus className="size-4" />
          新建对话
        </motion.button>
      </div>

      <div className="mt-5 mb-1 px-5 text-[11px] font-medium text-faint">最近</div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto px-2 pb-2">
        {threads.length === 0 && (
          <p className="px-3 py-2 text-xs leading-5 text-faint">
            还没有会话。跑一次就会出现在这里。
          </p>
        )}
        {threads.map((t) => (
          <motion.div key={t.id} variants={vRise} className="group relative">
            <button
              onClick={() => onPick(t.id)}
              className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-control px-3 py-2 pr-8 text-left transition-colors duration-200 ${
                t.id === currentId ? 'bg-brand-soft' : 'hover:bg-sunken'
              }`}
            >
              <span
                className={`truncate text-[0.8125rem] ${t.id === currentId ? 'font-medium text-brand-ink' : 'text-ink'}`}
              >
                {t.title}
              </span>
              <span className="num text-[10px] text-faint">
                {relativeTime(t.createdAt)} · {t.messages.length} 条
              </span>
            </button>
            <button
              onClick={() => onDelete(t.id)}
              aria-label="删除会话"
              className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-faint opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:text-bad"
            >
              <Trash2 className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-line p-3">
        {balance && (
          <div className="flex items-center gap-2 rounded-control bg-sunken px-3 py-2 text-xs text-muted">
            <Wallet className="size-3.5 text-faint" />
            余额
            <NumberTicker value={balance.balance / MICRO_PER_YUAN} prefix="¥" className="ml-auto text-ink" />
          </div>
        )}
        {apiKey ? (
          <button
            onClick={onSettings}
            className="flex cursor-pointer items-center gap-2 rounded-control border border-line px-3 py-2 text-xs text-muted transition-colors duration-200 hover:border-brand hover:text-brand-ink"
          >
            <span className="size-1.5 rounded-full bg-ok" />
            已连接 ····{apiKey.slice(-4)}
            <Settings className="ml-auto size-3.5 text-faint" />
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="flex cursor-pointer items-center gap-2 rounded-control bg-brand-deep px-3 py-2 text-xs font-medium text-on-brand"
          >
            <MessageSquarePlus className="size-3.5" />
            连接 Token 钱包
          </button>
        )}
      </div>
    </aside>
  )
}
