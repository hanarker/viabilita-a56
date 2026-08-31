import OpenAI from 'openai'
import { z } from 'zod'
import { SVINCOLI, SVINCOLO_IDS } from '@/lib/svincoli'
import type { SvincoloState, TrattoState } from '@/lib/types'

const ClosureWindowSchema = z.object({
  from: z.string(),
  to: z.string(),
})

const SVINCOLO_ID_ENUM = z.enum(SVINCOLO_IDS as [string, ...string[]])

const SvincoloStateSchema = z.object({
  id: SVINCOLO_ID_ENUM,
  direzione: z.enum(['capodichino', 'pozzuoli']),
  status: z.enum(['verde', 'giallo', 'rosso']),
  note: z.string().optional(),
  windows: z.array(ClosureWindowSchema).optional(),
})

const TrattoStateSchema = z.object({
  da: SVINCOLO_ID_ENUM,
  a: SVINCOLO_ID_ENUM,
  direzione: z.enum(['capodichino', 'pozzuoli']),
  uscitaObbligatoria: SVINCOLO_ID_ENUM,
  note: z.string().optional(),
  windows: z.array(ClosureWindowSchema).optional(),
})

const ResponseSchema = z.object({
  items: z.array(SvincoloStateSchema),
  tratti: z.array(TrattoStateSchema).optional(),
})

export interface InterpretedAvvisi {
  items: SvincoloState[]
  tratti: TrattoState[]
}

const ROME_TIMEZONE = 'Europe/Rome'

/**
 * Formatta `now` nel fuso Europe/Rome come "YYYY-MM-DDTHH:mm:ss+HH:mm",
 * così il prompt indica sia l'istante corrente sia l'offset da usare
 * per le finestre temporali generate dall'LLM.
 */
function formatNowWithRomeOffset(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ROME_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const localIso = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`

  // Calcola l'offset corrente di Europe/Rome (+01:00 o +02:00) confrontando
  // l'istante UTC con la stessa data/ora interpretata come locale.
  const offsetMinutes = Math.round(
    (new Date(`${localIso}Z`).getTime() - now.getTime()) / 60000
  )
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const offset = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`

  return `${localIso}${offset}`
}

