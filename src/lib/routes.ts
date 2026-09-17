// Mapa entre cada módulo de treino e sua URL (em inglês). A URL é a fonte da verdade do
// módulo ativo — ver `src/hooks/useRoute.ts`, que também lembra o último módulo aberto. Os caminhos são derivados de tarefa +
// conjunto de claves, então não há lista para manter em dia aqui.

import { MODULES, isNoteModule, type Module } from '../core/module'
import type { ClefSetId } from '../core/clefSet'
import type { NoteTask } from '../core/module'

const TASK_PATH: Record<NoteTask | 'readKey', string> = {
  readNote: '/read-note',
  readInterval: '/read-interval',
  readKey: '/read-key',
}

const SET_PATH: Record<ClefSetId, string> = {
  treble: 'treble',
  bass: 'bass',
  c: 'c-clef',
  piano: 'piano',
  cello: 'cello',
  viola: 'viola',
}

/** Módulo da primeira visita: a URL não aponta para nenhum e ainda não há um último aberto. */
export const DEFAULT_MODULE: Module = 'readNote:treble'

/** Caminho canônico (kebab-case, em inglês) de um módulo. */
export function pathForModule(m: Module): string {
  if (!isNoteModule(m)) return TASK_PATH.readKey
  const [task, set] = m.split(':') as [NoteTask, ClefSetId]
  return `${TASK_PATH[task]}/${SET_PATH[set]}`
}

const PATH_MODULE: Record<string, Module> = Object.fromEntries(
  MODULES.map((m) => [pathForModule(m), m]),
)

/**
 * Resolve um pathname para o módulo correspondente. Um caminho que não é de módulo ("/", um
 * link antigo) cai no `fallback` — o último módulo aberto, quando houver.
 */
export function moduleFromPath(pathname: string, fallback: Module = DEFAULT_MODULE): Module {
  const clean = pathname.replace(/\/+$/, '') || '/'
  return PATH_MODULE[clean] ?? fallback
}

/** Valida um id de módulo guardado: um id que deixou de existir vira `null`. */
export function parseModule(id: string | null): Module | null {
  return MODULES.find((m) => m === id) ?? null
}

/** As páginas que não são de módulo: o módulo aberto continua o último. */
export const ABOUT_PATH = '/about'
export const OTHER_APPS_PATH = '/other-apps'

export function isAboutPath(pathname: string): boolean {
  return (pathname.replace(/\/+$/, '') || '/') === ABOUT_PATH
}

export function isOtherAppsPath(pathname: string): boolean {
  return (pathname.replace(/\/+$/, '') || '/') === OTHER_APPS_PATH
}
