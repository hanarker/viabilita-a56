'use client'

import { SVINCOLI } from '@/lib/svincoli'
import {
  statusBySvincoloForMap,
  activeTratti,
  statusBySvincoloForMapForDateKey,
  activeTrattiForDateKey,
} from '@/lib/status-util'
import { computeWavePoints, toSmoothPath } from '@/lib/schematic-layout'
import type { TangenzialeState, Status, Direzione } from '@/lib/types'

type Orientation = 'horizontal' | 'vertical'

interface SchematicMapProps {
  state: TangenzialeState
  direction: Direzione
  /**
   * Sviluppo del tracciato: "horizontal" (default, desktop/tablet) oppure
   * "vertical" stile linea metro, pensato per smartphone senza scroll.
   */
  orientation?: Orientation
  /** Istante di riferimento per le finestre temporali dei tratti (default: now) */
  now?: Date
  /**
   * Se presente, mostra lo stato per questa data di calendario ('YYYY-MM-DD',
   * fuso Europe/Rome) invece che per `now`: ha sempre precedenza su `now`.
   */
  dateKey?: string
}

const SVINCOLO_INDEX = new Map(SVINCOLI.map((s, i) => [s.id, i]))

/**
 * Percorsi (uno per tratto attivo) tra i due estremi `da`/`a`, come sotto-tracciato
 * di `points` (allineato per indice a SVINCOLI in entrambi gli orientamenti).
 */
function trattoSegmentPaths(
  tratti: { da: string; a: string }[],
  points: [number, number][]
): string[] {
  return tratti.map((t) => {
    const ia = SVINCOLO_INDEX.get(t.da) ?? 0
    const ib = SVINCOLO_INDEX.get(t.a) ?? 0
    const [start, end] = ia <= ib ? [ia, ib] : [ib, ia]
    return toSmoothPath(points.slice(start, end + 1))
  })
}

const STATUS_VAR: Record<Status, string> = {
  verde: 'var(--status-verde)',
  giallo: 'var(--status-giallo)',
  rosso: 'var(--status-rosso)',
}

const STATUS_LABEL: Record<Status, string> = {
  verde: 'Aperta',
  giallo: 'Uscita/ingresso chiuso',
  rosso: 'Tratto chiuso, uscita obbligatoria',
}

const DIREZIONE_LABEL: Record<Direzione, string> = {
  capodichino: 'Capodichino',
  pozzuoli: 'Pozzuoli',
}

// Glifo scuro fisso: sempre leggibile sul giallo in entrambi i temi.
const GIALLO_GLYPH = '#1b2a5c'

// ── Layout ────────────────────────────────────────────────────────────────
// Spaziatura uniforme (indipendente dalla geografia reale) con una lieve onda
// decorativa: evita l'accavallamento di nodi ed etichette ai capolinea, dove
// gli svincoli reali sono molto ravvicinati.
const SVG_W = 960
const SVG_H = 300
const PAD_X = 60
const MID_Y = 150
const AMPLITUDE = 22
const CYCLES = 2.5
const NODE_R = 13
const TERMINUS_R = 19
const ROAD_WIDTH = 15
const LABEL_GAP = 26

const N = SVINCOLI.length
const LAST = N - 1
// SVINCOLI è ordinato da est (Capodichino, indice 0) a ovest (Pozzuoli-Arco Felice,
// ultimo indice); si inverte l'array dei punti così Capodichino appare a destra e
// Pozzuoli-Arco Felice a sinistra, coerente con l'orientamento reale della mappa.
const POINTS = [...computeWavePoints(N, { width: SVG_W, padX: PAD_X, midY: MID_Y, amplitude: AMPLITUDE, cycles: CYCLES })].reverse()
const ROAD_PATH = toSmoothPath(POINTS)

// ── Layout verticale (mobile) ─────────────────────────────────────────────
// Stile linea metro: Capodichino in alto, Pozzuoli-Arco Felice in basso,
// etichette alternate ai lati. Entra in un viewport da 375px senza scroll.
const V_SVG_W = 380
const V_PAD_Y = 46
const V_GAP = 54
const V_SVG_H = V_PAD_Y * 2 + (N - 1) * V_GAP
const V_MID_X = V_SVG_W / 2
const V_AMPLITUDE = 16
const V_LABEL_GAP = 22

