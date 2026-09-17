import { useCallback, useEffect, useState } from 'react'
import type { Module } from '../core/module'
import { ABOUT_PATH, DEFAULT_MODULE, isAboutPath, moduleFromPath, parseModule, pathForModule } from '../lib/routes'

/**
 * Último módulo aberto. Fica fora do store de configurações pelo mesmo motivo do idioma:
 * não é uma escolha de treino, é onde o usuário parou.
 */
const LAST_MODULE_KEY = 'sheetwise-module'

function lastModule(): Module {
  try {
    return parseModule(localStorage.getItem(LAST_MODULE_KEY)) ?? DEFAULT_MODULE
  } catch {
    return DEFAULT_MODULE // localStorage bloqueado: segue sem memória
  }
}

/** O estudo (de um módulo) ou a página "Sobre". */
export type View = 'practice' | 'about'

const viewOf = (pathname: string): View => (isAboutPath(pathname) ? 'about' : 'practice')

export interface Route {
  module: Module
  view: View
  /** abre o estudo de um módulo (também é como se sai do "Sobre") */
  navigate: (m: Module) => void
  openAbout: () => void
}

/**
 * Roteamento mínimo via History API: a URL é a fonte da verdade do módulo ativo.
 * Suporta deep-link, voltar/avançar do navegador e canoniza a URL inicial sem poluir o
 * histórico.
 *
 * Um link direto abre o módulo dele. Sem módulo na URL — "/", que é como o app Android
 * sempre abre — volta ao último módulo aberto. Em `/about` o módulo continua o último
 * aberto, que é para onde se volta.
 */
export function useRoute(): Route {
  const [module, setModule] = useState<Module>(() =>
    moduleFromPath(window.location.pathname, lastModule()),
  )
  const [view, setView] = useState<View>(() => viewOf(window.location.pathname))

  useEffect(() => {
    // canoniza a URL inicial sem criar entrada no histórico
    const here = window.location.pathname
    const canonical = isAboutPath(here) ? ABOUT_PATH : pathForModule(moduleFromPath(here, lastModule()))
    if (here !== canonical) {
      window.history.replaceState(null, '', canonical + window.location.search)
    }
    // acompanha voltar/avançar do navegador
    const sync = () => {
      setModule(moduleFromPath(window.location.pathname, lastModule()))
      setView(viewOf(window.location.pathname))
    }
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  // lembra cada módulo aberto, venha do menu, de um link ou do voltar do navegador
  useEffect(() => {
    try {
      localStorage.setItem(LAST_MODULE_KEY, module)
    } catch {
      /* sem armazenamento: o próximo início cai no padrão */
    }
  }, [module])

  const navigate = useCallback((next: Module) => {
    const path = pathForModule(next)
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path)
    }
    setModule(next)
    setView('practice')
  }, [])

  const openAbout = useCallback(() => {
    if (!isAboutPath(window.location.pathname)) window.history.pushState(null, '', ABOUT_PATH)
    setView('about')
  }, [])

  return { module, view, navigate, openAbout }
}
