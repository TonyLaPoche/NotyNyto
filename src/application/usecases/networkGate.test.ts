import { describe, expect, it } from 'vitest'
import { canDownloadForOffline, getNetworkQuality, readBrowserNetworkQuality } from './networkGate'

describe('networkGate', () => {
  it('detecte offline slow et good', () => {
    expect(getNetworkQuality(false)).toBe('offline')
    expect(getNetworkQuality(true, { saveData: true })).toBe('slow')
    expect(getNetworkQuality(true, { effectiveType: '2g' })).toBe('slow')
    expect(getNetworkQuality(true, { effectiveType: 'slow-2g' })).toBe('slow')
    expect(getNetworkQuality(true, { effectiveType: '4g' })).toBe('good')
    expect(getNetworkQuality()).toBe('good')
    expect(readBrowserNetworkQuality()).toMatch(/offline|slow|good/)
  })

  it('autorise le telechargement uniquement sur bon reseau', () => {
    expect(canDownloadForOffline('good')).toBe(true)
    expect(canDownloadForOffline('slow')).toBe(false)
    expect(canDownloadForOffline('offline')).toBe(false)
  })
})
