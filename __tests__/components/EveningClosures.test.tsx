import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EveningClosures } from '@/components/EveningClosures'
import type { TangenzialeState, SvincoloState } from '@/lib/types'

// Pomeriggio del 2 luglio 2026 (estate, +02:00): nessuna finestra notturna attiva
const NOW = new Date('2026-07-02T18:00:00+02:00')

function makeState(items: SvincoloState[]): TangenzialeState {
  return {
    items,
    updatedAt: '2026-07-02T16:00:00.000Z',
    source: 'test',
    stale: false,
  }
}

const stateConChiusure = makeState([
  {
    id: 'agnano',
    direzione: 'capodichino',
    status: 'rosso',
    note: 'Chiusura svincolo di uscita',
    windows: [
      { from: '2026-07-02T23:00:00+02:00', to: '2026-07-03T06:00:00+02:00' },
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
])

describe('EveningClosures', () => {
  it('renderizza la sezione con id e heading "Chiusure serali"', () => {
    const { container } = render(<EveningClosures state={stateConChiusure} now={NOW} />)
    expect(container.querySelector('section#chiusure-serali')).not.toBeNull()
    expect(
      screen.getByRole('heading', { name: /chiusure serali/i })
    ).toBeInTheDocument()
  })

  it('raggruppa per serata con heading Stanotte e Domani notte', () => {
    render(<EveningClosures state={stateConChiusure} now={NOW} />)
    expect(screen.getByRole('heading', { name: /stanotte/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /domani notte/i })).toBeInTheDocument()
  })

  it('mostra nome svincolo, direzione testuale e orari', () => {
    render(<EveningClosures state={stateConChiusure} now={NOW} />)
    expect(screen.getByText('Agnano')).toBeInTheDocument()
    expect(screen.getByText(/capodichino/i)).toBeInTheDocument()
    expect(screen.getAllByText('23:00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('06:00').length).toBeGreaterThan(0)
  })

  it('usa elementi <time> con dateTime corretto', () => {
    const { container } = render(<EveningClosures state={stateConChiusure} now={NOW} />)
    const times = [...container.querySelectorAll('time')].map((t) =>
      t.getAttribute('dateTime')
    )
    expect(times).toContain('2026-07-02T23:00:00+02:00')
    expect(times).toContain('2026-07-03T06:00:00+02:00')
  })

  it('mostra il badge IN CORSO solo per la finestra attiva rispetto a now', () => {
    const nowNight = new Date('2026-07-02T23:30:00+02:00')
    render(<EveningClosures state={stateConChiusure} now={nowNight} />)
    // Agnano è in corso (23:00-06:00), Vomero (domani) no
    expect(screen.getAllByText(/in corso/i)).toHaveLength(1)
  })

  it('non mostra badge IN CORSO di pomeriggio', () => {
    render(<EveningClosures state={stateConChiusure} now={NOW} />)
    expect(screen.queryByText(/^in corso$/i)).not.toBeInTheDocument()
  })

  it('mostra il gruppo permanenti per primo quando un item non ha finestre', () => {
    const state = makeState([
      ...stateConChiusure.items,
      { id: 'cuma', direzione: 'pozzuoli', status: 'giallo', note: 'Lavori in corso' },
    ])
    render(<EveningClosures state={state} now={NOW} />)
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings[0]).toHaveTextContent(/fino a nuovo avviso/i)
    expect(screen.getByText('Cuma')).toBeInTheDocument()
  })

  it('non renderizza le finestre già concluse', () => {
    const state = makeState([
      {
        id: 'fuorigrotta',
        direzione: 'pozzuoli',
        status: 'rosso',
        windows: [
          { from: '2026-06-29T23:00:00+02:00', to: '2026-06-30T06:00:00+02:00' },
        ],
      },
    ])
    render(<EveningClosures state={state} now={NOW} />)
    expect(screen.queryByText('Fuorigrotta')).not.toBeInTheDocument()
    expect(screen.getByText(/nessuna chiusura programmata/i)).toBeInTheDocument()
  })

  it('mostra empty state quando non ci sono chiusure', () => {
    render(<EveningClosures state={makeState([])} now={NOW} />)
    expect(screen.getByText(/nessuna chiusura programmata/i)).toBeInTheDocument()
  })

  it('mostra empty state anche con state null (anchor sempre valido)', () => {
    const { container } = render(<EveningClosures state={null} now={NOW} />)
    expect(container.querySelector('section#chiusure-serali')).not.toBeNull()
    expect(screen.getByText(/nessuna chiusura programmata/i)).toBeInTheDocument()
  })

  it('usa semantica lista con un listitem per chiusura', () => {
    render(<EveningClosures state={stateConChiusure} now={NOW} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('finestra a fine indeterminata: mostra "fino a cessate esigenze" e nessun orario di fine', () => {
    const state = makeState([
      {
        id: 'fuorigrotta',
        direzione: 'pozzuoli',
        status: 'rosso',
        windows: [{ from: '2026-07-02T19:00:00+02:00' }],
      },
    ])
    render(<EveningClosures state={state} now={NOW} />)
    expect(screen.getByText('Fuorigrotta')).toBeInTheDocument()
    expect(screen.getByText(/fino a cessate esigenze/i)).toBeInTheDocument()
    expect(screen.getAllByText('19:00').length).toBeGreaterThan(0)
  })
})
