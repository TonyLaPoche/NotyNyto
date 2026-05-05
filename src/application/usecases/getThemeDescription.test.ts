import { describe, expect, it } from 'vitest'
import { getThemeDescription } from './getThemeDescription'

describe('getThemeDescription', () => {
  it('retourne la description Noty', () => {
    expect(getThemeDescription('noty')).toContain('Mode Noty')
  })

  it('retourne la description Nyto', () => {
    expect(getThemeDescription('nyto')).toContain('Mode Nyto')
  })
})
