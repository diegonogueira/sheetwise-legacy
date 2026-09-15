// Motor de exercício: gera questões e valida respostas. Puro, sem React.
//
// Tarefa readNote (Pauta → Nota): uma nota acende na pauta; o aluno escolhe o nome dela.
//   Octave-agnóstico: vale a GRAFIA (letra + acidente) em qualquer oitava. Fá♯ nunca é
//   aceito no lugar de Sol♭ — a grafia é justamente o que se está aprendendo.
// Tarefa readInterval (Pauta → Intervalo): duas notas na pauta; o aluno nomeia o intervalo.
//   O modo `number` pede só o número (2ª…8ª), que se lê contando linhas e espaços; o modo
//   `quality` pede também a qualidade, que depende dos acidentes. As notas são sorteadas de
//   modo que a resposta seja SEMPRE uma das alternativas da tela (`INTERVAL_CHOICES`).
// Tarefa readKey (Armadura → Tonalidade): mostra-se a armadura; o aluno nomeia a tonalidade.
//   A armadura sozinha é ambígua entre relativa maior e menor, então o enunciado sempre diz
//   qual modo está pedindo (`keyAsk`) e todas as alternativas são desse mesmo modo.

import {
  CLEF,
  staffRange,
  type ClefId,
  type LedgerCount,
} from './clef'
import {
  CLEF_SET,
  clefsForSet,
  DEFAULT_C_CLEF_LINES,
  type CClefLine,
} from './clefSet'
import {
  isNoteModule,
  taskOf,
  clefSetOf,
  type Module,
} from './module'
import { ALTERS, spelledAt, type Alter, type Spelled } from './pitch'
import {
  INTERVAL_CHOICES,
  INTERVAL_NUMBERS,
  intervalBetween,
  isIntervalChoice,
  type Interval,
  type IntervalNumber,
  type Quality,
} from './interval'
import {
  alterInKey,
  signaturesUpTo,
  type KeyMode,
  type KeySignature,
} from './keys'

export type Rng = () => number

/** Modos que a tonalidade pode perguntar; `both` sorteia um a cada questão. */
export type KeyAsk = KeyMode | 'both'

/**
 * De onde vem o acidente da nota.
 *
 * - `none` — só naturais, sem armadura.
 * - `note` — o acidente é desenhado ao lado da nota; está à vista.
 * - `key` — uma ARMADURA na clave, e a nota vem limpa: quem diz que aquele Fá é Fá♯ é a
 *   armadura. É a leitura real, e a única em que o acidente é de fato perguntado.
 */
export type AccidentalMode = 'none' | 'note' | 'key'

/** Configuração de um módulo de nota (leitura / intervalo). */
export interface NoteConfig {
  ledgerBelow: LedgerCount
  ledgerAbove: LedgerCount
  accidentalMode: AccidentalMode
  /** no modo `key`: máximo de acidentes da armadura sorteada */
  keyMax: number
  /** linhas ocupadas pela clave de Dó (só usado pelo conjunto `c`) */
  cClefLines: readonly CClefLine[]
}

/** O que o módulo de intervalo pergunta: só o número (3ª) ou também a qualidade (3ª menor). */
export type IntervalAsk = 'number' | 'quality'

/** Melódico: uma nota depois da outra. Harmônico: as duas juntas. `both` sorteia por questão. */
export type IntervalStyle = 'melodic' | 'harmonic' | 'both'

/** Configuração própria do módulo de intervalo (a faixa e os acidentes vêm da `NoteConfig`). */
export interface IntervalConfig {
  ask: IntervalAsk
  style: IntervalStyle
}

/** Configuração do módulo de tonalidade. */
export interface KeyConfig {
  ask: KeyAsk
  /** máximo de acidentes na armadura (4 = até 4 sustenidos/bemóis; 7 = todas) */
  maxAccidentals: number
  /** claves em que a armadura pode ser desenhada (ao menos uma) */
  clefs: ClefId[]
}

export const DEFAULT_NOTE_CONFIG: NoteConfig = {
  ledgerBelow: 3,
  ledgerAbove: 3,
  accidentalMode: 'key',
  keyMax: 4,
  cClefLines: DEFAULT_C_CLEF_LINES,
}

export const DEFAULT_INTERVAL_CONFIG: IntervalConfig = {
  ask: 'number',
  style: 'both',
}

export const DEFAULT_KEY_CONFIG: KeyConfig = {
  ask: 'major',
  maxAccidentals: 4,
  clefs: ['treble', 'bass'],
}

