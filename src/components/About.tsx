// A página "Sobre": o que é ler na pauta, em que o app ajuda e como tirar
// proveito. Todo o texto mora na i18n (`about.*`); aqui fica só a forma.

import { ArrowLeft, ArrowUpDown, Hash, Headphones, KeySquare, Music2, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import logoUrl from '../assets/brand/icon.svg'

/** um ícone por item de `about.helps`, na mesma ordem */
const HELP_ICONS = [Music2, Hash, ArrowUpDown, KeySquare, SlidersHorizontal, Headphones]

interface Help {
  title: string
  text: string
}

export function AboutPage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const helps = t('about.helps', { returnObjects: true }) as unknown as Help[]
  const how = t('about.how', { returnObjects: true }) as unknown as string[]
  const credits = t('about.credits', { returnObjects: true }) as unknown as string[]

  return (
    // a tela do app tem a altura da janela: quem rola é a página, por dentro
    <div className="min-h-0 flex-1 overflow-y-auto">
      <article className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-8 sm:py-12">
        <header className="flex items-center gap-4">
          <img src={logoUrl} alt="" className="h-16 w-16 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('app.name')}</h1>
            <p className="text-muted">{t('about.tagline')}</p>
          </div>
        </header>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{t('about.whatTitle')}</h2>
          <p className="leading-relaxed text-ink">{t('about.what')}</p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{t('about.helpsTitle')}</h2>
          <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {helps.map((h, i) => {
              const Icon = HELP_ICONS[i] ?? Music2
              return (
                <li key={h.title} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-medium text-ink">{h.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">{h.text}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{t('about.howTitle')}</h2>
          <ul className="flex flex-col gap-2">
            {how.map((tip) => (
              <li key={tip} className="flex gap-3 leading-relaxed text-ink">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {tip}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{t('about.projectTitle')}</h2>
          <p className="leading-relaxed text-ink">{t('about.project')}</p>
        </section>

        <section className="flex flex-col gap-2 border-t border-line pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">{t('about.creditsTitle')}</h2>
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {credits.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

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
