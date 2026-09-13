import {
  parseListaAvvisi,
  parseCorpoAvviso,
  parseAvvisoHomepage,
  formatSource,
  HOMEPAGE_ALERT_HEADING,
  type Avviso,
} from '@/lib/scraper-parse'

export { HOMEPAGE_ALERT_HEADING }

const AVVISI_PATH = '/viabilità'
const HOMEPAGE_PATH = '/'
const MAX_AVVISI = 3
const FETCH_TIMEOUT_MS = 15_000

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`Errore HTTP ${response.status} durante il fetch di ${url}`)
  }
  return response.text()
}

/**
 * Scarica il riquadro "Avviso ai viaggiatori" in homepage (chiusure
 * straordinarie, annullamenti). Degrada a `null` su qualsiasi errore: è un
 * contenuto supplementare, un suo fallimento non deve bloccare l'update
 * basato sulla pagina `/viabilità`.
 */
async function fetchAvvisoHomepage(baseUrl: string): Promise<string | null> {
  try {
    const homepageUrl = new URL(HOMEPAGE_PATH, baseUrl).toString()
    const html = await fetchHtml(homepageUrl)
    return parseAvvisoHomepage(html)
  } catch (error) {
    console.error("Errore nel recupero dell'avviso homepage", error)
    return null
  }
}

/**
 * Scarica la lista degli avvisi dalla pagina `/viabilità` e il corpo dei
 * {@link MAX_AVVISI} avvisi più recenti, restituendo un unico testo
 * strutturato (un blocco per avviso) pronto per l'interpretazione LLM.
 *
 * Un singolo dettaglio che fallisce viene loggato e scartato (degradazione
 * controllata); si lancia un errore solo se la lista è irraggiungibile o
 * vuota, oppure se nessun dettaglio è recuperabile.
 */
export async function scrapeAvvisi(baseUrl: string): Promise<string> {
  const listaUrl = new URL(AVVISI_PATH, baseUrl).toString()
  const listaHtml = await fetchHtml(listaUrl)
  const links = parseListaAvvisi(listaHtml, baseUrl)

  if (links.length === 0) {
    throw new Error('Nessun avviso trovato nella pagina viabilità')
  }

  const [avvisoHomepage, risultati] = await Promise.all([
    fetchAvvisoHomepage(baseUrl),
    Promise.allSettled(
      links.slice(0, MAX_AVVISI).map(async (link): Promise<Avviso> => {
        const html = await fetchHtml(link.url)
        const corpo = parseCorpoAvviso(html)
        return { ...link, corpo }
      })
    ),
  ])

  const avvisi: Avviso[] = []
  for (const [index, risultato] of risultati.entries()) {
    if (risultato.status === 'fulfilled') {
      avvisi.push(risultato.value)
    } else {
      const link = links[index]
      console.error(
        `Errore nel recupero dell'avviso "${link?.titolo}" (${link?.url})`,
        risultato.reason
      )
    }
  }

  if (avvisi.length === 0) {
    throw new Error('Nessun avviso recuperabile')
  }

  const corpoAvvisi = formatSource(avvisi)

  return avvisoHomepage
    ? `${HOMEPAGE_ALERT_HEADING}\n${avvisoHomepage}\n\n${corpoAvvisi}`
    : corpoAvvisi
}
