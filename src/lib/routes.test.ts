import { describe, expect, it } from 'vitest'
import { DEFAULT_MODULE, moduleFromPath, parseModule, pathForModule } from './routes'
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
})
