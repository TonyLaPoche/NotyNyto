import type { Theme } from '../../domain/entities/track'

const descriptions: Record<Theme, string> = {
  noty: "Mode Noty: teintes chaudes et energie agressive pour un rendu HyperPop dark.",
  nyto: 'Mode Nyto: teintes froides et ambiance cyberpunk nocturne pour le focus.',
}

export function getThemeDescription(theme: Theme): string {
  return descriptions[theme]
}
