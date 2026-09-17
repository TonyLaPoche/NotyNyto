import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  ArtistCatalog,
  LocalPlaylist,
  Track,
  TrackAvailabilityFilter,
} from './domain/entities/track'
import {
  BULK_DOWNLOAD_WARNING_THRESHOLD,
  DEMO_ARTIST_HANDLE,
  ESTIMATED_MB_PER_TRACK,
} from './domain/entities/track'
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
import {
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  listPlaylists,
  removeTrackFromPlaylist,
  renamePlaylist,
} from './application/usecases/localPlaylists'
import { readPlayerPrefs, setSkipBulkDownloadWarning } from './application/usecases/playerPrefs'
import {
  estimateDownloadMegabytes,
  filterTracksByAvailability,
  pickNextShuffledIndex,
  shuffleTracks,
} from './application/usecases/playbackQueue'

type Page = 'home' | 'library' | 'artist' | 'playlist'
type LibraryTab = 'artists' | 'tracks' | 'playlists'
type RepeatMode = 'off' | 'all' | 'one'

interface DownloadProgress {
  label: string
  percent: number
  current: number
  total: number
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('artists')
  const [query, setQuery] = useState('')
  const [library, setLibrary] = useState<ArtistCatalog[]>(() => listArtistCatalogs())
  const [playlists, setPlaylists] = useState<LocalPlaylist[]>(() => listPlaylists())
  const [activeCatalog, setActiveCatalog] = useState<ArtistCatalog | null>(null)
  const [activePlaylist, setActivePlaylist] = useState<LocalPlaylist | null>(null)
  const [playQueue, setPlayQueue] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.85)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [shuffleEnabled, setShuffleEnabled] = useState(false)
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [playableUrl, setPlayableUrl] = useState<string | null>(null)
  const [cachedIds, setCachedIds] = useState<string[]>([])
  const [cacheBytes, setCacheBytes] = useState(0)
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false)
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(min-width: 721px)').matches
  })
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [trackDownloadPercent, setTrackDownloadPercent] = useState<Record<string, number>>({})
  const [networkQuality, setNetworkQuality] = useState(() => readBrowserNetworkQuality())
  const [artistFilter, setArtistFilter] = useState<TrackAvailabilityFilter>('all')
  const [libraryTrackFilter, setLibraryTrackFilter] = useState<TrackAvailabilityFilter>('all')
  const [playlistNameDraft, setPlaylistNameDraft] = useState('')
  const [playlistPickerTrack, setPlaylistPickerTrack] = useState<Track | null>(null)
  const [bulkWarningOpen, setBulkWarningOpen] = useState(false)
  const [bulkWarningDontAsk, setBulkWarningDontAsk] = useState(false)
  const [skipBulkWarning, setSkipBulkWarning] = useState(
    () => readPlayerPrefs().skipBulkDownloadWarning,
  )

  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const pendingAutoplayTrackIdRef = useRef<string | null>(null)
  const playableTrackIdRef = useRef<string | null>(null)

  const activeTrack = playQueue.find((track) => track.id === activeTrackId) ?? playQueue[0] ?? null
  const currentTrackIndex = activeTrack ? playQueue.findIndex((track) => track.id === activeTrack.id) : -1
  const inLibrary = Boolean(
    activeCatalog && library.some((entry) => entry.artist.handle === activeCatalog.artist.handle),
  )
  const libraryTracks = useMemo(() => library.flatMap((entry) => entry.tracks), [library])
  const localLibraryTracks = useMemo(
    () => filterTracksByAvailability(libraryTracks, cachedIds, 'local'),
    [libraryTracks, cachedIds],
  )
  const filteredArtistTracks = useMemo(
    () => filterTracksByAvailability(activeCatalog?.tracks ?? [], cachedIds, artistFilter),
    [activeCatalog, cachedIds, artistFilter],
  )
  const filteredLibraryTracks = useMemo(
    () => filterTracksByAvailability(libraryTracks, cachedIds, libraryTrackFilter),
    [libraryTracks, cachedIds, libraryTrackFilter],
  )
  const cachedCount = (activeCatalog?.tracks ?? []).filter((track) => cachedIds.includes(track.id)).length
  const installPercent = activeCatalog?.tracks.length
    ? Math.round((cachedCount / activeCatalog.tracks.length) * 100)
    : 0
  const pendingDownloadCount = (activeCatalog?.tracks ?? []).filter(
    (track) => !cachedIds.includes(track.id),
  ).length
  const estimatedBulkMb = estimateDownloadMegabytes(pendingDownloadCount, ESTIMATED_MB_PER_TRACK)

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
          setPlayQueue(existing.tracks)
          setActiveTrackId((previous) => previous ?? existing.tracks[0]?.id ?? null)
        }
        return
      }
      if (hash.startsWith('/playlist/')) {
        const id = hash.replace('/playlist/', '').split('/')[0]
        const playlist = getPlaylist(id)
        setPage('playlist')
        if (playlist) {
          setActivePlaylist(playlist)
          setPlayQueue(playlist.tracks)
          setActiveTrackId((previous) => previous ?? playlist.tracks[0]?.id ?? null)
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
      const trackId = activeTrack.id
      const nextUrl = await resolvePlayableUrl(trackId, activeTrack.audioUrl)
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
      playableTrackIdRef.current = trackId
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

    const trackId = playableTrackIdRef.current
    audio.load()

    if (!trackId || pendingAutoplayTrackIdRef.current !== trackId) return
    pendingAutoplayTrackIdRef.current = null

    const startPlayback = () => {
      void audio
        .play()
        .then(() => {
          setIsPlaying(true)
          setError(null)
        })
        .catch(() => {
          setIsPlaying(false)
          setError('Lecture bloquee par le navigateur. Reessaie via Lecture.')
        })
    }

    if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startPlayback()
      return
    }

    const onCanPlay = () => {
      audio.removeEventListener('canplay', onCanPlay)
      startPlayback()
    }
    audio.addEventListener('canplay', onCanPlay)
    return () => audio.removeEventListener('canplay', onCanPlay)
  }, [playableUrl])

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
    navigator.mediaSession.setActionHandler('previoustrack', () => goToRelativeTrack(-1, true))
    navigator.mediaSession.setActionHandler('nexttrack', () => goToRelativeTrack(1, true))
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
  }, [activeTrack, isPlaying, currentTime, duration, playQueue, currentTrackIndex, shuffleEnabled])
  /* c8 ignore end */

  async function refreshCacheState() {
    const ids = await listCachedTrackIds()
    const bytes = await getCachedAudioByteLength()
    setCachedIds(ids)
    setCacheBytes(bytes)
  }

  function requestAutoplay(trackId: string) {
    pendingAutoplayTrackIdRef.current = trackId
  }

  async function playCurrentAudio() {
    const audio = audioRef.current
    if (!audio) return
    try {
      await audio.play()
      setIsPlaying(true)
      setError(null)
    } catch {
      setIsPlaying(false)
      setError('Impossible de lancer la lecture. Reessaie.')
    }
  }

  function startQueue(tracks: Track[], track?: Track, autoplay = false, shuffled = shuffleEnabled) {
    if (!tracks.length) {
      setError('Aucune piste disponible pour cette lecture.')
      return
    }
    const queue = shuffled ? shuffleTracks(tracks) : tracks
    const selected = track && queue.some((item) => item.id === track.id) ? track : queue[0]
    setPlayQueue(queue)
    setIsLyricsExpanded(false)
    setError(null)

    if (autoplay) requestAutoplay(selected.id)

    if (selected.id === activeTrackId) {
      if (autoplay) void playCurrentAudio()
      return
    }

    setActiveTrackId(selected.id)
  }

  const selectTrack = (track: Track, queue: Track[], autoplay = true) => {
    startQueue(queue, track, autoplay, false)
  }

  const goToRelativeTrack = (delta: number, autoplay = true) => {
    if (!playQueue.length || currentTrackIndex < 0) return
    const nextIndex = shuffleEnabled
      ? pickNextShuffledIndex(playQueue.length, currentTrackIndex)
      : (currentTrackIndex + delta + playQueue.length) % playQueue.length
    const nextTrack = playQueue[nextIndex]
    if (autoplay) requestAutoplay(nextTrack.id)
    setActiveTrackId(nextTrack.id)
    setIsLyricsExpanded(false)
  }

  async function handleScanArtist(rawInput: string) {
    setError(null)
    setStatusMessage(null)
    setIsLoading(true)
    try {
      const catalog = await fetchPublicArtistCatalog(rawInput)
      const alreadySaved = Boolean(getArtistCatalog(catalog.artist.handle))
      if (alreadySaved) {
        setLibrary(saveArtistCatalog(catalog))
      }
      setActiveCatalog(catalog)
      setArtistFilter('all')
      startQueue(catalog.tracks, catalog.tracks[0], false, false)
      setPage('artist')
      window.location.hash = `/artist/${catalog.artist.handle}`
      setStatusMessage(
        alreadySaved
          ? `${catalog.tracks.length} sons · deja dans ta bibliotheque`
          : `${catalog.tracks.length} sons · ajoute-le a la bibliotheque si tu veux le garder`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan impossible')
    } finally {
      setIsLoading(false)
    }
  }

  function addActiveArtistToLibrary() {
    if (!activeCatalog) return
    const next = saveArtistCatalog(activeCatalog)
    setLibrary(next)
    setStatusMessage(`@${activeCatalog.artist.handle} ajoute a la bibliotheque`)
  }

  function openArtist(catalog: ArtistCatalog) {
    setActiveCatalog(catalog)
    setArtistFilter('all')
    startQueue(catalog.tracks, catalog.tracks[0], false, false)
    setPage('artist')
    window.location.hash = `/artist/${catalog.artist.handle}`
  }

  function openPlaylist(playlist: LocalPlaylist) {
    setActivePlaylist(playlist)
    startQueue(playlist.tracks, playlist.tracks[0], false, false)
    setPage('playlist')
    window.location.hash = `/playlist/${playlist.id}`
  }

  function deleteArtist(handle: string) {
    const next = removeArtistCatalog(handle)
    setLibrary(next)
    if (activeCatalog?.artist.handle === handle) {
      setActiveCatalog(null)
      setPage('library')
      window.location.hash = '#/library'
    }
  }

  function handleCreatePlaylist() {
    const next = createPlaylist(playlistNameDraft || 'Nouvelle playlist')
    setPlaylists(next)
    setPlaylistNameDraft('')
    setStatusMessage('Playlist creee')
    setLibraryTab('playlists')
  }

  function handleRenamePlaylist(id: string) {
    const name = window.prompt('Nouveau nom de playlist')
    if (!name) return
    setPlaylists(renamePlaylist(id, name))
  }

  function handleDeletePlaylist(id: string) {
    const next = deletePlaylist(id)
    setPlaylists(next)
    if (activePlaylist?.id === id) {
      setActivePlaylist(null)
      setPage('library')
      window.location.hash = '#/library'
    }
  }

  function handleAddTrackToPlaylist(playlistId: string, track: Track) {
    const next = addTrackToPlaylist(playlistId, track)
    setPlaylists(next)
    if (activePlaylist?.id === playlistId) {
      const updated = next.find((item) => item.id === playlistId) ?? null
      setActivePlaylist(updated)
    }
    setPlaylistPickerTrack(null)
    setStatusMessage('Titre ajoute a la playlist')
  }

  function handleRemoveFromPlaylist(trackId: string) {
    if (!activePlaylist) return
    const next = removeTrackFromPlaylist(activePlaylist.id, trackId)
    setPlaylists(next)
    const updated = next.find((item) => item.id === activePlaylist.id) ?? null
    setActivePlaylist(updated)
    if (updated) setPlayQueue(updated.tracks)
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
      await playCurrentAudio()
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

  const cycleRepeatMode = () => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'))
  }

  const startShuffle = (tracks: Track[], label: string) => {
    if (!tracks.length) {
      setError(`Aucun titre pour ${label}.`)
      return
    }
    setShuffleEnabled(true)
    startQueue(tracks, undefined, true, true)
    setStatusMessage(`Aleatoire: ${tracks.length} titres (${label})`)
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

  const requestDownloadAll = () => {
    if (!activeCatalog) return
    if (!canDownloadForOffline(networkQuality)) {
      setError('Reseau insuffisant pour tout telecharger.')
      return
    }
    if (pendingDownloadCount === 0) {
      setStatusMessage('Deja installe a 100% en local')
      return
    }
    if (pendingDownloadCount > BULK_DOWNLOAD_WARNING_THRESHOLD && !skipBulkWarning) {
      setBulkWarningDontAsk(false)
      setBulkWarningOpen(true)
      return
    }
    void runDownloadAll()
  }

  const confirmBulkDownload = () => {
    if (bulkWarningDontAsk) {
      setSkipBulkDownloadWarning(true)
      setSkipBulkWarning(true)
    }
    setBulkWarningOpen(false)
    void runDownloadAll()
  }

  const runDownloadAll = async () => {
    if (!activeCatalog) return
    const pending = activeCatalog.tracks.filter((track) => !cachedIds.includes(track.id))
    if (pending.length === 0) return

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

  const pageTitle =
    page === 'home'
      ? null
      : page === 'library'
        ? 'Bibliotheque'
        : page === 'playlist'
          ? activePlaylist?.name ?? 'Playlist'
          : activeCatalog?.artist.displayName ?? 'Artiste'

  const playerLayoutClass = activeTrack
    ? isPlayerExpanded
      ? 'app--player-expanded'
      : 'app--player-collapsed'
    : ''

  return (
    <main className={`app ${isPlaying ? 'app--playing' : ''} ${playerLayoutClass}`} style={appStyle}>
      <div className="atmosphere" aria-hidden />

      <nav className="site-nav" aria-label="Navigation principale">
        <a href="#/" className={`nav-link ${page === 'home' ? 'nav-link--active' : ''}`} onClick={() => setPage('home')}>
          Accueil
        </a>
        <a
          href="#/library"
          className={`nav-link ${page === 'library' || page === 'playlist' ? 'nav-link--active' : ''}`}
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
              <p className="subtitle">Scanne, ecoute, puis ajoute seulement ce que tu veux garder.</p>
            </>
          ) : (
            <h1 className="topbar-title">{pageTitle}</h1>
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
            <div
              className="progress-bar"
              role="progressbar"
              aria-valuenow={downloadProgress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progress-bar__fill" style={{ width: `${downloadProgress.percent}%` }} />
            </div>
          </div>
        )}
      </header>

      {page === 'home' && (
        <section className="panel" aria-label="Demarrer">
          <h2 className="section-title">Demarrer</h2>
          <p className="section-subtitle">
            Un scan ouvre l&apos;artiste sans l&apos;ajouter a ta bibliotheque. Tu decides ensuite.
          </p>
          <div className="home-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleScanArtist(DEMO_ARTIST_HANDLE)}
            >
              Essayer @{DEMO_ARTIST_HANDLE}
            </button>
            <button type="button" className="btn" onClick={() => {
              setPage('library')
              window.location.hash = '#/library'
            }}>
              Ouvrir la bibliotheque
            </button>
          </div>
          {library.length > 0 && (
            <div className="quick-artists" aria-label="Artistes de ta bibliotheque">
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
          <div className="segmented" role="tablist" aria-label="Sections bibliotheque">
            <button type="button" className={libraryTab === 'artists' ? 'segmented--active' : ''} onClick={() => setLibraryTab('artists')}>
              Artistes
            </button>
            <button type="button" className={libraryTab === 'tracks' ? 'segmented--active' : ''} onClick={() => setLibraryTab('tracks')}>
              Sons
            </button>
            <button type="button" className={libraryTab === 'playlists' ? 'segmented--active' : ''} onClick={() => setLibraryTab('playlists')}>
              Playlists
            </button>
          </div>

          <div className="home-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => startShuffle(localLibraryTracks, 'telecharges')}
            >
              Aleatoire · locaux ({localLibraryTracks.length})
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => startShuffle(libraryTracks, 'bibliotheque')}
            >
              Aleatoire · bibliotheque ({libraryTracks.length})
            </button>
          </div>

          {libraryTab === 'artists' && (
            <>
              <p className="section-subtitle">Seuls les artistes que tu as ajoutes manuellement.</p>
              <div className="artist-list">
                {library.length === 0 && <p>Aucun artiste sauvegarde. Scanne puis clique &quot;Ajouter a la bibliotheque&quot;.</p>}
                {library.map((catalog) => {
                  const localCount = catalog.tracks.filter((track) => cachedIds.includes(track.id)).length
                  return (
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
                            @{catalog.artist.handle} · {localCount}/{catalog.tracks.length} locaux
                          </small>
                        </div>
                      </button>
                      <button type="button" className="btn" onClick={() => deleteArtist(catalog.artist.handle)}>
                        Retirer
                      </button>
                    </article>
                  )
                })}
              </div>
            </>
          )}

          {libraryTab === 'tracks' && (
            <>
              <FilterChips value={libraryTrackFilter} onChange={setLibraryTrackFilter} />
              <div className="songs-list">
                {filteredLibraryTracks.length === 0 && <p>Aucun titre pour ce filtre.</p>}
                {filteredLibraryTracks.map((track, index) => (
                  <TrackRow
                    key={`${track.id}-${index}`}
                    track={track}
                    index={index}
                    active={track.id === activeTrack?.id}
                    cached={cachedIds.includes(track.id)}
                    percent={trackDownloadPercent[track.id]}
                    onPlay={() => selectTrack(track, filteredLibraryTracks, true)}
                    onDownload={() => void downloadTrack(track)}
                    onAddToPlaylist={() => setPlaylistPickerTrack(track)}
                  />
                ))}
              </div>
            </>
          )}

          {libraryTab === 'playlists' && (
            <>
              <form
                className="playlist-create"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleCreatePlaylist()
                }}
              >
                <input
                  value={playlistNameDraft}
                  onChange={(event) => setPlaylistNameDraft(event.target.value)}
                  placeholder="Nom de la playlist"
                  aria-label="Nom de la playlist"
                />
                <button type="submit" className="btn btn--primary">
                  Creer
                </button>
              </form>
              <div className="artist-list">
                {playlists.length === 0 && <p>Aucune playlist. Cree-en une, puis ajoute des titres depuis un artiste.</p>}
                {playlists.map((playlist) => (
                  <article key={playlist.id} className="artist-card">
                    <button type="button" className="artist-card__main" onClick={() => openPlaylist(playlist)}>
                      <div className="avatar-fallback" aria-hidden />
                      <div>
                        <strong>{playlist.name}</strong>
                        <small>{playlist.tracks.length} titres</small>
                      </div>
                    </button>
                    <div className="row-actions">
                      <button type="button" className="btn" onClick={() => handleRenamePlaylist(playlist.id)}>
                        Renommer
                      </button>
                      <button type="button" className="btn" onClick={() => handleDeletePlaylist(playlist.id)}>
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
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
            <div className="artist-header__actions">
              {!inLibrary ? (
                <button type="button" className="btn btn--primary" onClick={addActiveArtistToLibrary}>
                  Ajouter a la bibliotheque
                </button>
              ) : (
                <span className="cache-pill cache-pill--progress">Dans la bibliotheque</span>
              )}
              <button
                type="button"
                className="btn"
                onClick={requestDownloadAll}
                disabled={Boolean(downloadProgress)}
              >
                Installer local ({installPercent}%)
              </button>
            </div>
          </div>

          <FilterChips value={artistFilter} onChange={setArtistFilter} />

          <div className="songs-list">
            {filteredArtistTracks.length === 0 && <p>Aucun titre pour ce filtre.</p>}
            {filteredArtistTracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                active={track.id === activeTrack?.id}
                cached={cachedIds.includes(track.id)}
                percent={trackDownloadPercent[track.id]}
                onPlay={() => selectTrack(track, filteredArtistTracks, true)}
                onDownload={() => void downloadTrack(track)}
                onAddToPlaylist={() => setPlaylistPickerTrack(track)}
              />
            ))}
          </div>
        </section>
      )}

      {page === 'playlist' && activePlaylist && (
        <section className="panel" aria-label={`Playlist ${activePlaylist.name}`}>
          <div className="artist-header">
            <div className="artist-header__copy">
              <p className="section-subtitle">{activePlaylist.tracks.length} titres locaux a cette playlist</p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => startShuffle(activePlaylist.tracks, activePlaylist.name)}
            >
              Aleatoire
            </button>
          </div>
          <div className="songs-list">
            {activePlaylist.tracks.length === 0 && <p>Playlist vide.</p>}
            {activePlaylist.tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                active={track.id === activeTrack?.id}
                cached={cachedIds.includes(track.id)}
                percent={trackDownloadPercent[track.id]}
                onPlay={() => selectTrack(track, activePlaylist.tracks, true)}
                onDownload={() => void downloadTrack(track)}
                onRemove={() => handleRemoveFromPlaylist(track.id)}
              />
            ))}
          </div>
        </section>
      )}

      {activeTrack && (
        <aside
          className={`player-bar ${isPlaying ? 'player-bar--playing' : ''} ${isPlayerExpanded ? 'player-bar--expanded' : 'player-bar--collapsed'}`}
          aria-label="Lecteur"
        >
          <div
            className="player-bar__progress"
            aria-hidden
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
          {activeTrack.coverUrl ? <img src={activeTrack.coverUrl} alt="" aria-hidden /> : <div className="cover--empty" />}
          {isPlayerExpanded ? (
            <div className="player-bar__meta">
              <strong>{activeTrack.title}</strong>
              <small>
                {activeTrack.artist} · {formatTime(currentTime)} / {formatTime(duration)}
                {cachedIds.includes(activeTrack.id) ? ' · local' : ''}
                {shuffleEnabled ? ' · aleatoire' : ''}
              </small>
            </div>
          ) : (
            <button type="button" className="player-bar__meta" onClick={() => setIsPlayerExpanded(true)}>
              <strong>{activeTrack.title}</strong>
              <small>
                {activeTrack.artist} · {formatTime(currentTime)} / {formatTime(duration)}
                {cachedIds.includes(activeTrack.id) ? ' · local' : ''}
                {shuffleEnabled ? ' · aleatoire' : ''}
              </small>
            </button>
          )}
          <div className="player-bar__compact-actions">
            <button
              type="button"
              className="player-bar__play"
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
              onClick={() => void handlePlayPause()}
            >
              <Icon name={isPlaying ? 'pause' : 'play_arrow'} />
            </button>
            <button
              type="button"
              className="player-bar__toggle"
              aria-expanded={isPlayerExpanded}
              aria-label={isPlayerExpanded ? 'Reduire le lecteur' : 'Agrandir le lecteur'}
              onClick={() => {
                setIsPlayerExpanded((value) => {
                  if (value) setIsLyricsExpanded(false)
                  return !value
                })
              }}
            >
              <Icon name={isPlayerExpanded ? 'expand_more' : 'expand_less'} />
            </button>
          </div>
          {isPlayerExpanded && (
            <>
              <div className="player-bar__controls">
                <button type="button" aria-label="Piste precedente" onClick={() => goToRelativeTrack(-1, true)}>
                  <Icon name="skip_previous" />
                </button>
                <button
                  type="button"
                  className="player-bar__play"
                  aria-label={isPlaying ? 'Pause' : 'Lecture'}
                  onClick={() => void handlePlayPause()}
                >
                  <Icon name={isPlaying ? 'pause' : 'play_arrow'} />
                </button>
                <button type="button" aria-label="Piste suivante" onClick={() => goToRelativeTrack(1, true)}>
                  <Icon name="skip_next" />
                </button>
                <button
                  type="button"
                  className={shuffleEnabled ? 'repeat-btn--active' : ''}
                  aria-label="Lecture aleatoire"
                  aria-pressed={shuffleEnabled}
                  onClick={() => setShuffleEnabled((value) => !value)}
                >
                  <Icon name="shuffle" />
                </button>
                <button
                  type="button"
                  className={repeatMode !== 'off' ? 'repeat-btn--active' : ''}
                  aria-label="Mode repetition"
                  onClick={cycleRepeatMode}
                >
                  <Icon name={repeatMode === 'one' ? 'repeat_one' : 'repeat'} />
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
                  <Icon name="volume_up" />
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
                <button type="button" className="btn" onClick={() => setPlaylistPickerTrack(activeTrack)}>
                  <Icon name="playlist_add" /> Playlist
                </button>
                <button type="button" className="btn" onClick={() => void shareTrack(activeTrack)}>
                  <Icon name="share" /> Partager
                </button>
                <button type="button" className="btn" onClick={() => setIsLyricsExpanded((value) => !value)}>
                  <Icon name="lyrics" /> {isLyricsExpanded ? 'Masquer lyrics' : 'Lyrics'}
                </button>
                <a className="btn" href={activeTrack.sunoUrl} target="_blank" rel="noreferrer">
                  <Icon name="open_in_new" /> Suno
                </a>
              </div>
              {isLyricsExpanded && (
                <pre className="player-bar__lyrics">{activeTrack.lyrics || 'Lyrics indisponibles.'}</pre>
              )}
            </>
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
              if (repeatMode === 'all' || shuffleEnabled) {
                goToRelativeTrack(1, true)
                return
              }
              setIsPlaying(false)
              setCurrentTime(0)
            }}
          />
        </aside>
      )}

      {bulkWarningOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setBulkWarningOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmation telechargement"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="modal-title">Telechargement volumineux</h3>
            <p className="modal-text">
              Tu t&apos;appretes a installer <strong>{pendingDownloadCount} sons</strong> (~{estimatedBulkMb} Mo
              estimes). Sur telephone, ca peut saturer le stockage si tu n&apos;en ecoutes que quelques-uns.
            </p>
            <p className="modal-text modal-text--warning">
              Conseil: telecharge d&apos;abord 3 ou 4 titres a l&apos;unite, ou filtre &quot;En ligne&quot; puis
              choisis.
            </p>
            <label className="modal-check">
              <input
                type="checkbox"
                checked={bulkWarningDontAsk}
                onChange={(event) => setBulkWarningDontAsk(event.target.checked)}
              />
              Ne plus demander
            </label>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setBulkWarningOpen(false)}>
                Annuler
              </button>
              <button type="button" className="btn btn--primary" onClick={confirmBulkDownload}>
                Confirmer le telechargement
              </button>
            </div>
          </section>
        </div>
      )}

      {playlistPickerTrack && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPlaylistPickerTrack(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Ajouter a une playlist"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="modal-title">Ajouter a une playlist</h3>
            <p className="modal-text">{playlistPickerTrack.title}</p>
            {playlists.length === 0 ? (
              <p className="modal-text">Aucune playlist. Cree-en une dans Bibliotheque → Playlists.</p>
            ) : (
              <div className="playlist-picker-list">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    className="btn"
                    onClick={() => handleAddTrackToPlaylist(playlist.id, playlistPickerTrack)}
                  >
                    {playlist.name}
                  </button>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setPlaylistPickerTrack(null)}>
                Fermer
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function Icon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined" aria-hidden>
      {name}
    </span>
  )
}

function FilterChips({
  value,
  onChange,
}: {
  value: TrackAvailabilityFilter
  onChange: (value: TrackAvailabilityFilter) => void
}) {
  return (
    <div className="filter-chips" role="group" aria-label="Filtrer local ou en ligne">
      <button type="button" className={value === 'all' ? 'chip chip--active' : 'chip'} onClick={() => onChange('all')}>
        Tous
      </button>
      <button
        type="button"
        className={value === 'local' ? 'chip chip--active' : 'chip'}
        onClick={() => onChange('local')}
      >
        Telecharges
      </button>
      <button
        type="button"
        className={value === 'online' ? 'chip chip--active' : 'chip'}
        onClick={() => onChange('online')}
      >
        En ligne
      </button>
    </div>
  )
}

function TrackRow({
  track,
  index,
  active,
  cached,
  percent,
  onPlay,
  onDownload,
  onAddToPlaylist,
  onRemove,
}: {
  track: Track
  index: number
  active: boolean
  cached: boolean
  percent?: number
  onPlay: () => void
  onDownload: () => void
  onAddToPlaylist?: () => void
  onRemove?: () => void
}) {
  return (
    <div className={`song-row ${active ? 'song-row--active' : ''}`}>
      <button type="button" className="song-row__main" onClick={onPlay}>
        <span className="song-rank">#{index + 1}</span>
        <span className="song-title">{track.title}</span>
        <span className="song-artist">
          {track.artist} · {formatTime(track.duration)}
          {cached ? ' · local' : percent != null ? ` · ${percent}%` : ''}
        </span>
      </button>
      <div className="song-row__actions">
        {onAddToPlaylist && (
          <button type="button" className="song-cache-btn" onClick={onAddToPlaylist} aria-label={`Ajouter ${track.title} a une playlist`}>
            <Icon name="playlist_add" />
          </button>
        )}
        {onRemove && (
          <button type="button" className="song-cache-btn" onClick={onRemove} aria-label={`Retirer ${track.title}`}>
            <Icon name="close" />
          </button>
        )}
        <button
          type="button"
          className="song-cache-btn"
          onClick={onDownload}
          disabled={cached || percent != null}
          aria-label={cached ? `${track.title} deja local` : `Telecharger ${track.title}`}
        >
          {cached ? <Icon name="check" /> : percent != null ? `${percent}%` : <Icon name="download" />}
        </button>
      </div>
      {percent != null && (
        <div className="song-row__progress" aria-hidden>
          <div style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
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
