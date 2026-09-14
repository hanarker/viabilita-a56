import { describe, it, expect } from 'vitest'
import {
  worstStatus,
  statusBySvincolo,
  statusBySvincoloForMap,
  activeTratti,
  isWindowActive,
  effectiveStatus,
  isWindowOnDate,
  statusBySvincoloForDateKey,
  activeTrattiForDateKey,
  statusBySvincoloForMapForDateKey,
} from '@/lib/status-util'
import type { TangenzialeState, SvincoloState, ClosureWindow } from '@/lib/types'

describe('worstStatus', () => {
  it('ritorna verde su lista vuota', () => {
    expect(worstStatus([])).toBe('verde')
  })

  it('ritorna verde se tutti verdi', () => {
    expect(worstStatus(['verde', 'verde'])).toBe('verde')
  })

  it('ritorna giallo se il peggiore è giallo', () => {
    expect(worstStatus(['verde', 'giallo', 'verde'])).toBe('giallo')
  })

  it('ritorna rosso se presente almeno un rosso', () => {
    expect(worstStatus(['verde', 'giallo', 'rosso'])).toBe('rosso')
  })

  it('rosso vince su giallo', () => {
    expect(worstStatus(['giallo', 'rosso'])).toBe('rosso')
  })
})

describe('isWindowActive', () => {
  const notte: ClosureWindow = {
    from: '2026-06-30T23:00:00+02:00',
    to: '2026-07-01T06:00:00+02:00',
  }

  it('ritorna true se windows è assente (sempre attivo)', () => {
    expect(isWindowActive(undefined, new Date('2026-07-01T12:00:00+02:00'))).toBe(true)
  })

  it('ritorna true se windows è vuoto (sempre attivo)', () => {
    expect(isWindowActive([], new Date('2026-07-01T12:00:00+02:00'))).toBe(true)
  })

  it('ritorna true se now cade dentro la finestra', () => {
    expect(isWindowActive([notte], new Date('2026-07-01T02:00:00+02:00'))).toBe(true)
  })

  it('ritorna false se now è prima della finestra', () => {
    expect(isWindowActive([notte], new Date('2026-06-30T15:00:00+02:00'))).toBe(false)
  })

  it('ritorna false se now è dopo la finestra', () => {
    expect(isWindowActive([notte], new Date('2026-07-01T12:00:00+02:00'))).toBe(false)
  })

  it('ritorna true se now cade in una qualsiasi tra più finestre', () => {
    const altra: ClosureWindow = {
      from: '2026-07-02T23:00:00+02:00',
      to: '2026-07-03T06:00:00+02:00',
    }
    expect(
      isWindowActive([notte, altra], new Date('2026-07-02T23:30:00+02:00'))
    ).toBe(true)
  })

  describe('finestra a fine indeterminata ("to" assente)', () => {
    const openEnded: ClosureWindow = { from: '2026-09-13T19:00:00+02:00' }

    it('ritorna true subito dopo l\'inizio', () => {
      expect(isWindowActive([openEnded], new Date('2026-09-13T20:00:00+02:00'))).toBe(true)
    })

    it('ritorna false prima della scadenza implicita (06:00 del giorno dopo)', () => {
      expect(isWindowActive([openEnded], new Date('2026-09-14T05:59:00+02:00'))).toBe(true)
    })

    it('ritorna false (verde) dopo la scadenza implicita alle 06:00 del giorno dopo', () => {
      expect(isWindowActive([openEnded], new Date('2026-09-14T07:00:00+02:00'))).toBe(false)
    })
  })
})

