import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const catalog = {
  artist: {
    handle: 'noty2686',
    displayName: 'Noty',
    avatarUrl: 'https://cdn/avatar.jpg',
    description: 'bio',
    fetchedAt: '2026-01-01T00:00:00.000Z',
  },
  tracks: [
    {
      id: 't1',
      title: 'Grande Soeur',
      artist: 'Noty',
      handle: 'noty2686',
      audioUrl: 'https://cdn1.suno.ai/t1.mp4',
      coverUrl: 'https://cdn/t1.jpg',
      duration: 120,
      tags: 'hyperpop',
      lyrics: 'lyrics',
      sunoUrl: 'https://suno.com/song/t1',
    },
    {
      id: 't2',
      title: 'Independante',
      artist: 'Noty',
      handle: 'noty2686',
      audioUrl: 'https://cdn1.suno.ai/t2.mp4',
      coverUrl: '',
      duration: 90,
      tags: '',
      sunoUrl: 'https://suno.com/song/t2',
    },
  ],
}

vi.mock('./application/usecases/fetchPublicArtistCatalog', () => ({
  fetchPublicArtistCatalog: vi.fn(async () => catalog),
}))

vi.mock('./application/usecases/offlineAudioCache', () => ({
  cacheTrackAudio: vi.fn(async () => ({
    trackId: 't1',
    buffer: new ArrayBuffer(1),
    mimeType: 'audio/mp4',
    cachedAt: '',
    byteLength: 1,
  })),
  clearCachedAudio: vi.fn(async () => undefined),
  getCachedAudioByteLength: vi.fn(async () => 0),
  listCachedTrackIds: vi.fn(async () => []),
  resolvePlayableUrl: vi.fn(async (_id: string, remote: string) => remote),
}))

vi.mock('./application/usecases/shareTrack', () => ({
  shareTrack: vi.fn(async () => 'shared'),
}))

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.location.hash = '#/'
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'load', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('scanne sans ajouter automatiquement a la bibliotheque puis joue', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Ecoute publique, cache local' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Essayer @noty2686' }))

    expect(await screen.findByRole('button', { name: 'Ajouter a la bibliotheque' })).toBeInTheDocument()
    expect(screen.getAllByText('Grande Soeur').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Lecture' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Agrandir le lecteur' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lyrics' }))
    expect(screen.getByRole('button', { name: 'Masquer lyrics' })).toBeInTheDocument()
  })

  it('ajoute a la bibliotheque sur decision utilisateur et cree une playlist', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Essayer @noty2686' }))
    await screen.findByRole('button', { name: 'Ajouter a la bibliotheque' })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter a la bibliotheque' }))

    fireEvent.click(screen.getByRole('link', { name: 'Bibliotheque' }))
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(await screen.findByRole('heading', { name: 'Bibliotheque' })).toBeInTheDocument()
    expect(screen.getByText('Noty')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Playlists' }))
    fireEvent.change(screen.getByLabelText('Nom de la playlist'), { target: { value: 'Soiree' } })
    fireEvent.click(screen.getByRole('button', { name: 'Creer' }))
    expect(await screen.findByText('Soiree')).toBeInTheDocument()
  })
})
