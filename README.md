# NotyNyto Player (PWA)

Application musicale **React + TypeScript + Vite**, pensée comme une app locale installable (PWA), mobile-first, et partageable.

## Objectifs du projet

- **Offline first**: fonctionnement hors ligne après installation/cache.
- **Responsive mobile**: interface optimisée smartphone puis desktop.
- **Clean architecture**: séparation claire Domain / Application / Presentation.
- **Qualité stricte**: tests automatisés avec **couverture 100%**.

## Stack technique

- `react`, `react-dom`
- `typescript`
- `vite`
- `vite-plugin-pwa`
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`

## Architecture

```text
src/
  application/
    usecases/
      buildSharePayload.ts
      getThemeDescription.ts
      shareTrack.ts
  domain/
    entities/
      track.ts
  presentation/
    (UI portée par App.tsx + styles globaux)
  test/
    setup.ts
```

### Règles appliquées

- Le **domain** ne dépend de rien.
- Les **use-cases** orchestrent les règles métier.
- La **présentation** appelle les use-cases sans embarquer de logique métier profonde.

## Lancer en local

```bash
npm install
npm run dev
```

## Vérification qualité

```bash
npm run lint
npm run test
npm run test:coverage
```

Le seuil de couverture est configuré à **100%** (statements, branches, functions, lines) dans `vitest.config.ts`.

## Build production

```bash
npm run build
npm run preview
```

## Audio embarqué

Déposer les fichiers audio dans `public/tracks/`.

Fichier attendu pour le morceau initial:

- `public/tracks/double-face.exe-noty-v2.mp3`

## Déploiement Vercel

1. Connecter le repo GitHub sur [Vercel](https://vercel.com/).
2. Preset framework: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.

Le service worker PWA est actif en production sous HTTPS.
