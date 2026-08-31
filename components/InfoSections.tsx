import { SectionPanel } from '@/components/SectionPanel'

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M4 21 C4 16.5 7.5 14 12 14 C16.5 14 20 16.5 20 21"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        d="M5 21 V4 M5 4 C8 2 11 6 14 4 C16 2.7 18 3 19 4 V13 C18 12 16 11.7 14 13 C11 15 8 11 5 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        d="M12 3 L22 20 H2 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.1" fill="currentColor" />
    </svg>
  )
}

function CoffeeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        d="M4 9 H16 V16 C16 18.2 14.2 20 12 20 H8 C5.8 20 4 18.2 4 16 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 10 H18 C19.1 10 20 10.9 20 12 C20 13.1 19.1 14 18 14 H16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 3 C8 4.5 9.5 4.5 9.5 6 M13 3 C13 4.5 14.5 4.5 14.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

const CRITICITA = [
  {
    titolo: 'Quei maledetti 5 centesimi',
    testo:
      'Il pedaggio con gli spiccioli di resto, come se fosse pensato apposta per rallentare la fila al casello.',
  },
  {
    titolo: 'Un sito poco fruibile',
    testo:
      'E cosi difficile fare un sito web chiaro e leggibile, sopratutto per chi guida e quindi la paga?',
  },
  {
    titolo: 'Uscita chiusa? Paghi lo stesso',
    testo:
      'Se la percorri e la tua uscita è chiusa, il pedaggio l’hai già pagato: ti resta che uscire sconsolato, facendo il gioco dell\'oca e tornare indietro. Puoi chiedere il rimborso, ma quanti lo fanno per 1,05€?',
  },
] as const

export function InfoSections() {
  return (
    <div className="w-full mt-8 flex flex-col gap-8">
      <SectionPanel id="chi-sono" titolo="Chi sono" icona={<PersonIcon />}>
        <p className="text-foreground leading-relaxed">
          Sono un cittadino, non un&apos;azienda. Ho automatizzato e reso disponibile per tutti, qualcosa che 
          ho fatto un sacco di volte. Copiavo e incollavo le informazioni ufficiali, le mettevo su ChatGPT e mi
          facevo dire se la mia uscita fosse aperta o chiusa. Poi ho pensato che avrei potuto fare di meglio.
          Mettere online una mappa facilmente consultabile e rendere fruibile un&apos;informazione essenziale — la A56 è aperta o chiusa? In fondo,
          come il gatto di Schrödinger, è tutte e due le cose finché non la guardi: da qui il nome.
        </p>
      </SectionPanel>

      <SectionPanel id="perche" titolo="Perché questo sito" icona={<FlagIcon />}>
        <p className="text-foreground leading-relaxed">
          Non tolleravo più di imboccare la A56 dopo mezzanotte senza sapere se la mia
          uscita fosse aperta.
          Gli avvisi ufficiali esistono, ma una mappa immediata è piu comoda e intuitiva. Non c&apos;è niente di peggio di
          qualcuno che non si mette nei panni dell&apos;automobilista: tu vuoi solo sapere se si
          passa oppure no.
        </p>
        <p className="text-foreground leading-relaxed mt-3">
          Come se non bastasse, le chiusure notturne, a mia esperienza, quasi mai vengono segnalate su Google Maps,
          quindi te ne accorgi solo quando sei già davanti allo svincolo sbarrato. 
          È presente la segnaletica orizzontale e i tabelloni, ma è così difficile fare una mappa chiara?
        </p>
      </SectionPanel>

      <SectionPanel
        id="cosa-non-mi-piace"
        titolo="Cosa non mi piace della A56"
        icona={<WarningIcon />}
      >
        <ul className="grid gap-3 sm:grid-cols-3">
          {CRITICITA.map(({ titolo, testo }) => (
            <li
              key={titolo}
              className="rounded-[4px] border border-edge bg-surface p-4 flex flex-col gap-2"
            >
              <h3 className="flex items-start gap-2">
                <span
                  className="inline-flex items-center justify-center w-5 h-5 mt-px rounded-[2px] bg-amber-500 text-white text-[11px] font-bold shrink-0"
                  aria-hidden="true"
                >
                  !
                </span>
                <span className="font-display text-lg font-semibold uppercase tracking-wide text-foreground leading-tight">
                  {titolo}
                </span>
              </h3>
              <p className="text-sm text-muted leading-relaxed">{testo}</p>
            </li>
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel id="offrimi-un-caffe" titolo="Offrimi un caffè" icona={<CoffeeIcon />}>
        <p className="text-foreground leading-relaxed">
          Questo sito è gratuito, senza pubblicità e lo tengo online a mie spese (LLM, hosting).
          Se ti è tornato utile e ti va di ricambiare, qui niente spiccioli di resto al casello: basta un
          caffè.
        </p>
        <a
          href="https://paypal.me/aresbertelli"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-[4px] bg-accent px-5 py-2.5 font-display text-base font-bold uppercase tracking-wide text-white hover:opacity-90 transition-opacity"
        >
          <CoffeeIcon />
          Offrimi un caffè
        </a>
      </SectionPanel>
    </div>
  )
}
