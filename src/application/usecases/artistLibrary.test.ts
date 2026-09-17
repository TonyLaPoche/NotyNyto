import { describe, expect, it } from 'vitest'
import {
  clearArtistLibrary,
  getArtistCatalog,
  listArtistCatalogs,
  removeArtistCatalog,
  saveArtistCatalog,
} from './artistLibrary'
import type { ArtistCatalog } from '../../domain/entities/track'

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

const sample: ArtistCatalog = {
  artist: {
    handle: 'noty2686',
    displayName: 'Noty',
    avatarUrl: '',
    description: '',
    fetchedAt: '2026-01-01T00:00:00.000Z',
  },
  tracks: [],
}

describe('artistLibrary', () => {
  it('sauvegarde, lit et retire des catalogues', () => {
    const store = memoryStore()
    expect(listArtistCatalogs(store)).toEqual([])
    expect(getArtistCatalog('noty2686', store)).toBeNull()

    saveArtistCatalog(sample, store)
    expect(getArtistCatalog('noty2686', store)?.artist.displayName).toBe('Noty')

    const other = {
      ...sample,
      artist: { ...sample.artist, handle: 'other', displayName: 'Other' },
    }
    saveArtistCatalog(other, store)
    expect(listArtistCatalogs(store)).toHaveLength(2)

    removeArtistCatalog('other', store)
    expect(listArtistCatalogs(store)).toHaveLength(1)

    clearArtistLibrary(store)
    expect(listArtistCatalogs(store)).toEqual([])
  })

  it('ignore un JSON corrompu', () => {
    const store = memoryStore({ 'suno-public-player.library.v1': '{bad' })
    expect(listArtistCatalogs(store)).toEqual([])
  })

  it('ignore une valeur non tableau', () => {
    const store = memoryStore({ 'suno-public-player.library.v1': '{"hello":1}' })
    expect(listArtistCatalogs(store)).toEqual([])
  })

  it('utilise localStorage navigateur par defaut', () => {
    window.localStorage.clear()
    saveArtistCatalog(sample)
    expect(getArtistCatalog('noty2686')?.artist.handle).toBe('noty2686')
    clearArtistLibrary()
    expect(listArtistCatalogs()).toEqual([])
  })
})
