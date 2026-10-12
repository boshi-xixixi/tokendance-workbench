import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Composer from './components/Composer'
import MessageList from './components/MessageList'
import Recharge from './components/Recharge'
import SettingsDrawer from './components/SettingsDrawer'
import Sidebar from './components/Sidebar'
import { capabilities, findCapability, modelsFor } from './lib/capabilities'
import { saveBlob } from './lib/artifacts'
import { extractFrames, fileToDataUrl, isVideo } from './lib/media'
import { presets } from './lib/presets'
import type { Preset } from './lib/presets'
import type { RunInput } from './lib/capabilities'
import { formatYuan } from './lib/config'
import { loadThreads, newThread, saveThreads, uid } from './lib/conversation'
import type { Msg, Thread } from './lib/conversation'
import { GatewayError } from './lib/errors'
import { balanceAfterCall, getBalance, listModels } from './lib/gateway'
import type { Balance, Model } from './lib/gateway'
import { beginAuthorization, clearCodeFromUrl, codeFromLocation, exchangeCode } from './lib/oauth'
import { tPop } from './lib/motion'
import { createSession, fetchSession } from './lib/payment'
import type { PaySession } from './lib/payment'
import { readSettings, saveApiKey, saveAppUrl } from './lib/store'
import { applyTheme, nextTheme, readTheme, saveTheme } from './lib/theme'
import type { Theme } from './lib/theme'

/** StrictMode 会重跑 effect，而一次性 code 只能用一次。 */
let codeHandled = false

/** 渲染前先上一次主题，避免深色用户进来看见一闪的白底。 */
applyTheme(readTheme())

