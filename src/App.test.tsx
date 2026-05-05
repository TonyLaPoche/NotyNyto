import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { FEATURED_TRACK } from './domain/entities/track'

const shareTrackMock = vi.fn().mockResolvedValue('shared')

vi.mock('./application/usecases/shareTrack', () => ({
  shareTrack: (...args: unknown[]) => shareTrackMock(...args),
}))

describe('App', () => {
  beforeEach(() => {
    shareTrackMock.mockClear()
  })

  it('affiche les informations principales du track', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'NotyNyto Offline Player' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: FEATURED_TRACK.title })).toBeInTheDocument()
    expect(screen.getByText(FEATURED_TRACK.genre)).toBeInTheDocument()
    expect(screen.getByLabelText('Lecteur audio principal')).toBeInTheDocument()
  })

  it('change de theme via les chips', () => {
    render(<App />)
    const root = screen.getByRole('main')

    expect(root).toHaveClass('app--noty')
    fireEvent.click(screen.getByRole('button', { name: 'Theme Nyto' }))
    expect(root).toHaveClass('app--nyto')
    expect(screen.getByText(/Mode Nyto/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Theme Noty' }))
    expect(root).toHaveClass('app--noty')
    expect(screen.getByText(/Mode Noty/)).toBeInTheDocument()
  })

  it('declenche le use-case de partage', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }))
    expect(shareTrackMock).toHaveBeenCalledWith(FEATURED_TRACK)
  })

  it("affiche le bouton d'installation puis le masque apres confirmation", async () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: "Installer l'app" })).not.toBeInTheDocument()

    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
    }
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    })

    window.dispatchEvent(event)
    const button = await screen.findByRole('button', { name: "Installer l'app" })
    fireEvent.click(button)

    await vi.waitFor(() => {
      expect(prompt).toHaveBeenCalledOnce()
      expect(screen.queryByRole('button', { name: "Installer l'app" })).not.toBeInTheDocument()
    })
  })
})
