import type { Track } from '../../domain/entities/track'

export interface SharePayload {
  title: string
  text: string
  url: string
}

export function buildSharePayload(track: Track, url: string): SharePayload {
  return {
    title: `${track.artist} - ${track.title}`,
    text: `Decouvre ${track.title} (${track.genre}) dans mon univers Noty x Nyto.`,
    url,
  }
}
