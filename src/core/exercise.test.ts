import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INTERVAL_CONFIG,
  DEFAULT_KEY_CONFIG,
  DEFAULT_NOTE_CONFIG,
  checkInterval,
  checkKey,
  checkNoteName,
  generateQuestion,
  intervalChoices,
  rangeFor,
  type IntervalConfig,
  type KeyConfig,
  type NoteConfig,
  type Rng,
} from './exercise'
import { CLEF_SET_IDS } from './clefSet'
import { MODULES, isNoteModule, taskOf, type Module } from './module'
import { diatonic, type Spelled } from './pitch'
import { alterInKey, signatureByFifths, signaturesUpTo } from './keys'
import { INTERVAL_NUMBERS, intervalBetween, isIntervalChoice } from './interval'

/** RNG determinístico (mulberry32) — as questões viram reproduzíveis. */
function seeded(seed: number): Rng {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1)

function noteCfg(patch: Partial<NoteConfig> = {}): NoteConfig {
  return { ...DEFAULT_NOTE_CONFIG, ...patch }
}

function keyCfg(patch: Partial<KeyConfig> = {}): KeyConfig {
  return { ...DEFAULT_KEY_CONFIG, ...patch }
}

function intervalCfg(patch: Partial<IntervalConfig> = {}): IntervalConfig {
  return { ...DEFAULT_INTERVAL_CONFIG, ...patch }
}

const READ_MODULES = CLEF_SET_IDS.map((s): Module => `readNote:${s}`)
const INTERVAL_MODULES = CLEF_SET_IDS.map((s): Module => `readInterval:${s}`)

describe('cobertura dos módulos', () => {
  it('gera os 13 módulos (2 tarefas × 6 conjuntos + tonalidade)', () => {
    expect(MODULES).toHaveLength(13)
    expect(MODULES.filter(isNoteModule)).toHaveLength(12)
  })

  it('gera questão válida para todo módulo, em toda semente', () => {
    for (const module of MODULES) {
      for (const seed of SEEDS) {
        const q = generateQuestion({ module, note: noteCfg(), key: keyCfg(), rng: seeded(seed) })
        expect(q.module).toBe(module)
        expect(q.staves.length).toBeGreaterThan(0)
        expect(q.staves).toContain(q.clef)
      }
    }
  })
})

