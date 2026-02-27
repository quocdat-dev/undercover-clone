const STORAGE_KEY = 'sound_enabled'

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, String(enabled))
}

const audioCache = new Map<string, HTMLAudioElement>()

function getAudio(src: string): HTMLAudioElement {
  let audio = audioCache.get(src)
  if (!audio) {
    audio = new Audio(src)
    audioCache.set(src, audio)
  }
  return audio
}

export function playSound(name: 'card_flip' | 'eliminate' | 'game_end' | 'boomerang'): void {
  if (!isSoundEnabled()) return

  const soundMap: Record<string, string> = {
    card_flip: '/sounds/card-flip.mp3',
    eliminate: '/sounds/eliminate.mp3',
    game_end: '/sounds/game-end.mp3',
    boomerang: '/sounds/boomerang.mp3',
  }

  const src = soundMap[name]
  if (!src) return

  try {
    const audio = getAudio(src)
    audio.currentTime = 0
    audio.volume = 0.5
    audio.play().catch(() => {
      // Silently fail — browser may block autoplay
    })
  } catch {
    // Silently fail
  }
}
