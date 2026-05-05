import type { Track } from '../../domain/entities/track'
import { buildSharePayload } from './buildSharePayload'

export interface ShareDependencies {
  locationHref: string
  share?: (data: { title: string; text: string; url: string }) => Promise<void>
  writeText: (value: string) => Promise<void>
  notify: (value: string) => void
}

const fallbackMessage = 'Lien copie dans le presse-papiers.'

export async function shareTrack(
  track: Track,
  dependencies: ShareDependencies = {
    locationHref: window.location.href,
    share: navigator.share?.bind(navigator),
    writeText: navigator.clipboard.writeText.bind(navigator.clipboard),
    notify: window.alert,
  },
): Promise<'shared' | 'copied'> {
  const payload = buildSharePayload(track, dependencies.locationHref)

  if (dependencies.share) {
    await dependencies.share(payload)
    return 'shared'
  }

  await dependencies.writeText(`${payload.title}\n${payload.url}`)
  dependencies.notify(fallbackMessage)
  return 'copied'
}
