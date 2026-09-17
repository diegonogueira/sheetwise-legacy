// A página "Outros apps": os irmãos da família, com o ícone e uma linha sobre cada um. Igual em
// todos os apps (fonte: wisekit, `templates/identicos/src/components/OtherApps.tsx`); os dados
// vêm de `src/lib/family.ts`. Sem link: nenhum app está publicado ainda.

import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { otherApps } from '../lib/family'

interface OtherAppsProps {
  /** o id deste app, para ele não aparecer na própria lista */
  current: string
  onBack: () => void
}

export function OtherAppsPage({ current, onBack }: OtherAppsProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'pt'

  return (
    // a tela do app tem a altura da janela: quem rola é a página, por dentro
    <div className="min-h-0 flex-1 overflow-y-auto">
      <article className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 sm:py-12">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('otherApps.title')}</h1>
          <p className="text-muted">{t('otherApps.intro')}</p>
        </header>

        <ul className="flex flex-col gap-3">
          {otherApps(current).map((app) => (
            <li key={app.id} className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-4">
              <img src={app.logo} alt="" aria-hidden className="h-12 w-12 shrink-0" />
              <div className="min-w-0">
                <h2 className="font-medium text-ink">{app.name}</h2>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{app.tagline[lang]}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-xs text-faint">{t('otherApps.soon')}</p>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 self-start rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft size={16} />
          {t('about.back')}
        </button>
      </article>
    </div>
  )
}
