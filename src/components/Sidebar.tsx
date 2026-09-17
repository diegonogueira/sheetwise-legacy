import { ArrowUpDown, Info, KeySquare, Music2, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CLEF_SET_IDS } from '../core/clefSet'
import { NOTE_TASKS, type Module, type Task } from '../core/module'
import { setLanguage } from '../i18n'
import { useSettings } from '../store/settings'
import { cx } from '../lib/cx'

interface SidebarProps {
  module: Module
  onSelect: (m: Module) => void
  /** a página "Sobre" está aberta (nenhum módulo fica marcado) */
  about: boolean
  onAbout: () => void
  /** drawer aberto (apenas mobile) */
  open: boolean
  onClose: () => void
}

const TASK_ICON: Record<Task, typeof Music2> = {
  readNote: Music2,
  readInterval: ArrowUpDown,
  readKey: KeySquare,
}

/** O menu é derivado: uma seção por tarefa, um item por conjunto de claves. */
const GROUPS: { task: Task; items: { module: Module; labelKey: string }[] }[] = [
  ...NOTE_TASKS.map((task) => ({
    task: task as Task,
    items: CLEF_SET_IDS.map((set) => ({
      module: `${task}:${set}` as Module,
      labelKey: `clefSet.${set}`,
    })),
  })),
  { task: 'readKey', items: [{ module: 'readKey', labelKey: 'nav.item.readKey' }] },
]

function LangSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language === 'en' ? 'en' : 'pt'
  return (
    <div className="border-t border-line pt-3">
      <div className="flex gap-1 px-1">
        {(['pt', 'en'] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={cx(
              'rounded-md px-2.5 py-1 text-xs font-medium uppercase transition-colors',
              current === lang ? 'bg-accent-soft text-accent' : 'text-faint hover:text-ink',
            )}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * "Redefinir tudo": o app como veio de fábrica (ajustes gerais e todos os módulos), com
 * confirmação que explica o alcance. O idioma e o último módulo aberto não são configuração
 * de treino e ficam.
 */
function ResetAll() {
  const { t } = useTranslation()
  const resetAll = useSettings((s) => s.resetAll)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (!asking) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAsking(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [asking])

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-line hover:text-ink"
      >
        <RotateCcw size={16} className="shrink-0" />
        {t('resetAll.nav')}
      </button>
    )
  }
  return (
    <div role="group" aria-label={t('resetAll.nav')} className="rounded-lg bg-wrong-soft p-2.5 text-xs text-wrong">
      <p className="leading-snug">{t('resetAll.ask')}</p>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          autoFocus
          onClick={() => {
            resetAll()
            setAsking(false)
          }}
          className="rounded-md bg-wrong px-2.5 py-1 font-medium text-white"
        >
          {t('resetAll.yes')}
        </button>
        <button type="button" onClick={() => setAsking(false)} className="rounded-md px-2.5 py-1 hover:bg-surface">
          {t('resetAll.no')}
        </button>
      </div>
    </div>
  )
}

type NavProps = Pick<SidebarProps, 'module' | 'onSelect' | 'about' | 'onAbout'>

function Nav({ module, onSelect, about, onAbout }: NavProps) {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((group) => {
        const Icon = TASK_ICON[group.task]
        return (
          <div key={group.task}>
            <h2 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-faint">
              {t(`nav.group.${group.task}`)}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = !about && module === item.module
                return (
                  <li key={item.module}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.module)}
                      aria-current={active ? 'page' : undefined}
                      className={cx(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        active
                          ? 'bg-accent-soft font-medium text-accent'
                          : 'text-muted hover:bg-line hover:text-ink',
                      )}
                    >
                      <Icon size={16} className="shrink-0" />
                      {t(item.labelKey)}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onAbout}
          aria-current={about ? 'page' : undefined}
          className={cx(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
            about ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-line hover:text-ink',
          )}
        >
          <Info size={16} className="shrink-0" />
          {t('about.nav')}
        </button>
        <ResetAll />
        <LangSwitcher />
      </div>
    </nav>
  )
}

export function Sidebar({ module, onSelect, about, onAbout, open, onClose }: SidebarProps) {
  return (
    <>
      {/* coluna fixa em telas largas (desktop) */}
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-[49px] p-3">
          <Nav module={module} onSelect={onSelect} about={about} onAbout={onAbout} />
        </div>
      </aside>

      {/* drawer deslizante no mobile/tablet */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />
          {/* drawer de altura total: reserva as safe-areas do topo e da base */}
          <div
            className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-surface px-3 shadow-xl"
            style={{
              paddingTop: 'calc(0.75rem + var(--safe-area-inset-top, env(safe-area-inset-top)))',
              paddingBottom: 'calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom)))',
            }}
          >
            <Nav
              module={module}
              onSelect={(m) => {
                onSelect(m)
                onClose()
              }}
              about={about}
              onAbout={() => {
                onAbout()
                onClose()
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