export default function App() {
  const [settings, setSettings] = useState(readSettings)
  const [models, setModels] = useState<Model[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [initial] = useState<Thread[]>(() => {
    const saved = loadThreads()
    return saved.length ? saved : [newThread()]
  })
  const [threads, setThreads] = useState<Thread[]>(initial)
  const [currentId, setCurrentId] = useState(initial[0].id)
  const [capId, setCapId] = useState(capabilities[0].id)
  const [modelId, setModelId] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [media, setMedia] = useState<Record<string, string[]>>({})
  const [mediaNote, setMediaNote] = useState('')
  const [running, setRunning] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [recharge, setRecharge] = useState<{ paid: boolean; note: string } | null>(null)
  const [theme, setTheme] = useState<Theme>(readTheme)

  const abort = useRef<AbortController | null>(null)
  const timers = useRef(new Map<string, number>())
  const resumed = useRef(false)
  const poll = useRef<number | null>(null)
  const session = useRef<PaySession | null>(null)

  const cap = findCapability(capId)
  const pool = useMemo(() => modelsFor(models, cap.protocol, cap.modelIds), [models, cap])
  const thread = threads.find((t) => t.id === currentId) ?? threads[0]

  useEffect(() => {
    if (!threads.some((t) => t.id === currentId)) setCurrentId(threads[0]?.id ?? '')
  }, [threads, currentId])

  useEffect(() => {
    listModels().then(setModels).catch((e) => console.error('模型目录拉不下来', e))
  }, [])

  useEffect(() => {
    setModelId(pool[0]?.id ?? '')
    setValues(Object.fromEntries(cap.fields.filter((f) => f.kind !== 'media').slice(1).map((f) => [f.name, f.default ?? ''])))
    setMedia({})
    setMediaNote('')
  }, [cap, pool])

  useEffect(() => saveThreads(threads), [threads])

  useEffect(() => {
    applyTheme(theme)
    saveTheme(theme)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const refreshBalance = useCallback((key: string) => {
    if (!key) return setBalance(null)
    getBalance(key)
      .then(setBalance)
      .catch(() => setBalance(null))
  }, [])

  useEffect(() => {
    refreshBalance(settings.apiKey)
  }, [settings.apiKey, refreshBalance])

  useEffect(() => {
    const code = codeFromLocation()
    if (!code || codeHandled) return
    codeHandled = true
    exchangeCode(code)
      .then((key) => {
        saveApiKey(key, false)
        setSettings(readSettings())
        clearCodeFromUrl()
      })
      .catch((e) => console.error('授权交换失败', e))
  }, [])

  function stopPolling() {
    if (poll.current !== null) window.clearInterval(poll.current)
    poll.current = null
  }

  useEffect(() => stopPolling, [])

  function patchMessage(msgId: string, patch: Partial<Msg>) {
    setThreads((ts) =>
      ts.map((t) => ({
        ...t,
        messages: t.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
      })),
    )
  }

  /** 流式追加必须走函数式更新，闭包里的 threads 在这一轮里是旧的。 */
  function appendDelta(msgId: string, chunk: string) {
    setThreads((ts) =>
      ts.map((t) => ({
        ...t,
        messages: t.messages.map((m) => (m.id === msgId ? { ...m, text: m.text + chunk } : m)),
      })),
    )
  }

  function append(msgs: Msg[]) {
    setThreads((ts) =>
      ts.map((t) =>
        t.id === thread.id
          ? {
              ...t,
              title: t.messages.length === 0 ? msgs[0].text.slice(0, 24) : t.title,
              messages: [...t.messages, ...msgs],
            }
          : t,
      ),
    )
  }

  async function pickFiles(field: string, files: File[]) {
    setMediaNote('')
    try {
      const urls: string[] = []
      for (const f of files) {
        if (isVideo(f)) {
          setMediaNote(`正在从 ${f.name} 抽帧，原视频不会离开这台机器`)
          urls.push(...(await extractFrames(f, 8)))
        } else {
          urls.push(await fileToDataUrl(f))
        }
      }
      setMedia((m) => ({ ...m, [field]: [...(m[field] ?? []), ...urls] }))
      setMediaNote('')
    } catch (e) {
      setMediaNote((e as Error).message)
    }
  }

  function applyPreset(p: Preset) {
    setCapId(p.capId)
    setDraft(p.prompt)
  }

  function stopWatch(msgId: string) {
    const at = timers.current.get(msgId)
    if (at !== undefined) window.clearInterval(at)
    timers.current.delete(msgId)
  }

  useEffect(() => {
    const active = timers.current
    return () => active.forEach((id) => window.clearInterval(id))
  }, [])

  /** 异步任务：每 5 秒查一次，连续 5 次查不到才放弃；期间可以照常发别的需求。 */
  function watch(taskCapId: string, taskId: string, msgId: string, key: string, before: number | null) {
    if (timers.current.has(msgId)) return
    const c = findCapability(taskCapId)
    const poll = c.poll
    if (!poll) return
    let fails = 0
    const tick = async () => {
      try {
        const r = await poll(key, taskId)
        fails = 0
        if (!r.done) return
        stopWatch(msgId)
        if (r.error) {
          patchMessage(msgId, { error: r.error, running: false, pending: undefined })
          return
        }
        const out = r.output
        if (out?.video) {
          const storedKey = uid()
          try {
            const blob = await (await fetch(out.video.url)).blob()
            await saveBlob(storedKey, blob)
            out.video.storedKey = storedKey
          } catch {
            // 存不下来就只给那条 24 小时的链接，不阻塞结果展示
          }
        }
        let spent = '待结算'
        if (before !== null) {
          const after = await balanceAfterCall(key, before)
          setBalance(after.balance)
          spent = after.spent === null ? '待结算' : `-${formatYuan(after.spent)} 元`
        }
        patchMessage(msgId, {
          text: out?.text ?? '',
          images: out?.images,
          video: out?.video,
          spent,
          running: false,
          pending: undefined,
        })
      } catch (e) {
        fails += 1
        if (fails >= 5) {
          stopWatch(msgId)
          patchMessage(msgId, {
            error: `连续 5 次查不到任务状态：${(e as Error).message}`,
            running: false,
            pending: undefined,
          })
        }
      }
    }
    timers.current.set(msgId, window.setInterval(() => void tick(), 5000))
    void tick()
  }

  /** 刷新页面后接着轮询没跑完的任务。 */
  useEffect(() => {
    if (resumed.current || !settings.apiKey) return
    resumed.current = true
    for (const t of threads) {
      for (const m of t.messages) {
        if (m.pending && !m.error) watch(m.pending.capId, m.pending.taskId, m.id, settings.apiKey, null)
      }
    }
  }, [settings.apiKey, threads])

  async function send(text: string) {
    if (!settings.apiKey || !modelId) return
    const answerId = uid()
    const history = thread.messages.map((m) => ({ role: m.role, text: m.text }))
    const attachments = Object.values(media).flat()
    append([
      { id: uid(), role: 'user', capId, model: modelId, text, spent: null, error: null, at: Date.now(), attachments },
      { id: answerId, role: 'assistant', capId, model: modelId, text: '', spent: null, error: null, at: Date.now(), running: true },
    ])

    const before = balance?.balance ?? null
    setRunning(true)
    abort.current = new AbortController()
    const primary = cap.fields[0]

    const input: RunInput = {
      model: modelId,
      values: { ...values, [primary.name]: text },
      media,
      key: settings.apiKey,
      appUrl: settings.appUrl,
      signal: abort.current.signal,
      history,
      onDelta: (t) => appendDelta(answerId, t),
    }

    try {
      if (cap.submit) {
        const taskId = await cap.submit(input)
        patchMessage(answerId, { pending: { taskId, capId } })
        watch(capId, taskId, answerId, settings.apiKey, before)
        return
      }
      if (!cap.run) throw new Error(`${cap.label} 还没实现运行`)
      const r = await cap.run(input)
      let spent: string | null = null
      if (before !== null) {
        const after = await balanceAfterCall(settings.apiKey, before)
        setBalance(after.balance)
        spent = after.spent === null ? '待结算' : `-${formatYuan(after.spent)} 元`
      }
      patchMessage(answerId, {
        text: r.text ?? '',
        images: r.images,
        audio: r.audio ? { ...r.audio, live: true } : undefined,
        links: r.links,
        vector: r.vector,
        spent,
        running: false,
      })
    } catch (e) {
      const ge = e as GatewayError
      const isGateway = ge instanceof GatewayError
      const text2 = isGateway ? `${ge.code}（HTTP ${ge.status}）：${ge.message}` : (e as Error).message
      const recovery = isGateway ? ge.recovery : null
      patchMessage(answerId, {
        error: recovery === 'reauthorize_api_key' ? `${text2}｜Key 已失效，重新连接一次` : text2,
        running: false,
      })
      if (recovery === 'top_up_balance') setRecharge({ paid: false, note: '余额不足，先充值' })
      if (recovery === 'reauthorize_api_key') setSettingsOpen(true)
    } finally {
      setRunning(false)
      abort.current = null
    }
  }

  async function onRechargeCreate(amount: number): Promise<string> {
    const s = await createSession(settings.apiKey, amount)
    session.current = s
    setRecharge({ paid: false, note: '等待支付…' })
    stopPolling()
    poll.current = window.setInterval(async () => {
      if (!session.current) return
      try {
        const fresh = await fetchSession(settings.apiKey, session.current)
        session.current = fresh
        if (fresh.status === 'paid') {
          stopPolling()
          setRecharge({ paid: true, note: '已到账' })
          refreshBalance(settings.apiKey)
        } else {
          setRecharge({ paid: false, note: `当前状态 ${fresh.status}` })
        }
      } catch (e) {
        stopPolling()
        setRecharge({ paid: false, note: `查询失败：${(e as Error).message}` })
      }
    }, 3000)
    return s.payment_url
  }

  return (
    <div className="flex h-full">
      <Sidebar
        threads={threads}
        currentId={thread?.id ?? ''}
        balance={balance}
        apiKey={settings.apiKey}
        theme={theme}
        onCycleTheme={() => setTheme((t) => nextTheme(t))}
        onNew={() => {
          const t = newThread()
          setThreads((prev) => [t, ...prev])
          setCurrentId(t.id)
        }}
        onPick={setCurrentId}
        onDelete={(id) => setThreads((prev) => prev.filter((t) => t.id !== id))}
        onConnect={() => beginAuthorization(settings.appUrl)}
        onSettings={() => setSettingsOpen(true)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <MessageList
          messages={thread?.messages ?? []}
          caps={capabilities}
          onPick={(id, example) => {
            setCapId(id)
            if (example) setValues((v) => ({ ...v, [findCapability(id).fields[0].name]: example }))
          }}
        />
        <Composer
          cap={cap}
          caps={capabilities}
          models={pool}
          model={modelId}
          modelLabel={pool.find((m) => m.id === modelId)?.name ?? modelId}
          values={values}
          running={running}
          ready={!!settings.apiKey && !!modelId}
          draft={draft}
          media={media}
          mediaNote={mediaNote}
          presets={presets}
          onCap={setCapId}
          onModel={setModelId}
          onValue={(name, v) => setValues((s) => ({ ...s, [name]: v }))}
          onDraft={setDraft}
          onPreset={applyPreset}
          onPickFiles={pickFiles}
          onClearMedia={(field) => setMedia((m) => ({ ...m, [field]: [] }))}
          onSend={send}
          onStop={() => abort.current?.abort()}
        />
      </main>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 grid place-items-center bg-scrim/60 p-4 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={tPop}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-card border border-line bg-surface shadow-pop"
            >
              <SettingsDrawer
                appUrl={settings.appUrl}
                hasKey={!!settings.apiKey}
                keyTail={settings.apiKey.slice(-4)}
                onSaveAppUrl={(v) => {
                  saveAppUrl(v)
                  setSettings(readSettings())
                }}
                onPasteKey={async (k) => {
                  saveApiKey(k, false)
                  setSettings(readSettings())
                  setSettingsOpen(false)
                }}
                onDisconnect={() => {
                  saveApiKey('', false)
                  setSettings(readSettings())
                  setSettingsOpen(false)
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recharge && (
          <Recharge
            paid={recharge.paid}
            statusNote={recharge.note}
            onCreate={onRechargeCreate}
            onClose={() => {
              stopPolling()
              setRecharge(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
