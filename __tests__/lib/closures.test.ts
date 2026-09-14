import { describe, it, expect } from 'vitest'
import {
  romeDateKey,
  serataLabel,
  buildEveningClosures,
  nightSpanDays,
} from '@/lib/closures'
import type { TangenzialeState, SvincoloState, TrattoState } from '@/lib/types'

function makeState(items: SvincoloState[]): TangenzialeState {
  return {
    items,
    updatedAt: '2026-07-02T16:00:00.000Z',
    source: 'test',
    stale: false,
  }
}

describe('romeDateKey', () => {
  it('istante UTC serale che a Roma è già il giorno dopo', () => {
    // 22:30 UTC = 00:30 del 3 luglio a Roma (estate, +02:00)
    expect(romeDateKey(new Date('2026-07-02T22:30:00Z'))).toBe('2026-07-03')
  })

  it('offset invernale +01:00', () => {
    expect(romeDateKey(new Date('2026-01-15T23:30:00+01:00'))).toBe('2026-01-15')
  })
})

describe('serataLabel', () => {
  const now = new Date('2026-07-02T18:00:00+02:00')

  it('from lo stesso giorno di now → Stanotte', () => {
    expect(serataLabel(new Date('2026-07-02T23:00:00+02:00'), now)).toBe('Stanotte')
  })

  it('from il giorno dopo → Domani notte', () => {
    expect(serataLabel(new Date('2026-07-03T23:00:00+02:00'), now)).toBe('Domani notte')
  })

  it('from a due giorni → data formattata it-IT', () => {
    const label = serataLabel(new Date('2026-07-04T23:00:00+02:00'), now)
    expect(label).toMatch(/sab/i)
    expect(label).toMatch(/lug/i)
  })

  it('finestra iniziata ieri sera ancora attiva alle 02:00 → Stanotte', () => {
    const nowNight = new Date('2026-07-02T02:00:00+02:00')
    expect(serataLabel(new Date('2026-07-01T23:00:00+02:00'), nowNight)).toBe('Stanotte')
  })

  it('scavalco di anno non crasha e restituisce data formattata', () => {
    const nowEnd = new Date('2026-12-30T18:00:00+01:00')
    const label = serataLabel(new Date('2027-01-02T23:00:00+01:00'), nowEnd)
    expect(label).toMatch(/gen/i)
  })
})

describe('nightSpanDays', () => {
  it('notte standard 23:00→06:00 attraversa 1 data-calendario', () => {
    expect(
      nightSpanDays('2026-07-02T23:00:00+02:00', '2026-07-03T06:00:00+02:00')
    ).toBe(1)
  })

  it('finestra nello stesso giorno → 0', () => {
    expect(
      nightSpanDays('2026-07-03T00:00:00+02:00', '2026-07-03T06:00:00+02:00')
    ).toBe(0)
  })

  it('finestra anomala multi-giorno → più di 1', () => {
    expect(
      nightSpanDays('2026-07-02T23:00:00+02:00', '2026-07-05T06:00:00+02:00')
    ).toBe(3)
  })
})

