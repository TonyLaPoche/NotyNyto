import { describe, expect, it } from 'vitest'
import { parseArtistInput } from './parseArtistInput'

describe('parseArtistInput', () => {
  it('parse un handle simple et un handle avec @', () => {
    expect(parseArtistInput('Noty2686')).toBe('noty2686')
    expect(parseArtistInput('@noeticapius')).toBe('noeticapius')
  })

  it('parse une URL Suno complete', () => {
    expect(parseArtistInput('https://suno.com/@noty2686?page=songs')).toBe('noty2686')
    expect(parseArtistInput('suno.com/@artist_name/songs')).toBe('artist_name')
  })

  it('rejette une URL Suno mal formee', () => {
    expect(parseArtistInput('suno.com:badport/@artist')).toBeNull()
    expect(parseArtistInput('https://example.com/suno.com/@ghost')).toBeNull()
  })

  it('rejette les entrees invalides', () => {
    expect(parseArtistInput('')).toBeNull()
    expect(parseArtistInput('https://example.com/@x')).toBeNull()
    expect(parseArtistInput('https://suno.com/songs')).toBeNull()
    expect(parseArtistInput('a')).toBeNull()
    expect(parseArtistInput('@@@')).toBeNull()
    expect(parseArtistInput('not a url ://')).toBeNull()
  })
})
