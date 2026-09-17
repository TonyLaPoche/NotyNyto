const HANDLE_PATTERN = /^[a-zA-Z0-9._-]{2,64}$/

export function parseArtistInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let candidate = trimmed

  try {
    if (/suno\.com/i.test(candidate)) {
      const withProtocol = candidate.startsWith('http') ? candidate : `https://${candidate}`
      const url = new URL(withProtocol)
      if (!url.hostname.includes('suno.com')) return null
      const match = url.pathname.match(/\/@([^/]+)/)
      if (!match) return null
      candidate = match[1]
    }
  } catch {
    return null
  }

  if (candidate.startsWith('@')) {
    candidate = candidate.slice(1)
  }

  candidate = candidate.split(/[?#/]/)[0]?.trim() ?? ''
  if (!HANDLE_PATTERN.test(candidate)) return null
  return candidate.toLowerCase()
}
