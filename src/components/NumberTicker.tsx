import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion/react'

/** 数字滚动，只用于余额和单次消耗这类会被反复刷新的金额。 */
export default function NumberTicker({
  value,
  prefix = '',
  decimals = 4,
  className = '',
}: {
  value: number
  prefix?: string
  decimals?: number
  className?: string
}) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    const controls = animate(from.current, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(v),
      onComplete: () => {
        from.current = value
      },
    })
    return () => controls.stop()
  }, [value])

  return (
    <span className={`num ${className}`}>
      {prefix}
      {shown.toFixed(decimals)}
    </span>
  )
}
