import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  parseListaAvvisi,
  parseCorpoAvviso,
  formatSource,
  type Avviso,
} from '@/lib/scraper-parse'

const BASE_URL = 'https://www.tangenzialedinapoli.it'

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

describe('parseListaAvvisi', () => {
  it('estrae tutti gli avvisi dalla pagina viabilità', () => {
    const avvisi = parseListaAvvisi(fixtureLista, BASE_URL)

    expect(avvisi).toHaveLength(12)
  })

  it('estrae titolo, data e url assoluto del primo avviso', () => {
    const [primo] = parseListaAvvisi(fixtureLista, BASE_URL)

    expect(primo.titolo).toBe('Chiusure dal 31.08 al 06.09.2026')
    expect(primo.data).toBe('28-08-2026')
    expect(primo.url).toContain('/w/chiusure-dal-31.08-al-06.09.2026')
    expect(primo.url.startsWith('https://')).toBe(true)
  })

  it('restituisce un array vuoto se la pagina non contiene una lista di avvisi', () => {
    const avvisi = parseListaAvvisi(fixtureVuota, BASE_URL)

    expect(avvisi).toEqual([])
  })
})

describe('parseCorpoAvviso', () => {
  it('estrae il testo del corpo avviso dalla pagina di dettaglio', () => {
    const corpo = parseCorpoAvviso(fixtureDettaglio)

    expect(corpo).toContain('uscita obbligatoria')
    expect(corpo).toContain('Capodichino Aeroporto/Capodimonte')
    expect(corpo).toContain('dalle ore 24,00 del 04/09/2026')
  })

  it('preserva i confini di blocco come righe separate', () => {
    const corpo = parseCorpoAvviso(fixtureDettaglio)
    const righeDalleOre = corpo
      .split('\n')
      .filter((riga) => riga.startsWith('dalle ore'))

    expect(righeDalleOre.length).toBeGreaterThanOrEqual(5)
  })

  it('non produce righe vuote né spazi multipli residui', () => {
    const corpo = parseCorpoAvviso(fixtureDettaglio)
    const righe = corpo.split('\n')

    expect(righe.every((riga) => riga.trim().length > 0)).toBe(true)
    expect(corpo).not.toMatch(/ {2,}/)
  })

  it('lancia un errore se il corpo avviso non è trovato', () => {
    expect(() => parseCorpoAvviso(fixtureLista)).toThrow(
      'Corpo avviso non trovato'
    )
  })
})

describe('formatSource', () => {
  it('formatta gli avvisi con intestazione e blocchi separati da riga vuota', () => {
    const avvisi: Avviso[] = [
      {
        titolo: 'Avviso uno',
        data: '28-08-2026',
        url: 'https://example.com/uno',
        corpo: 'Corpo del primo avviso.',
      },
      {
        titolo: 'Avviso due',
        data: '08-08-2026',
        url: 'https://example.com/due',
        corpo: 'Corpo del secondo avviso.',
      },
    ]

    const source = formatSource(avvisi)

    expect(source).toBe(
      '## Avviso uno (pubblicato il 28-08-2026)\n' +
        'Corpo del primo avviso.\n' +
        '\n' +
        '## Avviso due (pubblicato il 08-08-2026)\n' +
        'Corpo del secondo avviso.'
    )
  })
})
