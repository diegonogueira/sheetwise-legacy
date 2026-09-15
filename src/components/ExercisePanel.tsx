import type { ReactNode } from 'react'
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Staff, type Mark } from './Staff/Staff'
import { AlterPicker, NotePicker } from './NotePicker'
import { taskOf } from '../core/module'
import { diatonic, noteLabel, type Naming } from '../core/pitch'
import { keyTonicLabel, type KeyMode, type KeySignature } from '../core/keys'
import type { LedgerCount } from '../core/clef'
import { intervalChoices, type IntervalGuess } from '../core/exercise'
import { INTERVAL_NUMBERS } from '../core/interval'
import type { ExerciseApi } from '../hooks/useExercise'
import { cx } from '../lib/cx'

function Result({ correct, children }: { correct: boolean; children: ReactNode }) {
  return (
    <div
      className={cx(
        'flex items-center gap-1.5 text-sm font-medium',
        correct ? 'text-correct' : 'text-wrong',
      )}
    >
      {correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      <span>{children}</span>
    </div>
  )
}

/** Resultado + "Próxima": em paisagem curta vão lado a lado p/ economizar altura. */
function Actions({
  compact,
  correct,
  next,
  children,
}: {
  compact: boolean
  correct: boolean
  next: ReactNode
  children: ReactNode
}) {
  return (
    <div className={cx('flex items-center', compact ? 'flex-row gap-3' : 'flex-col gap-4')}>
      <Result correct={correct}>{children}</Result>
      {next}
    </div>
  )
}

interface BodyProps {
  exercise: ExerciseApi
  naming: Naming
  ledgerBelow: LedgerCount
  ledgerAbove: LedgerCount
  compact: boolean
  nextButton: ReactNode
}

/** Largura da pauta conforme a densidade. */
function staffWidth(compact: boolean): number {
  return compact ? 260 : 340
}

/**
 * Ler notas: a nota acende na pauta e o aluno nomeia. A pauta nunca rotula a nota antes da
 * resposta (entregaria o exercício) — "mostrar o nome" só vale depois, na revelação.
 */
function ReadNoteBody(props: BodyProps) {
  const { exercise, naming, ledgerBelow, ledgerAbove, compact, nextButton } = props
  const { question, status, chosenNote } = exercise
  const { t } = useTranslation()
  const answered = status !== 'idle'
  const correct = status === 'correct'
  const note = question.note!

  const marks: Mark[] = [
    {
      slot: diatonic(note),
      // com armadura a nota é desenhada LIMPA: o acidente já está na clave, repeti-lo ao
      // lado da nota entregaria a resposta (e não é como a partitura escreve)
      alter: question.keySig ? 0 : note.alter,
      // ao acertar, a própria nota fica verde; ao errar ela continua em destaque, e o
      // texto abaixo é que diz qual era
      variant: correct ? 'correct' : 'accent',
      clef: question.clef,
    },
  ]

  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'gap-2' : 'gap-4')}>
      <p className="text-sm text-muted">{t('exercise.readNote.prompt')}</p>
      <Staff
        staves={question.staves}
        ledgerBelow={ledgerBelow}
        ledgerAbove={ledgerAbove}
        keySig={question.keySig}
        marks={marks}
        width={staffWidth(compact)}
      />
      {!answered ? (
        // Com armadura o acidente É a pergunta: ele não está ao lado da nota, sai da leitura
        // da armadura, então o aluno o escolhe e as letras acompanham a escolha. Sem
        // armadura o acidente está desenhado à vista, e repeti-lo num seletor só testaria
        // cópia — aí as letras já vêm com ele e a resposta é só a letra.
        <div className="flex w-full flex-col items-center gap-2">
          {question.keySig && (
            <AlterPicker alter={exercise.alter} onAlter={exercise.setAlter} compact={compact} />
          )}
          <NotePicker
            naming={naming}
            alter={question.keySig ? exercise.alter : note.alter}
            onPick={exercise.answerName}
            compact={compact}
          />
        </div>
      ) : (
        <Actions compact={compact} correct={correct} next={nextButton}>
          {correct
            ? t('exercise.readNote.correct', { note: noteLabel(note, naming, true) })
            : t('exercise.readNote.wrong', {
                note: noteLabel(note, naming, true),
                chosen: chosenNote ? noteLabel(chosenNote, naming) : '—',
              })}
        </Actions>
      )}
    </div>
  )
}

/**
 * Nome de um intervalo: "terça menor" ou "3ª m" (curto, nos botões). Sem qualidade é só o
 * número — "terça", "3ª". Os nomes são palavras do idioma, então vêm da i18n; só os nomes de
 * NOTA são configuração (ver `noteLabel`).
 */
function intervalLabel(guess: IntervalGuess, t: TFunction, short = false): string {
  const { number, quality } = guess
  if (!quality) return t(short ? `interval.short.${number}` : `interval.name.${number}`)
  return short
    ? t('interval.fullShort', { number, quality: t(`interval.qualityShort.${quality}`) })
    : t('interval.full', { name: t(`interval.name.${number}`), quality: t(`interval.quality.${quality}`) })
}

const CHOICE_BUTTON =
  'rounded-xl border border-line bg-surface font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft'

/**
 * Intervalos: duas notas na pauta e o aluno nomeia a distância. Só o número tem 7 botões,
 * como as letras; com qualidade são 13, arrumados em colunas POR NÚMERO (a 3ª menor em cima
 * da maior) — o aluno lê primeiro a distância e depois decide a qualidade, e a 4ª aumentada
 * fica ao lado da 5ª diminuta, que é o mesmo som escrito de outro jeito.
 */
