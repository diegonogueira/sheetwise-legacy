// Confere a UI num navegador de verdade, sem depender de olho humano: abre o app no
// Chromium do sistema, tira foto em retrato, paisagem e desktop e RECLAMA de erro no console.
//
//   node scripts/shot.mjs [url] [saida]
//
// Precisa do `npm run dev` rodando (ou aponte para o preview). Os passos próprios do app
// (clicar numa alternativa, abrir o modal…) entram no fim, antes do relatório.
import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'

/** o que precisa estar na tela para a foto valer (a pauta desenhada) */
const READY_SELECTOR = '.staff svg'

const url = process.argv[2] ?? 'http://localhost:5173/read-note/treble'
const out = process.argv[3] ?? '/tmp/sheetwise-shots'
await mkdir(out, { recursive: true })

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' })
const errors = []

async function shot(name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 })
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${name}] ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector(READY_SELECTOR, { timeout: 10000 })
  // botões têm `transition-colors`: foto logo depois de renderizar pega a cor no meio do caminho
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false })
  console.log(`✓ ${out}/${name}.png`)
  return page
}

await shot('retrato', { width: 390, height: 844 })
await shot('paisagem', { width: 844, height: 390 })
await shot('desktop', { width: 1280, height: 800 })

await browser.close()
if (errors.length) {
  console.error('\n✗ problemas:')
  for (const e of errors) console.error('  ' + e)
  process.exit(1)
}
console.log('\n✓ sem erros de console')
