import Link from 'next/link'
import { readState } from '@/lib/store'
import { MapViewSwitcher } from '@/components/MapViewSwitcher'
import { Legend } from '@/components/Legend'
import { StatusBar } from '@/components/StatusBar'
import { EveningClosures } from '@/components/EveningClosures'
import { InfoSections } from '@/components/InfoSections'
import { AdSlot } from '@/components/AdSlot'
import { ShieldLogo } from '@/components/ShieldLogo'
import { ADS_ENABLED } from '@/lib/ads-config'

// Rilegge i dati ad ogni richiesta (non cached), così il cron
// aggiorna Redis e la pagina mostra sempre l'ultimo snapshot.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const state = await readState()
  // Istante condiviso da mappa e chiusure: pagina force-dynamic, fresco a ogni richiesta
  const now = new Date()

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <ShieldLogo />
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide leading-none text-primary">
            A56 di Schrödinger
          </h1>
          <p className="text-muted text-sm mt-1 font-sans">
            La A56: aperta e chiusa finché non la osservi.
          </p>
        </div>
      </header>

      {/* Legenda */}
      <Legend />

      {/* Mappa */}
      <section
        id="mappa"
        className="w-full mt-6 scroll-mt-20 bg-surface rounded-lg border border-edge p-4"
      >
        <h2 className="flex items-center gap-2 mb-3 font-display text-xl font-bold uppercase tracking-wide text-foreground">
          <span
            aria-hidden="true"
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{
              background:
                'linear-gradient(135deg, var(--status-verde) 50%, var(--status-rosso) 50%)',
            }}
          />
          In tempo reale
        </h2>
        {state ? (
          <>
            <MapViewSwitcher state={state} now={now} />
            <StatusBar
              updatedAt={state.updatedAt}
              checkedAt={state.checkedAt}
              stale={state.stale}
            />
          </>
        ) : (
          <div className="text-center py-12 text-muted">
            <p className="text-lg font-medium">Dati non ancora disponibili</p>
            <p className="text-sm mt-1">
              Avvia il cron oppure esegui{' '}
              <code className="bg-background border border-edge px-1 rounded">
                npm run update
              </code>
            </p>
          </div>
        )}
      </section>

      {/* Chiusure programmate per le prossime serate */}
      <EveningClosures state={state} now={now} />

      {/* Banner pubblicitario (segnaposto AdSense) */}
      {ADS_ENABLED && <AdSlot id="dopo-mappa" />}

      {/* Sezioni informative */}
      <InfoSections />

      {/* Banner pubblicitario (segnaposto AdSense) */}
      {ADS_ENABLED && <AdSlot id="pre-footer" />}

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-muted">
        <p>
          Dati estratti da{' '}
          <a
            href="https://www.tangenzialedinapoli.it"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent"
          >
            tangenzialedinapoli.it
          </a>{' '}
          e interpretati con OpenAI
        </p>
        <p className="mt-1">
          I dati sono generati tramite interpretazione automatica e potrebbero contenere errori: verifica sempre con fonti ufficiali prima di metterti in viaggio.
        </p>
        <p className="mt-1">
          <Link href="/privacy" className="underline hover:text-accent">
            Privacy e Cookie
          </Link>
        </p>
      </footer>
    </main>
  )
}