// Si riusa il layout a onda scambiando gli assi: [posizione, onda] → [x, y]
const V_POINTS: [number, number][] = computeWavePoints(N, {
  width: V_SVG_H,
  padX: V_PAD_Y,
  midY: V_MID_X,
  amplitude: V_AMPLITUDE,
  cycles: CYCLES,
}).map(([pos, wave]) => [wave, pos] as [number, number])
const V_ROAD_PATH = toSmoothPath(V_POINTS)

// ── Icone di stato (regola color-not-only: lo stato non è affidato solo al colore) ──
function StatusIcon({ status, r }: { status: Status; r: number }) {
  if (status === 'rosso') {
    const d = r * 0.42
    return (
      <g stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round">
        <line x1={-d} y1={-d} x2={d} y2={d} />
        <line x1={-d} y1={d} x2={d} y2={-d} />
      </g>
    )
  }
  if (status === 'giallo') {
    const h = r * 0.45
    return (
      <g stroke={GIALLO_GLYPH} strokeWidth={2.2} strokeLinecap="round">
        <line x1={-r * 0.28} y1={-h} x2={-r * 0.28} y2={h} />
        <line x1={r * 0.28} y1={-h} x2={r * 0.28} y2={h} />
      </g>
    )
  }
  // verde: segno di spunta, coerente con l'idea "via libera"
  return (
    <path
      d={`M ${-r * 0.35} 0 L ${-r * 0.08} ${r * 0.32} L ${r * 0.4} ${-r * 0.32}`}
      fill="none"
      stroke="#ffffff"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

interface WaypointProps {
  index: number
  cx: number
  cy: number
  status: Status
  svincolo: (typeof SVINCOLI)[number]
  direction: Direzione
  orientation: Orientation
  /** Id del filtro ombra della variante corrente (univoco nel DOM) */
  shadowId: string
}

interface LabelGeometry {
  x: number
  y: number
  textAnchor: 'middle' | 'start' | 'end'
  guide: { x1: number; y1: number; x2: number; y2: number }
}

/** Etichetta sopra/sotto (orizzontale) oppure a lato alternato (verticale) */
function labelGeometry(
  orientation: Orientation,
  index: number,
  cx: number,
  cy: number,
  r: number
): LabelGeometry {
  const first = index % 2 === 0
  if (orientation === 'horizontal') {
    const labelY = first ? cy - r - LABEL_GAP : cy + r + LABEL_GAP
    return {
      x: cx,
      y: labelY,
      textAnchor: 'middle',
      guide: {
        x1: cx,
        y1: first ? labelY + 5 : labelY - 5,
        x2: cx,
        y2: first ? cy - r - 3 : cy + r + 3,
      },
    }
  }
  // Verticale: etichette alternate a sinistra/destra della linea
  const labelX = first ? cx - r - V_LABEL_GAP : cx + r + V_LABEL_GAP
  return {
    x: labelX,
    y: cy + 4,
    textAnchor: first ? 'end' : 'start',
    guide: {
      x1: first ? labelX + 4 : labelX - 4,
      y1: cy,
      x2: first ? cx - r - 3 : cx + r + 3,
      y2: cy,
    },
  }
}

function Waypoint({ index, cx, cy, status, svincolo, direction, orientation, shadowId }: WaypointProps) {
  const isTerminus = index === 0 || index === LAST
  const r = isTerminus ? TERMINUS_R : NODE_R
  const isClosed = status === 'rosso'
  const label = labelGeometry(orientation, index, cx, cy, r)

  return (
    <g>
      {/* Linea guida etichetta */}
      <line
        x1={label.guide.x1}
        y1={label.guide.y1}
        x2={label.guide.x2}
        y2={label.guide.y2}
        stroke="var(--map-guide)"
        strokeWidth={1}
      />
      <text
        x={label.x}
        y={label.y}
        textAnchor={label.textAnchor}
        fontSize={isTerminus ? 12.5 : 11}
        fontWeight={800}
        fill={isClosed ? 'var(--status-rosso)' : 'var(--map-label)'}
        letterSpacing="0.3"
      >
        {svincolo.breve.toUpperCase()}
      </text>

      {/* Anello pulsante sulle uscite chiuse: massima evidenza sui capolinea */}
      {isClosed && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 3}
          fill="none"
          stroke="var(--status-rosso)"
          strokeWidth={2}
          className="schematic-pulse"
        />
      )}

      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={STATUS_VAR[status]}
        stroke="var(--node-ring)"
        strokeWidth={2.5}
        filter={`url(#${shadowId})`}
        data-status={status}
        data-id={svincolo.id}
        data-dir={direction}
        role="img"
        aria-label={`${svincolo.nome} in direzione ${DIREZIONE_LABEL[direction]}: ${STATUS_LABEL[status]}`}
      />
      <g transform={`translate(${cx} ${cy})`} aria-hidden="true">
        <StatusIcon status={status} r={r} />
      </g>
    </g>
  )
}

