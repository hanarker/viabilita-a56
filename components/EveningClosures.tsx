import { ArrowIcon } from '@/components/ArrowIcon'
import { SectionPanel } from '@/components/SectionPanel'
import {
  buildEveningClosures,
  formatSerataDate,
  nightSpanDays,
} from '@/lib/closures'
import type { ClosureEntry, PermanentClosure } from '@/lib/closures'
import type { Direzione, Status, TangenzialeState } from '@/lib/types'

interface EveningClosuresProps {
  state: TangenzialeState | null
  /** Istante di riferimento, passato dalla pagina per determinismo */
  now: Date
}

const ORA_FORMATTER = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  hour: '2-digit',
  minute: '2-digit',
})

const DIREZIONE_LABEL: Record<Direzione, string> = {
  capodichino: 'Capodichino',
  pozzuoli: 'Pozzuoli',
}

const STATUS_SR_LABEL: Record<Status, string> = {
  verde: 'Aperta',
  giallo: 'Uscita/ingresso chiuso',
  rosso: 'Tratto chiuso, uscita obbligatoria',
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        d="M20 14.5 A8.5 8.5 0 1 1 9.5 4 A7 7 0 0 0 20 14.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Chip quadrato di stato, stessa grammatica visiva della Legend */
function StatusChip({ status }: { status: Status }) {
  const isRosso = status === 'rosso'
  return (
    <>
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center w-5 h-5 rounded-[2px] text-white text-[11px] font-bold shrink-0 ${
          isRosso ? 'bg-red-600' : 'bg-amber-500'
        }`}
      >
        {isRosso ? '✕' : '‖'}
      </span>
      <span className="sr-only">{STATUS_SR_LABEL[status]}</span>
    </>
  )
}

function DirezioneLabel({ direzione }: { direzione: Direzione }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted uppercase tracking-wide">
      {direzione === 'pozzuoli' && <ArrowIcon verso="sinistra" />}
      dir. {DIREZIONE_LABEL[direzione]}
      {direzione === 'capodichino' && <ArrowIcon verso="destra" />}
    </span>
  )
}

function EntryRow({ entry }: { entry: ClosureEntry }) {
  // Notte standard (from→mattina dopo): orari nudi. Finestra anomala
  // multi-giorno: esplicita la data di fine per non ingannare il lettore.
  // Fine non dichiarata ("fino a cessate esigenze"): niente orario di fine,
  // lo si dice esplicitamente invece di mostrare una scadenza inventata.
  const isMultiNight = entry.to != null && nightSpanDays(entry.from, entry.to) > 1

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-3 border-t border-edge">
      <StatusChip status={entry.status} />
      <span className="font-semibold text-foreground">{entry.nome}</span>
      <DirezioneLabel direzione={entry.direzione} />
      <span className="tabular-nums text-sm font-medium text-foreground ml-auto">
        <time dateTime={entry.from}>{ORA_FORMATTER.format(new Date(entry.from))}</time>
        {entry.to != null ? (
          <>
            {' – '}
            <time dateTime={entry.to}>{ORA_FORMATTER.format(new Date(entry.to))}</time>
            {isMultiNight && (
              <span className="text-muted font-normal">
                {' '}({formatSerataDate(new Date(entry.to))})
              </span>
            )}
          </>
        ) : (
          <span className="text-muted font-normal"> – fino a cessate esigenze</span>
        )}
      </span>
      {entry.active && (
        <span className="rounded-[2px] bg-red-600 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          In corso
        </span>
      )}
      {entry.note && (
        <p className="w-full text-xs text-muted leading-relaxed">{entry.note}</p>
      )}
    </li>
  )
}

function PermanentRow({ closure }: { closure: PermanentClosure }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-3 border-t border-edge">
      <StatusChip status={closure.status} />
      <span className="font-semibold text-foreground">{closure.nome}</span>
      <DirezioneLabel direzione={closure.direzione} />
      {closure.note && (
        <p className="w-full text-xs text-muted leading-relaxed">{closure.note}</p>
      )}
    </li>
  )
}

function EmptyState() {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-[4px] border border-edge bg-surface p-4">
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center w-5 h-5 rounded-[2px] bg-green-600 text-white text-[11px] font-bold shrink-0"
      >
        ✓
      </span>
      <div>
        <p className="font-display text-lg font-semibold uppercase tracking-wide text-foreground leading-tight">
          Nessuna chiusura programmata
        </p>
        <p className="text-sm text-muted mt-0.5">
          Tutte le uscite sono percorribili nelle prossime serate.
        </p>
      </div>
    </div>
  )
}

const RELATIVE_LABELS = new Set(['Stanotte', 'Domani notte'])

/**
 * Sezione "Chiusure serali": elenco delle chiusure programmate raggruppate
 * per serata, per pianificare il viaggio. Server component, zero JS client.
 */
export function EveningClosures({ state, now }: EveningClosuresProps) {
  const { permanent, groups } = buildEveningClosures(state, now)
  const isEmpty = permanent.length === 0 && groups.length === 0

  return (
    <div className="w-full mt-8">
      <SectionPanel id="chiusure-serali" titolo="Chiusure serali" icona={<MoonIcon />}>
        <p className="text-sm text-muted">
          Chiusure programmate per le prossime serate, per pianificare il viaggio.
          Orari italiani.
        </p>

        {isEmpty && <EmptyState />}

        {permanent.length > 0 && (
          <div className="mt-4 rounded-[4px] border border-edge bg-surface pb-1">
            <h3 className="px-3.5 pt-3 pb-2 font-display text-lg font-bold uppercase tracking-wide text-foreground">
              In corso fino a nuovo avviso
            </h3>
            <ul>
              {permanent.map((closure) => (
                <PermanentRow
                  key={`${closure.id}-${closure.direzione}-${closure.note ?? ''}`}
                  closure={closure}
                />
              ))}
            </ul>
          </div>
        )}

        {groups.map((group) => (
          <div
            key={group.dateKey}
            className="mt-4 rounded-[4px] border border-edge bg-surface pb-1"
          >
            <h3 className="flex items-baseline gap-2 px-3.5 pt-3 pb-2 font-display text-lg font-bold uppercase tracking-wide text-foreground">
              {group.label}
              {RELATIVE_LABELS.has(group.label) && (
                <time
                  dateTime={group.dateKey}
                  className="font-sans text-sm font-normal normal-case text-muted"
                >
                  {formatSerataDate(new Date(group.entries[0].from))}
                </time>
              )}
            </h3>
            <ul>
              {group.entries.map((entry) => (
                <EntryRow
                  key={`${entry.id}-${entry.direzione}-${entry.from}`}
                  entry={entry}
                />
              ))}
            </ul>
          </div>
        ))}
      </SectionPanel>
    </div>
  )
}
