import type { TFunction } from 'i18next'
import { clefSetOf, isNoteModule, taskOf, type Module } from '../core/module'

/** O nome do módulo como no menu: grupo (tarefa) + conjunto de claves. É o título da TopBar, da
 *  aba e da seção do módulo nos ajustes. */
export function moduleTitle(t: TFunction, module: Module): string {
  return isNoteModule(module) ? `${t(`nav.group.${taskOf(module)}`)} — ${t(`clefSet.${clefSetOf(module)}`)}` : t('nav.item.readKey')
}
