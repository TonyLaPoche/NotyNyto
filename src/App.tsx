import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Theme } from './domain/entities/track'
import { FEATURED_TRACK } from './domain/entities/track'
import { getThemeDescription } from './application/usecases/getThemeDescription'
import { shareTrack } from './application/usecases/shareTrack'

const VISUALS = {
  hero: '/visual/bannerSuno.png',
  trackCover: '/visual/Double-Face.exe–Noty-v2.jpg',
  split: '/visual/splitFaceNytoNoty.jpg',
  landscape: '/visual/landscapeNytoNoty.jpg',
  portrait: '/visual/notyBackgroundWhite.png',
}

function App() {
  const [theme, setTheme] = useState<Theme>('noty')
  const [canInstall, setCanInstall] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [spectrum, setSpectrum] = useState<number[]>(() => Array.from({ length: 20 }, () => 0.08))
  const [audioEnergy, setAudioEnergy] = useState(0)
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef<number | null>(null)

  const appStyle = { '--audio-energy': audioEnergy.toFixed(3) } as CSSProperties

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      installPromptRef.current = event as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      void audioContextRef.current?.close()
    }
  }, [])

  const handleInstall = async () => {
    const promptEvent = installPromptRef.current as BeforeInstallPromptEvent
    await promptEvent.prompt()
    await promptEvent.userChoice
    installPromptRef.current = null
    setCanInstall(false)
  }

  const handlePlayPause = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      try {
        await audio.play()
      } catch {
        return
      }
      setIsPlaying(true)
      return
    }

    audio.pause()
    setIsPlaying(false)
  }

  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const nextValue = Math.min(Math.max(value, 0), duration)
    audio.currentTime = nextValue
    setCurrentTime(nextValue)
  }

  const setupAudioAnalysis = async () => {
    const audio = audioRef.current
    if (!audio || analyserRef.current) return

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8

    const source = audioContext.createMediaElementSource(audio)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
  }

  const startReactiveLoop = () => {
    const analyser = analyserRef.current
    if (!analyser) return

    const binCount = analyser.frequencyBinCount
    const data = new Uint8Array(binCount)
    const barCount = 20
    const binPerBar = Math.floor(binCount / barCount)

    const draw = () => {
      analyser.getByteFrequencyData(data)

      const nextSpectrum = Array.from({ length: barCount }, (_, index) => {
        const start = index * binPerBar
        const end = start + binPerBar
        let total = 0
        for (let i = start; i < end; i += 1) {
          total += data[i]
        }
        const average = total / Math.max(binPerBar, 1)
        return Math.max(average / 255, 0.06)
      })

      const bassEnergy = nextSpectrum.slice(0, 5).reduce((sum, value) => sum + value, 0) / 5
      setSpectrum(nextSpectrum)
      setAudioEnergy(bassEnergy)
      frameRef.current = requestAnimationFrame(draw)
    }

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }
    draw()
  }

  const stopReactiveLoop = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    setAudioEnergy(0)
    setSpectrum((previous) => previous.map(() => 0.08))
  }

  return (
    <main className={`app app--${theme} ${isPlaying ? 'app--reactive' : ''}`} style={appStyle}>
      <div className="reactive-backdrop" aria-hidden />
      <header className="hero" data-testid="hero">
        <img className="hero__background" src={VISUALS.hero} alt="" aria-hidden />
        <div className="hero__overlay" />
        <div className="hero__noise" aria-hidden />
        <div className="hero__orb hero__orb--a" aria-hidden />
        <div className="hero__orb hero__orb--b" aria-hidden />
        <div className="hero__content">
          <div className="hero__avatar">{FEATURED_TRACK.artist.slice(0, 2).toUpperCase()}</div>
          <div>
            <p className="label">Noty / Nyto universe</p>
            <h1>NotyNyto Offline Player</h1>
            <p className="subtitle">{getThemeDescription(theme)}</p>
            <a className="hero__link" href="https://suno.com/@noty2686" target="_blank" rel="noreferrer">
              Voir le profil Suno
            </a>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="panel__top">
          <img className="cover" src={VISUALS.trackCover} alt={`Pochette ${FEATURED_TRACK.title}`} />
          <div className="meta">
            <p className="label">Titre embarque</p>
            <h2>{FEATURED_TRACK.title}</h2>
            <p>{FEATURED_TRACK.artist}</p>
            <p className="genre">{FEATURED_TRACK.genre}</p>
          </div>
        </div>

        <div className={`player-shell ${isPlaying ? 'player-shell--playing' : ''}`}>
          <div className="player-shell__header">
            <button type="button" className="player-btn" onClick={handlePlayPause}>
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>
            <div className="visualizer visualizer--live" aria-hidden>
              {spectrum.map((value, index) => (
                <span key={`${index}-${Math.round(value * 1000)}`} style={{ '--bar-level': value } as CSSProperties} />
              ))}
            </div>
          </div>

          <input
            className="player-seek"
            type="range"
            min={0}
            max={duration || 1}
            value={currentTime}
            aria-label="Progression du morceau"
            onChange={(event) => handleSeek(Number(event.target.value))}
          />

          <div className="player-time">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <audio
          ref={audioRef}
          className="audio-element"
          preload="metadata"
          src={FEATURED_TRACK.audioUrl}
          aria-label="Lecteur audio principal"
          onPlay={() => setIsPlaying(true)}
          onPause={() => {
            setIsPlaying(false)
            stopReactiveLoop()
          }}
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration || 0)
          }}
          onTimeUpdate={(event) => {
            setCurrentTime(event.currentTarget.currentTime)
          }}
          onCanPlay={async () => {
            await setupAudioAnalysis()
          }}
          onPlaying={async () => {
            await audioContextRef.current?.resume()
            startReactiveLoop()
          }}
          onEnded={() => {
            setIsPlaying(false)
            setCurrentTime(0)
            stopReactiveLoop()
          }}
        />

        <div className="actions">
          <button type="button" className="btn btn--primary" onClick={() => shareTrack(FEATURED_TRACK)}>
            Partager
          </button>
          {canInstall && (
            <button type="button" className="btn" onClick={handleInstall}>
              Installer l'app
            </button>
          )}
        </div>

        <div className="switches">
          <button
            type="button"
            className={`chip ${theme === 'noty' ? 'chip--active' : ''}`}
            onClick={() => setTheme('noty')}
          >
            Theme Noty
          </button>
          <button
            type="button"
            className={`chip ${theme === 'nyto' ? 'chip--active' : ''}`}
            onClick={() => setTheme('nyto')}
          >
            Theme Nyto
          </button>
        </div>
      </section>

      <section className="visual-grid" aria-label="Univers visuel Noty Nyto">
        <img className="visual visual--wide" src={VISUALS.landscape} alt="Univers cyberpunk Noty et Nyto" />
        <img className="visual visual--tall" src={VISUALS.portrait} alt="Portrait Noty" />
        <img className="visual visual--wide" src={VISUALS.split} alt="Visuel split face Nyto Noty" />
      </section>
    </main>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default App
