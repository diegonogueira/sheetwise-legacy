// Áudio via smplr (soundfont de piano), carregado dos arquivos que vão dentro do app
// (`public/samples/`, baixados por `npm run samples`), nunca de um CDN: o Android precisa tocar
// sem internet. Carregamento sob demanda e tolerante a falhas: sem os samples, o app segue
// funcionando em silêncio.

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

/** O arquivo local do piano: ogg em todo lugar, mp3 no Safari. */
function sampleUrl(): string {
  const ogg = typeof Audio !== 'undefined' && !!new Audio().canPlayType('audio/ogg; codecs="vorbis"')
  return `${import.meta.env.BASE_URL}samples/sf/MusyngKite/${INSTRUMENT}-${ogg ? 'ogg' : 'mp3'}.js`
}

export function loadInstrument(): Promise<void> {
  if (loaded) return Promise.resolve()
  if (loadingPromise) return loadingPromise

  const inst = new Soundfont(getContext(), { instrumentUrl: sampleUrl() })
  loadingPromise = inst.load
    .then(() => {
      loaded = inst
    })
    .catch(() => {
      // sem os samples: segue sem áudio, e a próxima tentativa carrega de novo
      loadingPromise = null
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
