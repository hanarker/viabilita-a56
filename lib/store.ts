import { Redis } from '@upstash/redis'
import { z } from 'zod'
import type { TangenzialeState } from '@/lib/types'

export const DEFAULT_STATE_KEY = 'tangenziale:state'

const ClosureWindowSchema = z.object({
  from: z.string(),
  to: z.string().optional(),
})

const SvincoloStateSchema = z.object({
  id: z.string(),
  direzione: z.enum(['capodichino', 'pozzuoli']),
  status: z.enum(['verde', 'giallo', 'rosso']),
  note: z.string().optional(),
  windows: z.array(ClosureWindowSchema).optional(),
})

const TrattoStateSchema = z.object({
  da: z.string(),
  a: z.string(),
  direzione: z.enum(['capodichino', 'pozzuoli']),
  uscitaObbligatoria: z.string(),
  note: z.string().optional(),
  windows: z.array(ClosureWindowSchema).optional(),
})

const TangenzialeStateSchema = z.object({
  items: z.array(SvincoloStateSchema),
  tratti: z.array(TrattoStateSchema).optional(),
  updatedAt: z.string(),
  checkedAt: z.string().optional(),
  source: z.string(),
  stale: z.boolean(),
})

let redisClient: Redis | null = null

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = Redis.fromEnv()
  }
  return redisClient
}

/**
 * Legge lo stato da Redis (Upstash). Restituisce null se la chiave non esiste
 * o se il valore salvato non rispetta più lo schema atteso.
 */
export async function readState(
  key: string = DEFAULT_STATE_KEY
): Promise<TangenzialeState | null> {
  const raw = await getRedis().get<unknown>(key)
  if (raw == null) return null

  const parsed = TangenzialeStateSchema.safeParse(raw)
  return parsed.success ? (parsed.data as TangenzialeState) : null
}

/**
 * Scrive lo stato su Redis dopo aver validato i dati con zod.
 * Lancia un errore (senza sovrascrivere) se i dati non sono validi.
 */
export async function writeState(
  state: TangenzialeState,
  key: string = DEFAULT_STATE_KEY
): Promise<void> {
  // Valida prima di toccare la chiave: fail fast
  TangenzialeStateSchema.parse(state)
  await getRedis().set(key, state)
}
