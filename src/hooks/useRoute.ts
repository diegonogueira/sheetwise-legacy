import { useCallback, useEffect, useState } from 'react'
import type { Module } from '../core/module'
import { DEFAULT_MODULE, moduleFromPath, parseModule, pathForModule } from '../lib/routes'

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

/**
 * Roteamento mínimo via History API: a URL é a fonte da verdade do módulo ativo.
 * Suporta deep-link, voltar/avançar do navegador e canoniza a URL inicial sem poluir o
 * histórico.
 *
 * Um link direto abre o módulo dele. Sem módulo na URL — "/", que é como o app Android
 * sempre abre — volta ao último módulo aberto.
 */
export function useRoute(): [Module, (m: Module) => void] {
  const [module, setModule] = useState<Module>(() =>
    moduleFromPath(window.location.pathname, lastModule()),
  )

  useEffect(() => {
    // canoniza a URL inicial sem criar entrada no histórico
    const canonical = pathForModule(moduleFromPath(window.location.pathname, lastModule()))
    if (window.location.pathname !== canonical) {
      window.history.replaceState(null, '', canonical)
    }
    // acompanha voltar/avançar do navegador
    const sync = () => setModule(moduleFromPath(window.location.pathname, lastModule()))
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
  }, [])

  return [module, navigate]
}
