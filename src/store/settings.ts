import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { MODULES, usesCClef, type Module } from '../core/module'
import { DEFAULT_C_CLEF_LINES, type CClefLine } from '../core/clefSet'
import type { ClefId, LedgerCount } from '../core/clef'
import type { AccidentalMode, IntervalAsk, IntervalStyle, KeyAsk } from '../core/exercise'
import type { Naming } from '../core/pitch'

/** Configs que cada módulo lembra separadamente. */
export interface ModuleConfig {
  /** linhas suplementares abaixo da pauta (ver `LEDGER_COUNTS`) */
  ledgerBelow: LedgerCount
  /** linhas suplementares acima da pauta (ver `LEDGER_COUNTS`) */
  ledgerAbove: LedgerCount
  /** de onde vem o acidente: nenhum, desenhado na nota, ou imposto pela armadura */
  accidentalMode: AccidentalMode
  /** no modo `key`: máximo de acidentes da armadura */
  keyMax: number
  /** intervalos: pergunta só o número ou também a qualidade */
  intervalAsk: IntervalAsk
  /** intervalos: melódico, harmônico ou os dois */
  intervalStyle: IntervalStyle
}

const DEFAULT_MODULE_CONFIG: ModuleConfig = {
  ledgerBelow: 3,
  ledgerAbove: 3,
  accidentalMode: 'key',
  keyMax: 4,
  intervalAsk: 'number',
  intervalStyle: 'both',
}

/** Replica uma config-semente para todos os módulos (estado inicial / migração). */
function modulesFrom(seed: ModuleConfig): Record<Module, ModuleConfig> {
  return Object.fromEntries(MODULES.map((m) => [m, { ...seed }])) as Record<Module, ModuleConfig>
}

/**
 * Aplica um patch à config de um módulo, sempre preenchendo campos ausentes com
 * `DEFAULT_MODULE_CONFIG`. Único ponto que normaliza um `ModuleConfig` parcial/ausente —
 * resiliente a `modules` corrompido (null) vindo do localStorage.
 */
function patchModule(
  modules: Record<Module, ModuleConfig> | undefined,
  module: Module,
  patch: Partial<ModuleConfig>,
): Record<Module, ModuleConfig> {
  const next = { ...modulesFrom(DEFAULT_MODULE_CONFIG), ...modules }
  next[module] = { ...DEFAULT_MODULE_CONFIG, ...modules?.[module], ...patch }
  return next
}

/**
 * Os ajustes que não são de um módulo, como vêm de fábrica. `naming` e `audioEnabled` são da
 * seção Geral; as linhas da clave de Dó e a tonalidade aparecem só na seção dos módulos delas,
 * então voltam junto com o "Restaurar padrões" desses módulos.
 */
const GENERAL_DEFAULTS = {
  naming: 'letters' as Naming,
  audioEnabled: true,
}
const C_CLEF_DEFAULTS = () => ({ cClefLines: [...DEFAULT_C_CLEF_LINES] })
const KEY_DEFAULTS = () => ({
  keyAsk: 'major' as KeyAsk,
  keyMaxAccidentals: 4,
  keyClefs: ['treble', 'bass'] as ClefId[],
})

interface SettingsState {
  // --- globais (valem para todos os módulos) ---
  /** nomes em letras (C D E) ou solfejo (Dó Ré Mi) — é config, não idioma */
  naming: Naming
  audioEnabled: boolean
  // --- por módulo ---
  modules: Record<Module, ModuleConfig>
  // --- módulos de clave de Dó ---
  /** linhas em que a clave de Dó pode aparecer (ao menos uma) */
  cClefLines: CClefLine[]
  // --- módulo de tonalidade ---
  keyAsk: KeyAsk
  keyMaxAccidentals: number
  /** claves em que a armadura pode ser desenhada (ao menos uma) */
  keyClefs: ClefId[]
  setNaming: (v: Naming) => void
  setAudioEnabled: (v: boolean) => void
  setLedger: (module: Module, side: 'below' | 'above', v: LedgerCount) => void
  setAccidentalMode: (module: Module, v: AccidentalMode) => void
  setKeyMax: (module: Module, v: number) => void
  setIntervalAsk: (module: Module, v: IntervalAsk) => void
  setIntervalStyle: (module: Module, v: IntervalStyle) => void
  toggleCClefLine: (line: CClefLine) => void
  setKeyAsk: (v: KeyAsk) => void
  setKeyMaxAccidentals: (v: number) => void
  toggleKeyClef: (clef: ClefId) => void
  /**
   * "Restaurar padrões": o módulo como vem de fábrica — o `ModuleConfig` dele e o que só
   * aparece na seção dele (linhas da clave de Dó, a tonalidade). Os ajustes gerais ficam.
   */
  resetModule: (module: Module) => void
  /** "Redefinir tudo": gerais e todos os módulos. O idioma e o último módulo ficam (não moram aqui). */
  resetAll: () => void
}

