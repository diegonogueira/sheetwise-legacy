import { describe, expect, it } from 'vitest'
import {
  ABOUT_PATH,
  DEFAULT_MODULE,
  OTHER_APPS_PATH,
  isAboutPath,
  isOtherAppsPath,
  moduleFromPath,
  parseModule,
  pathForModule,
} from './routes'
import { MODULES } from '../core/module'

describe('rotas', () => {
  it('dá um caminho único para cada um dos 13 módulos', () => {
    const paths = MODULES.map(pathForModule)
    expect(new Set(paths).size).toBe(MODULES.length)
  })

  it('fecha a volta caminho ↔ módulo', () => {
    for (const m of MODULES) {
      expect(moduleFromPath(pathForModule(m))).toBe(m)
    }
  })

  it('usa caminhos legíveis em inglês', () => {
    expect(pathForModule('readNote:treble')).toBe('/read-note/treble')
    expect(pathForModule('readNote:piano')).toBe('/read-note/piano')
    expect(pathForModule('readNote:c')).toBe('/read-note/c-clef')
    expect(pathForModule('readInterval:cello')).toBe('/read-interval/cello')
    expect(pathForModule('readKey')).toBe('/read-key')
  })

  it('ignora barra sobrando no fim', () => {
    expect(moduleFromPath('/read-note/treble/')).toBe('readNote:treble')
    expect(moduleFromPath('/read-key//')).toBe('readKey')
  })

  it('cai no módulo padrão em caminho desconhecido', () => {
    expect(moduleFromPath('/')).toBe(DEFAULT_MODULE)
    expect(moduleFromPath('/nao-existe')).toBe(DEFAULT_MODULE)
    expect(moduleFromPath('/read-note')).toBe(DEFAULT_MODULE)
  })

  it('sem módulo na URL, volta ao último aberto', () => {
    expect(moduleFromPath('/', 'readKey')).toBe('readKey')
    expect(moduleFromPath('/mark-note/treble', 'readInterval:cello')).toBe('readInterval:cello')
    // um link direto vence a memória
    expect(moduleFromPath('/read-note/bass', 'readKey')).toBe('readNote:bass')
  })

  it('só aceita como último módulo um id que ainda existe', () => {
    expect(parseModule('readInterval:piano')).toBe('readInterval:piano')
    expect(parseModule('markNote:treble')).toBeNull() // módulo removido
    expect(parseModule('lixo')).toBeNull()
    expect(parseModule(null)).toBeNull()
  })

  it('a página Sobre é /about e não é de módulo: o módulo continua o último aberto', () => {
    expect(ABOUT_PATH).toBe('/about')
    expect(isAboutPath('/about')).toBe(true)
    expect(isAboutPath('/about/')).toBe(true)
    expect(isAboutPath('/read-key')).toBe(false)
    for (const m of MODULES) expect(pathForModule(m)).not.toBe(ABOUT_PATH)
    expect(moduleFromPath(ABOUT_PATH, 'readInterval:piano')).toBe('readInterval:piano')
  })

  it('a página Outros apps é /other-apps e também não é de módulo', () => {
    expect(OTHER_APPS_PATH).toBe('/other-apps')
    expect(isOtherAppsPath('/other-apps')).toBe(true)
    expect(isOtherAppsPath('/other-apps/')).toBe(true)
    expect(isOtherAppsPath(ABOUT_PATH)).toBe(false)
    expect(isAboutPath(OTHER_APPS_PATH)).toBe(false)
    for (const m of MODULES) expect(pathForModule(m)).not.toBe(OTHER_APPS_PATH)
    expect(moduleFromPath(OTHER_APPS_PATH, 'readInterval:piano')).toBe('readInterval:piano')
  })
})
