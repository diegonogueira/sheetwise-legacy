// Áudio via smplr (soundfonts). Carregamento sob demanda e tolerante a falhas:
// se a rede falhar (offline), o app segue funcionando sem som.

import { Soundfont } from 'smplr'

const INSTRUMENT = 'acoustic_grand_piano'

let ctx: AudioContext | null = null
let loaded: Soundfont | null = null
let loadingPromise: Promise<void> | null = null

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function loadInstrument(): Promise<void> {
  if (loaded) return Promise.resolve()
  if (loadingPromise) return loadingPromise

  const inst = new Soundfont(getContext(), { instrument: INSTRUMENT })
  loadingPromise = inst.load
    .then(() => {
      loaded = inst
    })
    .catch(() => {
      /* falha de rede: segue sem áudio */
    })
  return loadingPromise
}

const DURATION = 1.6

/** Toca uma ou mais alturas (MIDI): juntas, ou uma a cada `gap` segundos (melodia).
 *  Chamado sempre a partir de um clique, então o AudioContext já está destravado.
 *  Silencioso em qualquer erro. */
export async function playMidi(midi: number | number[], gap = 0): Promise<void> {
  try {
    const context = getContext()
    if (!loaded) await loadInstrument()
    const notes = Array.isArray(midi) ? midi : [midi]
    const start = context.currentTime
    notes.forEach((m, i) => {
      // na melodia cada nota se cala quando entra a próxima; senão viraria um acorde arrastado
      const last = i === notes.length - 1
      loaded?.start({ note: m, time: start + i * gap, duration: gap && !last ? gap : DURATION })
    })
  } catch {
    /* silencioso */
  }
}
