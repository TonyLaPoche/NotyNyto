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

interface DownloadProgress {
  label: string
  percent: number
  current: number
  total: number
}

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
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [trackDownloadPercent, setTrackDownloadPercent] = useState<Record<string, number>>({})
  const [networkQuality, setNetworkQuality] = useState(() => readBrowserNetworkQuality())

  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const shouldAutoplayRef = useRef(false)

  const tracks = useMemo(() => activeCatalog?.tracks ?? [], [activeCatalog])
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0] ?? null
  const currentTrackIndex = activeTrack ? tracks.findIndex((track) => track.id === activeTrack.id) : -1
  const cachedCount = tracks.filter((track) => cachedIds.includes(track.id)).length
  const installPercent = tracks.length ? Math.round((cachedCount / tracks.length) * 100) : 0

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
    const refreshNetwork = () => setNetworkQuality(readBrowserNetworkQuality())
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
    const audio = audioRef.current
    if (!audio || !playableUrl) return
    audio.load()
    if (!shouldAutoplayRef.current) return
    shouldAutoplayRef.current = false
    void audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        setIsPlaying(false)
        setError('Lecture bloquee par le navigateur. Reessaie via PLAY.')
      })
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
        setStatusMessage(`Demo prete: @${catalog.artist.handle}`)
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
      setStatusMessage(`${catalog.tracks.length} sons pour @${catalog.artist.handle}`)
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
      if (!next[0]) {
        setPage('home')
        window.location.hash = '#/'
      }
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
    if (!playableUrl) {
      setError('Audio en cours de preparation...')
      return
    }
    if (audio.paused) {
      try {
        await audio.play()
        setIsPlaying(true)
        setError(null)
      } catch {
        setError('Impossible de lancer la lecture. Reessaie.')
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
    setError(null)
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
    setTrackDownloadPercent((prev) => ({ ...prev, [track.id]: 0 }))
    try {
      await cacheTrackAudio(track.id, track.audioUrl, fetch, (percent) => {
        setTrackDownloadPercent((prev) => ({ ...prev, [track.id]: percent }))
      })
      await refreshCacheState()
      setStatusMessage(`${track.title} installe en local`)
      setTrackDownloadPercent((prev) => {
        const next = { ...prev }
        delete next[track.id]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Telechargement impossible')
      setTrackDownloadPercent((prev) => {
        const next = { ...prev }
        delete next[track.id]
        return next
      })
    }
  }

  const downloadAll = async () => {
    if (!activeCatalog) return
    if (!canDownloadForOffline(networkQuality)) {
      setError('Reseau insuffisant pour tout telecharger.')
      return
    }
    const pending = activeCatalog.tracks.filter((track) => !cachedIds.includes(track.id))
    if (pending.length === 0) {
      setStatusMessage('Deja installe a 100% en local')
      return
    }

    setDownloadProgress({ label: pending[0].title, percent: 0, current: 0, total: pending.length })
    try {
      for (let index = 0; index < pending.length; index += 1) {
        const track = pending[index]
        setDownloadProgress({
          label: track.title,
          percent: Math.round((index / pending.length) * 100),
          current: index,
          total: pending.length,
        })
        await cacheTrackAudio(track.id, track.audioUrl, fetch, (filePercent) => {
          const overall = Math.round(((index + filePercent / 100) / pending.length) * 100)
          setDownloadProgress({
            label: track.title,
            percent: overall,
            current: index + 1,
            total: pending.length,
          })
          setTrackDownloadPercent((prev) => ({ ...prev, [track.id]: filePercent }))
        })
        setTrackDownloadPercent((prev) => {
          const next = { ...prev }
          delete next[track.id]
          return next
        })
      }
      await refreshCacheState()
      setDownloadProgress({
        label: 'Termine',
        percent: 100,
        current: pending.length,
        total: pending.length,
      })
      setStatusMessage(`Installation locale: 100% pour @${activeCatalog.artist.handle}`)
      window.setTimeout(() => setDownloadProgress(null), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Telechargement impossible')
      setDownloadProgress(null)
    }
  }

  const wipeCache = async () => {
    await clearCachedAudio()
    await refreshCacheState()
    setTrackDownloadPercent({})
    setDownloadProgress(null)
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
      </nav>

      <header className="topbar">
        <div className="brand-block">
          <p className="label">Suno Public Player</p>
          {page === 'home' ? (
            <>
              <h1>Ecoute publique, cache local</h1>
              <p className="subtitle">Scanne un profil Suno, joue, puis installe hors ligne.</p>
            </>
          ) : (
            <h1 className="topbar-title">
              {page === 'library'
                ? 'Bibliotheque'
                : activeCatalog
                  ? activeCatalog.artist.displayName
                  : 'Artiste'}
            </h1>
          )}
        </div>

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
            placeholder="@handle ou URL Suno"
            aria-label="Chercher un artiste Suno"
          />
          <button type="submit" className="btn btn--primary" disabled={isLoading}>
            Scanner
          </button>
        </form>

        <div className="meta-row">
          <span className={`network-pill network-pill--${networkQuality}`}>Reseau {networkQuality}</span>
          <span className="cache-pill">Cache {formatBytes(cacheBytes)}</span>
          {page === 'artist' && activeCatalog && (
            <span className="cache-pill cache-pill--progress">Local {installPercent}%</span>
          )}
          {canInstall && (
            <button type="button" className="btn" onClick={handleInstall}>
              Installer l&apos;app
            </button>
          )}
          <button type="button" className="btn" onClick={() => void wipeCache()}>
            Vider cache
          </button>
        </div>

        {error && <p className="banner banner--error">{error}</p>}
        {statusMessage && <p className="banner banner--ok">{statusMessage}</p>}
        {isLoading && <p className="banner">Chargement...</p>}

        {downloadProgress && (
          <div className="progress-block" aria-live="polite">
            <div className="progress-block__meta">
              <strong>Installation locale {downloadProgress.percent}%</strong>
              <span>
                {downloadProgress.current}/{downloadProgress.total} · {downloadProgress.label}
              </span>
            </div>
            <div className="progress-bar" role="progressbar" aria-valuenow={downloadProgress.percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-bar__fill" style={{ width: `${downloadProgress.percent}%` }} />
            </div>
          </div>
        )}
      </header>

      {page === 'home' && (
        <section className="panel" aria-label="Demarrer">
          <h2 className="section-title">Demarrer</h2>
          <p className="section-subtitle">
            Exemple: <code>@{DEMO_ARTIST_HANDLE}</code> ou une URL <code>suno.com/@…</code>
          </p>
          <div className="home-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleScanArtist(DEMO_ARTIST_HANDLE)}
            >
              Charger @{DEMO_ARTIST_HANDLE}
            </button>
            {library[0] && (
              <button type="button" className="btn" onClick={() => openArtist(library[0])}>
                Continuer avec {library[0].artist.displayName}
              </button>
            )}
          </div>

          {library.length > 0 && (
            <div className="quick-artists" aria-label="Artistes recents">
              {library.slice(0, 4).map((catalog) => (
                <button key={catalog.artist.handle} type="button" className="chip" onClick={() => openArtist(catalog)}>
                  @{catalog.artist.handle}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {page === 'library' && (
        <section className="panel" aria-label="Bibliotheque locale">
          <p className="section-subtitle">Artistes scannes conserves sur cet appareil.</p>
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
            <div className="artist-header__copy">
              <p className="section-subtitle">
                @{activeCatalog.artist.handle} · {activeCatalog.tracks.length} sons · {cachedCount} en local
              </p>
              <div className="progress-bar progress-bar--inline" aria-hidden>
                <div className="progress-bar__fill" style={{ width: `${installPercent}%` }} />
              </div>
              <a href={`https://suno.com/@${activeCatalog.artist.handle}?page=songs`} target="_blank" rel="noreferrer">
                Profil Suno
              </a>
            </div>
            <button type="button" className="btn btn--primary" onClick={() => void downloadAll()} disabled={Boolean(downloadProgress)}>
              Installer local ({installPercent}%)
            </button>
          </div>

          <div className="songs-list">
            {activeCatalog.tracks.map((track, index) => {
              const percent = trackDownloadPercent[track.id]
              const isCached = cachedIds.includes(track.id)
              return (
                <div
                  key={track.id}
                  className={`song-row ${track.id === activeTrack?.id ? 'song-row--active' : ''}`}
                >
                  <button type="button" className="song-row__main" onClick={() => selectTrack(track, true)}>
                    <span className="song-rank">#{index + 1}</span>
                    <span className="song-title">{track.title}</span>
                    <span className="song-artist">
                      {formatTime(track.duration)}
                      {isCached ? ' · local' : percent != null ? ` · ${percent}%` : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="song-cache-btn"
                    onClick={() => void downloadTrack(track)}
                    disabled={isCached || percent != null}
                    aria-label={isCached ? `${track.title} deja local` : `Telecharger ${track.title}`}
                  >
                    {isCached ? 'OK' : percent != null ? `${percent}%` : '↓'}
                  </button>
                  {percent != null && (
                    <div className="song-row__progress" aria-hidden>
                      <div style={{ width: `${percent}%` }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {activeTrack && (
        <aside className={`player-bar ${isPlaying ? 'player-bar--playing' : ''}`} aria-label="Lecteur">
          {activeTrack.coverUrl ? <img src={activeTrack.coverUrl} alt="" aria-hidden /> : <div className="cover--empty" />}
          <div className="player-bar__meta">
            <strong>{activeTrack.title}</strong>
            <small>
              {activeTrack.artist} · {formatTime(currentTime)} / {formatTime(duration)}
              {cachedIds.includes(activeTrack.id) ? ' · local' : ''}
            </small>
          </div>
          <div className="player-bar__controls">
            <button type="button" aria-label="Piste precedente" onClick={() => goToRelativeTrack(-1)}>
              ◁
            </button>
            <button type="button" className="player-bar__play" aria-label={isPlaying ? 'Pause' : 'Lecture'} onClick={() => void handlePlayPause()}>
              {isPlaying ? '❚❚' : '▷'}
            </button>
            <button type="button" aria-label="Piste suivante" onClick={() => goToRelativeTrack(1)}>
              ▷
            </button>
            <button
              type="button"
              className={repeatMode !== 'off' ? 'repeat-btn--active' : ''}
              aria-label="Mode repetition"
              onClick={cycleRepeatMode}
            >
              {repeatMode === 'off' ? '1×' : repeatMode === 'all' ? '∞' : '1'}
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
          <div className="player-bar__extra">
            <label className="volume-inline">
              <span className="sr-only">Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                aria-label="Volume"
              />
            </label>
            <button type="button" className="btn" onClick={() => void shareTrack(activeTrack)}>
              Partager
            </button>
            <button type="button" className="btn" onClick={() => setIsLyricsExpanded((v) => !v)}>
              {isLyricsExpanded ? 'Masquer lyrics' : 'Lyrics'}
            </button>
            <a className="btn" href={activeTrack.sunoUrl} target="_blank" rel="noreferrer">
              Suno
            </a>
          </div>
          {isLyricsExpanded && (
            <pre className="player-bar__lyrics">{activeTrack.lyrics || 'Lyrics indisponibles.'}</pre>
          )}
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
            onError={() => setError('Source audio illisible. Rescanne l artiste ou reessaie.')}
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
        </aside>
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
