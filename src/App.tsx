import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ArtistCatalog, Track } from './domain/entities/track'
import { DEMO_ARTIST_HANDLE } from './domain/entities/track'
import {
  getArtistCatalog,
  listArtistCatalogs,
  removeArtistCatalog,
  saveArtistCatalog,
} from './application/usecases/artistLibrary'
import { fetchPublicArtistCatalog } from './application/usecases/fetchPublicArtistCatalog'
import {
  cacheTrackAudio,
  clearCachedAudio,
  getCachedAudioByteLength,
  listCachedTrackIds,
  resolvePlayableUrl,
} from './application/usecases/offlineAudioCache'
import { canDownloadForOffline, readBrowserNetworkQuality } from './application/usecases/networkGate'
import { shareTrack } from './application/usecases/shareTrack'

type Page = 'home' | 'library' | 'artist'
type RepeatMode = 'off' | 'all' | 'one'

function App() {
  const [page, setPage] = useState<Page>('home')
  const [query, setQuery] = useState('')
  const [library, setLibrary] = useState<ArtistCatalog[]>(() => listArtistCatalogs())
  const [activeCatalog, setActiveCatalog] = useState<ArtistCatalog | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.85)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [playableUrl, setPlayableUrl] = useState<string | null>(null)
  const [cachedIds, setCachedIds] = useState<string[]>([])
  const [cacheBytes, setCacheBytes] = useState(0)
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false)
  const [networkQuality, setNetworkQuality] = useState(() => readBrowserNetworkQuality())

  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const shouldAutoplayRef = useRef(false)

  const tracks = useMemo(() => activeCatalog?.tracks ?? [], [activeCatalog])
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0] ?? null
  const currentTrackIndex = activeTrack ? tracks.findIndex((track) => track.id === activeTrack.id) : -1

  const appStyle = useMemo(
    () => ({ '--play-progress': duration ? String(currentTime / duration) : '0' }) as CSSProperties,
    [currentTime, duration],
  )

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      installPromptRef.current = event as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  useEffect(() => {
    const resolvePageFromHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash.startsWith('/artist/')) {
        const handle = hash.replace('/artist/', '').split('/')[0]
        setPage('artist')
        const existing = getArtistCatalog(handle)
        if (existing) {
          setActiveCatalog(existing)
          setActiveTrackId((previous) => previous ?? existing.tracks[0]?.id ?? null)
        }
        return
      }
      if (hash === '/library') {
        setPage('library')
        return
      }
      setPage('home')
    }

    resolvePageFromHash()
    window.addEventListener('hashchange', resolvePageFromHash)
    return () => window.removeEventListener('hashchange', resolvePageFromHash)
  }, [])

  useEffect(() => {
    const refreshNetwork = () => {
      setNetworkQuality(readBrowserNetworkQuality())
    }
    window.addEventListener('online', refreshNetwork)
    window.addEventListener('offline', refreshNetwork)
    return () => {
      window.removeEventListener('online', refreshNetwork)
      window.removeEventListener('offline', refreshNetwork)
    }
  }, [])

  useEffect(() => {
    void refreshCacheState()
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
  }, [volume])

  /* c8 ignore start -- resolution async cache/stream */
  useEffect(() => {
    if (!activeTrack) return

    let cancelled = false
    void (async () => {
      const nextUrl = await resolvePlayableUrl(activeTrack.id, activeTrack.audioUrl)
      if (cancelled) {
        if (nextUrl.startsWith('blob:')) URL.revokeObjectURL(nextUrl)
        return
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      if (nextUrl.startsWith('blob:')) {
        objectUrlRef.current = nextUrl
      }
      setPlayableUrl(nextUrl)
      setCurrentTime(0)
      setDuration(activeTrack.duration || 0)
    })()

    return () => {
      cancelled = true
    }
  }, [activeTrack])
  /* c8 ignore end */

  useEffect(() => {
    if (!shouldAutoplayRef.current || !playableUrl) return
    const audio = audioRef.current
    if (!audio) return
    shouldAutoplayRef.current = false
    void audio.play().catch(() => setIsPlaying(false))
  }, [playableUrl, activeTrackId])

  useEffect(() => {
    const bootstrap = async () => {
      const existing = getArtistCatalog(DEMO_ARTIST_HANDLE)
      if (existing) {
        setLibrary(listArtistCatalogs())
        if (!activeCatalog) {
          setActiveCatalog(existing)
          setActiveTrackId(existing.tracks[0]?.id ?? null)
        }
        return
      }

      if (!navigator.onLine) {
        setError('Hors ligne: ajoute un artiste quand le reseau revient.')
        return
      }

      setIsLoading(true)
      try {
        const catalog = await fetchPublicArtistCatalog(DEMO_ARTIST_HANDLE)
        const nextLibrary = saveArtistCatalog(catalog)
        setLibrary(nextLibrary)
        setActiveCatalog(catalog)
        setActiveTrackId(catalog.tracks[0]?.id ?? null)
        setStatusMessage(`Demo chargee: @${catalog.artist.handle} (${catalog.tracks.length} sons publics)`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger la demo')
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* c8 ignore start -- Media Session API absente en tests */
  useEffect(() => {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined' || !activeTrack) return
    const audio = audioRef.current
    if (!audio) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeTrack.title,
      artist: activeTrack.artist,
      album: `@${activeTrack.handle}`,
      artwork: activeTrack.coverUrl
        ? [{ src: activeTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    })
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    navigator.mediaSession.setActionHandler('play', () => {
      void audio.play()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      audio.pause()
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (!tracks.length || currentTrackIndex < 0) return
      const nextIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length
      shouldAutoplayRef.current = true
      setActiveTrackId(tracks[nextIndex].id)
      setIsLyricsExpanded(false)
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (!tracks.length || currentTrackIndex < 0) return
      const nextIndex = (currentTrackIndex + 1) % tracks.length
      shouldAutoplayRef.current = true
      setActiveTrackId(tracks[nextIndex].id)
      setIsLyricsExpanded(false)
    })
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        const bounded = Math.min(Math.max(details.seekTime, 0), duration || 0)
        audio.currentTime = bounded
        setCurrentTime(bounded)
      }
    })
    if ('setPositionState' in navigator.mediaSession && duration > 0) {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(currentTime, duration),
      })
    }
  }, [activeTrack, isPlaying, currentTime, duration, tracks, currentTrackIndex])
  /* c8 ignore end */

  async function refreshCacheState() {
    const ids = await listCachedTrackIds()
    const bytes = await getCachedAudioByteLength()
    setCachedIds(ids)
    setCacheBytes(bytes)
  }

  async function handleScanArtist(rawInput: string) {
    setError(null)
    setStatusMessage(null)
    setIsLoading(true)
    try {
      const catalog = await fetchPublicArtistCatalog(rawInput)
      const nextLibrary = saveArtistCatalog(catalog)
      setLibrary(nextLibrary)
      setActiveCatalog(catalog)
      setActiveTrackId(catalog.tracks[0]?.id ?? null)
      setPage('artist')
      window.location.hash = `/artist/${catalog.artist.handle}`
      setStatusMessage(`${catalog.tracks.length} sons publics trouves pour @${catalog.artist.handle}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan impossible')
    } finally {
      setIsLoading(false)
    }
  }

  function openArtist(catalog: ArtistCatalog) {
    setActiveCatalog(catalog)
    setActiveTrackId(catalog.tracks[0]?.id ?? null)
    setPage('artist')
    window.location.hash = `/artist/${catalog.artist.handle}`
  }

  function deleteArtist(handle: string) {
    const next = removeArtistCatalog(handle)
    setLibrary(next)
    if (activeCatalog?.artist.handle === handle) {
      setActiveCatalog(next[0] ?? null)
      setActiveTrackId(next[0]?.tracks[0]?.id ?? null)
    }
  }

  const handleInstall = async () => {
    const promptEvent = installPromptRef.current
    if (!promptEvent) return
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
        setIsPlaying(true)
      } catch {
        return
      }
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

  const selectTrack = (track: Track, autoplay = false) => {
    shouldAutoplayRef.current = autoplay
    setActiveTrackId(track.id)
    setIsLyricsExpanded(false)
  }

  const goToRelativeTrack = (delta: number, autoplay = isPlaying) => {
    if (!tracks.length || currentTrackIndex < 0) return
    const nextIndex = (currentTrackIndex + delta + tracks.length) % tracks.length
    selectTrack(tracks[nextIndex], autoplay)
  }

  const cycleRepeatMode = () => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'))
  }

  const downloadTrack = async (track: Track) => {
    if (!canDownloadForOffline(networkQuality)) {
      setError('Reseau insuffisant pour telecharger. Passe en Wi-Fi ou 4G.')
      return
    }
    setStatusMessage(`Telechargement: ${track.title}`)
    try {
      await cacheTrackAudio(track.id, track.audioUrl)
      await refreshCacheState()
      setStatusMessage(`${track.title} disponible hors ligne`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Telechargement impossible')
    }
  }

  const downloadAll = async () => {
    if (!activeCatalog) return
    if (!canDownloadForOffline(networkQuality)) {
      setError('Reseau insuffisant pour tout telecharger.')
      return
    }
    setIsLoading(true)
    try {
      for (const track of activeCatalog.tracks) {
        if (cachedIds.includes(track.id)) continue
        await cacheTrackAudio(track.id, track.audioUrl)
      }
      await refreshCacheState()
      setStatusMessage(`Cache local pret pour @${activeCatalog.artist.handle}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Telechargement impossible')
    } finally {
      setIsLoading(false)
    }
  }

  const wipeCache = async () => {
    await clearCachedAudio()
    await refreshCacheState()
    setStatusMessage('Cache audio vide')
  }

  return (
    <main className={`app ${isPlaying ? 'app--playing' : ''}`} style={appStyle}>
      <div className="atmosphere" aria-hidden />

      <nav className="site-nav" aria-label="Navigation principale">
        <a
          href="#/"
          className={`nav-link ${page === 'home' ? 'nav-link--active' : ''}`}
          onClick={() => setPage('home')}
        >
          Accueil
        </a>
        <a
          href="#/library"
          className={`nav-link ${page === 'library' ? 'nav-link--active' : ''}`}
          onClick={() => setPage('library')}
        >
          Bibliotheque
        </a>
        {activeCatalog && (
          <a
            href={`#/artist/${activeCatalog.artist.handle}`}
            className={`nav-link ${page === 'artist' ? 'nav-link--active' : ''}`}
            onClick={() => setPage('artist')}
          >
            Artiste
          </a>
        )}
      </nav>

      <header className="hero">
        <p className="label">Suno Public Player</p>
        <h1>Lecteur multi-artistes</h1>
        <p className="subtitle">
          Scanne un profil public Suno, ecoute en stream, telecharge localement si le reseau le permet.
        </p>
        <p className="disclaimer">Sons publics uniquement · non affilie a Suno · usage personnel</p>

        <form
          className="search-bar"
          onSubmit={(event) => {
            event.preventDefault()
            void handleScanArtist(query)
          }}
        >
          <label htmlFor="artist-search" className="sr-only">
            Chercher un artiste Suno
          </label>
          <input
            id="artist-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="@handle ou https://suno.com/@artiste"
            aria-label="Chercher un artiste Suno"
          />
          <button type="submit" className="btn btn--primary" disabled={isLoading}>
            Scanner
          </button>
        </form>

        <div className="meta-row">
          <span className={`network-pill network-pill--${networkQuality}`}>Reseau: {networkQuality}</span>
          <span className="cache-pill">Cache: {formatBytes(cacheBytes)}</span>
          {canInstall && (
            <button type="button" className="btn" onClick={handleInstall}>
              Installer l&apos;app
            </button>
          )}
          <button type="button" className="btn" onClick={() => void wipeCache()}>
            Vider le cache
          </button>
        </div>

        {error && <p className="banner banner--error">{error}</p>}
        {statusMessage && <p className="banner banner--ok">{statusMessage}</p>}
        {isLoading && <p className="banner">Chargement...</p>}
      </header>

      {activeTrack && (
        <section className={`player-panel ${isPlaying ? 'player-panel--playing' : ''}`}>
          <div className="player-panel__top">
            {activeTrack.coverUrl ? (
              <img className="cover" src={activeTrack.coverUrl} alt={`Pochette ${activeTrack.title}`} />
            ) : (
              <div className="cover cover--empty" aria-hidden />
            )}
            <div className="meta">
              <p className="label">Now playing</p>
              <h2>{activeTrack.title}</h2>
              <p>
                {activeTrack.artist} · @{activeTrack.handle}
              </p>
              <p className="genre">{activeTrack.tags || 'Public Suno track'}</p>
              <div className="meta__status">
                <span className={`status-pill ${isPlaying ? 'status-pill--playing' : ''}`}>
                  {isPlaying ? 'En lecture' : 'En pause'}
                </span>
                <span className="meta__time">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                {cachedIds.includes(activeTrack.id) && <span className="status-pill">Hors ligne</span>}
              </div>
            </div>
          </div>

          <div className="transport">
            <button type="button" className="transport-btn" onClick={() => goToRelativeTrack(-1)}>
              PREV
            </button>
            <button type="button" className="player-btn" onClick={() => void handlePlayPause()}>
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>
            <button type="button" className="transport-btn" onClick={() => goToRelativeTrack(1)}>
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

          <input
            className="player-seek"
            type="range"
            min={0}
            max={duration || 1}
            value={currentTime}
            aria-label="Progression du morceau"
            onChange={(event) => handleSeek(Number(event.target.value))}
          />

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

          <audio
            ref={audioRef}
            className="audio-element"
            preload="metadata"
            src={playableUrl ?? undefined}
            aria-label="Lecteur audio principal"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || activeTrack.duration || 0)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onEnded={() => {
              if (repeatMode === 'one') {
                const audio = audioRef.current
                if (audio) {
                  audio.currentTime = 0
                  void audio.play()
                }
                return
              }
              if (repeatMode === 'all') {
                goToRelativeTrack(1, true)
                return
              }
              setIsPlaying(false)
              setCurrentTime(0)
            }}
          />

          <div className="actions">
            <button type="button" className="btn btn--primary" onClick={() => void shareTrack(activeTrack)}>
              Partager
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => setIsDownloadModalOpen(true)}>
              Lien Suno / licence
            </button>
            <button type="button" className="btn" onClick={() => void downloadTrack(activeTrack)}>
              Telecharger local
            </button>
            <a className="btn" href={activeTrack.sunoUrl} target="_blank" rel="noreferrer">
              Ouvrir sur Suno
            </a>
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
              <pre className="lyrics-content">{activeTrack.lyrics || 'Lyrics indisponibles pour ce son public.'}</pre>
            </div>
          </section>
        </section>
      )}

      {page === 'home' && (
        <section className="panel" aria-label="Demarrer">
          <h3 className="section-title">Commencer</h3>
          <p className="section-subtitle">
            Colle une URL du type <code>https://suno.com/@noty2686?page=songs</code> ou un handle. Seuls les sons
            publics sont indexes.
          </p>
          <div className="home-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleScanArtist(DEMO_ARTIST_HANDLE)}
            >
              Recharger la demo @{DEMO_ARTIST_HANDLE}
            </button>
            {library[0] && (
              <button type="button" className="btn" onClick={() => openArtist(library[0])}>
                Ouvrir {library[0].artist.displayName}
              </button>
            )}
          </div>
        </section>
      )}

      {page === 'library' && (
        <section className="panel" aria-label="Bibliotheque locale">
          <h3 className="section-title">Bibliotheque locale</h3>
          <p className="section-subtitle">Artistes scannes et conserves dans localStorage.</p>
          <div className="artist-list">
            {library.length === 0 && <p>Aucun artiste pour le moment.</p>}
            {library.map((catalog) => (
              <article key={catalog.artist.handle} className="artist-card">
                <button type="button" className="artist-card__main" onClick={() => openArtist(catalog)}>
                  {catalog.artist.avatarUrl ? (
                    <img src={catalog.artist.avatarUrl} alt="" />
                  ) : (
                    <div className="avatar-fallback" aria-hidden />
                  )}
                  <div>
                    <strong>{catalog.artist.displayName}</strong>
                    <small>
                      @{catalog.artist.handle} · {catalog.tracks.length} sons
                    </small>
                  </div>
                </button>
                <button type="button" className="btn" onClick={() => deleteArtist(catalog.artist.handle)}>
                  Retirer
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {page === 'artist' && activeCatalog && (
        <section className="panel" aria-label={`Sons publics de ${activeCatalog.artist.displayName}`}>
          <div className="artist-header">
            {activeCatalog.artist.avatarUrl ? (
              <img src={activeCatalog.artist.avatarUrl} alt="" className="artist-avatar" />
            ) : (
              <div className="artist-avatar avatar-fallback" aria-hidden />
            )}
            <div>
              <h3 className="section-title">{activeCatalog.artist.displayName}</h3>
              <p className="section-subtitle">
                @{activeCatalog.artist.handle} · {activeCatalog.tracks.length} sons publics
              </p>
              <a href={`https://suno.com/@${activeCatalog.artist.handle}?page=songs`} target="_blank" rel="noreferrer">
                Voir sur Suno
              </a>
            </div>
            <button type="button" className="btn btn--primary" onClick={() => void downloadAll()}>
              Tout telecharger
            </button>
          </div>

          <div className="songs-list">
            {activeCatalog.tracks.map((track, index) => (
              <button
                key={track.id}
                type="button"
                className={`song-row ${track.id === activeTrack?.id ? 'song-row--active' : ''}`}
                onClick={() => selectTrack(track, true)}
              >
                <span className="song-rank">#{index + 1}</span>
                <span className="song-title">{track.title}</span>
                <span className="song-artist">
                  {formatTime(track.duration)}
                  {cachedIds.includes(track.id) ? ' · local' : ''}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeTrack && (
        <aside className={`mini-player ${isPlaying ? 'mini-player--playing' : ''}`} aria-label="Mini lecteur">
          {activeTrack.coverUrl ? <img src={activeTrack.coverUrl} alt="" aria-hidden /> : <div className="cover--empty" />}
          <div className="mini-player__meta">
            <strong>{activeTrack.title}</strong>
            <small>{activeTrack.artist}</small>
          </div>
          <div className="mini-player__actions">
            <button type="button" aria-label="Mini piste precedente" onClick={() => goToRelativeTrack(-1)}>
              ◁
            </button>
            <button type="button" aria-label="Mini lecture pause" onClick={() => void handlePlayPause()}>
              {isPlaying ? '❚❚' : '▷'}
            </button>
            <button type="button" aria-label="Mini piste suivante" onClick={() => goToRelativeTrack(1)}>
              ▷
            </button>
          </div>
        </aside>
      )}

      {isDownloadModalOpen && activeTrack && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsDownloadModalOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Conditions d utilisation"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="modal-title">Sons publics Suno</h3>
            <p className="modal-text">
              Ce lecteur indexe uniquement les sons publics. Le cache local sert a une ecoute personnelle hors ligne.
            </p>
            <p className="modal-text modal-text--warning">
              Toute exploitation commerciale reste soumise aux conditions Suno. Ce projet n&apos;est pas affilie a Suno.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setIsDownloadModalOpen(false)}>
                Fermer
              </button>
              <a className="btn btn--primary" href={activeTrack.sunoUrl} target="_blank" rel="noreferrer">
                Ouvrir la page Suno
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
  if (!Number.isFinite(value) || value < 0) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export default App