function buildSystemPrompt(now: Date): string {
  const nowIso = formatNowWithRomeOffset(now)
  const svincoliList = SVINCOLI.map((s) => `${s.id} = "${s.nome}"`).join(', ')

  return `Sei un assistente che interpreta avvisi stradali della Tangenziale di Napoli.
Ti verrà fornito un testo con avvisi ai viaggiatori. Devi distinguere DUE TIPI di
chiusura, che vanno in due elenchi separati della risposta:

1. "items": chiusura di un singolo SVINCOLO (uscita e/o ingresso), senza obbligare a
   uscire dal tratto autostradale. Frasi tipiche: "verrà chiuso lo svincolo d'uscita
   «X»", "verrà chiuso lo svincolo d'ingresso/entrata «X»". Colore: SEMPRE "giallo"
   (mai "rosso": il rosso è riservato ai tratti, vedi punto 2; usa "verde" solo se
   non applicabile, ma per un item da includere lo stato è sempre "giallo").
2. "tratti": chiusura di un TRATTO autostradale tra due svincoli, con conseguente
   USCITA OBBLIGATORIA. Frasi tipiche: "verranno chiusi il tratto autostradale
   «X/Y» ... con conseguente uscita obbligatoria «Z»". Qui "X/Y" sono i due
   svincoli estremi del tratto chiuso (in un ordine qualsiasi) e "Z" è lo svincolo
   dove i veicoli sono obbligati a uscire (di solito coincide con uno tra X e Y, il
   più vicino alla provenienza). Ogni tratto ha i campi: "da", "a" (i due estremi),
   "direzione", "uscitaObbligatoria", "note" opzionale, "windows" opzionale. Non
   generare per i tratti un colore/status: sono implicitamente "rosso".

Gli id svincolo validi, con il nome come compare nel testo sorgente, sono:
${svincoliList}
Usa SOLO questi id per "id" (negli items) e per "da"/"a"/"uscitaObbligatoria" (nei
tratti). Individua l'id corretto dal nome più vicino citato nel testo (i nomi nel
testo possono abbreviare o comporre più tratti/uscite con "/").

Il campo "direzione" ammette SOLO due valori: "capodichino" oppure "pozzuoli".
Il testo sorgente usa spesso sinonimi che NON vanno copiati letteralmente: normalizzali
sempre a una delle due etichette valide.
- "autostrade", "Napoli", "aeroporto" → "capodichino"
- "mare", "Pozzuoli", "Cuma" → "pozzuoli"
Se un avviso indica "entrambe le direzioni", genera due elementi separati (uno per
"capodichino" e uno per "pozzuoli") con la stessa nota.

La data e ora corrente è: ${nowIso} (fuso Europe/Rome).
Molte chiusure sono PROGRAMMATE solo in specifiche fasce orarie e date (es. "dalle ore
23,00 del giorno 30 giugno alle ore 6,00 del giorno successivo"), non chiusure permanenti.
Per ogni chiusura con orario/data specifici, DEVI calcolare le finestre temporali reali
in cui è attiva e restituirle nel campo "windows" come coppie "from"/"to" in formato ISO
8601 con offset Europe/Rome (es. "2026-06-30T23:00:00+02:00"). Usa la data corrente sopra
per risolvere riferimenti relativi ("il giorno successivo", mese/anno impliciti).
ATTENZIONE al caso "ore 24,00" (equivalente a "ore 24:00", "le ore 24", "mezzanotte del
giorno X"): in italiano indica la mezzanotte di FINE della giornata X, cioè lo STESSO
istante di "ore 00,00 del giorno X+1" — NON coincide con "ore 00,00 del giorno X" (un
giorno PRIMA, errore comune da evitare). Esempio: "dalle ore 24,00 del giorno 3 luglio
alle ore 6,00 del giorno successivo" → {"from": "2026-07-04T00:00:00+02:00", "to":
"2026-07-04T06:00:00+02:00"} (la notte è quella TRA IL 3 E IL 4 LUGLIO, non tra il 2 e
il 3). Se l'avviso cita più giorni o più clausole unite da virgole/"e" (es. "dalle ore
23,00 dei giorni 30 giugno e 1 e 2 luglio ... e dalle ore 24,00 del giorno 3 luglio
..."), DEVI generare UNA finestra per CIASCUNA data/clausola citata, SENZA OMETTERNE
NESSUNA, anche quando l'orario di inizio cambia da una clausola all'altra (es. alcune
notti iniziano alle 23,00 e una notte specifica alle 24,00): applica a ogni clausola il
proprio orario di inizio, non estendere un solo orario a tutte le date della frase. Se
una chiusura NON ha un orario/data specifico (es. lavori permanenti o divieti senza
fascia oraria), ometti il campo "windows" (sempre attiva).

ATTENZIONE: lo stesso svincolo o lo stesso tratto (stessi "id"/stessi "da"+"a") può
essere citato in PIÙ paragrafi separati del testo, uno per ogni settimana/periodo di
cantiere (es. un paragrafo per "questa settimana" con alcune date, un altro paragrafo
più avanti nel testo per "la settimana successiva" con date diverse). NON fondere questi
paragrafi scartando le date di uno di essi: DEVI includere nel campo "windows" TUTTE le
finestre di TUTTI i paragrafi che citano quello svincolo/tratto, senza lasciare che
l'ultima occorrenza nel testo sovrascriva o faccia perdere le finestre di un'occorrenza
precedente. In pratica, prima di scrivere l'item/tratto finale, cerca nell'intero testo
OGNI paragrafo che lo riguarda e unisci le finestre di tutti.

Il testo che segue è composto da più avvisi distinti, ognuno introdotto da
un'intestazione "## <titolo> (pubblicato il <data>)" e pubblicato in un momento diverso.
La stessa regola di fusione vale ANCHE TRA avvisi diversi: se lo stesso svincolo o
tratto compare in più avvisi con intestazioni diverse, unisci le finestre di tutti invece
di considerare solo l'avviso più recente.

Restituisci SOLO un JSON con questa struttura:
{
  "items": [
    {
      "id": "<id_svincolo>",
      "direzione": "capodichino|pozzuoli",
      "status": "giallo",
      "note": "...",
      "windows": [{ "from": "2026-06-30T23:00:00+02:00", "to": "2026-07-01T06:00:00+02:00" }]
    }
  ],
  "tratti": [
    {
      "da": "<id_svincolo>",
      "a": "<id_svincolo>",
      "direzione": "capodichino|pozzuoli",
      "uscitaObbligatoria": "<id_svincolo>",
      "note": "...",
      "windows": [{ "from": "2026-06-30T23:00:00+02:00", "to": "2026-07-01T06:00:00+02:00" }]
    }
  ]
}

Includi in "items" SOLO gli svincoli chiusi (uscita/ingresso, mai il caso "tratto").
Includi in "tratti" SOLO le chiusure di tratto con uscita obbligatoria.
Non inventare svincoli: usa solo questi id: ${SVINCOLO_IDS.join(', ')}.`
}

/**
 * Chiama l'API OpenAI per interpretare il testo degli avvisi e restituisce gli
 * item (chiusure di svincolo, giallo) e i tratti (chiusure con uscita
 * obbligatoria, rosso implicito). Valida la risposta con zod (lancia su schema
 * non valido, incluso un id svincolo fuori enum).
 */
export async function interpretAvvisi(
  apiKey: string,
  testoAvvisi: string,
  now: Date = new Date(),
  model: string = 'gpt-5'
): Promise<InterpretedAvvisi> {
  const client = new OpenAI({ apiKey })

  // I modelli "reasoning" (famiglia gpt-5) accettano solo temperature di default (1):
  // per loro il parametro va omesso, non impostato a 0 come per gpt-4o.
  const isReasoningModel = model.startsWith('gpt-5')

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(now) },
      { role: 'user', content: `Avvisi da classificare:\n\n${testoAvvisi}` },
    ],
    response_format: { type: 'json_object' },
    ...(isReasoningModel ? {} : { temperature: 0 }),
  })

  const rawContent = completion.choices[0]?.message?.content
  if (!rawContent) {
    throw new Error('Risposta LLM vuota o malformata')
  }

  const parsed = JSON.parse(rawContent)
  const validated = ResponseSchema.parse(parsed)

  return {
    items: validated.items as SvincoloState[],
    tratti: (validated.tratti ?? []) as TrattoState[],
  }
}
