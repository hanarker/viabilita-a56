import { SVINCOLI } from '@/lib/svincoli'
import { resolveWindowEnd } from '@/lib/closure-window'
import type {
  Direzione,
  Status,
  SvincoloState,
  TrattoState,
  TangenzialeState,
} from '@/lib/types'

const ROME_TIMEZONE = 'Europe/Rome'
const MS_PER_DAY = 86_400_000

/** Riga di chiusura: una singola finestra di un item, arricchita col nome canonico */
export interface ClosureEntry {
  id: string
  nome: string
  direzione: Direzione
  status: Status
  note?: string
  /** ISO originale della finestra */
  from: string
  /** ISO originale della finestra; assente se a fine indeterminata */
  to?: string
  /** true se la finestra è attiva rispetto a `now` */
  active: boolean
  /** Id svincolo usato per l'ordinamento canonico (i tratti si ordinano sull'estremo `da`) */
  sortId?: string
}

/** Gruppo di chiusure che iniziano nella stessa serata (data di `from` a Roma) */
export interface ClosureGroup {
  /** 'YYYY-MM-DD' in Europe/Rome */
  dateKey: string
  /** 'Stanotte' | 'Domani notte' | data formattata it-IT (es. "sab 4 lug") */
  label: string
  entries: ClosureEntry[]
}

/** Chiusura senza finestre temporali: sempre attiva fino a nuovo avviso */
export interface PermanentClosure {
  id: string
  nome: string
  direzione: Direzione
  status: Status
  note?: string
  /** Id svincolo usato per l'ordinamento canonico (i tratti si ordinano sull'estremo `da`) */
  sortId?: string
}

export interface EveningClosuresData {
  permanent: PermanentClosure[]
  groups: ClosureGroup[]
}