export interface Question {
  module: Module
  /** clave desta questão; no sistema de piano, a pauta em que a nota caiu */
  clef: ClefId
  /** claves desenhadas na tela (uma só, ou as duas do sistema de piano, do grave ao agudo) */
  staves: ClefId[]
  /** readNote: a nota da questão */
  note?: Spelled
  /** readInterval: as duas notas, na ordem em que soam (no harmônico, do grave ao agudo) */
  notes?: [Spelled, Spelled]
  /** readInterval: o intervalo entre `notes` — sempre uma das `INTERVAL_CHOICES` */
  interval?: Interval
  /** readInterval: o que esta questão pergunta */
  intervalAsk?: IntervalAsk
  /** readInterval: as notas são desenhadas juntas (acorde) em vez de uma depois da outra */
  harmonic?: boolean
  /** a armadura desenhada: sorteada em readKey, e no modo `key` dos módulos de nota */
  keySig?: KeySignature
  /** readKey: alternativas embaralhadas, todas do mesmo modo */
  keyChoices?: KeySignature[]
  /** readKey: qual modo está sendo perguntado nesta questão */
  keyAsk?: KeyMode
}

export interface GenOptions {
  module: Module
  rng?: Rng
  /** obrigatório nos módulos de nota */
  note?: NoteConfig
  /** obrigatório no módulo de tonalidade */
  key?: KeyConfig
  /** obrigatório nos módulos de intervalo (junto com `note`) */
  interval?: IntervalConfig
}

/**
 * Resposta do aluno a um intervalo. No modo `number` não há qualidade — o botão é só "3ª".
 */
export interface IntervalGuess {
  number: IntervalNumber
  quality?: Quality
}

function randInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive)
}

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[randInt(rng, arr.length)]
}

/** Embaralha no lugar (Fisher–Yates) e devolve. */
function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** A faixa lida de uma clave, já com as linhas suplementares da config. */
export function rangeFor(clef: ClefId, config: NoteConfig): { lo: number; hi: number } {
  return staffRange(CLEF[clef], config.ledgerBelow, config.ledgerAbove)
}

/** Acidentes que podem ser desenhados AO LADO da nota (só no modo `note`). */
function altersFor(config: NoteConfig): readonly Alter[] {
  return config.accidentalMode === 'note' ? ALTERS : [0]
}

/**
 * Sorteia a nota da questão e a clave em que ela cai.
 *
 * No sistema de piano as duas pautas estão na tela: sorteia-se primeiro a pauta, depois a
 * nota dentro dela — assim as duas claves aparecem com a mesma frequência (sortear a nota
 * numa faixa unificada favoreceria a região central, onde as faixas se sobrepõem).
 */
function pickNote(
  module: Module,
  config: NoteConfig,
  rng: Rng,
): { clef: ClefId; staves: ClefId[]; note: Spelled; keySig?: KeySignature } {
  const setId = clefSetOf(module)!
  const set = CLEF_SET[setId]
  const clefs = clefsForSet(set, config.cClefLines)
  const clef = pick(clefs, rng)
  const staves = set.layout === 'grand' ? clefs : [clef]
  const { lo, hi } = rangeFor(clef, config)
  const d = lo + randInt(rng, hi - lo + 1)

  // No modo `key` o acidente NÃO é sorteado: ele é consequência da armadura. A nota é
  // desenhada limpa e a grafia certa sai da leitura da armadura — que é o exercício.
  if (config.accidentalMode === 'key') {
    const keySig = pick(signaturesUpTo(config.keyMax), rng)
    const step = spelledAt(d).step
    return { clef, staves, note: spelledAt(d, alterInKey(step, keySig)), keySig }
  }

  const alter = pick(altersFor(config), rng)
  return { clef, staves, note: spelledAt(d, alter) }
}

function generateReadNote(module: Module, config: NoteConfig, rng: Rng): Question {
  const { clef, staves, note, keySig } = pickNote(module, config, rng)
  return { module, clef, staves, note, keySig }
}

/**
 * Intervalo: sorteia o NÚMERO primeiro (as sete distâncias aparecem com a mesma frequência),
 * depois onde ele cai na faixa, depois os acidentes.
 *
 * As duas notas ficam na mesma pauta — no sistema de piano, a sorteada. A faixa mais estreita
 * possível (0 suplementares) tem 11 posições, então uma oitava sempre cabe.
 */
