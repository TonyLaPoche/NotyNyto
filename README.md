# Suno Public Player

PWA multi-artistes pour ecouter les **sons publics** Suno.

## Idee

1. Entrer un handle (`@noty2686`) ou une URL (`https://suno.com/@noty2686?page=songs`)
2. L'app lit le profil **public** via un proxy serveur
3. Lecture en stream (CloudFront)
4. Telechargement local optionnel (IndexedDB) si le reseau est bon
5. Bibliotheque persistee dans `localStorage`

Demo prechargee: `@noty2686`.

## Stack

- React + TypeScript + Vite
- Vercel Serverless (`/api/suno/profile`)
- PWA (`vite-plugin-pwa`)
- Clean architecture: `domain` / `application` / `presentation`

## Scripts

```bash
npm install
npm run dev
npm run test
npm run test:coverage
npm run build
```

## Deploy Vercel

- Framework: Vite
- Root: `./`
- Build: `npm run build`
- Output: `dist`
- API routes: dossier `api/`

## Limites

- Endpoint Suno public non officiel: peut evoluer
- Sons prives ignores
- Usage personnel, non affilie a Suno
