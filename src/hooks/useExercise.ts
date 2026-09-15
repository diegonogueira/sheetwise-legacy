import { useCallback, useState } from 'react'
import {
  checkInterval,
  checkKey,
  checkNoteName,
  generateQuestion,
  type IntervalConfig,
  type IntervalGuess,
  type KeyConfig,
  type NoteConfig,
  type Question,
} from '../core/exercise'
import type { Module } from '../core/module'
import type { KeySignature } from '../core/keys'
import { midiOf, type Alter, type Spelled } from '../core/pitch'

export type Status = 'idle' | 'correct' | 'wrong'

interface UseExerciseArgs {
  /** módulo ativo — controlado externamente (vem da URL) */
  module: Module
  note: NoteConfig
  key: KeyConfig
  interval: IntervalConfig
  /** chamado ao responder, com o(s) MIDI(s) a soar — juntos, ou um depois do outro se `melodic` */
  onReveal?: (midi: number | number[], melodic?: boolean) => void
}

export interface ExerciseApi {
  module: Module
  question: Question
  status: Status
  /** readNote: grafia escolhida nas alternativas */
  chosenNote: Spelled | null
  /** readNote com armadura: acidente escolhido no seletor (as letras o acompanham) */
  alter: Alter
  /** readKey: armadura escolhida */
  chosenKey: KeySignature | null
  /** readInterval: intervalo escolhido */
  chosenInterval: IntervalGuess | null
  setAlter: (a: Alter) => void
  answerName: (note: Spelled) => void
  answerKey: (sig: KeySignature) => void
  answerInterval: (guess: IntervalGuess) => void
  next: () => void
}

export function useExercise({ module, note, key, interval, onReveal }: UseExerciseArgs): ExerciseApi {
  const [question, setQuestion] = useState<Question>(() =>
    generateQuestion({ module, note, key, interval }),
  )
  const [status, setStatus] = useState<Status>('idle')
  const [chosenNote, setChosenNote] = useState<Spelled | null>(null)
  const [chosenKey, setChosenKey] = useState<KeySignature | null>(null)
  const [chosenInterval, setChosenInterval] = useState<IntervalGuess | null>(null)
  const [alter, setAlter] = useState<Alter>(0)

  const newQuestion = useCallback(() => {
    setQuestion(generateQuestion({ module, note, key, interval }))
    setStatus('idle')
    setChosenNote(null)
    setChosenKey(null)
    setChosenInterval(null)
    setAlter(0)
  }, [module, note, key, interval])

  const next = useCallback(() => newQuestion(), [newQuestion])

  const answerName = useCallback(
    (chosen: Spelled) => {
      if (status !== 'idle') return
      setChosenNote(chosen)
      setStatus(checkNoteName(question, chosen) ? 'correct' : 'wrong')
      if (question.note) onReveal?.(midiOf(question.note))
    },
    [status, question, onReveal],
  )

  const answerKey = useCallback(
    (sig: KeySignature) => {
      if (status !== 'idle') return
      setChosenKey(sig)
      setStatus(checkKey(question, sig) ? 'correct' : 'wrong')
    },
    [status, question],
  )

  const answerInterval = useCallback(
    (guess: IntervalGuess) => {
      if (status !== 'idle') return
      setChosenInterval(guess)
      setStatus(checkInterval(question, guess) ? 'correct' : 'wrong')
      // soa como foi desenhado: acorde junto, melodia na ordem escrita
      if (question.notes) onReveal?.(question.notes.map(midiOf), !question.harmonic)
    },
    [status, question, onReveal],
  )

  // Regenera ao trocar de módulo ou de configuração. As configs chegam memoizadas do App,
  // então a identidade só muda quando um valor muda de fato.
  //
  // Isto acontece DURANTE o render (o padrão do React para ajustar estado quando uma prop
  // muda), e não num efeito: num efeito sobraria um quadro com a questão do módulo antigo,
  // e cada tarefa lê campos que só a sua questão tem — a tonalidade lendo `keyChoices` de
  // uma questão de nota quebrava a tela, que só voltava com um F5.
  const [source, setSource] = useState({ module, note, key, interval })
  if (
    source.module !== module ||
    source.note !== note ||
    source.key !== key ||
    source.interval !== interval
  ) {
    setSource({ module, note, key, interval })
    newQuestion()
  }

  return {
    module,
    question,
    status,
    chosenNote,
    chosenKey,
    chosenInterval,
    alter,
    setAlter,
    answerName,
    answerKey,
    answerInterval,
    next,
  }
}
