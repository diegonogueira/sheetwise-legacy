import { Menu, Settings as SettingsIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from '../lib/cx'
import logoUrl from '../assets/brand/icon.svg'

interface TopBarProps {
  /** o título do que está aberto (módulo ou "Sobre"): a TopBar é quem anuncia, não a página */
  title: string
  /** paisagem curta: barra mais fina, mas nunca some (é por ela que se chega ao menu e aos ajustes) */
  compact: boolean
  onOpenSettings: () => void
  onToggleSidebar: () => void
}

export function TopBar({ title, compact, onOpenSettings, onToggleSidebar }: TopBarProps) {
  const { t } = useTranslation()
  return (
    <header
      className={cx(
        'sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-surface/90 px-3 backdrop-blur',
        compact ? 'py-0.5' : 'py-2',
      )}
      // desce abaixo da status bar no Android (--safe-area-inset-top vem do Capacitor;
      // 0 na web e na paisagem, onde a barra está escondida)
      style={{
        paddingTop: `calc(${compact ? '0.125rem' : '0.5rem'} + var(--safe-area-inset-top, env(safe-area-inset-top)))`,
      }}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={t('topbar.aria.menu')}
        className={cx('rounded-lg p-1.5 text-muted hover:bg-line hover:text-ink', compact ? '' : 'lg:hidden')}
      >
        <Menu size={18} />
      </button>

      {/* a mesma arte do ícone do app e do favicon (o nome ao lado já diz o que é) */}
      <img src={logoUrl} alt="" aria-hidden className={cx('shrink-0', compact ? 'h-5 w-5' : 'h-6 w-6')} />
      <span className="shrink-0 font-semibold tracking-tight text-ink">{t('app.name')}</span>
      <span className="shrink-0 text-sm text-faint">·</span>
      <span className="min-w-0 truncate text-sm text-muted">{title}</span>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label={t('topbar.aria.settings')}
        className="ml-auto rounded-lg p-1.5 text-muted hover:bg-line hover:text-ink"
      >
        <SettingsIcon size={18} />
      </button>
    </header>
  )
}
