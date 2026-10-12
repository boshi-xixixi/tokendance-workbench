import type { Transition, Variants } from 'motion/react'

/**
 * 全站只用这三条曲线：入场 ease-out（快进缓停）、退场 ease-in（缓启快出）、按压回弹。
 * 时长上限 450ms，超过就开始显得拖沓。
 */
const EASE_ENTER: [number, number, number, number] = [0.16, 1, 0.3, 1]
const EASE_SPRING_SOFT: [number, number, number, number] = [0.34, 1.4, 0.64, 1]

export const tBase: Transition = { duration: 0.22, ease: EASE_ENTER }
export const tSlow: Transition = { duration: 0.45, ease: EASE_ENTER }
export const tPop: Transition = { duration: 0.36, ease: EASE_SPRING_SOFT }

export const vRoot: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } },
}

export const vRise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: tSlow },
}

export const vPress = { scale: 0.975 }
