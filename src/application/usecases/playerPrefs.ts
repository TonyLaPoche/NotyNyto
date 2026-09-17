const PREFS_KEY = 'suno-public-player.prefs.v1'

export interface PlayerPrefs {
  skipBulkDownloadWarning: boolean
}

export interface PrefsStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const DEFAULT_PREFS: PlayerPrefs = {
  skipBulkDownloadWarning: false,
}

function getStore(store?: PrefsStore): PrefsStore {
  return (
    store ?? {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: (key) => window.localStorage.removeItem(key),
    }
  )
}

export function readPlayerPrefs(store?: PrefsStore): PlayerPrefs {
  const raw = getStore(store).getItem(PREFS_KEY)
  if (!raw) return { ...DEFAULT_PREFS }
  try {
    const parsed = JSON.parse(raw) as Partial<PlayerPrefs>
    return {
      skipBulkDownloadWarning: Boolean(parsed.skipBulkDownloadWarning),
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function writePlayerPrefs(prefs: PlayerPrefs, store?: PrefsStore): PlayerPrefs {
  getStore(store).setItem(PREFS_KEY, JSON.stringify(prefs))
  return prefs
}

export function setSkipBulkDownloadWarning(value: boolean, store?: PrefsStore): PlayerPrefs {
  return writePlayerPrefs({ ...readPlayerPrefs(store), skipBulkDownloadWarning: value }, store)
}
