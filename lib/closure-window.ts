import { romeParts, romeWallTimeToDate } from '@/lib/rome-time'
import type { ClosureWindow } from '@/lib/types'

const MS_PER_DAY = 86_400_000

/**
 * Ora (Europe/Rome) alla quale scade implicitamente una chiusura senza fine
 * dichiarata ("fino a cessate esigenze", "fino a nuovo avviso"): il primo
 * mattino successivo all'inizio della chiusura.
 */
export const OPEN_ENDED_CLOSURE_END_HOUR = 6

/**
 * Restituisce l'istante delle OPEN_ENDED_CLOSURE_END_HOUR (Europe/Rome)
 * strettamente successivo a `from`: stesso giorno se `from` è prima di
 * quell'ora, altrimenti il giorno successivo.
 */
export function openEndedWindowEnd(from: Date): Date {
  const { year, month, day, hour } = romeParts(from)
  const sameDayNumber = Date.UTC(year, month - 1, day) / MS_PER_DAY
  const targetDayNumber = hour < OPEN_ENDED_CLOSURE_END_HOUR ? sameDayNumber : sameDayNumber + 1
  const targetDay = new Date(targetDayNumber * MS_PER_DAY)

  return romeWallTimeToDate(
    targetDay.getUTCFullYear(),
    targetDay.getUTCMonth() + 1,
    targetDay.getUTCDate(),
    OPEN_ENDED_CLOSURE_END_HOUR,
    0,
    0
  )
}

/**
 * Restituisce true se la finestra non dichiara un orario di fine ("to"
 * assente): chiusura a fine indeterminata, la cui scadenza effettiva è
 * calcolata da `openEndedWindowEnd`.
 */
export function isOpenEndedWindow(window: ClosureWindow): boolean {
  return !window.to
}

/**
 * Risolve l'orario di fine effettivo di una finestra: quello dichiarato
 * ("to"), o la scadenza implicita se la finestra è a fine indeterminata.
 */
export function resolveWindowEnd(window: ClosureWindow): Date {
  return window.to ? new Date(window.to) : openEndedWindowEnd(new Date(window.from))
}