/** Alterna um item mantendo ao menos um selecionado (a lista vazia trava o exercício). */
function toggleKeepingOne<T>(list: T[], item: T): T[] {
  const next = list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
  return next.length ? next : list
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...GENERAL_DEFAULTS,
      modules: modulesFrom(DEFAULT_MODULE_CONFIG),
      ...C_CLEF_DEFAULTS(),
      ...KEY_DEFAULTS(),
      setNaming: (naming) => set({ naming }),
      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setLedger: (module, side, v) =>
        set((s) => ({
          modules: patchModule(s.modules, module, side === 'below' ? { ledgerBelow: v } : { ledgerAbove: v }),
        })),
      setAccidentalMode: (module, accidentalMode) =>
        set((s) => ({ modules: patchModule(s.modules, module, { accidentalMode }) })),
      setKeyMax: (module, keyMax) =>
        set((s) => ({ modules: patchModule(s.modules, module, { keyMax }) })),
      setIntervalAsk: (module, intervalAsk) =>
        set((s) => ({ modules: patchModule(s.modules, module, { intervalAsk }) })),
      setIntervalStyle: (module, intervalStyle) =>
        set((s) => ({ modules: patchModule(s.modules, module, { intervalStyle }) })),
      toggleCClefLine: (line) => set((s) => ({ cClefLines: toggleKeepingOne(s.cClefLines, line) })),
      setKeyAsk: (keyAsk) => set({ keyAsk }),
      setKeyMaxAccidentals: (keyMaxAccidentals) => set({ keyMaxAccidentals }),
      toggleKeyClef: (clef) => set((s) => ({ keyClefs: toggleKeepingOne(s.keyClefs, clef) })),
      resetModule: (module) =>
        set((s) => ({
          modules: patchModule(s.modules, module, DEFAULT_MODULE_CONFIG),
          ...(usesCClef(module) ? C_CLEF_DEFAULTS() : {}),
          ...(module === 'readKey' ? KEY_DEFAULTS() : {}),
        })),
      resetAll: () =>
        set({ ...GENERAL_DEFAULTS, modules: modulesFrom(DEFAULT_MODULE_CONFIG), ...C_CLEF_DEFAULTS(), ...KEY_DEFAULTS() }),
    }),
    {
      name: 'sheetwise-settings',
      version: 4,
      /**
       * Migrações (o backfill da leitura só preenche campo ausente, então mudar um default
       * não alcança quem já abriu o app, e um campo removido ficaria salvo para sempre):
       *
       * - v2 ligou os acidentes em todos os módulos.
       * - v3 troca o booleano `accidentals` pelo modo: quem os tinha ligados passa a ler
       *   com ARMADURA (o acidente deixa de ser copiado da nota e passa a ser deduzido),
       *   quem os tinha desligados continua só com naturais.
       * - v4 remove o "Marcar notas": somem os módulos `markNote:*` e o campo `slotHints`.
       *
       * Cada módulo é reconstruído só com os campos que `ModuleConfig` ainda conhece, então
       * os restos de versões antigas (`accidentals`, `slotHints`) não sobrevivem.
       */
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as Partial<SettingsState>
        if (version >= 4) return state
        const stored = (state.modules ?? {}) as Record<string, Record<string, unknown> | undefined>
        const modules = modulesFrom(DEFAULT_MODULE_CONFIG)
        for (const m of MODULES) {
          const old = stored[m] ?? {}
          const known = Object.entries(old).filter(([field]) => field in DEFAULT_MODULE_CONFIG)
          modules[m] = { ...DEFAULT_MODULE_CONFIG, ...Object.fromEntries(known) }
          if (version < 3) {
            const hadAccidentals = version >= 2 ? (old.accidentals ?? true) : true
            modules[m].accidentalMode = hadAccidentals ? 'key' : 'none'
          }
        }
        return { ...state, modules }
      },
    },
  ),
)

/**
 * Config do módulo ativo. Preenche campos ausentes com `DEFAULT_MODULE_CONFIG` (e tolera
 * `modules` ausente/null), então adicionar um campo novo a `ModuleConfig` é seguro mesmo
 * para estados já persistidos — o backfill acontece na leitura. `useShallow` mantém a
 * referência estável enquanto os valores não mudam.
 */
export function useModuleConfig(module: Module): ModuleConfig {
  return useSettings(useShallow((s) => ({ ...DEFAULT_MODULE_CONFIG, ...s.modules?.[module] })))
}
