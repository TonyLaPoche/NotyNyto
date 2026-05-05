export type Theme = 'noty' | 'nyto'

export interface Track {
  id: string
  title: string
  artist: string
  genre: string
  audioUrl: string
}

export const FEATURED_TRACK: Track = {
  id: 'noty-double-face-exe',
  title: 'Double Face.exe',
  artist: 'Noty',
  genre: 'HyperPop / Cyberbung / Darkcore / French Core',
  audioUrl: '/tracks/double-face.exe-noty-v2.mp3',
}
