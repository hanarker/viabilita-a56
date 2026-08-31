import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InfoSections } from '@/components/InfoSections'

describe('InfoSections', () => {
  it('mostra le tre sezioni con i rispettivi titoli', () => {
    render(<InfoSections />)
    expect(screen.getByRole('heading', { name: /chi sono/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /perché questo sito/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /cosa non mi piace della a56/i })
    ).toBeInTheDocument()
  })

  it('espone gli id ancora usati dalla navbar', () => {
    const { container } = render(<InfoSections />)
    expect(container.querySelector('section#chi-sono')).toBeInTheDocument()
    expect(container.querySelector('section#perche')).toBeInTheDocument()
    expect(container.querySelector('section#cosa-non-mi-piace')).toBeInTheDocument()
  })

  it('elenca le tre criticità della A56', () => {
    render(<InfoSections />)
    expect(screen.getByRole('heading', { name: /5 centesimi/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /caselli fuori servizio/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /uscita chiusa\? paghi lo stesso/i })
    ).toBeInTheDocument()
  })
})
