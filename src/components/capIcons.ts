import { AudioLines, Eye, Image as ImageIcon, MessageSquare, ScanLine, Search, Sparkles, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const CAP_ICONS: Record<string, LucideIcon> = {
  chat: MessageSquare,
  image: ImageIcon,
  video: Video,
  audio: AudioLines,
  search: Search,
  embed: ScanLine,
  vision: Eye,
  sparkles: Sparkles,
}

export function capIcon(name: string): LucideIcon {
  return CAP_ICONS[name] ?? Sparkles
}
