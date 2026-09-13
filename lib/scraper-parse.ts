import * as cheerio from 'cheerio'

/** Un avviso trovato nella lista `/viabilità`, prima di scaricarne il dettaglio. */
export interface AvvisoLink {
  titolo: string
  /** Data di pubblicazione così come appare nella lista (es. "28-08-2026"), non parsata. */
  data: string
  url: string
}

/** Un avviso completo di corpo, pronto per essere incluso nel `source` finale. */
export interface Avviso extends AvvisoLink {
  corpo: string
}

/**
 * Intestazione anteposta all'avviso homepage nel `source` (vedi
 * `lib/scraper.ts`): il testo esatto è citato nel prompt LLM
 * (`lib/interpreter.ts`) per fargli riconoscere questo blocco come
 * prioritario (può annullare/rettificare le chiusure sottostanti).
 */
export const HOMEPAGE_ALERT_HEADING =
  '## AVVISO URGENTE (homepage — ha priorità: può annullare o rettificare le chiusure elencate sotto)'

const LIST_ITEM_SELECTOR = '#news-list .list-item, .list-item'
const LIST_TITLE_SELECTOR = 'a.list-title'
const LIST_HEADER_SELECTOR = '.list-header'
const ARTICLE_SELECTOR = '.journal-content-article'
const HOMEPAGE_ALERT_SELECTOR = '#AlertArea .journal-content-article'
const BLOCK_TAGS = 'p, li, div, h1, h2, h3, h4, h5, h6, tr'

/**
 * Estrae il testo di un elemento preservando i confini tra blocchi (paragrafi,
 * `<li>`, righe) come newline invece di collassare tutto su una riga sola.
 * Usata sia per il corpo avviso sia per il riquadro "Avviso ai viaggiatori".
 */
function estraiTestoBlocco(root: ReturnType<ReturnType<typeof cheerio.load>>): string {
  root.find('script, style').remove()
  root.find('br').replaceWith('\n')
  root.find(BLOCK_TAGS).append('\n')

  return root
    .text()
    .split('\n')
    .map((riga) => riga.replace(/[^\S\n]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

/**
 * Estrae titolo, data e url assoluto di ogni avviso dalla pagina lista
 * `/viabilità`. Gli item privi di link titolo vengono scartati.
 */
export function parseListaAvvisi(html: string, baseUrl: string): AvvisoLink[] {
  const $ = cheerio.load(html)
  const avvisi: AvvisoLink[] = []

  $(LIST_ITEM_SELECTOR).each((_, el) => {
    const link = $(el).find(LIST_TITLE_SELECTOR).first()
    const href = link.attr('href')
    if (!href) {
      return
    }

    const titolo = link.text().trim()
    const data = $(el).find(LIST_HEADER_SELECTOR).first().text().trim()
    const url = new URL(href, baseUrl).toString()

    avvisi.push({ titolo, data, url })
  })

  return avvisi
}

/**
 * Estrae il testo del corpo avviso da una pagina di dettaglio, preservando i
 * confini tra blocchi (paragrafi, `<li>`, righe) come newline invece di
 * collassare tutto su una riga sola. Lancia un errore se il corpo non è
 * trovato o è vuoto.
 */
export function parseCorpoAvviso(html: string): string {
  const $ = cheerio.load(html)
  const root = $(ARTICLE_SELECTOR).first()

  if (!root.length) {
    throw new Error('Corpo avviso non trovato')
  }

  const corpo = estraiTestoBlocco(root)

  if (corpo.length === 0) {
    throw new Error('Corpo avviso non trovato')
  }

  return corpo
}

/**
 * Estrae il testo del riquadro "Avviso ai viaggiatori" in homepage, che ospita
 * comunicazioni urgenti (chiusure straordinarie, annullamenti/rettifiche di
 * chiusure già programmate) separate dalla pagina `/viabilità`. Restituisce
 * `null` se il riquadro non è presente o non contiene un avviso attivo
 * (condizione normale, non un errore: non sempre c'è un avviso urgente).
 */
export function parseAvvisoHomepage(html: string): string | null {
  const $ = cheerio.load(html)
  const root = $(HOMEPAGE_ALERT_SELECTOR).first()

  if (!root.length) {
    return null
  }

  const testo = estraiTestoBlocco(root)

  return testo.length === 0 ? null : testo
}

/**
 * Concatena gli avvisi in un unico testo strutturato per l'LLM: ogni avviso
 * preceduto da un'intestazione con titolo e data di pubblicazione, blocchi
 * separati da riga vuota.
 */
export function formatSource(avvisi: readonly Avviso[]): string {
  return avvisi
    .map((avviso) => `## ${avviso.titolo} (pubblicato il ${avviso.data})\n${avviso.corpo}`)
    .join('\n\n')
}
