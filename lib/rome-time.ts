export const ROME_TIMEZONE = 'Europe/Rome'

/** Componenti di una data scomposta nel fuso Europe/Rome */
export interface RomeDateParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const ROME_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: ROME_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Scompone `date` nelle sue componenti Y/M/D/h/m/s nel fuso Europe/Rome. */
export function romeParts(date: Date): RomeDateParts {
  const parts = ROME_PARTS_FORMATTER.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/**
 * Offset (in minuti) di Europe/Rome rispetto a UTC nell'istante `instant`
 * (positivo = avanti su UTC, es. +120 in CEST). Confronta l'istante con la
 * stessa data/ora interpretata come se fosse UTC per ricavare lo scarto.
 */
export function romeOffsetMinutesAt(instant: Date): number {
  const { year, month, day, hour, minute, second } = romeParts(instant)
  const localIso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`
  return Math.round((new Date(`${localIso}Z`).getTime() - instant.getTime()) / 60000)
}

/**
 * Converte una data/ora "muro" (wall-clock) di Europe/Rome nell'istante UTC
 * corrispondente, gestendo correttamente il cambio ora legale/solare.
 */
export function romeWallTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date {
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, second)
  const offsetMinutes = romeOffsetMinutesAt(new Date(guessUtcMs))
  return new Date(guessUtcMs - offsetMinutes * 60000)
}

/**
 * Formatta `now` nel fuso Europe/Rome come "YYYY-MM-DDTHH:mm:ss+HH:mm",
 * utile per indicare a un prompt LLM sia l'istante corrente sia l'offset da
 * usare per finestre temporali generate a partire da esso.
 */
export function formatNowWithRomeOffset(now: Date): string {
  const { year, month, day, hour, minute, second } = romeParts(now)
  const localIso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`
  const offsetMinutes = romeOffsetMinutesAt(now)
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  return `${localIso}${offset}`
}
