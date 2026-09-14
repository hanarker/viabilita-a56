import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { TangenzialeState } from '@/lib/types'

const { fakeRedisData } = vi.hoisted(() => ({
  fakeRedisData: new Map<string, unknown>(),
}))

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({
      get: async (key: string) => (fakeRedisData.has(key) ? fakeRedisData.get(key) : null),
      set: async (key: string, value: unknown) => {
        fakeRedisData.set(key, value)
        return 'OK'
      },
    }),
  },
}))

import { writeState, readState } from '@/lib/store'

const TEST_KEY = 'test:store:state'

const stateOk: TangenzialeState = {
  items: [
    { id: 'fuorigrotta', direzione: 'pozzuoli', status: 'rosso', note: 'Chiusa' },
  ],
  updatedAt: '2026-06-28T23:00:00.000Z',
  source: 'Testo avviso di esempio',
  stale: false,
}

describe('store', () => {
  beforeEach(() => {
    fakeRedisData.clear()
  })

  it('scrive lo stato su Redis e lo rilegge correttamente', async () => {
    await writeState(stateOk, TEST_KEY)
    const read = await readState(TEST_KEY)
    expect(read?.items[0].id).toBe('fuorigrotta')
    expect(read?.updatedAt).toBe(stateOk.updatedAt)
  })

  it('readState restituisce null se la chiave non esiste', async () => {
    const result = await readState(TEST_KEY)
    expect(result).toBeNull()
  })

  it('non sovrascrive la chiave se il nuovo stato è invalido', async () => {
    fakeRedisData.set(TEST_KEY, stateOk)

    const invalid = { items: null, updatedAt: 'bad', source: '', stale: false } as unknown as TangenzialeState
    await expect(writeState(invalid, TEST_KEY)).rejects.toThrow()

    const read = await readState(TEST_KEY)
    expect(read?.items[0].id).toBe('fuorigrotta')
  })

  it('readState restituisce stale=true se lo stato salvato ha stale=true', async () => {
    fakeRedisData.set(TEST_KEY, { ...stateOk, stale: true })
    const read = await readState(TEST_KEY)
    expect(read?.stale).toBe(true)
  })

  it('scrive e rilegge correttamente il campo windows opzionale', async () => {
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
      updatedAt: '2026-07-01T12:00:00.000Z',
      source: 'Testo avviso di esempio',
      stale: false,
    }
    await writeState(stateConFinestra, TEST_KEY)
    const read = await readState(TEST_KEY)
    expect(read?.items[0].windows).toEqual([
      { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
    ])
  })

  it('scrive e rilegge correttamente una finestra a fine indeterminata ("to" assente)', async () => {
    const stateConFinestraAperta: TangenzialeState = {
      items: [
        {
          id: 'fuorigrotta',
          direzione: 'pozzuoli',
          status: 'rosso',
          windows: [{ from: '2026-09-13T19:00:00+02:00' }],
        },
      ],
      updatedAt: '2026-09-13T19:00:00.000Z',
      source: 'Avviso urgente di esempio',
      stale: false,
    }
    await writeState(stateConFinestraAperta, TEST_KEY)
    const read = await readState(TEST_KEY)
    expect(read?.items[0].windows).toEqual([{ from: '2026-09-13T19:00:00+02:00' }])
  })

  it('scrive e rilegge correttamente il campo checkedAt opzionale', async () => {
    const stateConCheckedAt: TangenzialeState = {
      ...stateOk,
      checkedAt: '2026-07-02T18:00:00.000Z',
    }
    await writeState(stateConCheckedAt, TEST_KEY)
    const read = await readState(TEST_KEY)
    expect(read?.checkedAt).toBe('2026-07-02T18:00:00.000Z')
  })

  it('readState legge correttamente uno stato senza checkedAt (retro-compatibilità)', async () => {
    fakeRedisData.set(TEST_KEY, stateOk)
    const read = await readState(TEST_KEY)
    expect(read?.checkedAt).toBeUndefined()
    expect(read?.items[0].id).toBe('fuorigrotta')
  })

  it('readState restituisce null se il valore salvato non rispetta lo schema', async () => {
    fakeRedisData.set(TEST_KEY, { foo: 'bar' })
    const read = await readState(TEST_KEY)
    expect(read).toBeNull()
  })

  it('readState legge correttamente uno stato senza tratti (retro-compatibilità)', async () => {
    fakeRedisData.set(TEST_KEY, stateOk)
    const read = await readState(TEST_KEY)
    expect(read?.tratti).toBeUndefined()
  })

  it('scrive e rilegge correttamente il campo tratti', async () => {
    const stateConTratti: TangenzialeState = {
      ...stateOk,
      tratti: [
        {
          da: 'capodichino',
          a: 'capodimonte',
          direzione: 'pozzuoli',
          uscitaObbligatoria: 'capodichino',
          note: 'Chiusura tratto con uscita obbligatoria',
          windows: [
            { from: '2026-06-30T23:00:00+02:00', to: '2026-07-01T06:00:00+02:00' },
          ],
        },
      ],
    }
    await writeState(stateConTratti, TEST_KEY)
    const read = await readState(TEST_KEY)
    expect(read?.tratti).toEqual(stateConTratti.tratti)
  })
})
