import { describe, expect, it } from 'vitest'
import {
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  listPlaylists,
  removeTrackFromPlaylist,
  renamePlaylist,
} from './localPlaylists'
import type { Track } from '../../domain/entities/track'

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value
    },
    removeItem: (key: string) => {
      delete data[key]
    },
  }
}

const track: Track = {
  id: 't1',
  title: 'Song',
  artist: 'Noty',
  handle: 'noty2686',
  audioUrl: 'https://cdn/a.mp4',
  coverUrl: '',
  duration: 10,
  tags: '',
  sunoUrl: 'https://suno.com/song/t1',
}

describe('localPlaylists', () => {
  it('cree, renomme, ajoute et retire des titres', () => {
    const store = memoryStore()
    createPlaylist('Favourites', [track], store)
    expect(listPlaylists(store)).toHaveLength(1)
    const id = listPlaylists(store)[0].id
    expect(getPlaylist(id, store)?.name).toBe('Favourites')

    renamePlaylist(id, 'Top', store)
    expect(getPlaylist(id, store)?.name).toBe('Top')

    addTrackToPlaylist(id, { ...track, id: 't2', title: 'Other' }, store)
    expect(getPlaylist(id, store)?.tracks).toHaveLength(2)

    addTrackToPlaylist(id, track, store)
    expect(getPlaylist(id, store)?.tracks).toHaveLength(2)

    removeTrackFromPlaylist(id, 't2', store)
    expect(getPlaylist(id, store)?.tracks).toHaveLength(1)

    deletePlaylist(id, store)
    expect(listPlaylists(store)).toEqual([])
  })

  it('ignore un JSON corrompu', () => {
    const store = memoryStore({ 'suno-public-player.playlists.v1': '{bad' })
    expect(listPlaylists(store)).toEqual([])
  })
})
