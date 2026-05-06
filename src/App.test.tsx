import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { FEATURED_TRACK, TOP_TRACKS } from './domain/entities/track'

const shareTrackMock = vi.fn().mockResolvedValue('shared')
const playMock = vi.fn().mockResolvedValue(undefined)
const pauseMock = vi.fn()
const resumeMock = vi.fn().mockResolvedValue(undefined)
const closeMock = vi.fn().mockResolvedValue(undefined)
const createMediaElementSourceConnectMock = vi.fn()
const analyserConnectMock = vi.fn()
const audioContextCreatedMock = vi.fn()
const getByteFrequencyDataMock = vi.fn((array: Uint8Array) => {
  array.fill(180)
})

const fakeAnalyser = {
  fftSize: 0,
  smoothingTimeConstant: 0,
  frequencyBinCount: 64,
  connect: analyserConnectMock,
  getByteFrequencyData: getByteFrequencyDataMock,
}

class FakeAudioContext {
  destination = {}
  constructor() {
    audioContextCreatedMock()
  }
  createAnalyser() {
    return fakeAnalyser
  }
  createMediaElementSource() {
    return { connect: createMediaElementSourceConnectMock }
  }
  resume() {
    return resumeMock()
  }
  close() {
    return closeMock()
  }
}

const requestAnimationFrameMock = vi.fn(() => 99)
const cancelAnimationFrameMock = vi.fn()

vi.mock('./application/usecases/shareTrack', () => ({
  shareTrack: (...args: unknown[]) => shareTrackMock(...args),
}))

