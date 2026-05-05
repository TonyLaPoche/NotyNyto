import { describe, expect, it } from 'vitest'
import { FEATURED_TRACK } from '../../domain/entities/track'
import { buildSharePayload } from './buildSharePayload'

describe('buildSharePayload', () => {
  it('compose le payload de partage', () => {
    const payload = buildSharePayload(FEATURED_TRACK, 'https://example.com')

    expect(payload.title).toBe('Noty - Double Face.exe')
    expect(payload.text).toContain('Noty x Nyto')
    expect(payload.url).toBe('https://example.com')
  })
})
