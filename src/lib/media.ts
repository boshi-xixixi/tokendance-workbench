export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error(`读不了 ${file.name}`))
    fr.readAsDataURL(file)
  })
}

function seekTo(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const on = () => {
      v.removeEventListener('seeked', on)
      resolve()
    }
    v.addEventListener('seeked', on)
    v.currentTime = t
  })
}

/**
 * 在浏览器里把视频抽成若干帧，不需要后端也不需要上传原始视频。
 * 时长未知（部分 webm）时无法定位，直接报错而不是乱抽。
 */
export async function extractFrames(file: File, count = 8, maxWidth = 768): Promise<string[]> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('这个视频浏览器读不了，换成 mp4 试试'))
    })
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error('拿不到视频时长，无法定位抽帧点')
    }
    const frames: string[] = []
    const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth))
    for (let i = 0; i < count; i++) {
      await seekTo(video, (video.duration * (i + 0.5)) / count)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round((video.videoWidth || maxWidth) * scale)
      canvas.height = Math.round((video.videoHeight || maxWidth) * scale)
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      frames.push(canvas.toDataURL('image/jpeg', 0.72))
    }
    return frames
  } finally {
    video.src = ''
    URL.revokeObjectURL(url)
  }
}

export function isVideo(file: File): boolean {
  return file.type.startsWith('video/')
}