describe('effectiveStatus', () => {
  const notte: ClosureWindow = {
    from: '2026-06-30T23:00:00+02:00',
    to: '2026-07-01T06:00:00+02:00',
  }

  it('ritorna lo status annunciato se la finestra è attiva', () => {
    const item: SvincoloState = {
      id: 'fuorigrotta',
      direzione: 'pozzuoli',
      status: 'rosso',
      windows: [notte],
    }
    expect(effectiveStatus(item, new Date('2026-07-01T02:00:00+02:00'))).toBe('rosso')
  })

  it('ritorna verde se la finestra non è attiva', () => {
    const item: SvincoloState = {
      id: 'fuorigrotta',
      direzione: 'pozzuoli',
      status: 'rosso',
      windows: [notte],
    }
    expect(effectiveStatus(item, new Date('2026-07-01T12:00:00+02:00'))).toBe('verde')
  })

  it('ritorna lo status annunciato se non ci sono finestre (sempre attivo)', () => {
    const item: SvincoloState = {
      id: 'fuorigrotta',
      direzione: 'pozzuoli',
      status: 'giallo',
    }
    expect(effectiveStatus(item, new Date('2026-07-01T12:00:00+02:00'))).toBe('giallo')
  })
})

describe('statusBySvincolo', () => {
  const state: TangenzialeState = {
    items: [
      { id: 'fuorigrotta', direzione: 'pozzuoli', status: 'rosso', note: 'Chiusa' },
      { id: 'fuorigrotta', direzione: 'capodichino', status: 'giallo', note: 'Lavori' },
      { id: 'camaldoli', direzione: 'pozzuoli', status: 'verde' },
    ],
    updatedAt: '2026-06-29T00:00:00.000Z',
    source: 'test',
    stale: false,
  }

  it('calcola lo stato per ogni direzione di fuorigrotta', () => {
    const map = statusBySvincolo(state)
    const f = map.get('fuorigrotta')
    expect(f?.pozzuoli).toBe('rosso')
    expect(f?.capodichino).toBe('giallo')
  })

  it('worst di fuorigrotta è rosso (rosso > giallo)', () => {
    const map = statusBySvincolo(state)
    expect(map.get('fuorigrotta')?.worst).toBe('rosso')
  })

  it('uno svincolo senza items in state ha default verde', () => {
    const map = statusBySvincolo(state)
    // capodimonte non è negli items
    const c = map.get('capodimonte')
    expect(c?.pozzuoli).toBe('verde')
    expect(c?.capodichino).toBe('verde')
    expect(c?.worst).toBe('verde')
  })

  it('camaldoli pozzuoli è verde, capodichino default verde, worst verde', () => {
    const map = statusBySvincolo(state)
    const c = map.get('camaldoli')
    expect(c?.pozzuoli).toBe('verde')
    expect(c?.capodichino).toBe('verde')
    expect(c?.worst).toBe('verde')
  })

  it('uno svincolo rosso con finestra notturna è verde di giorno', () => {
    const stateConFinestra: TangenzialeState = {
      items: [
        {
          id: 'agnano',
          direzione: 'capodichino',
          status: 'rosso',
          windows: [
            { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
          ],
        },
      ],
      updatedAt: '2026-07-01T12:00:00+02:00',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincolo(stateConFinestra, new Date('2026-07-01T12:00:00+02:00'))
    expect(map.get('agnano')?.capodichino).toBe('verde')
  })

  it('uno svincolo rosso con finestra notturna è rosso di notte (finestra attiva)', () => {
    const stateConFinestra: TangenzialeState = {
      items: [
        {
          id: 'agnano',
          direzione: 'capodichino',
          status: 'rosso',
          windows: [
            { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
          ],
        },
      ],
      updatedAt: '2026-07-01T00:00:00+02:00',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincolo(stateConFinestra, new Date('2026-07-01T02:00:00+02:00'))
    expect(map.get('agnano')?.capodichino).toBe('rosso')
  })

  it('con item duplicati stesso id+direzione, usa quello con finestra attiva ora anche se non è il primo', () => {
    const stateConDuplicati: TangenzialeState = {
      items: [
        {
          id: 'fuorigrotta',
          direzione: 'capodichino',
          status: 'rosso',
          windows: [
            { from: '2026-06-29T23:00:00+02:00', to: '2026-06-30T06:00:00+02:00' },
          ],
        },
        {
          id: 'fuorigrotta',
          direzione: 'capodichino',
          status: 'rosso',
          windows: [
            { from: '2026-07-04T00:00:00+02:00', to: '2026-07-04T06:00:00+02:00' },
          ],
        },
      ],
      updatedAt: '2026-07-02T22:35:23.305Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincolo(stateConDuplicati, new Date('2026-07-04T00:04:00+02:00'))
    expect(map.get('fuorigrotta')?.capodichino).toBe('rosso')
  })
})

describe('activeTratti', () => {
  const stateConTratto: TangenzialeState = {
    items: [],
    tratti: [
      {
        da: 'capodichino',
        a: 'capodimonte',
        direzione: 'pozzuoli',
        uscitaObbligatoria: 'capodichino',
        windows: [
          { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
        ],
      },
    ],
    updatedAt: '2026-06-29T00:00:00.000Z',
    source: 'test',
    stale: false,
  }

  it('ritorna il tratto se la finestra è attiva ora nella direzione richiesta', () => {
    const result = activeTratti(
      stateConTratto,
      'pozzuoli',
      new Date('2026-07-01T02:00:00+02:00')
    )
    expect(result).toHaveLength(1)
    expect(result[0].uscitaObbligatoria).toBe('capodichino')
  })

  it('non ritorna il tratto se la finestra non è attiva', () => {
    const result = activeTratti(
      stateConTratto,
      'pozzuoli',
      new Date('2026-07-01T12:00:00+02:00')
    )
    expect(result).toHaveLength(0)
  })

  it('non ritorna il tratto se la direzione richiesta è diversa', () => {
    const result = activeTratti(
      stateConTratto,
      'capodichino',
      new Date('2026-07-01T02:00:00+02:00')
    )
    expect(result).toHaveLength(0)
  })

  it('ritorna array vuoto se state.tratti è assente', () => {
    const stateSenzaTratti: TangenzialeState = {
      items: [],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    expect(activeTratti(stateSenzaTratti, 'pozzuoli', new Date())).toHaveLength(0)
  })
})

describe('statusBySvincoloForMap', () => {
  it('marca rosso il nodo di uscita obbligatoria di un tratto attivo', () => {
    const state: TangenzialeState = {
      items: [],
      tratti: [
        {
          da: 'capodichino',
          a: 'capodimonte',
          direzione: 'pozzuoli',
          uscitaObbligatoria: 'capodichino',
          windows: [
            { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
          ],
        },
      ],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincoloForMap(state, new Date('2026-07-01T02:00:00+02:00'))
    expect(map.get('capodichino')?.pozzuoli).toBe('rosso')
    expect(map.get('capodichino')?.capodichino).toBe('verde')
  })

  it('non marca rosso il nodo se il tratto non è attivo ora', () => {
    const state: TangenzialeState = {
      items: [],
      tratti: [
        {
          da: 'capodichino',
          a: 'capodimonte',
          direzione: 'pozzuoli',
          uscitaObbligatoria: 'capodichino',
          windows: [
            { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
          ],
        },
      ],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincoloForMap(state, new Date('2026-07-01T12:00:00+02:00'))
    expect(map.get('capodichino')?.pozzuoli).toBe('verde')
  })

  it('combina svincolo giallo e tratto rosso: vince il rosso (worstStatus)', () => {
    const state: TangenzialeState = {
      items: [
        { id: 'capodichino', direzione: 'pozzuoli', status: 'giallo' },
      ],
      tratti: [
        {
          da: 'capodichino',
          a: 'capodimonte',
          direzione: 'pozzuoli',
          uscitaObbligatoria: 'capodichino',
        },
      ],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincoloForMap(state, new Date('2026-07-01T12:00:00+02:00'))
    expect(map.get('capodichino')?.pozzuoli).toBe('rosso')
  })

  it('marca rosso anche gli svincoli intermedi del tratto, non solo gli estremi/uscita obbligatoria', () => {
    // SVINCOLI: capodichino(0), secondigliano(1), doganella(2), corso-malta(3), capodimonte(4)...
    // Un tratto chiuso capodichino↔capodimonte rende impraticabili anche gli
    // svincoli intermedi (secondigliano, doganella, corso-malta): la strada in
    // quel tratto è fisicamente chiusa, non solo il punto di uscita obbligatoria.
    const state: TangenzialeState = {
      items: [],
      tratti: [
        {
          da: 'capodichino',
          a: 'capodimonte',
          direzione: 'pozzuoli',
          uscitaObbligatoria: 'capodichino',
        },
      ],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincoloForMap(state, new Date('2026-07-01T12:00:00+02:00'))
    expect(map.get('secondigliano')?.pozzuoli).toBe('rosso')
    expect(map.get('doganella')?.pozzuoli).toBe('rosso')
    expect(map.get('corso-malta')?.pozzuoli).toBe('rosso')
    // Estremi del tratto, inclusi
    expect(map.get('capodichino')?.pozzuoli).toBe('rosso')
    expect(map.get('capodimonte')?.pozzuoli).toBe('rosso')
    // Fuori dal tratto: non toccato
    expect(map.get('arenella')?.pozzuoli).toBe('verde')
  })

  it('tratto con finestra a fine indeterminata: rosso subito dopo l\'inizio, verde dopo la scadenza implicita', () => {
    const state: TangenzialeState = {
      items: [],
      tratti: [
        {
          da: 'capodichino',
          a: 'capodimonte',
          direzione: 'pozzuoli',
          uscitaObbligatoria: 'capodichino',
          windows: [{ from: '2026-09-13T19:00:00+02:00' }],
        },
      ],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const subito = statusBySvincoloForMap(state, new Date('2026-09-13T20:00:00+02:00'))
    expect(subito.get('capodichino')?.pozzuoli).toBe('rosso')

    const dopoScadenza = statusBySvincoloForMap(state, new Date('2026-09-14T07:00:00+02:00'))
    expect(dopoScadenza.get('capodichino')?.pozzuoli).toBe('verde')
  })

  it('non marca rosso gli svincoli intermedi nella direzione opposta a quella del tratto', () => {
    const state: TangenzialeState = {
      items: [],
      tratti: [
        {
          da: 'capodichino',
          a: 'capodimonte',
          direzione: 'pozzuoli',
          uscitaObbligatoria: 'capodichino',
        },
      ],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincoloForMap(state, new Date('2026-07-01T12:00:00+02:00'))
    expect(map.get('secondigliano')?.capodichino).toBe('verde')
  })
})

describe('isWindowOnDate', () => {
  const notte: ClosureWindow = {
    from: '2026-07-06T23:00:00+02:00',
    to: '2026-07-07T06:00:00+02:00',
  }

  it('ritorna true se windows è assente (sempre attivo)', () => {
    expect(isWindowOnDate(undefined, '2026-07-01')).toBe(true)
  })

  it('ritorna true se windows è vuoto (sempre attivo)', () => {
    expect(isWindowOnDate([], '2026-07-01')).toBe(true)
  })

  it('ritorna true se una finestra inizia in quella data (fuso Europe/Rome)', () => {
    expect(isWindowOnDate([notte], '2026-07-06')).toBe(true)
  })

  it('ritorna false se nessuna finestra inizia in quella data', () => {
    expect(isWindowOnDate([notte], '2026-07-07')).toBe(false)
    expect(isWindowOnDate([notte], '2026-07-13')).toBe(false)
  })

  it('ritorna true se almeno una tra più finestre inizia in quella data', () => {
    const altra: ClosureWindow = {
      from: '2026-07-13T23:00:00+02:00',
      to: '2026-07-14T06:00:00+02:00',
    }
    expect(isWindowOnDate([notte, altra], '2026-07-13')).toBe(true)
  })
})

describe('statusBySvincoloForDateKey', () => {
  it('ritorna lo status annunciato se una finestra inizia in quella data', () => {
    const state: TangenzialeState = {
      items: [
        {
          id: 'agnano',
          direzione: 'capodichino',
          status: 'rosso',
          windows: [
            { from: '2026-07-06T23:00:00+02:00', to: '2026-07-07T06:00:00+02:00' },
          ],
        },
      ],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincoloForDateKey(state, '2026-07-06')
    expect(map.get('agnano')?.capodichino).toBe('rosso')
  })

  it('ritorna verde se nessuna finestra inizia in quella data', () => {
    const state: TangenzialeState = {
      items: [
        {
          id: 'agnano',
          direzione: 'capodichino',
          status: 'rosso',
          windows: [
            { from: '2026-07-06T23:00:00+02:00', to: '2026-07-07T06:00:00+02:00' },
          ],
        },
      ],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincoloForDateKey(state, '2026-07-13')
    expect(map.get('agnano')?.capodichino).toBe('verde')
  })

  it('una chiusura permanente (senza finestre) è attiva per qualsiasi data', () => {
    const state: TangenzialeState = {
      items: [{ id: 'agnano', direzione: 'capodichino', status: 'giallo' }],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincoloForDateKey(state, '2026-07-06')
    expect(map.get('agnano')?.capodichino).toBe('giallo')
  })
})

describe('activeTrattiForDateKey', () => {
  const stateConTratto: TangenzialeState = {
    items: [],
    tratti: [
      {
        da: 'capodichino',
        a: 'capodimonte',
        direzione: 'pozzuoli',
        uscitaObbligatoria: 'capodichino',
        windows: [
          { from: '2026-07-06T23:00:00+02:00', to: '2026-07-07T06:00:00+02:00' },
        ],
      },
    ],
    updatedAt: '2026-06-29T00:00:00.000Z',
    source: 'test',
    stale: false,
  }

  it('ritorna il tratto se una finestra inizia in quella data nella direzione richiesta', () => {
    const result = activeTrattiForDateKey(stateConTratto, 'pozzuoli', '2026-07-06')
    expect(result).toHaveLength(1)
  })

  it('non ritorna il tratto se nessuna finestra inizia in quella data', () => {
    const result = activeTrattiForDateKey(stateConTratto, 'pozzuoli', '2026-07-13')
    expect(result).toHaveLength(0)
  })

  it('non ritorna il tratto se la direzione richiesta è diversa', () => {
    const result = activeTrattiForDateKey(stateConTratto, 'capodichino', '2026-07-06')
    expect(result).toHaveLength(0)
  })
})

describe('statusBySvincoloForMapForDateKey', () => {
  it('marca rosso gli svincoli del tratto (estremi e intermedi) per la data selezionata', () => {
    const state: TangenzialeState = {
      items: [],
      tratti: [
        {
          da: 'capodichino',
          a: 'capodimonte',
          direzione: 'pozzuoli',
          uscitaObbligatoria: 'capodichino',
          windows: [
            { from: '2026-07-06T23:00:00+02:00', to: '2026-07-07T06:00:00+02:00' },
          ],
        },
      ],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincoloForMapForDateKey(state, '2026-07-06')
    expect(map.get('secondigliano')?.pozzuoli).toBe('rosso')
    expect(map.get('capodichino')?.pozzuoli).toBe('rosso')
  })

  it('non marca rosso se la data selezionata non corrisponde a nessuna finestra del tratto', () => {
    const state: TangenzialeState = {
      items: [],
      tratti: [
        {
          da: 'capodichino',
          a: 'capodimonte',
          direzione: 'pozzuoli',
          uscitaObbligatoria: 'capodichino',
          windows: [
            { from: '2026-07-06T23:00:00+02:00', to: '2026-07-07T06:00:00+02:00' },
          ],
        },
      ],
      updatedAt: '2026-06-29T00:00:00.000Z',
      source: 'test',
      stale: false,
    }
    const map = statusBySvincoloForMapForDateKey(state, '2026-07-13')
    expect(map.get('secondigliano')?.pozzuoli).toBe('verde')
  })
})
