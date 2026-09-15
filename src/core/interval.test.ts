import { describe, expect, it } from 'vitest'
import { INTERVAL_CHOICES, intervalBetween, isIntervalChoice } from './interval'
import { ALTERS, STEPS, spelledAt, type Alter, type Spelled, type Step } from './pitch'
import { KEY_SIGNATURES, alterInKey } from './keys'

/** Atalho: nota na oitava 4 (ou na dada). */
function n(step: Step, alter: Alter = 0, octave = 4): Spelled {
  return { step, alter, octave }
}

describe('intervalBetween', () => {
  it('nomeia os intervalos a partir do dó central', () => {
    expect(intervalBetween(n(0), n(1))).toEqual({ number: 2, quality: 'M' }) // Dó–Ré
    expect(intervalBetween(n(0), n(2))).toEqual({ number: 3, quality: 'M' }) // Dó–Mi
    expect(intervalBetween(n(0), n(3))).toEqual({ number: 4, quality: 'P' }) // Dó–Fá
    expect(intervalBetween(n(0), n(4))).toEqual({ number: 5, quality: 'P' }) // Dó–Sol
    expect(intervalBetween(n(0), n(5))).toEqual({ number: 6, quality: 'M' }) // Dó–Lá
    expect(intervalBetween(n(0), n(6))).toEqual({ number: 7, quality: 'M' }) // Dó–Si
    expect(intervalBetween(n(0), n(0, 0, 5))).toEqual({ number: 8, quality: 'P' }) // Dó–Dó
  })

  it('tira a qualidade dos acidentes, não da distância', () => {
    expect(intervalBetween(n(2), n(3))).toEqual({ number: 2, quality: 'm' }) // Mi–Fá
    expect(intervalBetween(n(2), n(4))).toEqual({ number: 3, quality: 'm' }) // Mi–Sol
    expect(intervalBetween(n(0), n(2, -1))).toEqual({ number: 3, quality: 'm' }) // Dó–Mi♭
    expect(intervalBetween(n(1), n(3, 1))).toEqual({ number: 3, quality: 'M' }) // Ré–Fá♯
    expect(intervalBetween(n(2), n(0, 0, 5))).toEqual({ number: 6, quality: 'm' }) // Mi–Dó
    expect(intervalBetween(n(1), n(0, 0, 5))).toEqual({ number: 7, quality: 'm' }) // Ré–Dó
  })

  it('distingue as duas grafias do trítono', () => {
    // mesmos 6 semitons, distâncias diferentes na pauta
    expect(intervalBetween(n(3), n(6))).toEqual({ number: 4, quality: 'A' }) // Fá–Si
    expect(intervalBetween(n(6), n(3, 0, 5))).toEqual({ number: 5, quality: 'd' }) // Si–Fá
    expect(intervalBetween(n(3), n(0, -1, 5))).toEqual({ number: 5, quality: 'd' }) // Fá–Dó♭
  })

  it('não depende da ordem das notas', () => {
    for (let lo = 21; lo < 35; lo++) {
      for (let span = 1; span <= 7; span++) {
        for (const a of ALTERS) {
          for (const b of ALTERS) {
            const x = spelledAt(lo, a)
            const y = spelledAt(lo + span, b)
            expect(intervalBetween(x, y)).toEqual(intervalBetween(y, x))
          }
        }
      }
    }
  })

  it('não nomeia uníssono, intervalo composto nem dobrado', () => {
    expect(intervalBetween(n(0), n(0))).toBeNull()
    expect(intervalBetween(n(0), n(0, 1))).toBeNull() // uníssono aumentado
    expect(intervalBetween(n(0), n(1, 0, 5))).toBeNull() // 9ª
    expect(intervalBetween(n(3, -1), n(6, 1))).toBeNull() // Fá♭–Si♯: 4ª dobrada-aumentada
  })
})

describe('respostas oferecidas', () => {
  it('são 13, sem repetição', () => {
    const ids = INTERVAL_CHOICES.map((c) => `${c.quality}${c.number}`)
    expect(ids).toHaveLength(13)
    expect(new Set(ids).size).toBe(13)
  })

  it('cobrem todo intervalo possível dentro de qualquer armadura', () => {
    // é o que garante que, com armadura, a questão nunca fica sem resposta certa na tela
    for (const sig of KEY_SIGNATURES) {
      for (const lo of STEPS) {
        for (let span = 1; span <= 7; span++) {
          const low = spelledAt(28 + lo)
          const high = spelledAt(28 + lo + span)
          const i = intervalBetween(
            { ...low, alter: alterInKey(low.step, sig) },
            { ...high, alter: alterInKey(high.step, sig) },
          )
          expect(isIntervalChoice(i)).toBe(true)
        }
      }
    }
  })

  it('recusam intervalos fora da lista', () => {
    expect(isIntervalChoice({ number: 2, quality: 'A' })).toBe(false) // 2ª aumentada
    expect(isIntervalChoice({ number: 4, quality: 'd' })).toBe(false)
    expect(isIntervalChoice(null)).toBe(false)
  })
})