export function SchematicMap({
  state,
  direction,
  orientation = 'horizontal',
  now,
  dateKey,
}: SchematicMapProps) {
  const statusMap = dateKey
    ? statusBySvincoloForMapForDateKey(state, dateKey)
    : statusBySvincoloForMap(state, now)
  const tratti = dateKey
    ? activeTrattiForDateKey(state, direction, dateKey)
    : activeTratti(state, direction, now)
  const isVertical = orientation === 'vertical'

  // Verticale: Capodichino in alto → si viaggia "in su" verso Capodichino
  const arrowLabel = isVertical
    ? direction === 'capodichino'
      ? '↑ Direzione Capodichino'
      : '↓ Direzione Pozzuoli'
    : direction === 'capodichino'
      ? 'Direzione Capodichino →'
      : '← Direzione Pozzuoli'

  const points = isVertical ? V_POINTS : POINTS
  const roadPath = isVertical ? V_ROAD_PATH : ROAD_PATH
  const svgW = isVertical ? V_SVG_W : SVG_W
  const svgH = isVertical ? V_SVG_H : SVG_H
  // Id univoco per variante: entrambe possono coesistere nel DOM (visibilità responsive)
  const shadowId = `badgeShadow-${orientation}`
  const trattoPaths = trattoSegmentPaths(tratti, points)

  const svg = (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      {...(isVertical ? {} : { width: SVG_W, height: SVG_H })}
      className={isVertical ? 'w-full h-auto' : 'min-w-full'}
      role="presentation"
      style={{ fontFamily: 'var(--font-barlow-condensed)' }}
    >
      <defs>
        <filter id={shadowId} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.3" floodColor="#1b2a5c" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* ── Sede stradale ───────────────────────────────────────────── */}
      <path d={roadPath} fill="none" stroke="var(--road-navy)" strokeWidth={ROAD_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      <path d={roadPath} fill="none" stroke="var(--road-dash)" strokeWidth={2} strokeDasharray="10 9" strokeLinecap="round" />

      {/* ── Tratti chiusi con uscita obbligatoria: segmento in evidenza ── */}
      {trattoPaths.map((d, i) => (
        <path
          key={`tratto-${i}`}
          d={d}
          fill="none"
          stroke="var(--status-rosso)"
          strokeWidth={ROAD_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          data-tratto-chiuso="true"
        />
      ))}

      {/* ── Indicatore di senso di marcia ───────────────────────────── */}
      <text
        x={svgW / 2}
        y={svgH - (isVertical ? 8 : 12)}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="var(--map-guide)"
        letterSpacing="0.4"
      >
        {arrowLabel}
      </text>

      {/* ── Nodi ─────────────────────────────────────────────────────── */}
      {SVINCOLI.map((sv, i) => {
        const [cx, cy] = points[i]
        const info = statusMap.get(sv.id)
        const status = (direction === 'pozzuoli' ? info?.pozzuoli : info?.capodichino) ?? 'verde'
        return (
          <Waypoint
            key={sv.id}
            index={i}
            cx={cx}
            cy={cy}
            status={status}
            svincolo={sv}
            direction={direction}
            orientation={orientation}
            shadowId={shadowId}
          />
        )
      })}
    </svg>
  )

  return (
    <div
      className="w-full"
      data-orientation={orientation}
      aria-label={`Mappa stilizzata della A56 — direzione ${DIREZIONE_LABEL[direction]}`}
    >
      <style>{`
        @keyframes schematic-pulse-ring {
          0%   { r: ${NODE_R + 3}; opacity: 0.55; }
          100% { r: ${NODE_R + 12}; opacity: 0; }
        }
        .schematic-pulse { animation: schematic-pulse-ring 1.6s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .schematic-pulse { animation: none; opacity: 0.35; }
        }
      `}</style>

      {isVertical ? svg : <div className="overflow-x-auto">{svg}</div>}
    </div>
  )
}
