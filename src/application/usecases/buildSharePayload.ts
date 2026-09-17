import type { Track } from '../../domain/entities/track'

export interface SharePayload {
  title: string
  text: string
  url: string
}

export function buildSharePayload(track: Track, url: string): SharePayload {
  return {
    title: `${track.artist} - ${track.title}`,
    text: `Ecoute ${track.title} sur Suno (@${track.handle}).`,
    url: track.sunoUrl || url,
  }
}
