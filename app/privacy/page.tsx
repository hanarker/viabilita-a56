import type { Metadata } from 'next'
import Link from 'next/link'
import { SectionPanel } from '@/components/SectionPanel'

export const metadata: Metadata = {
  title: 'Privacy e Cookie — A56 di Schrödinger',
  description: 'Informativa sul trattamento dei dati personali e sui cookie utilizzati dal sito.',
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <rect x="5" y="11" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 11 V7 C8 4.24 9.79 2 12 2 C14.21 2 16 4.24 16 7 V11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="1.4" fill="currentColor" />
    </svg>
  )
}

export default function PrivacyPage() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-4xl mx-auto w-full">
      <header className="w-full mb-6">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide leading-none text-primary">
          Privacy e Cookie
        </h1>
        <p className="text-muted text-sm mt-2 font-sans">
          Informativa sul trattamento dei dati personali ai sensi del Regolamento (UE) 2016/679
          (GDPR).
        </p>
      </header>

      <div className="w-full flex flex-col gap-8">
        <SectionPanel id="titolare" titolo="Titolare del trattamento" icona={<LockIcon />}>
          <p className="text-foreground leading-relaxed">
            Il sito è gestito da un privato cittadino, a titolo non commerciale e senza finalità di
            lucro (vedi la sezione{' '}
            <Link href="/#chi-sono" className="underline hover:text-accent">
              Chi sono
            </Link>
            ). Per qualsiasi richiesta relativa al trattamento dei dati puoi scrivere a{' '}
            <a href="mailto:aresbertelli@gmail.com" className="underline hover:text-accent">
              aresbertelli@gmail.com
            </a>
            .
          </p>
        </SectionPanel>

        <SectionPanel id="dati-trattati" titolo="Dati trattati" icona={<LockIcon />}>
          <p className="text-foreground leading-relaxed">
            Il sito non richiede registrazione e non raccoglie direttamente dati identificativi
            degli utenti. Il servizio di hosting può registrare automaticamente dati tecnici di
            navigazione (es. indirizzo IP, tipo di browser, pagine visitate) nei log di sistema,
            necessari al funzionamento e alla sicurezza dell&apos;infrastruttura, e conservati per
            il tempo strettamente necessario a tali finalità.
          </p>
        </SectionPanel>

        <SectionPanel id="cookie-tecnici" titolo="Cookie tecnici" icona={<LockIcon />}>
          <p className="text-foreground leading-relaxed">
            Il sito non installa cookie tecnici propri, salvo un unico dato salvato in{' '}
            <code className="bg-background border border-edge px-1 rounded">localStorage</code>{' '}
            del tuo dispositivo per ricordare la scelta espressa nel banner cookie (accettazione o
            rifiuto), descritto nella sezione successiva.
          </p>
        </SectionPanel>

        <SectionPanel
          id="cookie-pubblicitari"
          titolo="Cookie di profilazione e pubblicità"
          icona={<LockIcon />}
        >
          <p className="text-foreground leading-relaxed">
            Il sito non ospita attualmente alcun annuncio pubblicitario: l&apos;integrazione con
            Google AdSense è predisposta nel codice ma disattivata. Se e quando verrà riattivata,
            il servizio potrà utilizzare cookie e tecnologie simili per mostrare annunci, anche
            personalizzati in base ai tuoi interessi, e verrà caricato solo previo consenso
            esplicito raccolto tramite il banner cookie mostrato al primo accesso al sito (non un
            messaggio gestito da Google). Puoi modificare o revocare la tua scelta in qualsiasi
            momento cancellando i dati di navigazione del sito dal tuo browser. Per maggiori
            informazioni su come Google tratterebbe i dati, consulta la{' '}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-accent"
            >
              informativa sulla pubblicità di Google
            </a>
            .
          </p>
        </SectionPanel>

        <SectionPanel id="base-giuridica" titolo="Base giuridica" icona={<LockIcon />}>
          <p className="text-foreground leading-relaxed">
            Il trattamento dei dati tramite l&apos;eventuale futuro banner cookie pubblicitario si
            baserà sul consenso dell&apos;utente (art. 6, par. 1, lett. a, GDPR), raccolto e
            liberamente revocabile tramite il banner stesso. I log tecnici indispensabili al
            funzionamento del sito sono trattati sulla base del legittimo interesse del titolare
            alla sicurezza e al corretto funzionamento del servizio.
          </p>
        </SectionPanel>

        <SectionPanel id="conservazione" titolo="Conservazione dei dati" icona={<LockIcon />}>
          <p className="text-foreground leading-relaxed">
            La preferenza espressa nel banner cookie è conservata sul tuo dispositivo fino a
            revoca o cancellazione manuale dei dati di navigazione del browser. I log tecnici del
            server sono conservati per il tempo minimo necessario alle finalità di sicurezza.
          </p>
        </SectionPanel>

        <SectionPanel id="diritti" titolo="I tuoi diritti" icona={<LockIcon />}>
          <p className="text-foreground leading-relaxed">
            In qualità di interessato hai diritto di chiedere in qualsiasi momento l&apos;accesso
            ai tuoi dati, la rettifica, la cancellazione, la limitazione del trattamento, di
            opporti al trattamento e, dove applicabile, la portabilità dei dati. Puoi esercitare
            questi diritti scrivendo a{' '}
            <a href="mailto:aresbertelli@gmail.com" className="underline hover:text-accent">
              aresbertelli@gmail.com
            </a>
            . Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati
            personali (
            <a
              href="https://www.garanteprivacy.it"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-accent"
            >
              www.garanteprivacy.it
            </a>
            ).
          </p>
        </SectionPanel>

        <SectionPanel id="modifiche" titolo="Modifiche a questa informativa" icona={<LockIcon />}>
          <p className="text-foreground leading-relaxed">
            Questa informativa può essere aggiornata nel tempo, ad esempio in caso di modifiche ai
            servizi pubblicitari utilizzati. Ultimo aggiornamento: luglio 2026.
          </p>
        </SectionPanel>
      </div>

      <footer className="mt-8 text-center text-xs text-muted">
        <Link href="/" className="underline hover:text-accent">
          Torna alla home
        </Link>
      </footer>
    </main>
  )
}