describe('App', () => {
  beforeEach(() => {
    shareTrackMock.mockClear()
    playMock.mockClear()
    pauseMock.mockClear()
    resumeMock.mockClear()
    closeMock.mockClear()
    createMediaElementSourceConnectMock.mockClear()
    analyserConnectMock.mockClear()
    getByteFrequencyDataMock.mockClear()
    audioContextCreatedMock.mockClear()
    requestAnimationFrameMock.mockClear()
    cancelAnimationFrameMock.mockClear()
    window.location.hash = '#/'

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: playMock,
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: pauseMock,
    })
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: FakeAudioContext,
    })
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrameMock,
    })
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrameMock,
    })
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
    expect(screen.getByRole('group', { name: 'Choix du theme' })).toBeInTheDocument()

    expect(root).toHaveClass('app--noty')
    fireEvent.click(screen.getByRole('button', { name: 'Nyto' }))
    expect(root).toHaveClass('app--nyto')
    expect(screen.getByText(/Mode Nyto/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Noty' }))
    expect(root).toHaveClass('app--noty')
    expect(screen.getByText(/Mode Noty/)).toBeInTheDocument()
  })

  it('declenche le use-case de partage', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }))
    expect(shareTrackMock).toHaveBeenCalledWith(FEATURED_TRACK)
  })

  it('ouvre une modal d information au clic telechargement', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Telecharger MP3' }))
    expect(screen.getByRole('dialog', { name: 'Conditions de telechargement' })).toBeInTheDocument()

    const finalDownloadLink = screen.getByRole('link', { name: 'Telecharger quand meme' })
    expect(finalDownloadLink).toHaveAttribute('href', FEATURED_TRACK.audioUrl)
    expect(finalDownloadLink).toHaveAttribute('download')
  })

  it('affiche les lyrics via un accordéon au clic', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Voir les lyrics' })).toBeInTheDocument()
    expect(screen.getByLabelText('Lyrics du son en cours')).toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Voir les lyrics' }))
    expect(screen.getByLabelText('Lyrics du son en cours')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Masquer les lyrics' })).toBeInTheDocument()
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

  it('gere le transport audio, seek et volume', async () => {
    render(<App />)

    const audio = screen.getByLabelText('Lecteur audio principal') as HTMLAudioElement
    fireEvent.change(screen.getByLabelText('Progression du morceau'), { target: { value: '10' } })
    expect(audio.currentTime).toBe(0)

    Object.defineProperty(audio, 'duration', { configurable: true, value: 125 })
    fireEvent.loadedMetadata(audio)

    expect(screen.getByText('02:05')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Progression du morceau'), { target: { value: '30' } })
    expect(audio.currentTime).toBe(30)
    expect(screen.getByText('00:30')).toBeInTheDocument()
    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 61 })
    fireEvent.timeUpdate(audio)
    expect(screen.getByText('01:01')).toBeInTheDocument()
    Object.defineProperty(audio, 'duration', { configurable: true, value: Number.NaN })
    fireEvent.loadedMetadata(audio)
    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: Number.NaN })
    fireEvent.timeUpdate(audio)
    expect(screen.getAllByText('00:00').length).toBeGreaterThanOrEqual(2)

    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '0.45' } })
    expect(screen.getByText('45%')).toBeInTheDocument()

    playMock.mockRejectedValueOnce(new Error('play blocked'))
    Object.defineProperty(audio, 'paused', { configurable: true, value: true })
    fireEvent.click(screen.getByRole('button', { name: 'PLAY' }))
    expect(screen.getByRole('button', { name: 'PLAY' })).toBeInTheDocument()

    Object.defineProperty(audio, 'paused', { configurable: true, value: true })
    fireEvent.click(screen.getByRole('button', { name: 'PLAY' }))
    await waitFor(() => expect(playMock).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'PAUSE' })).toBeInTheDocument()

    Object.defineProperty(audio, 'paused', { configurable: true, value: false })
    fireEvent.click(screen.getByRole('button', { name: 'PAUSE' }))
    expect(pauseMock).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'PLAY' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: TOP_TRACKS[1].title })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'PREV' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: TOP_TRACKS[0].title })).toBeInTheDocument())

    fireEvent.play(audio)
  })

  it('applique les modes de repetition sur la fin de track', async () => {
    render(<App />)

    const audio = screen.getByLabelText('Lecteur audio principal') as HTMLAudioElement
    Object.defineProperty(audio, 'paused', { configurable: true, value: true })
    fireEvent.click(screen.getByRole('button', { name: 'PLAY' }))
    await waitFor(() => expect(playMock).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'REP OFF' }))
    expect(screen.getByRole('button', { name: 'REP ALL' })).toBeInTheDocument()
    fireEvent.ended(audio)
    await waitFor(() => expect(screen.getByRole('heading', { name: TOP_TRACKS[1].title })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'REP ALL' }))
    expect(screen.getByRole('button', { name: 'REP 1' })).toBeInTheDocument()

    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 42 })
    fireEvent.ended(audio)
    expect(audio.currentTime).toBe(0)
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(3))

    fireEvent.click(screen.getByRole('button', { name: 'REP 1' }))
    expect(screen.getByRole('button', { name: 'REP OFF' })).toBeInTheDocument()
    fireEvent.ended(audio)
    expect(screen.getByRole('button', { name: 'PLAY' })).toBeInTheDocument()
  })

  it('active et stoppe l analyseur audio reactif', async () => {
    const { unmount } = render(<App />)
    const audio = screen.getByLabelText('Lecteur audio principal')
    const main = screen.getByRole('main')

    fireEvent.playing(audio)
    fireEvent.canPlay(audio)
    expect(audioContextCreatedMock).toHaveBeenCalledOnce()
    expect(createMediaElementSourceConnectMock).toHaveBeenCalledOnce()
    expect(analyserConnectMock).toHaveBeenCalledOnce()
    fireEvent.canPlay(audio)

    fireEvent.playing(audio)
    fireEvent.playing(audio)
    await waitFor(() => {
      expect(resumeMock).toHaveBeenCalled()
      expect(getByteFrequencyDataMock).toHaveBeenCalled()
      expect(requestAnimationFrameMock).toHaveBeenCalled()
      expect(main).toHaveStyle({ '--audio-energy': '0.706' })
    })

    fireEvent.pause(audio)
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(99)
    await waitFor(() => expect(main).toHaveStyle({ '--audio-energy': '0.000' }))

    unmount()
    expect(closeMock).toHaveBeenCalledOnce()
  })

  it('annule la frame reactive au unmount quand audio actif', async () => {
    const { unmount } = render(<App />)
    const audio = screen.getByLabelText('Lecteur audio principal')

    fireEvent.canPlay(audio)
    fireEvent.playing(audio)
    await waitFor(() => expect(requestAnimationFrameMock).toHaveBeenCalledWith(expect.any(Function)))

    unmount()
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(99)
  })

  it('navigue entre home songs gallery et change le son depuis la liste', async () => {
    render(<App />)

    const homeSection = screen.getByRole('region', { name: 'Presentation musicale Noty et Nyto' })
    expect(screen.getByRole('heading', { name: 'Presentation musicale' })).toBeInTheDocument()
    fireEvent.click(within(homeSection).getByRole('button', { name: /VapeStore/i }))
    await waitFor(() => expect(window.location.hash).toBe('#/songs'))
    expect(screen.getByRole('heading', { name: 'Top 10 songs' })).toBeInTheDocument()

    window.location.hash = '#/gallery'
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(screen.getByRole('heading', { name: 'Galerie DA Noty x Nyto' })).toBeInTheDocument()

    window.location.hash = '#/songs'
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(screen.getByRole('heading', { name: 'Top 10 songs' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Grand Frere Faux/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: TOP_TRACKS[0].title })).toBeInTheDocument())
    expect(pauseMock).toHaveBeenCalled()
  })

  it('gere la modal telechargement et ses fermetures', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Telecharger MP3' }))
    expect(screen.getByRole('dialog', { name: 'Conditions de telechargement' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('presentation'))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Conditions de telechargement' })).not.toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Telecharger MP3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Conditions de telechargement' })).not.toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Telecharger MP3' }))
    const forcedDownload = screen.getByRole('link', { name: 'Telecharger quand meme' })
    expect(forcedDownload).toHaveAttribute('download', `${FEATURED_TRACK.title.replace(/[^\w.-]+/g, '_')}.mp3`)
    forcedDownload.addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(forcedDownload)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Conditions de telechargement' })).not.toBeInTheDocument(),
    )
  })
})
