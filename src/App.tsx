import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Theme } from './domain/entities/track'
import { FEATURED_TRACK, TOP_TRACKS } from './domain/entities/track'
import { getThemeDescription } from './application/usecases/getThemeDescription'
import { shareTrack } from './application/usecases/shareTrack'

const VISUALS = {
  hero: '/visual/bannerSuno.png',
  trackCover: '/visual/Double-Face.exe–Noty-v2.jpg',
  split: '/visual/splitFaceNytoNoty.jpg',
  landscape: '/visual/landscapeNytoNoty.jpg',
  portrait: '/visual/notyBackgroundWhite.png',
}

const SHORT_BIO =
  "Noty/Nyto, c'est une dualite HyperPop Cyberpunk: entre douceur glitch, colere froide et exutoire digital. La musique raconte la survie, l'identite et la rupture des masques."

type Page = 'home' | 'songs' | 'gallery'
type RepeatMode = 'off' | 'all' | 'one'

function App() {
  const [page, setPage] = useState<Page>('home')
  const [theme, setTheme] = useState<Theme>('noty')
  const [canInstall, setCanInstall] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [spectrum, setSpectrum] = useState<number[]>(() => Array.from({ length: 20 }, () => 0.08))
  const [audioEnergy, setAudioEnergy] = useState(0)
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false)
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef<number | null>(null)
  const shouldAutoplayRef = useRef(false)
  const [activeTrackId, setActiveTrackId] = useState(FEATURED_TRACK.id)

  /* c8 ignore next -- garde defensive si un id devient invalide */
  const activeTrack = TOP_TRACKS.find((track) => track.id === activeTrackId) ?? FEATURED_TRACK

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
    const resolvePageFromHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === '/songs') {
        setPage('songs')
        return
      }
      if (hash === '/gallery') {
        setPage('gallery')
        return
      }
      setPage('home')
    }

    resolvePageFromHash()
    window.addEventListener('hashchange', resolvePageFromHash)

    return () => {
      window.removeEventListener('hashchange', resolvePageFromHash)
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

  useEffect(() => {
    const audio = audioRef.current
    /* c8 ignore next -- element audio toujours present apres montage */
    if (!audio) return
    audio.volume = volume
  }, [volume])

  useEffect(() => {
    if (!shouldAutoplayRef.current) return

    const audio = audioRef.current
    /* c8 ignore next -- element audio toujours present apres montage */
    if (!audio) return
    shouldAutoplayRef.current = false

    const tryPlay = async () => {
      try {
        await audio.play()
      } catch {
        /* c8 ignore next -- fallback securite si autoplay bloque */
        setIsPlaying(false)
      }
    }

    void tryPlay()
  }, [activeTrackId])

  const handleInstall = async () => {
    const promptEvent = installPromptRef.current as BeforeInstallPromptEvent
    await promptEvent.prompt()
    await promptEvent.userChoice
    installPromptRef.current = null
    setCanInstall(false)
  }

  const handlePlayPause = async () => {
    const audio = audioRef.current
    /* c8 ignore next -- element audio toujours present apres montage */
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

  const setTrackByIndex = (nextIndex: number, shouldAutoplay = false) => {
    /* c8 ignore next -- la liste est statique et non vide */
    if (!TOP_TRACKS.length) return

    const normalizedIndex = ((nextIndex % TOP_TRACKS.length) + TOP_TRACKS.length) % TOP_TRACKS.length
    const targetTrack = TOP_TRACKS[normalizedIndex]
    shouldAutoplayRef.current = shouldAutoplay
    setActiveTrackId(targetTrack.id)
    setCurrentTime(0)
    setDuration(0)
    setIsLyricsExpanded(false)
  }

  const getCurrentTrackIndex = () => {
    const index = TOP_TRACKS.findIndex((track) => track.id === activeTrack.id)
    /* c8 ignore next -- fallback defensif */
    return index < 0 ? 0 : index
  }

  const goToNextTrack = (shouldAutoplay = isPlaying) => {
    setTrackByIndex(getCurrentTrackIndex() + 1, shouldAutoplay)
  }

  const goToPreviousTrack = (shouldAutoplay = isPlaying) => {
    setTrackByIndex(getCurrentTrackIndex() - 1, shouldAutoplay)
  }

  const cycleRepeatMode = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all'
      if (prev === 'all') return 'one'
      return 'off'
    })
  }

  const setupAudioAnalysis = async () => {
    const audio = audioRef.current
    /* c8 ignore next -- garde defensive */
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
    /* c8 ignore next -- garde defensive */
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

  const downloadName = `${activeTrack.title.replace(/[^\w.-]+/g, '_')}.mp3`

  return (
    <main className={`app app--${theme} ${isPlaying ? 'app--reactive' : ''}`} style={appStyle}>
      <div className="reactive-backdrop" aria-hidden />
      <nav className="site-nav" aria-label="Navigation principale">
        <a href="#/" className={`nav-link ${page === 'home' ? 'nav-link--active' : ''}`}>
          Accueil
        </a>
        <a href="#/songs" className={`nav-link ${page === 'songs' ? 'nav-link--active' : ''}`}>
          Sons
        </a>
        <a href="#/gallery" className={`nav-link ${page === 'gallery' ? 'nav-link--active' : ''}`}>
          Galerie DA
        </a>
      </nav>
      <div className="theme-toggle" role="group" aria-label="Choix du theme">
        <button
          type="button"
          className={`chip ${theme === 'noty' ? 'chip--active' : ''}`}
          onClick={() => setTheme('noty')}
        >
          Noty
        </button>
        <button
          type="button"
          className={`chip ${theme === 'nyto' ? 'chip--active' : ''}`}
          onClick={() => setTheme('nyto')}
        >
          Nyto
        </button>
      </div>
      <header className="hero" data-testid="hero">
        <img className="hero__background" src={VISUALS.hero} alt="" aria-hidden />
        <div className="hero__overlay" />
        <div className="hero__noise" aria-hidden />
        <div className="hero__orb hero__orb--a" aria-hidden />
        <div className="hero__orb hero__orb--b" aria-hidden />
        <div className="hero__content">
          <div className="hero__text">
            <p className="label">Noty / Nyto universe</p>
            <h1>NotyNyto Offline Player</h1>
            <p className="subtitle">{getThemeDescription(theme)}</p>
            <p className="hero__description">
              HyperPop cyberpunk, darkcore et frenchcore emotionnel. Un projet narratif ou chaque track est une
              transmission brute entre Noty et Nyto.
            </p>
            <a className="hero__link" href="https://suno.com/@noty2686" target="_blank" rel="noreferrer">
              Voir le profil Suno
            </a>
          </div>
          <div className="hero__now-playing" aria-label="Morceau mis en avant">
            <span>Now playing</span>
            <strong>{activeTrack.title}</strong>
            <small>{activeTrack.artist}</small>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="panel__top">
          <img
            className="cover"
            src={activeTrack.coverUrl}
            alt={`Pochette ${activeTrack.title}`}
          />
          <div className="meta">
            <p className="label">Titre embarque</p>
            <h2>{activeTrack.title}</h2>
            <p>{activeTrack.artist}</p>
            <p className="genre">{activeTrack.genre}</p>
          </div>
        </div>

        <div className={`player-shell ${isPlaying ? 'player-shell--playing' : ''}`}>
          <div className="player-shell__header">
            <div className="transport">
              <button type="button" className="transport-btn" onClick={() => goToPreviousTrack()}>
                PREV
              </button>
              <button type="button" className="player-btn" onClick={handlePlayPause}>
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
              <button type="button" className="transport-btn" onClick={() => goToNextTrack()}>
                NEXT
              </button>
              <button
                type="button"
                className={`repeat-btn ${repeatMode !== 'off' ? 'repeat-btn--active' : ''}`}
                onClick={cycleRepeatMode}
              >
                {repeatMode === 'off' ? 'REP OFF' : repeatMode === 'all' ? 'REP ALL' : 'REP 1'}
              </button>
            </div>
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

          <div className="volume-control">
            <label htmlFor="volume-range">Volume</label>
            <input
              id="volume-range"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label="Volume"
            />
            <span>{Math.round(volume * 100)}%</span>
          </div>
        </div>

        <audio
          ref={audioRef}
          className="audio-element"
          preload="metadata"
          src={activeTrack.audioUrl}
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
            if (repeatMode === 'one') {
              const audio = audioRef.current
              /* c8 ignore next -- garde defensive */
              if (audio) {
                audio.currentTime = 0
                void audio.play()
              }
              return
            }

            if (repeatMode === 'all') {
              goToNextTrack(true)
              return
            }

            setIsPlaying(false)
            setCurrentTime(0)
            stopReactiveLoop()
          }}
        />

        <div className="actions">
          <button type="button" className="btn btn--primary" onClick={() => shareTrack(activeTrack)}>
            Partager
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => setIsDownloadModalOpen(true)}>
            Telecharger MP3
          </button>
          {canInstall && (
            <button type="button" className="btn" onClick={handleInstall}>
              Installer l'app
            </button>
          )}
        </div>

        <button
          type="button"
          className="lyrics-toggle"
          aria-expanded={isLyricsExpanded}
          aria-controls="lyrics-accordion"
          onClick={() => setIsLyricsExpanded((previous) => !previous)}
        >
          {isLyricsExpanded ? 'Masquer les lyrics' : 'Voir les lyrics'}
        </button>

        <section
          id="lyrics-accordion"
          className={`lyrics-accordion ${isLyricsExpanded ? 'lyrics-accordion--open' : ''}`}
          aria-label="Lyrics du son en cours"
          aria-hidden={!isLyricsExpanded}
        >
          <div className="lyrics-panel">
            <h3 className="lyrics-title">Lyrics</h3>
            <pre className="lyrics-content">{activeTrack.lyrics}</pre>
          </div>
        </section>
      </section>

      {page === 'home' && (
        <>
          <section className="home-about" aria-label="Presentation musicale Noty et Nyto">
            <div className="home-about__bio">
              <p className="home-about__kicker">Manifeste Sonore</p>
              <h3 className="section-title">Presentation musicale</h3>
              <p className="section-subtitle">{SHORT_BIO}</p>
              <div className="home-about__tags">
                <span>HyperPop</span>
                <span>Darkcore</span>
                <span>Frenchcore</span>
                <span>Cyberpunk</span>
              </div>
              <p className="home-about__note">
                Melange de darkcore, frenchcore, hyperpop et synthwave nerveuse. Chaque track est pense comme un
                chapitre d'un journal sonore.
              </p>
              <blockquote className="home-about__quote">
                "Noty c'est le masque. Nyto c'est l'echo. Au milieu, la verite qui fuit."
              </blockquote>
            </div>
            <div className="home-about__highlights">
              <h4>A ecouter maintenant</h4>
              <ul>
                {TOP_TRACKS.slice(0, 3).map((track) => (
                  <li key={`home-highlight-${track.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setPage('songs')
                        window.location.hash = '/songs'
                        setTrackByIndex(TOP_TRACKS.findIndex((item) => item.id === track.id), false)
                      }}
                    >
                      <span>{track.title}</span>
                      <small>{track.artist}</small>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="home-about__stats" aria-label="Statistiques musicales">
                <div>
                  <strong>{TOP_TRACKS.length}</strong>
                  <span>tracks</span>
                </div>
                <div>
                  <strong>2</strong>
                  <span>alter ego</span>
                </div>
                <div>
                  <strong>1</strong>
                  <span>univers</span>
                </div>
              </div>
            </div>
          </section>

          <section className="visual-grid" aria-label="Univers visuel Noty Nyto">
            <img className="visual visual--wide" src={VISUALS.landscape} alt="Univers cyberpunk Noty et Nyto" />
            <img className="visual visual--tall" src={VISUALS.portrait} alt="Portrait Noty" />
            <img className="visual visual--wide" src={VISUALS.split} alt="Visuel split face Nyto Noty" />
          </section>
        </>
      )}

      {page === 'songs' && (
        <section className="songs-page" aria-label="Top songs Noty Nyto">
          <h3 className="section-title">Top 10 songs</h3>
          <p className="section-subtitle">
            Tous tes tracks locaux sont relies au player. Clique un son dans la liste pour le charger.
          </p>
          <div className="songs-list">
            {TOP_TRACKS.map((track) => (
              <button
                key={track.id}
                type="button"
                className={`song-row ${track.id === activeTrack.id ? 'song-row--active' : ''}`}
                onClick={() => {
                  audioRef.current?.pause()
                  setTrackByIndex(TOP_TRACKS.findIndex((item) => item.id === track.id), false)
                  setIsPlaying(false)
                  setCurrentTime(0)
                  stopReactiveLoop()
                }}
              >
                <span className="song-rank">#{track.rank}</span>
                <span className="song-title">{track.title}</span>
                <span className="song-artist">{track.artist}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {page === 'gallery' && (
        <section className="gallery-page" aria-label="Galerie complete DA Noty et Nyto">
          <h3 className="section-title">Galerie DA Noty x Nyto</h3>
          <div className="gallery-grid">
            <img className="visual" src={VISUALS.hero} alt="Banner Suno Noty Nyto" />
            <img className="visual" src={VISUALS.trackCover} alt="Cover Double Face.exe" />
            <img className="visual" src={VISUALS.landscape} alt="Landscape cyberpunk Noty Nyto" />
            <img className="visual" src={VISUALS.split} alt="Split face Nyto Noty" />
            <img className="visual" src={VISUALS.portrait} alt="Portrait Noty fond blanc" />
          </div>
        </section>
      )}

      {isDownloadModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsDownloadModalOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Conditions de telechargement"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="modal-title">Telechargement gratuit</h3>
            <p className="modal-text">
              Les musiques sont fournies a titre gratuit. Si tu veux soutenir l&apos;artiste, suis-moi sur Instagram,
              YouTube et Suno.
            </p>
            <p className="modal-text modal-text--warning">
              Les sons sont proteges par la licence Suno. Toute exploitation commerciale est interdite et peut
              entrainer des poursuites.
            </p>

            <div className="modal-links">
              <a href="https://suno.com/@noty2686" target="_blank" rel="noreferrer">
                Suno
              </a>
              <a href="https://instagram.com/" target="_blank" rel="noreferrer">
                Instagram
              </a>
              <a href="https://youtube.com/" target="_blank" rel="noreferrer">
                YouTube
              </a>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setIsDownloadModalOpen(false)}>
                Fermer
              </button>
              <a
                className="btn btn--primary"
                href={activeTrack.audioUrl}
                download={downloadName}
                onClick={() => setIsDownloadModalOpen(false)}
              >
                Telecharger quand meme
              </a>
            </div>
          </section>
        </div>
      )}
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