describe('readNote', () => {
  it('sorteia a nota sempre dentro da faixa desenhada', () => {
    for (const module of READ_MODULES) {
      for (const seed of SEEDS) {
        const cfg = noteCfg()
        const q = generateQuestion({ module, note: cfg, rng: seeded(seed) })
        const { lo, hi } = rangeFor(q.clef, cfg)
        expect(diatonic(q.note!)).toBeGreaterThanOrEqual(lo)
        expect(diatonic(q.note!)).toBeLessThanOrEqual(hi)
      }
    }
  })

  it('valida pela grafia, ignorando a oitava', () => {
    const q = generateQuestion({ module: 'readNote:treble', note: noteCfg(), rng: seeded(7) })
    const answer = q.note!
    expect(checkNoteName(q, { ...answer, octave: answer.octave + 2 })).toBe(true)
  })

  it('nunca aceita a enarmônica no lugar da grafia certa', () => {
    // Fá♯ e Sol♭ soam igual; só a grafia escrita vale
    const q = generateQuestion({ module: 'readNote:treble', note: noteCfg(), rng: seeded(3) })
    const fSharp: Spelled = { step: 3, alter: 1, octave: 4 }
    const gFlat: Spelled = { step: 4, alter: -1, octave: 4 }
    const forged = { ...q, note: fSharp }
    expect(checkNoteName(forged, fSharp)).toBe(true)
    expect(checkNoteName(forged, gFlat)).toBe(false)
  })

  it('sem acidentes na config só sorteia notas naturais', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readNote:treble',
        note: noteCfg({ accidentalMode: 'none' }),
        rng: seeded(seed),
      })
      expect(q.note!.alter).toBe(0)
    }
  })

  it('com armadura a nota é alterada PELA armadura, nunca por sorteio', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readNote:treble',
        note: noteCfg({ accidentalMode: 'key' }),
        rng: seeded(seed),
      })
      expect(q.keySig).toBeDefined()
      expect(q.note!.alter).toBe(alterInKey(q.note!.step, q.keySig!))
    }
  })

  it('a armadura respeita o teto de acidentes da config', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readNote:bass',
        note: noteCfg({ accidentalMode: 'key', keyMax: 2 }),
        rng: seeded(seed),
      })
      expect(Math.abs(q.keySig!.fifths)).toBeLessThanOrEqual(2)
    }
  })

  it('sem armadura a questão não desenha armadura nenhuma', () => {
    for (const mode of ['none', 'note'] as const) {
      const q = generateQuestion({
        module: 'readNote:treble',
        note: noteCfg({ accidentalMode: mode }),
        rng: seeded(5),
      })
      expect(q.keySig).toBeUndefined()
    }
  })

  it('com acidentes na config, sustenidos e bemóis aparecem', () => {
    const alters = new Set<number>()
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readNote:treble',
        note: noteCfg({ accidentalMode: 'note' }),
        rng: seeded(seed),
      })
      alters.add(q.note!.alter)
    }
    expect([...alters].sort()).toEqual([-1, 0, 1])
  })

  it('cobre as 7 letras ao longo das sementes', () => {
    const steps = new Set<number>()
    for (const seed of SEEDS) {
      steps.add(generateQuestion({ module: 'readNote:bass', note: noteCfg(), rng: seeded(seed) }).note!.step)
    }
    expect(steps.size).toBe(7)
  })
})

describe('conjuntos de clave', () => {
  it('o sistema de piano desenha as duas pautas e a nota cai numa delas', () => {
    const used = new Set<string>()
    for (const seed of SEEDS) {
      const q = generateQuestion({ module: 'readNote:piano', note: noteCfg(), rng: seeded(seed) })
      expect(q.staves).toEqual(['bass', 'treble'])
      used.add(q.clef)
    }
    expect([...used].sort()).toEqual(['bass', 'treble'])
  })

  it('violoncelo e viola alternam a clave numa pauta só', () => {
    for (const [module, expected] of [
      ['readNote:cello', ['bass', 'tenor']],
      ['readNote:viola', ['alto', 'treble']],
    ] as const) {
      const used = new Set<string>()
      for (const seed of SEEDS) {
        const q = generateQuestion({ module, note: noteCfg(), rng: seeded(seed) })
        expect(q.staves).toHaveLength(1)
        used.add(q.clef)
      }
      expect([...used].sort()).toEqual([...expected].sort())
    }
  })

  it('a clave de Dó segue as linhas configuradas', () => {
    const used = new Set<string>()
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readNote:c',
        note: noteCfg({ cClefLines: ['1', '5'] }),
        rng: seeded(seed),
      })
      used.add(q.clef)
    }
    expect([...used].sort()).toEqual(['baritone', 'soprano'])
  })

  it('cai no padrão (3ª e 4ª) se a lista de linhas ficar vazia', () => {
    const used = new Set<string>()
    for (const seed of SEEDS) {
      used.add(
        generateQuestion({ module: 'readNote:c', note: noteCfg({ cClefLines: [] }), rng: seeded(seed) }).clef,
      )
    }
    expect([...used].sort()).toEqual(['alto', 'tenor'])
  })
})

