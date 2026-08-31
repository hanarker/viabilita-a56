'use client'

import { useEffect, useState } from 'react'
import { ShieldLogo } from '@/components/ShieldLogo'
import { ArrowIcon } from '@/components/ArrowIcon'

const NAV_LINKS = [
  { href: '/#mappa', label: 'Mappa' },
  { href: '/#chiusure-serali', label: 'Chiusure serali' },
  { href: '/#chi-sono', label: 'Chi sono' },
  { href: '/#perche', label: 'Perché' },
  { href: '/#cosa-non-mi-piace', label: 'Cosa non mi piace' },
  { href: '/#offrimi-un-caffe', label: 'Offrimi un caffè' },
] as const

function BurgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      {isOpen ? (
        <path
          d="M4 4 L16 16 M16 4 L4 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M3 5 H17 M3 10 H17 M3 15 H17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  return (
    <div className="sticky top-0 z-40 bg-sign text-sign-foreground shadow-md">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
        <a
          href="/#mappa"
          className="flex items-center gap-2.5"
          onClick={() => setIsOpen(false)}
        >
          <ShieldLogo width={22} height={24} variant="inverse" />
          <span className="font-display text-base sm:text-lg font-bold uppercase tracking-wide leading-none">
            A56 di Schrödinger
          </span>
        </a>

        {/* Link desktop */}
        <nav aria-label="Principale" className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-3 py-2 text-sm font-semibold uppercase tracking-wide text-sign-foreground/80 hover:text-sign-foreground hover:bg-sign-line/40 rounded-[3px] transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Burger mobile */}
        <button
          type="button"
          aria-label={isOpen ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={isOpen}
          aria-controls="menu-mobile"
          onClick={() => setIsOpen((prev) => !prev)}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-[4px] hover:bg-sign-line/40 transition-colors"
        >
          <BurgerIcon isOpen={isOpen} />
        </button>
      </div>

      {/* Pannello mobile in stile elenco uscite */}
      {isOpen && (
        <nav
          id="menu-mobile"
          aria-label="Menu mobile"
          className="md:hidden border-t border-sign-line"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-3.5 border-b border-sign-line last:border-b-0 font-display text-lg font-semibold uppercase tracking-wide hover:bg-sign-line/40 transition-colors"
            >
              {label}
              <ArrowIcon verso="destra" />
            </a>
          ))}
        </nav>
      )}
    </div>
  )
}
