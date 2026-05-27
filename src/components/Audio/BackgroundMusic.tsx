import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'futbattles-music-muted'
const MUSIC_SRC = '/music/bg.mp3'
const MUSIC_VOLUME = 0.32

function readMutedPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeMutedPreference(muted: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(readMutedPreference)
  const [playing, setPlaying] = useState(false)
  const [needsGesture, setNeedsGesture] = useState(true)

  useEffect(() => {
    const audio = new Audio(MUSIC_SRC)
    audio.loop = true
    audio.volume = MUSIC_VOLUME
    audio.preload = 'auto'
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [])

  const tryPlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || muted) return

    try {
      await audio.play()
      setPlaying(true)
      setNeedsGesture(false)
    } catch {
      setPlaying(false)
      setNeedsGesture(true)
    }
  }, [muted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (muted) {
      audio.pause()
      setPlaying(false)
      return
    }

    void tryPlay()
  }, [muted, tryPlay])

  useEffect(() => {
    if (muted || playing) return

    const unlock = () => { void tryPlay() }

    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [muted, playing, tryPlay])

  function toggleMute() {
    const next = !muted
    setMuted(next)
    writeMutedPreference(next)

    if (!next) {
      void tryPlay()
    }
  }

  return (
    <button
      type="button"
      className="bg-music-toggle"
      onClick={toggleMute}
      aria-label={muted ? 'Turn music on' : 'Turn music off'}
      title={muted ? 'Music off' : 'Music on'}
    >
      <span className="bg-music-toggle__icon" aria-hidden>
        {muted ? '🔇' : playing ? '🔊' : '🔈'}
      </span>
      {!muted && needsGesture && !playing && (
        <span className="bg-music-toggle__hint">Tap to play</span>
      )}
    </button>
  )
}