// Formatter riusabili (creazione Intl costosa, meglio a livello modulo)
const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: ROME_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat('it-IT', {
  timeZone: ROME_TIMEZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const SVINCOLO_INDEX = new Map(SVINCOLI.map((s, i) => [s.id, i]))
const SVINCOLO_NOME = new Map(SVINCOLI.map((s) => [s.id, s.nome]))

/** 'YYYY-MM-DD' della data-calendario di `date` in Europe/Rome */
export function romeDateKey(date: Date): string {
  // en-CA produce direttamente YYYY-MM-DD, ordinabile lessicograficamente
  return DATE_KEY_FORMATTER.format(date)
}

/** Giorni interi dall'epoch UTC per una chiave 'YYYY-MM-DD' (niente DST a mezzanotte UTC) */
function dayNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / MS_PER_DAY
}

/**
 * Etichetta relativa della serata identificata da `from` rispetto a `now`:
 * "Stanotte" (oggi o già iniziata), "Domani notte", altrimenti data it-IT.
 */
export function serataLabel(from: Date, now: Date): string {
  const dayDiff = dayNumber(romeDateKey(from)) - dayNumber(romeDateKey(now))
  if (dayDiff <= 0) return 'Stanotte'
  if (dayDiff === 1) return 'Domani notte'
  return LONG_DATE_FORMATTER.format(from)
}

/** Data breve it-IT della serata (es. "gio 2 lug"), stessa forma delle label assolute */
export function formatSerataDate(date: Date): string {
  return LONG_DATE_FORMATTER.format(date)
}

/** Numero di date-calendario (Europe/Rome) attraversate dalla finestra: 1 = notte standard */
export function nightSpanDays(fromIso: string, toIso: string): number {
  return (
    dayNumber(romeDateKey(new Date(toIso))) -
    dayNumber(romeDateKey(new Date(fromIso)))
  )
}

function nomeSvincolo(id: string): string {
  return SVINCOLO_NOME.get(id) ?? id
}

/** Nome leggibile di un tratto: "«NomeDa» → «NomeA»" */
function nomeTratto(t: TrattoState): string {
  return `${nomeSvincolo(t.da)} → ${nomeSvincolo(t.a)}`
}

/** Nota di un tratto, con l'uscita obbligatoria sempre esplicitata */
function trattoNote(t: TrattoState): string {
  const uscita = `Uscita obbligatoria: ${nomeSvincolo(t.uscitaObbligatoria)}`
  return t.note ? `${t.note} (${uscita})` : uscita
}

/** Id composito univoco per un tratto (non collide con id svincolo) */
function trattoId(t: TrattoState): string {
  return `tratto:${t.da}>${t.a}`
}

/** Ordinamento canonico: indice in SVINCOLI (via sortId, fallback id), poi direzione */
function bySvincoloThenDirection(
  a: { id: string; direzione: Direzione; sortId?: string },
  b: { id: string; direzione: Direzione; sortId?: string }
): number {
  const ia = SVINCOLO_INDEX.get(a.sortId ?? a.id) ?? Number.MAX_SAFE_INTEGER
  const ib = SVINCOLO_INDEX.get(b.sortId ?? b.id) ?? Number.MAX_SAFE_INTEGER
  if (ia !== ib) return ia - ib
  return a.direzione.localeCompare(b.direzione)
}

function collectPermanent(
  items: SvincoloState[],
  tratti: TrattoState[]
): PermanentClosure[] {
  const dedup = new Map<string, PermanentClosure>()
  for (const item of items) {
    if (item.windows && item.windows.length > 0) continue
    const key = `${item.id}|${item.direzione}|${item.note ?? ''}`
    if (dedup.has(key)) continue
    dedup.set(key, {
      id: item.id,
      nome: nomeSvincolo(item.id),
      direzione: item.direzione,
      status: item.status,
      note: item.note,
    })
  }
  for (const t of tratti) {
    if (t.windows && t.windows.length > 0) continue
    const key = `${trattoId(t)}|${t.direzione}`
    if (dedup.has(key)) continue
    dedup.set(key, {
      id: trattoId(t),
      sortId: t.da,
      nome: nomeTratto(t),
      direzione: t.direzione,
      status: 'rosso',
      note: trattoNote(t),
    })
  }
  return [...dedup.values()].sort(bySvincoloThenDirection)
}

function collectEntries(
  items: SvincoloState[],
  tratti: TrattoState[],
  now: Date
): ClosureEntry[] {
  const dedup = new Map<string, ClosureEntry>()
  for (const item of items) {
    for (const window of item.windows ?? []) {
      const to = resolveWindowEnd(window)
      if (to < now) continue // finestra già conclusa

      const key = `${item.id}|${item.direzione}|${window.from}|${window.to ?? 'open'}`
      if (dedup.has(key)) continue

      const from = new Date(window.from)
      dedup.set(key, {
        id: item.id,
        nome: nomeSvincolo(item.id),
        direzione: item.direzione,
        status: item.status,
        note: item.note,
        from: window.from,
        to: window.to,
        active: from <= now && now <= to,
      })
    }
  }
  for (const t of tratti) {
    for (const window of t.windows ?? []) {
      const to = resolveWindowEnd(window)
      if (to < now) continue // finestra già conclusa

      const key = `${trattoId(t)}|${t.direzione}|${window.from}|${window.to ?? 'open'}`
      if (dedup.has(key)) continue

      const from = new Date(window.from)
      dedup.set(key, {
        id: trattoId(t),
        sortId: t.da,
        nome: nomeTratto(t),
        direzione: t.direzione,
        status: 'rosso',
        note: trattoNote(t),
        from: window.from,
        to: window.to,
        active: from <= now && now <= to,
      })
    }
  }

  return [...dedup.values()].sort((a, b) => {
    const delta = new Date(a.from).getTime() - new Date(b.from).getTime()
    if (delta !== 0) return delta
    return bySvincoloThenDirection(a, b)
  })
}

/**
 * Costruisce i dati per la sezione "Chiusure serali": chiusure permanenti
 * (senza finestre) e gruppi per serata delle chiusure programmate future o
 * in corso. Deterministica: `now` è sempre un parametro esplicito.
 */
export function buildEveningClosures(
  state: TangenzialeState | null,
  now: Date
): EveningClosuresData {
  const tratti = state?.tratti ?? []
  if (!state || (state.items.length === 0 && tratti.length === 0)) {
    return { permanent: [], groups: [] }
  }

  const permanent = collectPermanent(state.items, tratti)
  const entries = collectEntries(state.items, tratti, now)

  const grouped = new Map<string, ClosureEntry[]>()
  for (const entry of entries) {
    const dateKey = romeDateKey(new Date(entry.from))
    grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), entry])
  }

  const groups = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, groupEntries]) => ({
      dateKey,
      label: serataLabel(new Date(groupEntries[0].from), now),
      entries: groupEntries,
    }))

  return { permanent, groups }
}
