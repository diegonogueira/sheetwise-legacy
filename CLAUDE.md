# CLAUDE.md

Sheetwise é um app web-first (React + Vite) de **leitura na pauta**: nomear notas, reconhecer
intervalos e identificar armaduras nas claves de Sol, Fá e Dó. Veja o `README.md` para o
produto. As regras da família *wise (identidade, casca, modal de ajustes, estado, i18n, stack,
Android, infra e fluxo de tickets) vêm do plugin `wise` (repo **wisekit**) e **não se repetem
aqui** — este arquivo guarda só o que é do sheetwise.

## Comandos

```bash
npx vitest run src/core/clef.test.ts    # um arquivo
npx vitest run -t "linha inferior"       # um teste pelo nome

JAVA_HOME=/usr/lib/jvm/java-21-openjdk npm run android:apk
node scripts/shot.mjs [url]   # fotos + erros de console num Chromium de verdade (dev rodando)
```

`npm test` cobre o núcleo musical (grafia, claves, conjuntos de clave, armaduras, intervalos,
geração e validação das questões) e as rotas.

## Invariantes

- **A grafia é a língua franca, não o MIDI.** Uma nota é uma `Spelled` (`{ step, alter, octave }`)
  e a posição vertical na pauta é o **diatônico** `octave * 7 + step` — o acidente não move a nota.
  O MIDI só existe na saída de áudio (`midiOf`). Nenhuma checagem de resposta passa pelo MIDI:
  `sameNote`/`checkNoteName` comparam grafia, então um enarmônico é sempre errado.
- **Uma clave é o diatônico da sua linha de baixo** (`src/core/clef.ts`); toda a geometria é
  aritmética a partir daí. `yForDiatonic` recebe `topLineY` e `spacing` lidos do `Stave` — **nunca
  fixe os 10 px** entre linhas.
- **Os módulos são derivados** (`tarefa × conjunto de claves`, `src/core/module.ts`): menu, URLs e
  `Record<Module, …>` saem daí. Não existe lista de módulos para manter em dia.
- **A armadura é ambígua** entre a maior e a relativa menor: `question.keyAsk` sempre diz qual modo
  está sendo pedido, e toda alternativa é desse modo. Nunca "resolva" aceitando as duas.
- **Com `accidentalMode: 'key'` o acidente vem da armadura**: o `alter` é `alterInKey(step, keySig)`
  e a marca é desenhada com `alter: 0` — repetir o acidente ao lado da nota é notação errada e
  entrega a resposta.

## Arquitetura

`src/core/` é puro e é a fonte única da verdade: o desenho da pauta, o gerador de questões e o
áudio derivam a identidade das notas dele.

### Por que a grafia, e não o MIDI

É a única coisa que muda em relação ao fretwise, e errar aqui quebra o app inteiro. No braço só
importa a altura, então o fretwise usa o MIDI em toda parte. Na pauta importa a **grafia**: Fá♯ e
Sol♭ soam igual mas ficam em **linhas diferentes**, e distinguir as duas é exatamente o que o aluno
está aprendendo. O índice diatônico é o análogo da `Position` do fretwise: é o que se desenha, e
`Mark.slot` é um índice diatônico.

### Claves e conjuntos de clave

Cada clave é um número: o diatônico da nota da **linha de baixo** (Sol = E4, Fá = G2, Dó 3ª = F3,
Dó 4ª = D3…). Uma linha são 2 diatônicos; linha → espaço, 1. Por isso a geometria é testada sem DOM.

`single` vs `grand` é uma distinção musical, não de desenho:
- `grand` (piano) desenha **as duas** pautas de uma vez e a nota cai numa delas;
- `single` (violoncelo, viola, clave de Dó) desenha **uma** pauta e **troca a clave a cada
  questão** — é assim que esses instrumentos leem, trocando de clave no meio da peça.

Acrescentar um conjunto em `clefSet.ts` cria os módulos de nota e de intervalo sozinho e faz o
TypeScript exigir as entradas novas em todo `Record<Module, …>`.

### Como cada tarefa valida

- **readNote** — sem oitava: a grafia (letra + acidente) precisa bater, em qualquer oitava. O aluno
  escolhe entre as 7 letras (lembrar, não múltipla escolha — por isso não há `choices`). Se o
  **acidente é perguntado** depende do `accidentalMode`: com armadura ele é o ponto da questão, então
  o seletor ♭/♮/♯ aparece e as letras o seguem; sem armadura o acidente vem desenhado ao lado da
  nota, e perguntá-lo só testaria cópia — as letras já o carregam (`C♯ D♯ E♯…`).
