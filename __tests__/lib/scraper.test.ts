import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const fixtureLista = readFileSync(
  join(process.cwd(), 'fixtures/html/viabilita-lista.html'),
  'utf-8'
)
const fixtureDettaglio = readFileSync(
  join(process.cwd(), 'fixtures/html/avviso-dettaglio.html'),
  'utf-8'
)
const fixtureVuota = readFileSync(
  join(process.cwd(), 'fixtures/html/nessun-avviso.html'),
  'utf-8'
)

const BASE_URL = 'https://example.com'

// Mock globale di fetch prima di importare lo scraper
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function okResponse(body: string) {
  return { ok: true, status: 200, text: () => Promise.resolve(body) }
}

function errorResponse(status: number) {
  return { ok: false, status }
}

describe('scrapeAvvisi', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
  })

  it('scarica la lista e i dettagli, restituendo un source con i titoli concatenati', async () => {
    mockFetch.mockImplementation((input: string | URL) => {
      const url = input.toString()
      if (url.includes('/w/')) {
        return Promise.resolve(okResponse(fixtureDettaglio))
      }
      return Promise.resolve(okResponse(fixtureLista))
    })

    const { scrapeAvvisi } = await import('@/lib/scraper')
    const source = await scrapeAvvisi(BASE_URL)

    expect(mockFetch).toHaveBeenCalledTimes(4) // 1 lista + 3 dettagli (MAX_AVVISI)
    expect(source).toContain('Chiusure dal 31.08 al 06.09.2026')
    expect(source).toContain('Chiusure dal 24.08 al 30.08.2026')
    expect(source).toContain('Chiusure dal 17.08 al 23.08.2026')
    expect(source).not.toContain('Chiusura 02.08')
  })

  it('lancia un errore se il fetch della lista fallisce', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(503))

    const { scrapeAvvisi } = await import('@/lib/scraper')
    await expect(scrapeAvvisi(BASE_URL)).rejects.toThrow('503')
  })

  it('lancia un errore se la lista non contiene avvisi', async () => {
    mockFetch.mockResolvedValueOnce(okResponse(fixtureVuota))

    const { scrapeAvvisi } = await import('@/lib/scraper')
    await expect(scrapeAvvisi(BASE_URL)).rejects.toThrow('Nessun avviso')
  })

  it('degrada e ignora i dettagli falliti, purché almeno uno riesca', async () => {
    let dettagliChiamate = 0
    mockFetch.mockImplementation((input: string | URL) => {
      const url = input.toString()
      if (url.includes('/w/')) {
        dettagliChiamate += 1
        if (dettagliChiamate === 1) {
          return Promise.resolve(errorResponse(500))
        }
        return Promise.resolve(okResponse(fixtureDettaglio))
      }
      return Promise.resolve(okResponse(fixtureLista))
    })

    const { scrapeAvvisi } = await import('@/lib/scraper')
    const source = await scrapeAvvisi(BASE_URL)

    expect(source).toContain('Chiusure dal 24.08 al 30.08.2026')
  })

  it('lancia un errore se tutti i dettagli falliscono', async () => {
    mockFetch.mockImplementation((input: string | URL) => {
      const url = input.toString()
      if (url.includes('/w/')) {
        return Promise.resolve(errorResponse(500))
      }
      return Promise.resolve(okResponse(fixtureLista))
    })

    const { scrapeAvvisi } = await import('@/lib/scraper')
    await expect(scrapeAvvisi(BASE_URL)).rejects.toThrow('Nessun avviso recuperabile')
  })
})
