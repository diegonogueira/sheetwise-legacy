import { useLayoutEffect, useRef } from 'react'
import { Accidental, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice } from 'vexflow'
import { CLEF, staffRange, yForDiatonic, type ClefId, type LedgerCount } from '../../core/clef'
import { spelledAt, toVexKey, type Alter } from '../../core/pitch'
import { toVexKeySignature, type KeySignature } from '../../core/keys'

/** Uma nota desenhada na pauta, com o papel dela no exercício. */
export type MarkVariant = 'accent' | 'correct'

export interface Mark {
  /** posição vertical (índice diatônico) */
  slot: number
  alter: Alter
  variant: MarkVariant
  /** clave/pauta em que desenhar; sem isso vai na primeira que cobrir a posição */
  clef?: ClefId
}

const VARIANT_COLOR: Record<MarkVariant, string> = {
  accent: 'var(--color-accent)',
  correct: 'var(--color-correct)',
}

/** Espaçamento entre linhas (o padrão do VexFlow). Toda a geometria lê o espaçamento do
 *  próprio `Stave`, então basta mudar aqui. */
const SPACING = 10
const STAVE_GAP = 80 // distância entre as duas pautas do sistema de piano
/** Folga à esquerda. O sistema de piano precisa de mais: a chave é desenhada FORA da pauta. */
const PAD_X = 10
const PAD_X_GRAND = 26
/** Y em que o VexFlow põe a 1ª linha de uma pauta criada em y=0 (folga p/ texto acima). */
const STAVE_TOP_OFFSET = 40
/** Quanto a clave passa da pauta (a de Sol é o glifo mais alto) — entra no enquadramento. */
const CLEF_OVERHANG = 20
/**
 * Folga acima/abaixo da nota mais extrema, em espaços de pauta. Não é a cabeça que manda:
 * o ♭ sobe cerca de um espaço e meio acima dela, então uma folga fixa em pixels cortaria o
 * acidente da nota mais aguda da faixa.
 */
const NOTE_MARGIN_SPACES = 2
const noteMargin = (spacing: number) => NOTE_MARGIN_SPACES * spacing

interface StaffProps {
  /** claves desenhadas, do grave ao agudo (uma só, ou as duas do sistema de piano) */
  staves: ClefId[]
  ledgerBelow: LedgerCount
  ledgerAbove: LedgerCount
  /** armadura desenhada em todas as pautas (módulo de tonalidade) */
  keySig?: KeySignature
  marks?: Mark[]
  /**
   * desenha as marcas de cada pauta como UM acorde (intervalo harmônico) em vez de uma
   * depois da outra. O acorde tem uma cor só: a da primeira marca
   */
  chord?: boolean
  width?: number
}

/**
 * Altura da tela de desenho. É deliberadamente folgada: o VexFlow precisa de espaço para
 * desenhar, e o `viewBox` no fim recorta o resultado na altura real (ver `useLayoutEffect`).
 */
function canvasHeight(
  staves: ClefId[],
  ledgerBelow: LedgerCount,
  ledgerAbove: LedgerCount,
  spacing: number,
): number {
  const body = 4 * spacing
  const ledger = (ledgerBelow + ledgerAbove) * spacing + 2 * CLEF_OVERHANG
  const gaps = (staves.length - 1) * STAVE_GAP
  return STAVE_TOP_OFFSET + staves.length * body + gaps + ledger + 2 * noteMargin(spacing)
}

/**
 * A pauta: desenha com VexFlow e recorta o resultado na faixa que o módulo usa.
 *
 * O recorte NÃO é estimado: sai de `yForDiatonic` (núcleo, testado) alimentado com o Y e o
 * espaçamento que o próprio VexFlow reporta (`getYForLine` / `getSpacingBetweenLines`), então
 * acompanha o desenho mesmo que o VexFlow mude o espaçamento padrão.
 */