describe('readInterval', () => {
  const ALL_MODES = ['none', 'note', 'key'] as const

  it('põe as duas notas na faixa da pauta sorteada', () => {
    for (const module of INTERVAL_MODULES) {
      for (const seed of SEEDS) {
        const cfg = noteCfg({ ledgerBelow: 0, ledgerAbove: 0 })
        const q = generateQuestion({ module, note: cfg, interval: intervalCfg(), rng: seeded(seed) })
        const { lo, hi } = rangeFor(q.clef, cfg)
        for (const note of q.notes!) {
          expect(diatonic(note)).toBeGreaterThanOrEqual(lo)
          expect(diatonic(note)).toBeLessThanOrEqual(hi)
        }
      }
    }
  })

  it('o intervalo da questão é o das notas, e sempre uma alternativa da tela', () => {
    for (const accidentalMode of ALL_MODES) {
      for (const seed of SEEDS) {
        const q = generateQuestion({
          module: 'readInterval:treble',
          note: noteCfg({ accidentalMode, keyMax: 7 }),
          interval: intervalCfg({ ask: 'quality' }),
          rng: seeded(seed),
        })
        const [a, b] = q.notes!
        expect(intervalBetween(a, b)).toEqual(q.interval)
        expect(isIntervalChoice(q.interval!)).toBe(true)
      }
    }
  })

  it('sorteia as sete distâncias, subindo e descendo', () => {
    const numbers = new Set<number>()
    const directions = new Set<string>()
    for (let seed = 1; seed <= 200; seed++) {
      const q = generateQuestion({
        module: 'readInterval:bass',
        note: noteCfg(),
        interval: intervalCfg({ style: 'melodic' }),
        rng: seeded(seed),
      })
      numbers.add(q.interval!.number)
      const [first, second] = q.notes!
      directions.add(diatonic(second) > diatonic(first) ? 'up' : 'down')
    }
    expect([...numbers].sort()).toEqual([...INTERVAL_NUMBERS])
    expect([...directions].sort()).toEqual(['down', 'up'])
  })

  it('com armadura as duas notas são alteradas pela armadura', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readInterval:piano',
        note: noteCfg({ accidentalMode: 'key' }),
        interval: intervalCfg(),
        rng: seeded(seed),
      })
      expect(q.keySig).toBeDefined()
      for (const note of q.notes!) expect(note.alter).toBe(alterInKey(note.step, q.keySig!))
    }
  })

  it('com acidentes na nota, eles aparecem sem sair das alternativas', () => {
    const alters = new Set<number>()
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readInterval:treble',
        note: noteCfg({ accidentalMode: 'note' }),
        interval: intervalCfg(),
        rng: seeded(seed),
      })
      expect(q.keySig).toBeUndefined()
      for (const note of q.notes!) alters.add(note.alter)
    }
    expect([...alters].sort()).toEqual([-1, 0, 1])
  })

  it('segue o tipo configurado e sorteia os dois em "both"', () => {
    const seen = new Set<boolean>()
    for (const seed of SEEDS) {
      const gen = (style: IntervalConfig['style']) =>
        generateQuestion({
          module: 'readInterval:treble',
          note: noteCfg(),
          interval: intervalCfg({ style }),
          rng: seeded(seed),
        })
      expect(gen('melodic').harmonic).toBe(false)
      expect(gen('harmonic').harmonic).toBe(true)
      seen.add(gen('both').harmonic!)
    }
    expect(seen.size).toBe(2)
  })

  it('no acorde as notas vêm do grave ao agudo', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({
        module: 'readInterval:cello',
        note: noteCfg(),
        interval: intervalCfg({ style: 'harmonic' }),
        rng: seeded(seed),
      })
      expect(diatonic(q.notes![0])).toBeLessThan(diatonic(q.notes![1]))
    }
  })

  it('no modo "number" vale só o número; no "quality" a qualidade também', () => {
    const base = generateQuestion({
      module: 'readInterval:treble',
      note: noteCfg(),
      interval: intervalCfg(),
      rng: seeded(4),
    })
    const byNumber = { ...base, interval: { number: 5, quality: 'P' } as const, intervalAsk: 'number' as const }
    expect(checkInterval(byNumber, { number: 5 })).toBe(true)
    expect(checkInterval(byNumber, { number: 4 })).toBe(false)

    const byQuality = { ...byNumber, interval: { number: 4, quality: 'A' } as const, intervalAsk: 'quality' as const }
    expect(checkInterval(byQuality, { number: 4, quality: 'A' })).toBe(true)
    expect(checkInterval(byQuality, { number: 4, quality: 'P' })).toBe(false)
    // mesmo som, outra grafia: o trítono escrito como 5ª diminuta não vale
    expect(checkInterval(byQuality, { number: 5, quality: 'd' })).toBe(false)
    expect(checkInterval(byQuality, { number: 4 })).toBe(false)
  })

  it('a tela sempre oferece a resposta certa', () => {
    for (const ask of ['number', 'quality'] as const) {
      for (const seed of SEEDS) {
        const q = generateQuestion({
          module: 'readInterval:viola',
          note: noteCfg({ accidentalMode: 'note' }),
          interval: intervalCfg({ ask }),
          rng: seeded(seed),
        })
        expect(intervalChoices(ask).filter((c) => checkInterval(q, c))).toHaveLength(1)
      }
    }
  })
})