- **readInterval** — duas notas numa pauta (no `grand`, na pauta desenhada), melódicas ou
  harmônicas (`question.harmonic` → prop `chord` do `Staff`). O intervalo sai da **grafia**
  (`src/core/interval.ts`): o número é a distância diatônica, a qualidade é o que os acidentes fazem
  com ela, então Fá–Si (4ª aum.) e Fá–Dó♭ (5ª dim.) são respostas diferentes. `intervalAsk: 'number'`
  confere só o número; `'quality'` confere os dois, contra as 13 `INTERVAL_CHOICES` (os intervalos de
  uma escala maior). O gerador garante que a resposta é sempre uma delas: dentro de uma armadura por
  construção, e no modo `note` só sorteia pares de acidentes que caem na lista — nada de 2ª aum. ou
  4ª dim. sem botão. No modo `key`, a mesma regra de desenhar com `alter: 0` da readNote.
- **readKey** — ver a invariante da armadura ambígua.

### `accidentalMode`: de onde vem o acidente

`none` (só naturais) · `note` (desenhado ao lado da cabeça da nota) · `key` (**o padrão**: armadura
na clave e a nota desenhada *limpa*).

### A pauta (`src/components/Staff/Staff.tsx`)

Desenha com VexFlow e depois faz duas coisas à mão:

1. **Centraliza as notas.** O formatter alinha à esquerda, colando a nota na clave. O deslocamento
   sai da caixa das notas (posição **mais largura**) e fica preso à área das notas, para as duas
   notas de um intervalo melódico nunca passarem da barra. O deslocamento vai no **`TickContext`**,
   nunca em `setXShift`: o `x_shift` de uma nota é do VexFlow, que o usa para abrir espaço para o
   acidente — sobrescrevê-lo movia só a cabeça, e o acidente (que lê o X absoluto do tick context)
   ficava estacionado ao lado da clave.
2. **Recorta o canvas.** O VexFlow recebe um canvas generoso e o `viewBox` é estreitado para a faixa
   vertical que o módulo usa de fato. Essa faixa sai da **configuração** (linhas suplementares), não
   da nota desenhada, então a pauta não pula entre questões. O VexFlow escreve a altura original num
   `style` inline, que vence o atributo `height` — é preciso definir `svgEl.style.height` também, senão
   o conteúdo fica com tarjas. A margem em volta é medida em **espaços da pauta**, não em pixels: um
   ♭ sobe um espaço e meio acima da cabeça, e uma margem fixa cortava o acidente da nota mais aguda.

### Estado do sheetwise

- `useSettings` (`sheetwise-settings`, **v4**): globais (`naming`, `audioEnabled`, linhas da clave
  de Dó, configuração da tonalidade) e um `ModuleConfig` por módulo (linhas suplementares,
  `accidentalMode`, `keyMax`, intervalo). Histórico das versões: v2 ligou os acidentes em todos os
  módulos (mudança de padrão que precisava valer sobre o que já estava gravado); v3 trocou o
  booleano `accidentals` por `accidentalMode`; v4 tirou a tarefa "marcar notas" (módulos
  `markNote:*` e o campo `slotHints`).
- O corpo de cada tarefa lê campos que só a questão dele tem: a regeneração **durante o render** é o
  que evita o `ReadKeyBody` ler uma questão de nota sem `keyChoices` (tela branca até recarregar).
- O último módulo aberto fica em `sheetwise-module`; `parseModule` descarta um id que deixou de
  existir.
- Os ajustes aparecem por predicados do core: `isNoteModule`, `isReadInterval`, `usesCClef`,
  `module === 'readKey'`.

### Áudio

`src/audio/player.ts` toca a nota (e as duas do intervalo, com `MELODIC_GAP` entre elas no
melódico) com um soundfont de piano pelo smplr. O soundfont vem da rede: sem internet o app funciona
mudo.

## Desvios do guia

Nenhum.

## Verificando UI

Não há teste de componente: `node scripts/shot.mjs [url]` (padrão
`http://localhost:5173/read-note/treble`) abre o Chromium do sistema, fotografa retrato, paisagem e
desktop e falha com erro no console. Seletor estável: `.staff` (o `<svg>` dentro dele é a pauta
desenhada). Para conferir os outros módulos, passe a URL: `/read-note/piano` (sistema de duas
pautas), `/read-interval/cello`, `/read-key`.