function ReadIntervalBody(props: BodyProps) {
  const { exercise, naming, ledgerBelow, ledgerAbove, compact, nextButton } = props
  const { question, status, chosenInterval } = exercise
  const { t } = useTranslation()
  const answered = status !== 'idle'
  const correct = status === 'correct'
  const notes = question.notes!
  const ask = question.intervalAsk!

  const marks: Mark[] = notes.map((note) => ({
    slot: diatonic(note),
    // com armadura as notas vêm limpas, como na leitura de nota
    alter: question.keySig ? 0 : note.alter,
    variant: correct ? 'correct' : 'accent',
    clef: question.clef,
  }))

  const choiceButton = (guess: IntervalGuess) => (
    <button
      key={`${guess.number}${guess.quality ?? ''}`}
      type="button"
      onClick={() => exercise.answerInterval(guess)}
      title={intervalLabel(guess, t)}
      aria-label={intervalLabel(guess, t)}
      className={cx(
        CHOICE_BUTTON,
        ask === 'quality' ? 'px-0 text-xs sm:text-sm' : 'px-1 text-sm',
        compact ? 'py-1.5' : 'py-2.5',
      )}
    >
      {intervalLabel(guess, t, true)}
    </button>
  )

  const choices = intervalChoices(ask)

  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'gap-2' : 'gap-4')}>
      <p className="text-sm text-muted">{t('exercise.readInterval.prompt')}</p>
      <Staff
        staves={question.staves}
        ledgerBelow={ledgerBelow}
        ledgerAbove={ledgerAbove}
        keySig={question.keySig}
        marks={marks}
        chord={question.harmonic}
        width={staffWidth(compact)}
      />
      {!answered ? (
        ask === 'quality' ? (
          <div className="grid w-full grid-cols-7 gap-1.5">
            {INTERVAL_NUMBERS.map((number) => (
              <div key={number} className="flex flex-col gap-1.5">
                {choices.filter((c) => c.number === number).map(choiceButton)}
              </div>
            ))}
          </div>
        ) : (
          <div className={cx('grid w-full gap-1.5', compact ? 'grid-cols-7' : 'grid-cols-4 sm:grid-cols-7')}>
            {choices.map(choiceButton)}
          </div>
        )
      ) : (
        <Actions compact={compact} correct={correct} next={nextButton}>
          {/* a revelação dá o nome completo mesmo quando só o número foi perguntado: a
              resposta já saiu, e ouvir "terça menor" junto do desenho é de graça */}
          {t(correct ? 'exercise.readInterval.correct' : 'exercise.readInterval.wrong', {
            interval: intervalLabel(question.interval!, t),
            notes: notes.map((n) => noteLabel(n, naming)).join('–'),
            chosen: chosenInterval ? intervalLabel(chosenInterval, t) : '—',
          })}
        </Actions>
      )}
    </div>
  )
}

/** Nome completo de uma tonalidade ("Ré maior"). */
function keyLabel(sig: KeySignature, mode: KeyMode, naming: Naming, t: TFunction): string {
  return t(`exercise.key.${mode}`, { tonic: keyTonicLabel(sig, mode, naming) })
}

/**
 * Tonalidade: a armadura é desenhada e o aluno nomeia a tonalidade. O enunciado sempre diz
 * qual modo está pedindo — a armadura sozinha serve à maior e à relativa menor.
 */
function ReadKeyBody(props: BodyProps) {
  const { exercise, naming, compact, nextButton } = props
  const { question, status, chosenKey } = exercise
  const { t } = useTranslation()
  const answered = status !== 'idle'
  const correct = status === 'correct'
  const ask = question.keyAsk!
  const sig = question.keySig!

  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'gap-2' : 'gap-4')}>
      <p className="text-sm text-muted">
        {t(ask === 'major' ? 'exercise.readKey.promptMajor' : 'exercise.readKey.promptMinor')}
      </p>
      <Staff
        staves={question.staves}
        ledgerBelow={0}
        ledgerAbove={0}
        keySig={sig}
        width={staffWidth(compact)}
      />
      {!answered ? (
        <div className={cx('grid w-full gap-1.5', compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4')}>
          {question.keyChoices!.map((choice) => (
            <button
              key={choice.fifths}
              type="button"
              onClick={() => exercise.answerKey(choice)}
              className="rounded-xl border border-line bg-surface px-1 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft"
            >
              {keyLabel(choice, ask, naming, t)}
            </button>
          ))}
        </div>
      ) : (
        <Actions compact={compact} correct={correct} next={nextButton}>
          {correct
            ? t('exercise.readKey.correct', { key: keyLabel(sig, ask, naming, t) })
            : t('exercise.readKey.wrong', {
                key: keyLabel(sig, ask, naming, t),
                chosen: chosenKey ? keyLabel(chosenKey, ask, naming, t) : '—',
              })}
        </Actions>
      )}
    </div>
  )
}

export function ExercisePanel(props: Omit<BodyProps, 'nextButton'>) {
  const { exercise, compact } = props
  const { t } = useTranslation()
  const answered = exercise.status !== 'idle'
  const correct = exercise.status === 'correct'

  const nextButton = (
    <button
      type="button"
      onClick={exercise.next}
      className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
    >
      {t('exercise.next')} <ArrowRight size={16} />
    </button>
  )

  const body = { ...props, nextButton }
  const task = taskOf(exercise.module)

  return (
    <section
      className={cx(
        'rounded-2xl border bg-surface',
        compact ? 'p-3' : 'p-5',
        answered && !correct && 'animate-shake',
        !answered ? 'border-line' : correct ? 'border-correct/40' : 'border-wrong/40',
      )}
    >
      {task === 'readNote' ? (
        <ReadNoteBody {...body} />
      ) : task === 'readInterval' ? (
        <ReadIntervalBody {...body} />
      ) : (
        <ReadKeyBody {...body} />
      )}
    </section>
  )
}
