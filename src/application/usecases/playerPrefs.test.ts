import { describe, expect, it } from 'vitest'
import { readPlayerPrefs, setSkipBulkDownloadWarning, writePlayerPrefs } from './playerPrefs'

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

describe('playerPrefs', () => {
  it('lit et ecrit le skip warning', () => {
    const store = memoryStore()
    expect(readPlayerPrefs(store).skipBulkDownloadWarning).toBe(false)
    setSkipBulkDownloadWarning(true, store)
    expect(readPlayerPrefs(store).skipBulkDownloadWarning).toBe(true)
    writePlayerPrefs({ skipBulkDownloadWarning: false }, store)
    expect(readPlayerPrefs(store).skipBulkDownloadWarning).toBe(false)
  })

  it('ignore un JSON invalide', () => {
    const store = memoryStore({ 'suno-public-player.prefs.v1': '{bad' })
    expect(readPlayerPrefs(store).skipBulkDownloadWarning).toBe(false)
  })
})