export function Staff({
  staves,
  ledgerBelow,
  ledgerAbove,
  keySig,
  marks = [],
  chord = false,
  width = 320,
}: StaffProps) {
  const ref = useRef<HTMLDivElement>(null)

  // assinatura estável: só redesenha quando o CONTEÚDO muda, não a identidade dos arrays
  const sig = [
    staves.join(','),
    ledgerBelow,
    ledgerAbove,
    keySig?.fifths ?? 'none',
    marks.map((m) => `${m.slot}:${m.alter}:${m.variant}:${m.clef ?? ''}`).join('|'),
    chord ? 'chord' : 'seq',
    width,
  ].join('#')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''

    // `SPACING` é o pedido ao VexFlow; a geometria abaixo relê o valor efetivo de cada `Stave`
    const height = canvasHeight(staves, ledgerBelow, ledgerAbove, SPACING)
    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(width, height)
    const ctx = renderer.getContext()

    // as pautas vêm do grave ao agudo, mas na tela a aguda fica em cima
    const drawn = [...staves].reverse()
    const padX = staves.length > 1 ? PAD_X_GRAND : PAD_X
    const staveWidth = width - padX - PAD_X
    const built = drawn.map((clefId, i) => {
      const stave = new Stave(padX, i * (4 * SPACING + STAVE_GAP), staveWidth, {
        spacing_between_lines_px: SPACING,
      })
      stave.addClef(CLEF[clefId].vex)
      if (keySig) stave.addKeySignature(toVexKeySignature(keySig))
      stave.setContext(ctx).draw()
      return { clefId, stave }
    })

    // sistema de piano: chave + linha ligando as duas pautas
    if (built.length === 2) {
      const [top, bottom] = built
      for (const type of [StaveConnector.type.BRACE, StaveConnector.type.SINGLE_LEFT]) {
        new StaveConnector(top.stave, bottom.stave).setType(type).setContext(ctx).draw()
      }
    }

    // onde a nota cai: na pauta pedida, ou na primeira que cobre a posição
    const staveFor = (mark: Mark) => {
      if (mark.clef) return built.find((b) => b.clefId === mark.clef) ?? built[0]
      const range = (b: (typeof built)[number]) =>
        staffRange(CLEF[b.clefId], ledgerBelow, ledgerAbove)
      return built.find((b) => mark.slot >= range(b).lo && mark.slot <= range(b).hi) ?? built[0]
    }

    // Todas as marcas de uma mesma pauta são formatadas JUNTAS: assim o VexFlow as espaça
    // na horizontal em vez de empilhá-las no mesmo x (as duas notas de um intervalo
    // melódico). Depois de formatar, o conjunto é deslocado
    // para o centro da pauta — o formatter alinha à esquerda, o que deixaria a nota colada
    // na clave, com um vazio enorme à direita.
    for (const target of built) {
      const { clefId, stave } = target
      const mine = marks.filter((m) => staveFor(m) === target)
      if (!mine.length) continue
      // um grupo vira uma StaveNote: uma marca só, ou todas juntas no acorde (do grave ao
      // agudo — o índice do acidente é o da tecla, e o VexFlow desloca a cabeça da 2ª sozinho)
      const groups = chord ? [[...mine].sort((a, b) => a.slot - b.slot)] : mine.map((m) => [m])
      const notes = groups.map((group) => {
        const keys = group.map((mark) => toVexKey(spelledAt(mark.slot, mark.alter)))
        const note = new StaveNote({ keys: keys.map((k) => k.key), duration: 'w', clef: CLEF[clefId].vex })
        keys.forEach(({ accidental }, i) => {
          if (accidental) note.addModifier(new Accidental(accidental), i)
        })
        const color = VARIANT_COLOR[group[0].variant]
        note.setStyle({ fillStyle: color, strokeStyle: color })
        return note
      })

      const voice = new Voice({ num_beats: notes.length, beat_value: 1 })
        .setMode(Voice.Mode.SOFT)
        .addTickables(notes)
      const areaStart = stave.getNoteStartX()
      const areaWidth = stave.getNoteEndX() - areaStart
      new Formatter().joinVoices([voice]).format([voice], areaWidth)

      // Centraliza pela CAIXA das notas (posição + largura), senão a última encosta ou vaza
      // a borda direita da pauta.
      //
      // A conta é feita no espaço do FORMATTER: `getAbsoluteX` é relativo ao começo da área
      // de notas — a clave e a armadura já saíram dele. Somar `getNoteStartX` aqui contava a
      // largura delas duas vezes e empurrava a nota contra a barra final; com armadura, que
      // é mais larga que a clave sozinha, ficava escancarado.
      const lefts = notes.map((n) => n.getAbsoluteX())
      const contentL = Math.min(...lefts)
      const contentR = Math.max(...notes.map((n, i) => lefts[i] + n.getWidth()))
      // conteúdo mais largo que a área: encosta à esquerda em vez de sangrar dos dois lados
      const free = Math.max(0, areaWidth - (contentR - contentL))
      const shift = free / 2 - contentL
      // O deslocamento vai no TickContext, NÃO em `setXShift`: o `x_shift` da nota é do
      // próprio VexFlow, que o usa para abrir espaço ao acidente. Sobrescrevê-lo movia só a
      // cabeça — o acidente se posiciona pelo X absoluto (que vem do TickContext) e ficava
      // largado ao lado da clave, longe da nota que ele altera.
      for (const tc of new Set(notes.map((n) => n.getTickContext()))) tc.setX(tc.getX() + shift)

      voice.draw(ctx, stave)
    }

    // Enquadramento vertical: recorta a tela folgada na altura que o módulo REALMENTE usa.
    // A extensão vem da FAIXA configurada (não da nota sorteada), então a pauta não pula de
    // posição entre uma questão e outra; a clave entra via `CLEF_OVERHANG`, porque a de Sol
    // passa bastante das linhas.
    const svg = el.querySelector('svg')
    if (svg) {
      let top = Infinity
      let bottom = -Infinity
      for (const { clefId, stave } of built) {
        const clef = CLEF[clefId]
        const topLineY = stave.getYForLine(0)
        const spacing = stave.getSpacingBetweenLines()
        const range = staffRange(clef, ledgerBelow, ledgerAbove)
        const margin = noteMargin(spacing)
        top = Math.min(top, yForDiatonic(range.hi, clef, topLineY, spacing) - margin, topLineY - CLEF_OVERHANG)
        bottom = Math.max(
          bottom,
          yForDiatonic(range.lo, clef, topLineY, spacing) + margin,
          topLineY + 4 * spacing + CLEF_OVERHANG,
        )
      }
      const viewHeight = bottom - top
      svg.setAttribute('viewBox', `0 ${top} ${width} ${viewHeight}`)
      svg.setAttribute('height', String(viewHeight))
      // o VexFlow escreve a altura original num style inline, que vence o atributo — sem
      // sobrescrevê-lo o conteúdo recortado ficaria "letterboxed" dentro da tela folgada
      svg.style.height = `${viewHeight}px`
    }

    return () => {
      el.innerHTML = ''
    }
  }, [sig])

  return <div ref={ref} className="staff" aria-label="Pauta" />
}
