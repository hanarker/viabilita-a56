import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted garantisce che mockCreate sia disponibile dentro vi.mock (che viene hoistato)
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

vi.mock('openai', () => {
  class MockOpenAI {
    chat = { completions: { create: mockCreate } }
  }
  return { default: MockOpenAI }
})

import { interpretAvvisi } from '@/lib/interpreter'
import { HOMEPAGE_ALERT_HEADING } from '@/lib/scraper-parse'

const AVVISO_ESEMPIO = `Fuorigrotta chiusa in direzione Pozzuoli dalle 23:00 alle 06:00.
Chiuso il tratto autostradale tra Camaldoli e Arenella in direzione Capodichino,
con uscita obbligatoria Camaldoli.`

function mockResponse(body: unknown) {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(body) } }],
  })
}

describe('interpretAvvisi', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('classifica una chiusura di svincolo come item giallo', async () => {
    mockResponse({
      items: [
        { id: 'fuorigrotta', direzione: 'pozzuoli', status: 'giallo', note: 'Chiusa 23:00-06:00' },
      ],
      tratti: [],
    })

    const { items } = await interpretAvvisi('sk-test', AVVISO_ESEMPIO)
    const fuorigrotta = items.find(
      (i) => i.id === 'fuorigrotta' && i.direzione === 'pozzuoli'
    )
    expect(fuorigrotta?.status).toBe('giallo')
  })

  it('classifica una chiusura di tratto come elemento in "tratti" con uscita obbligatoria', async () => {
    mockResponse({
      items: [],
      tratti: [
        {
          da: 'camaldoli',
          a: 'arenella',
          direzione: 'capodichino',
          uscitaObbligatoria: 'camaldoli',
          note: 'Chiusura tratto notturna',
        },
      ],
    })

    const { tratti } = await interpretAvvisi('sk-test', AVVISO_ESEMPIO)
    expect(tratti).toHaveLength(1)
    expect(tratti[0]).toMatchObject({
      da: 'camaldoli',
      a: 'arenella',
      direzione: 'capodichino',
      uscitaObbligatoria: 'camaldoli',
    })
  })

  it('restituisce tratti come array vuoto se il campo è assente dalla risposta LLM', async () => {
    mockResponse({ items: [] })

    const { tratti } = await interpretAvvisi('sk-test', AVVISO_ESEMPIO)
    expect(tratti).toEqual([])
  })

  it('lancia un errore se la risposta LLM è JSON malformato', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'questo non è json valido!!!' } }],
    })

    await expect(interpretAvvisi('sk-test', AVVISO_ESEMPIO)).rejects.toThrow()
  })

  it('lancia un errore se un item ha uno status non valido', async () => {
    mockResponse({
      items: [{ id: 'fuorigrotta', direzione: 'pozzuoli', status: 'blu' }],
    })

    await expect(interpretAvvisi('sk-test', AVVISO_ESEMPIO)).rejects.toThrow()
  })

  it('lancia un errore se un item ha una direzione non valida (es. "autostrade")', async () => {
    // Regressione: il sito sorgente usa "in direzione Autostrade" come sinonimo di
    // "capodichino" — se il prompt non lo normalizza esplicitamente, l'LLM copia il
    // testo originale e produce un valore fuori enum, facendo fallire l'update.
    mockResponse({
      items: [{ id: 'fuorigrotta', direzione: 'autostrade', status: 'giallo' }],
    })

    await expect(interpretAvvisi('sk-test', AVVISO_ESEMPIO)).rejects.toThrow()
  })

  it('lancia un errore se un item ha un id svincolo inesistente', async () => {
    mockResponse({
      items: [{ id: 'svincolo-fantasma', direzione: 'pozzuoli', status: 'giallo' }],
    })

    await expect(interpretAvvisi('sk-test', AVVISO_ESEMPIO)).rejects.toThrow()
  })

  it('lancia un errore se un tratto referenzia un id svincolo inesistente', async () => {
    mockResponse({
      items: [],
      tratti: [
        {
          da: 'camaldoli',
          a: 'svincolo-fantasma',
          direzione: 'capodichino',
          uscitaObbligatoria: 'camaldoli',
        },
      ],
    })

    await expect(interpretAvvisi('sk-test', AVVISO_ESEMPIO)).rejects.toThrow()
  })

  it('istruisce il modello a normalizzare i sinonimi di direzione presenti nel sito sorgente', async () => {
    mockResponse({ items: [] })

    await interpretAvvisi('sk-test', AVVISO_ESEMPIO)

    const [{ messages }] = mockCreate.mock.calls[0]
    const systemPrompt: string = messages[0].content
    expect(systemPrompt).toMatch(/autostrade/i)
    expect(systemPrompt).toMatch(/capodichino/i)
    expect(systemPrompt).toMatch(/normalizz/i)
  })

  it('istruisce il modello a distinguere svincoli (giallo) da tratti con uscita obbligatoria (rosso implicito)', async () => {
    mockResponse({ items: [] })

    await interpretAvvisi('sk-test', AVVISO_ESEMPIO)

    const [{ messages }] = mockCreate.mock.calls[0]
    const systemPrompt: string = messages[0].content
    expect(systemPrompt).toMatch(/uscita obbligatoria/i)
    expect(systemPrompt).toMatch(/"tratti"/)
    expect(systemPrompt).toMatch(/"items"/)
  })

  it('istruisce il modello sul caso "ore 24,00 del giorno X" come mezzanotte di fine giornata (non giorno X)', async () => {
    mockResponse({ items: [] })

    await interpretAvvisi('sk-test', AVVISO_ESEMPIO)

    const [{ messages }] = mockCreate.mock.calls[0]
    const systemPrompt: string = messages[0].content
    expect(systemPrompt).toMatch(/ore 24,00/)
    expect(systemPrompt).toMatch(/mezzanotte/i)
    // Regressione diretta del bug osservato su "capodichino": l'esempio deve
    // mostrare lo shift al giorno successivo (X+1), non il giorno X.
    expect(systemPrompt).toContain('2026-07-04T00:00:00+02:00')
    expect(systemPrompt).toContain('2026-07-04T06:00:00+02:00')
  })

  it('istruisce il modello a unire le finestre quando lo stesso svincolo/tratto compare in più paragrafi separati', async () => {
    // Regressione: il sito ripete lo stesso tratto "Capodichino Aeroporto/Capodimonte"
    // in due paragrafi diversi (uno per "questa settimana", uno per "la settimana
    // successiva") con date diverse. L'LLM fondeva i due paragrafi in un solo tratto
    // tenendo solo le finestre dell'ULTIMO paragrafo, perdendo silenziosamente quelle
    // del primo (incluse chiusure in corso quella notte stessa).
    mockResponse({ items: [] })

    await interpretAvvisi('sk-test', AVVISO_ESEMPIO)

    const [{ messages }] = mockCreate.mock.calls[0]
    const systemPrompt: string = messages[0].content
    expect(systemPrompt).toMatch(/più paragrafi/i)
    expect(systemPrompt).toMatch(/settiman/i)
    expect(systemPrompt).toMatch(/TUTTE le\s*\n?\s*finestre di TUTTI i paragrafi/i)
  })

  it('istruisce il modello a enumerare tutte le clausole/date di una frase composta senza ometterne nessuna', async () => {
    mockResponse({ items: [] })

    await interpretAvvisi('sk-test', AVVISO_ESEMPIO)

    const [{ messages }] = mockCreate.mock.calls[0]
    const systemPrompt: string = messages[0].content
    // Regressione diretta del bug osservato su "camaldoli": la clausola
    // "24,00 del giorno 3 luglio" veniva omessa insieme ad altre a "23,00".
    expect(systemPrompt).toMatch(/SENZA\s+OMETTERNE\s+NESSUNA/)
    expect(systemPrompt).toMatch(/clausola/i)
    expect(systemPrompt).toMatch(/orario di inizio/i)
  })

  it('accetta e restituisce il campo windows con finestre temporali su un item', async () => {
    mockResponse({
      items: [
        {
          id: 'fuorigrotta',
          direzione: 'pozzuoli',
          status: 'giallo',
          note: 'Chiusa 23:00-06:00',
          windows: [
            { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
          ],
        },
      ],
    })

    const { items } = await interpretAvvisi('sk-test', AVVISO_ESEMPIO)
    expect(items[0].windows).toEqual([
      { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
    ])
  })

  it('accetta e restituisce il campo windows con finestre temporali su un tratto', async () => {
    mockResponse({
      items: [],
      tratti: [
        {
          da: 'camaldoli',
          a: 'arenella',
          direzione: 'capodichino',
          uscitaObbligatoria: 'camaldoli',
          windows: [
            { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
          ],
        },
      ],
    })

    const { tratti } = await interpretAvvisi('sk-test', AVVISO_ESEMPIO)
    expect(tratti[0].windows).toEqual([
      { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
    ])
  })

  it('include nel prompt la data/ora corrente (parametro now) con offset Europe/Rome', async () => {
    mockResponse({ items: [] })

    // 1 luglio 2026, 12:00 UTC → estate, offset Europe/Rome = +02:00
    const now = new Date('2026-07-01T12:00:00.000Z')
    await interpretAvvisi('sk-test', AVVISO_ESEMPIO, now)

    const [{ messages }] = mockCreate.mock.calls[0]
    const systemPrompt: string = messages[0].content
    expect(systemPrompt).toContain('2026-07-01T14:00:00+02:00')
    expect(systemPrompt).toMatch(/windows/i)
  })

  it('usa la data corrente reale come default quando "now" non è passato', async () => {
    mockResponse({ items: [] })

    await interpretAvvisi('sk-test', AVVISO_ESEMPIO)

    const [{ messages }] = mockCreate.mock.calls[0]
    const systemPrompt: string = messages[0].content
    const currentYear = new Date().getFullYear().toString()
    expect(systemPrompt).toContain(currentYear)
  })

  it('istruisce a escludere le finestre esplicitamente annullate invece di fonderle', async () => {
    mockResponse({ items: [] })

    await interpretAvvisi('sk-test', AVVISO_ESEMPIO)

    const [{ messages }] = mockCreate.mock.calls[0]
    const systemPrompt: string = messages[0].content
    expect(systemPrompt).toMatch(/NON SARÀ EFFETTUATA/)
    expect(systemPrompt).toMatch(/ESCLUSA/)
  })

  it('istruisce a dare priorità al blocco avviso homepage in caso di conflitto', async () => {
    mockResponse({ items: [] })

    await interpretAvvisi('sk-test', AVVISO_ESEMPIO)

    const [{ messages }] = mockCreate.mock.calls[0]
    const systemPrompt: string = messages[0].content
    expect(systemPrompt).toContain(HOMEPAGE_ALERT_HEADING)
    expect(systemPrompt).toMatch(/PRIORITÀ/)
  })

  it('istruisce a omettere "windows" per chiusure con inizio ma senza fine definita', async () => {
    mockResponse({ items: [] })

    await interpretAvvisi('sk-test', AVVISO_ESEMPIO)

    const [{ messages }] = mockCreate.mock.calls[0]
    const systemPrompt: string = messages[0].content
    expect(systemPrompt).toMatch(/cessate esigenze/)
  })
})
