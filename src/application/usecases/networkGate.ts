export type NetworkQuality = 'offline' | 'slow' | 'good'

interface NetworkConnectionLike {
  effectiveType?: string
  saveData?: boolean
}

export function getNetworkQuality(
  online = true,
  connection?: NetworkConnectionLike | null,
): NetworkQuality {
  if (!online) return 'offline'

  const effectiveType = connection?.effectiveType
  if (connection?.saveData) return 'slow'
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow'
  return 'good'
}

export function readBrowserNetworkQuality(): NetworkQuality {
  const connection = (navigator as Navigator & { connection?: NetworkConnectionLike }).connection
  return getNetworkQuality(navigator.onLine, connection)
}

export function canDownloadForOffline(quality: NetworkQuality): boolean {
  return quality === 'good'
}
