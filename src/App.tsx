import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { SettingsPanel } from './components/Settings'
import { ExercisePanel } from './components/ExercisePanel'
import { AboutPage } from './components/About'
import { useSettings, useModuleConfig } from './store/settings'
import { useExercise } from './hooks/useExercise'
import { useRoute } from './hooks/useRoute'
import { useShortLandscape } from './hooks/useMediaQuery'
import { clefSetOf, isNoteModule, taskOf } from './core/module'
import type { IntervalConfig, KeyConfig, NoteConfig } from './core/exercise'
import { loadInstrument, playMidi } from './audio/player'
import { syncStatusBar } from './native/statusBar'
import { cx } from './lib/cx'

/** Segundos entre as notas de um intervalo melódico. */
const MELODIC_GAP = 0.7

export default function App() {
  const { t, i18n } = useTranslation()
  const { module, view, navigate, openAbout } = useRoute()
  const naming = useSettings((s) => s.naming)
  const audioEnabled = useSettings((s) => s.audioEnabled)
  const cClefLines = useSettings((s) => s.cClefLines)
  const keyAsk = useSettings((s) => s.keyAsk)
  const keyMaxAccidentals = useSettings((s) => s.keyMaxAccidentals)
  const keyClefs = useSettings((s) => s.keyClefs)
  const { ledgerBelow, ledgerAbove, accidentalMode, keyMax, intervalAsk, intervalStyle } =
    useModuleConfig(module)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // paisagem curta (celular deitado): layout compacto que cabe numa tela
  const compact = useShortLandscape()

  // identidade estável: o exercício só regenera a questão quando a config muda de fato
  const noteCfg = useMemo<NoteConfig>(
    () => ({ ledgerBelow, ledgerAbove, accidentalMode, keyMax, cClefLines }),
    [ledgerBelow, ledgerAbove, accidentalMode, keyMax, cClefLines],
  )
  const keyCfg = useMemo<KeyConfig>(
    () => ({ ask: keyAsk, maxAccidentals: keyMaxAccidentals, clefs: keyClefs }),
    [keyAsk, keyMaxAccidentals, keyClefs],
  )
  const intervalCfg = useMemo<IntervalConfig>(
    () => ({ ask: intervalAsk, style: intervalStyle }),
    [intervalAsk, intervalStyle],
  )

  const exercise = useExercise({
    module,
    note: noteCfg,
    key: keyCfg,
    interval: intervalCfg,
    onReveal: (midi, melodic) => {
      if (audioEnabled) void playMidi(midi, melodic ? MELODIC_GAP : 0)
    },
  })

  // pré-carrega o piano para a primeira nota soar sem atraso
  useEffect(() => {
    if (audioEnabled) void loadInstrument()
  }, [audioEnabled])

  // no Android: status bar escondida na paisagem, visível (sem cobrir) no retrato
  useEffect(() => {
    void syncStatusBar(compact)
  }, [compact])

  // título do módulo: grupo (tarefa) + conjunto de claves, como no menu
  const setId = clefSetOf(module)
  const moduleTitle = isNoteModule(module)
    ? `${t(`nav.group.${taskOf(module)}`)} — ${t(`clefSet.${setId}`)}`
    : t('nav.item.readKey')

  const title = view === 'about' ? t('about.title') : moduleTitle

  // título da aba reflete o que está aberto e o idioma corrente
  useEffect(() => {
    document.title = `Sheetwise — ${title}`
  }, [title, i18n.language])

  return (
    <div
      // A tela é uma só, em qualquer orientação: a altura é a da janela e quem rola é o
      // conteúdo, por dentro. Deixar a página crescer empurrava o exercício para fora da tela.
      className="flex h-[100dvh] flex-col overflow-hidden"
      // a barra de gestos do Android é desenhada SOBRE o fim da WebView; sem descontá-la o
      // centro do layout cai abaixo do centro do que se enxerga
      style={{ paddingBottom: 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom))' }}
    >
      {/* reserva a área da status bar no retrato (o Android 15+ desenha edge-to-edge): o
          relógio e a bateria ficam sobre o fundo do app, não sobre o conteúdo. Na paisagem
          a status bar é escondida, o inset vira 0 e a faixa some sozinha. */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-40"
        style={{
          height: 'var(--safe-area-inset-top, env(safe-area-inset-top))',
          backgroundColor: 'var(--color-bg)',
        }}
      />
      {/* a barra fica também na paisagem curta, só mais fina: é por ela que se chega ao
          menu e aos ajustes com o celular deitado */}
      <TopBar
        title={title}
        compact={compact}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleSidebar={() => setSidebarOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          module={module}
          onSelect={navigate}
          about={view === 'about'}
          onAbout={openAbout}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          compact={compact}
        />

        {view === 'about' ? (
          <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
            <AboutPage onBack={() => navigate(module)} />
          </main>
        ) : (
        /* O exercício ocupa o centro da altura livre. O nome do módulo vive na TopBar (e
            aqui só para leitores de tela): como <h1> visível ele empurrava o cartão para
            baixo do meio — uma linha fina de texto no topo, e o olho lendo o vazio acima
            dela como topo, não como metade do miolo. `justify-center-safe` centraliza SEM
            cortar o começo quando a pauta cresce (faixa larga, sistema de piano). */
        <main
          className={cx(
            'mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col justify-center-safe overflow-y-auto',
            compact ? 'gap-2 px-2 py-1' : 'gap-4 px-4 py-5',
          )}
        >
          <h1 className="sr-only">{moduleTitle}</h1>

          <ExercisePanel
            exercise={exercise}
            naming={naming}
            ledgerBelow={ledgerBelow}
            ledgerAbove={ledgerAbove}
            compact={compact}
          />
        </main>
        )}
      </div>

      {settingsOpen && <SettingsPanel module={module} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
