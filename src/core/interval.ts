// Intervalos: a distância entre duas notas ESCRITAS.
//
// Como tudo no núcleo, o intervalo sai da GRAFIA, nunca do MIDI. Ele tem duas partes:
//
//   número    = distância diatônica + 1 → contam-se linhas e espaços, o acidente não entra.
//               É o que o olho lê à primeira vista: linha→linha vizinha é 3ª, linha→espaço
//               vizinho é 2ª.
//   qualidade = o que os acidentes fazem com essa distância (menor, maior, justa…).
//
// Por isso Fá–Si é quarta aumentada e Fá–Dó♭ é quinta diminuta, embora os dois tenham 6
// semitons: ocupam distâncias diferentes na pauta, então são intervalos diferentes — o mesmo
// motivo pelo qual Fá♯ nunca vale por Sol♭.

import { diatonic, midiOf, type Spelled } from './pitch'

/** Números de intervalo simples, da 2ª à 8ª. O uníssono fica de fora: não há distância a ler. */
export const INTERVAL_NUMBERS = [2, 3, 4, 5, 6, 7, 8] as const
export type IntervalNumber = (typeof INTERVAL_NUMBERS)[number]

/** d = diminuto · m = menor · M = maior · P = justo · A = aumentado */
export type Quality = 'd' | 'm' | 'M' | 'P' | 'A'

export interface Interval {
  number: IntervalNumber
  quality: Quality
}

/** Semitons do intervalo maior (ou justo) de cada número, indexado por `número − 1`. */
const REFERENCE_SEMITONES = [0, 2, 4, 5, 7, 9, 11, 12] as const

/** Uníssono, 4ª, 5ª e 8ª são justos; os outros são maiores ou menores. */
function isPerfectNumber(n: number): boolean {
  return n === 1 || n === 4 || n === 5 || n === 8
}

/** Desvio em semitons da referência → qualidade. Fora daqui (dobrados) não há nome no v1. */
const PERFECT_BY_DEVIATION: Record<number, Quality> = { [-1]: 'd', 0: 'P', 1: 'A' }
const IMPERFECT_BY_DEVIATION: Record<number, Quality> = { [-2]: 'd', [-1]: 'm', 0: 'M', 1: 'A' }

/**
 * O intervalo entre duas notas, na ordem que for (o nome não depende da direção).
 *
 * `null` quando não é um intervalo simples nomeável: uníssono, maior que a oitava, ou
 * dobrado-aumentado/diminuto.
 */
export function intervalBetween(a: Spelled, b: Spelled): Interval | null {
  const [low, high] = diatonic(a) <= diatonic(b) ? [a, b] : [b, a]
  const number = diatonic(high) - diatonic(low) + 1
  if (number < 2 || number > 8) return null
  const deviation = midiOf(high) - midiOf(low) - REFERENCE_SEMITONES[number - 1]
  const quality = (isPerfectNumber(number) ? PERFECT_BY_DEVIATION : IMPERFECT_BY_DEVIATION)[deviation]
  return quality ? { number: number as IntervalNumber, quality } : null
}

/**
 * As 13 respostas do modo com qualidade, na ordem em que a tela as dispõe.
 *
 * São exatamente os intervalos que cabem numa escala maior — e portanto em qualquer
 * armadura: 2ª, 3ª, 6ª e 7ª menores e maiores, as justas, e o trítono duas vezes (4ª
 * aumentada e 5ª diminuta), porque são grafias diferentes do mesmo som.
 */
export const INTERVAL_CHOICES: readonly Interval[] = [
  { number: 2, quality: 'm' },
  { number: 2, quality: 'M' },
  { number: 3, quality: 'm' },
  { number: 3, quality: 'M' },
  { number: 4, quality: 'P' },
  { number: 4, quality: 'A' },
  { number: 5, quality: 'd' },
  { number: 5, quality: 'P' },
  { number: 6, quality: 'm' },
  { number: 6, quality: 'M' },
  { number: 7, quality: 'm' },
  { number: 7, quality: 'M' },
  { number: 8, quality: 'P' },
]

/** O intervalo é uma das 13 respostas oferecidas? */
export function isIntervalChoice(i: Interval | null): i is Interval {
  return !!i && INTERVAL_CHOICES.some((c) => c.number === i.number && c.quality === i.quality)
}