describe('readKey', () => {
  it('dá 4 armaduras distintas, uma delas a resposta', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({ module: 'readKey', key: keyCfg({ maxAccidentals: 7 }), rng: seeded(seed) })
      expect(q.keyChoices).toHaveLength(4)
      expect(new Set(q.keyChoices!.map((k) => k.fifths)).size).toBe(4)
      expect(q.keyChoices!.some((k) => checkKey(q, k))).toBe(true)
    }
  })

  it('respeita o limite de acidentes', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({ module: 'readKey', key: keyCfg({ maxAccidentals: 2 }), rng: seeded(seed) })
      for (const k of q.keyChoices!) expect(Math.abs(k.fifths)).toBeLessThanOrEqual(2)
    }
  })

  it('com poucas armaduras disponíveis não repete alternativa', () => {
    // com máx. 1 acidente só existem 3 armaduras: as alternativas caem para 3, sem duplicar
    for (const seed of SEEDS) {
      const q = generateQuestion({ module: 'readKey', key: keyCfg({ maxAccidentals: 1 }), rng: seeded(seed) })
      expect(new Set(q.keyChoices!.map((k) => k.fifths)).size).toBe(q.keyChoices!.length)
      expect(q.keyChoices!.length).toBe(signaturesUpTo(1).length)
    }
  })

  it('pergunta o modo configurado e sorteia os dois em "both"', () => {
    const asks = new Set<string>()
    for (const seed of SEEDS) {
      expect(generateQuestion({ module: 'readKey', key: keyCfg({ ask: 'minor' }), rng: seeded(seed) }).keyAsk).toBe('minor')
      asks.add(generateQuestion({ module: 'readKey', key: keyCfg({ ask: 'both' }), rng: seeded(seed) }).keyAsk!)
    }
    expect([...asks].sort()).toEqual(['major', 'minor'])
  })

  it('desenha a armadura só nas claves configuradas', () => {
    const used = new Set<string>()
    for (const seed of SEEDS) {
      used.add(generateQuestion({ module: 'readKey', key: keyCfg({ clefs: ['alto'] }), rng: seeded(seed) }).clef)
    }
    expect([...used]).toEqual(['alto'])
  })

  it('valida pela armadura, não pelo nome do modo', () => {
    const q = generateQuestion({ module: 'readKey', key: keyCfg(), rng: seeded(2) })
    expect(checkKey(q, q.keySig!)).toBe(true)
    const other = signatureByFifths(q.keySig!.fifths === 0 ? 1 : 0)
    expect(checkKey(q, other)).toBe(false)
  })
})

describe('helpers de módulo', () => {
  it('deriva tarefa e conjunto do id', () => {
    expect(taskOf('readNote:piano')).toBe('readNote')
    expect(taskOf('readKey')).toBe('readKey')
    expect(taskOf('readInterval:c')).toBe('readInterval')
    expect(isNoteModule('readKey')).toBe(false)
  })
})