describe('buildEveningClosures', () => {
  const now = new Date('2026-07-02T18:00:00+02:00')

  it('restituisce struttura vuota con state null', () => {
    expect(buildEveningClosures(null, now)).toEqual({ permanent: [], groups: [] })
  })

  it('restituisce struttura vuota con items vuoto', () => {
    expect(buildEveningClosures(makeState([]), now)).toEqual({
      permanent: [],
      groups: [],
    })
  })

  it('filtra le finestre già concluse', () => {
    const state = makeState([
      {
        id: 'agnano',
        direzione: 'capodichino',
        status: 'rosso',
        windows: [
          { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
        ],
      },
    ])
    expect(buildEveningClosures(state, now).groups).toEqual([])
  })

  it('marca active la finestra in corso e non-active quella futura', () => {
    const nowNight = new Date('2026-07-02T23:30:00+02:00')
    const state = makeState([
      {
        id: 'agnano',
        direzione: 'capodichino',
        status: 'rosso',
        windows: [
          { from: '2026-07-02T23:00:00+02:00', to: '2026-07-03T06:00:00+02:00' },
          { from: '2026-07-03T23:00:00+02:00', to: '2026-07-04T06:00:00+02:00' },
        ],
      },
    ])
    const { groups } = buildEveningClosures(state, nowNight)
    expect(groups).toHaveLength(2)
    expect(groups[0].entries[0].active).toBe(true)
    expect(groups[1].entries[0].active).toBe(false)
  })

  it('raggruppa per la data di from (la serata), non di to', () => {
    const state = makeState([
      {
        id: 'vomero',
        direzione: 'pozzuoli',
        status: 'rosso',
        windows: [
          { from: '2026-07-02T23:00:00+02:00', to: '2026-07-03T06:00:00+02:00' },
        ],
      },
    ])
    const { groups } = buildEveningClosures(state, now)
    expect(groups).toHaveLength(1)
    expect(groups[0].dateKey).toBe('2026-07-02')
    expect(groups[0].label).toBe('Stanotte')
  })

  it('finestra che inizia a mezzanotte finisce nel gruppo del suo giorno', () => {
    const state = makeState([
      {
        id: 'capodichino',
        direzione: 'pozzuoli',
        status: 'rosso',
        windows: [
          { from: '2026-07-03T00:00:00+02:00', to: '2026-07-03T06:00:00+02:00' },
        ],
      },
    ])
    const { groups } = buildEveningClosures(state, now)
    expect(groups[0].dateKey).toBe('2026-07-03')
  })

  it('ordina i gruppi cronologicamente e le entries per from poi ordine SVINCOLI', () => {
    const state = makeState([
      {
        id: 'fuorigrotta',
        direzione: 'capodichino',
        status: 'rosso',
        windows: [
          { from: '2026-07-04T23:00:00+02:00', to: '2026-07-05T06:00:00+02:00' },
        ],
      },
      {
        id: 'vomero',
        direzione: 'pozzuoli',
        status: 'rosso',
        windows: [
          { from: '2026-07-03T23:00:00+02:00', to: '2026-07-04T06:00:00+02:00' },
        ],
      },
      {
        id: 'agnano',
        direzione: 'capodichino',
        status: 'rosso',
        windows: [
          { from: '2026-07-03T23:00:00+02:00', to: '2026-07-04T06:00:00+02:00' },
        ],
      },
    ])
    const { groups } = buildEveningClosures(state, now)
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-07-03', '2026-07-04'])
    // Stesso from: vince l'ordine canonico SVINCOLI (vomero prima di agnano)
    expect(groups[0].entries.map((e) => e.id)).toEqual(['vomero', 'agnano'])
  })

  it('deduplica finestre identiche dello stesso svincolo+direzione', () => {
    const win = { from: '2026-07-03T23:00:00+02:00', to: '2026-07-04T06:00:00+02:00' }
    const state = makeState([
      { id: 'agnano', direzione: 'capodichino', status: 'rosso', note: 'A', windows: [win] },
      { id: 'agnano', direzione: 'capodichino', status: 'rosso', note: 'B', windows: [win] },
    ])
    const { groups } = buildEveningClosures(state, now)
    expect(groups[0].entries).toHaveLength(1)
  })

  it('unisce finestre diverse di item duplicati stesso id+direzione (caso reale)', () => {
    const state = makeState([
      {
        id: 'capodichino',
        direzione: 'pozzuoli',
        status: 'rosso',
        note: 'Tratto A',
        windows: [
          { from: '2026-07-02T23:00:00+02:00', to: '2026-07-03T06:00:00+02:00' },
        ],
      },
      {
        id: 'capodichino',
        direzione: 'pozzuoli',
        status: 'rosso',
        note: 'Tratto B',
        windows: [
          { from: '2026-07-03T23:00:00+02:00', to: '2026-07-04T06:00:00+02:00' },
        ],
      },
    ])
    const { groups } = buildEveningClosures(state, now)
    expect(groups).toHaveLength(2)
    expect(groups[0].entries[0].note).toBe('Tratto A')
    expect(groups[1].entries[0].note).toBe('Tratto B')
  })

  it('item senza windows va in permanent, non nei gruppi', () => {
    const state = makeState([
      { id: 'cuma', direzione: 'pozzuoli', status: 'giallo', note: 'Lavori' },
    ])
    const { permanent, groups } = buildEveningClosures(state, now)
    expect(groups).toEqual([])
    expect(permanent).toHaveLength(1)
    expect(permanent[0]).toMatchObject({ id: 'cuma', status: 'giallo', note: 'Lavori' })
  })

  it('deduplica item permanenti identici', () => {
    const item: SvincoloState = { id: 'cuma', direzione: 'pozzuoli', status: 'giallo', note: 'Lavori' }
    const { permanent } = buildEveningClosures(makeState([item, { ...item }]), now)
    expect(permanent).toHaveLength(1)
  })

  it('risolve il nome canonico da SVINCOLI con fallback all\'id', () => {
    const state = makeState([
      {
        id: 'fuorigrotta',
        direzione: 'pozzuoli',
        status: 'rosso',
        windows: [
          { from: '2026-07-03T23:00:00+02:00', to: '2026-07-04T06:00:00+02:00' },
        ],
      },
      {
        id: 'svincolo-fantasma',
        direzione: 'pozzuoli',
        status: 'rosso',
        windows: [
          { from: '2026-07-03T23:30:00+02:00', to: '2026-07-04T06:00:00+02:00' },
        ],
      },
    ])
    const { groups } = buildEveningClosures(state, now)
    const nomi = groups[0].entries.map((e) => e.nome)
    expect(nomi).toContain('Fuorigrotta')
    expect(nomi).toContain('svincolo-fantasma')
  })

  it('gestisce il cambio ora legale→solare di ottobre senza errori di grouping', () => {
    const nowOct = new Date('2026-10-24T18:00:00+02:00')
    const state = makeState([
      {
        id: 'agnano',
        direzione: 'capodichino',
        status: 'rosso',
        windows: [
          { from: '2026-10-24T23:00:00+02:00', to: '2026-10-25T06:00:00+01:00' },
        ],
      },
    ])
    const { groups } = buildEveningClosures(state, nowOct)
    expect(groups).toHaveLength(1)
    expect(groups[0].dateKey).toBe('2026-10-24')
    expect(groups[0].label).toBe('Stanotte')
  })

  it('include i tratti con finestra: nome combinato, status rosso, nota con uscita obbligatoria', () => {
    const tratto: TrattoState = {
      da: 'capodichino',
      a: 'capodimonte',
      direzione: 'pozzuoli',
      uscitaObbligatoria: 'capodichino',
      windows: [
        { from: '2026-07-02T23:00:00+02:00', to: '2026-07-03T06:00:00+02:00' },
      ],
    }
    const state: TangenzialeState = { ...makeState([]), tratti: [tratto] }
    const { groups } = buildEveningClosures(state, now)
    expect(groups).toHaveLength(1)
    const [entry] = groups[0].entries
    expect(entry.nome).toBe('Capodichino / Aeroporto → Capodimonte')
    expect(entry.status).toBe('rosso')
    expect(entry.note).toContain('Uscita obbligatoria: Capodichino / Aeroporto')
  })

  it('tratto senza windows va in permanent con status rosso', () => {
    const tratto: TrattoState = {
      da: 'camaldoli',
      a: 'arenella',
      direzione: 'capodichino',
      uscitaObbligatoria: 'camaldoli',
    }
    const state: TangenzialeState = { ...makeState([]), tratti: [tratto] }
    const { permanent, groups } = buildEveningClosures(state, now)
    expect(groups).toEqual([])
    expect(permanent).toHaveLength(1)
    expect(permanent[0].status).toBe('rosso')
  })

  it('finestra a fine indeterminata: compare nei gruppi (non permanent) finché non scade', () => {
    const state = makeState([
      {
        id: 'fuorigrotta',
        direzione: 'pozzuoli',
        status: 'rosso',
        windows: [{ from: '2026-07-02T19:00:00+02:00' }],
      },
    ])
    const subito = buildEveningClosures(state, new Date('2026-07-02T20:00:00+02:00'))
    expect(subito.permanent).toEqual([])
    expect(subito.groups).toHaveLength(1)
    expect(subito.groups[0].entries[0].to).toBeUndefined()
    expect(subito.groups[0].entries[0].active).toBe(true)

    const dopoScadenza = buildEveningClosures(state, new Date('2026-07-03T07:00:00+02:00'))
    expect(dopoScadenza.groups).toEqual([])
  })

  it('filtra le finestre di tratto già concluse', () => {
    const tratto: TrattoState = {
      da: 'capodichino',
      a: 'capodimonte',
      direzione: 'pozzuoli',
      uscitaObbligatoria: 'capodichino',
      windows: [
        { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
      ],
    }
    const state: TangenzialeState = { ...makeState([]), tratti: [tratto] }
    expect(buildEveningClosures(state, now).groups).toEqual([])
  })
})