function generateReadInterval(
  module: Module,
  config: NoteConfig,
  intervalConfig: IntervalConfig,
  rng: Rng,
): Question {
  const set = CLEF_SET[clefSetOf(module)!]
  const clefs = clefsForSet(set, config.cClefLines)
  const clef = pick(clefs, rng)
  const staves = set.layout === 'grand' ? clefs : [clef]
  const { lo, hi } = rangeFor(clef, config)
  const span = pick(INTERVAL_NUMBERS, rng) - 1
  const low = lo + randInt(rng, hi - lo - span + 1)
  const high = low + span

  let keySig: KeySignature | undefined
  let pair: [Spelled, Spelled]
  if (config.accidentalMode === 'key') {
    // como na leitura de nota: quem altera as duas é a armadura. Dentro de uma armadura todo
    // intervalo simples é uma das 13 alternativas, então não há o que filtrar
    keySig = pick(signaturesUpTo(config.keyMax), rng)
    const sig = keySig
    const inKey = (d: number) => spelledAt(d, alterInKey(spelledAt(d).step, sig))
    pair = [inKey(low), inKey(high)]
  } else {
    // Acidentes ao lado das notas: sorteia um PAR cujo intervalo esteja entre as alternativas.
    // Sem filtro sairiam 2ª aumentada, 4ª diminuta e dobrados, que a tela não oferece. O par
    // sem acidente nenhum é sempre válido, então a lista nunca fica vazia.
    const alters = altersFor(config)
    const pairs = alters
      .flatMap((a) => alters.map((b): [Spelled, Spelled] => [spelledAt(low, a), spelledAt(high, b)]))
      .filter(([a, b]) => isIntervalChoice(intervalBetween(a, b)))
    pair = pick(pairs, rng)
  }

  const harmonic =
    intervalConfig.style === 'both' ? rng() < 0.5 : intervalConfig.style === 'harmonic'
  // no melódico a direção importa para o olho (subir e descer se leem diferente); no acorde não
  const notes: [Spelled, Spelled] = !harmonic && rng() < 0.5 ? [pair[1], pair[0]] : pair

  return {
    module,
    clef,
    staves,
    notes,
    keySig,
    interval: intervalBetween(pair[0], pair[1])!,
    intervalAsk: intervalConfig.ask,
    harmonic,
  }
}

function generateReadKey(config: KeyConfig, rng: Rng): Question {
  const ask: KeyMode = config.ask === 'both' ? pick(['major', 'minor'] as const, rng) : config.ask
  const pool = signaturesUpTo(config.maxAccidentals)
  const answer = pick(pool, rng)
  const others = shuffle(pool.filter((s) => s.fifths !== answer.fifths), rng).slice(0, 3)
  const clefs = config.clefs.length ? config.clefs : DEFAULT_KEY_CONFIG.clefs
  const clef = pick(clefs, rng)
  return {
    module: 'readKey',
    clef,
    staves: [clef],
    keySig: answer,
    keyAsk: ask,
    keyChoices: shuffle([answer, ...others], rng),
  }
}

export function generateQuestion(opts: GenOptions): Question {
  const { module, rng = Math.random } = opts
  if (!isNoteModule(module)) return generateReadKey(opts.key ?? DEFAULT_KEY_CONFIG, rng)
  const config = opts.note ?? DEFAULT_NOTE_CONFIG
  switch (taskOf(module)) {
    case 'readInterval':
      return generateReadInterval(module, config, opts.interval ?? DEFAULT_INTERVAL_CONFIG, rng)
    default:
      return generateReadNote(module, config, rng)
  }
}

/** readNote: a grafia escolhida bate com a da nota? (a oitava não conta) */
export function checkNoteName(question: Question, chosen: Spelled): boolean {
  const note = question.note
  if (!note) return false
  return note.step === chosen.step && note.alter === chosen.alter
}

/** As alternativas de intervalo que a tela oferece para o modo pedido. */
export function intervalChoices(ask: IntervalAsk): readonly IntervalGuess[] {
  return ask === 'quality' ? INTERVAL_CHOICES : INTERVAL_NUMBERS.map((number) => ({ number }))
}

/**
 * readInterval: o número sempre tem de bater; a qualidade só quando a questão a pergunta.
 * Uma 4ª aumentada nunca vale por 5ª diminuta — mesmo som, grafia diferente.
 */
export function checkInterval(question: Question, chosen: IntervalGuess): boolean {
  const answer = question.interval
  if (!answer || answer.number !== chosen.number) return false
  return question.intervalAsk !== 'quality' || answer.quality === chosen.quality
}

/** readKey: a tonalidade escolhida é a da armadura? */
export function checkKey(question: Question, chosen: KeySignature): boolean {
  return question.keySig?.fifths === chosen.fifths
}
