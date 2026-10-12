import { useState } from 'react'
import { motion } from 'motion/react'
import { Loader2, QrCode, X } from 'lucide-react'
import { tPop } from '../lib/motion'

export default function Recharge({
  paid,
  statusNote,
  onCreate,
  onClose,
}: {
  paid: boolean
  statusNote: string
  onCreate: (amount: number) => Promise<string>
  onClose: () => void
}) {
  const [amount, setAmount] = useState('10')
  const [qr, setQr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pay() {
    const value = Math.trunc(Number(amount))
    if (!Number.isFinite(value) || value < 1 || value > 100000) {
      setError('金额得是 1 到 100000 之间的整数')
      return
    }
    setBusy(true)
    setError('')
    try {
      const url = await onCreate(value)
      const { default: QRCode } = await import('qrcode')
      setQr(await QRCode.toDataURL(url, { margin: 1, width: 240 }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-20 grid place-items-center bg-scrim/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={tPop}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-pop"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">充值到词元跳动账户</h2>
          <button onClick={onClose} className="cursor-pointer text-faint transition-colors hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        {!qr ? (
          <>
            <label className="mt-5 mb-1.5 block text-xs font-medium text-faint">金额（元，整数）</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className="field" />
            {error && <p className="mt-2 text-xs text-bad">{error}</p>}
            <button
              onClick={pay}
              disabled={busy}
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-deep py-2.5 text-sm font-medium text-on-brand transition-shadow duration-200 hover:shadow-pop disabled:opacity-45"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
              生成支付二维码
            </button>
            <p className="mt-3 text-xs leading-5 text-faint">
              充值进当前 Key 所属的账户。二维码是聚合码内容，电脑上微信或支付宝扫都行。
            </p>
          </>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-3">
            <img src={qr} alt="支付二维码" className="w-[240px] rounded-control border border-line p-2" />
            <p className={`flex items-center gap-1.5 text-xs ${paid ? 'text-ok' : 'text-muted'}`} role="status" aria-live="polite">
              {!paid && <span className="size-1.5 animate-pulse rounded-full bg-brand" />}
              {statusNote}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
