import { describe, it, expect } from 'vitest'
import {
  OPEN_ENDED_CLOSURE_END_HOUR,
  openEndedWindowEnd,
  resolveWindowEnd,
  isOpenEndedWindow,
} from '@/lib/closure-window'
import type { ClosureWindow } from '@/lib/types'

describe('openEndedWindowEnd', () => {
  it('inizio serale: scade alle 06:00 Europe/Rome del giorno successivo', () => {
    // Arrange
    const from = new Date('2026-09-13T19:00:00+02:00')

    // Act
    const end = openEndedWindowEnd(from)

    // Assert
    expect(end.toISOString()).toBe(new Date('2026-09-14T06:00:00+02:00').toISOString())
  })

  it('inizio notturno prima delle 06:00: scade alle 06:00 dello stesso giorno', () => {
    // Arrange
    const from = new Date('2026-09-14T02:00:00+02:00')

    // Act
    const end = openEndedWindowEnd(from)

    // Assert
    expect(end.toISOString()).toBe(new Date('2026-09-14T06:00:00+02:00').toISOString())
  })

  it('inizio mattutino dopo le 06:00: scade alle 06:00 del giorno successivo', () => {
    // Arrange
    const from = new Date('2026-09-14T10:00:00+02:00')

    // Act
    const end = openEndedWindowEnd(from)

    // Assert
    expect(end.toISOString()).toBe(new Date('2026-09-15T06:00:00+02:00').toISOString())
  })

  it('inizio esattamente alle 06:00: scade alle 06:00 del giorno successivo (strettamente dopo)', () => {
    // Arrange
    const from = new Date('2026-09-14T06:00:00+02:00')

    // Act
    const end = openEndedWindowEnd(from)

    // Assert
    expect(end.toISOString()).toBe(new Date('2026-09-15T06:00:00+02:00').toISOString())
  })

  it('attraversa correttamente il cambio DST di fine ottobre (CEST → CET)', () => {
    // Arrange: 25/10/2026 è l'ultima domenica di ottobre (fine ora legale)
    const from = new Date('2026-10-25T23:00:00+02:00')

    // Act
    const end = openEndedWindowEnd(from)

    // Assert: 06:00 del 26/10 è già in CET (+01:00)
    expect(end.toISOString()).toBe(new Date('2026-10-26T06:00:00+01:00').toISOString())
  })

  it('usa la costante OPEN_ENDED_CLOSURE_END_HOUR', () => {
    expect(OPEN_ENDED_CLOSURE_END_HOUR).toBe(6)
  })
})

describe('resolveWindowEnd', () => {
  it('con "to" presente, restituisce "to"', () => {
    // Arrange
    const window: ClosureWindow = {
      from: '2026-06-30T23:00:00+02:00',
      to: '2026-07-01T06:00:00+02:00',
    }

    // Act
    const end = resolveWindowEnd(window)

    // Assert
    expect(end.toISOString()).toBe(new Date('2026-07-01T06:00:00+02:00').toISOString())
  })

  it('con "to" assente, restituisce la scadenza implicita open-ended', () => {
    // Arrange
    const window: ClosureWindow = { from: '2026-09-13T19:00:00+02:00' }

    // Act
    const end = resolveWindowEnd(window)

    // Assert
    expect(end.toISOString()).toBe(new Date('2026-09-14T06:00:00+02:00').toISOString())
  })
})

describe('isOpenEndedWindow', () => {
  it('ritorna true se "to" è assente', () => {
    expect(isOpenEndedWindow({ from: '2026-09-13T19:00:00+02:00' })).toBe(true)
  })

  it('ritorna false se "to" è presente', () => {
    expect(
      isOpenEndedWindow({
        from: '2026-09-13T19:00:00+02:00',
        to: '2026-09-14T06:00:00+02:00',
      })
    ).toBe(false)
  })
})
