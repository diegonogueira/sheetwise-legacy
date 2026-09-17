# Sheetwise

App de treino de **leitura na pauta** nas claves de **Sol**, **Fá** e **Dó**. Web-first
(React + Vite) e Android (Capacitor). Irmão do [fretwise](https://github.com/diegonogueira/fretwise),
[sightwise](https://github.com/diegonogueira/sightwise), [mathwise](https://github.com/diegonogueira/mathwise)
e [keyswise](https://github.com/diegonogueira/keyswise): mesmo chassi, mesmas convenções
([wisekit](https://github.com/diegonogueira/wisekit)).

## O que ele faz

Cada módulo é uma tarefa numa configuração de claves, com URL própria e configurações
lembradas separadamente.

**Ler notas** (pauta → nome) — uma nota acende na pauta e você diz qual é. Por padrão a pauta
traz uma **armadura** e a nota vem limpa: quem diz que aquele Fá é Fá♯ é a armadura, então
você escolhe o acidente e a letra — que é a leitura de verdade.

**Intervalos** (pauta → intervalo) — duas notas na pauta, uma depois da outra (melódico) ou
juntas (harmônico), e você diz a distância. Por padrão só o número (2ª a 8ª), que é o que o
olho precisa reconhecer à primeira vista; com qualidade, as 13 opções da escala (3ª menor,
4ª justa, 4ª aumentada, 5ª diminuta…). O intervalo sai da grafia: Fá–Si e Fá–Dó♭ soam igual,
mas são 4ª aumentada e 5ª diminuta.

Os dois existem em seis configurações de clave:

| Módulo | Claves | Como aparece |
|---|---|---|
| Clave de Sol | Sol | uma pauta |
| Clave de Fá | Fá | uma pauta |
| Clave de Dó | Dó 3ª e 4ª (configurável até a 1ª, 2ª e 5ª) | uma pauta, clave sorteada por questão |
| Piano | Sol + Fá | **sistema de duas pautas** com chave |
| Violoncelo | Fá + Dó 4ª | uma pauta, clave sorteada por questão |
| Viola | Dó 3ª + Sol | uma pauta, clave sorteada por questão |

O piano é **simultâneo** (as duas pautas na tela, como no repertório); violoncelo, viola e a
clave de Dó são **alternados** — a clave muda de uma questão para outra, que é como esses
instrumentos leem de verdade.

**Tonalidade** (armadura → tonalidade) — a armadura aparece na pauta e você nomeia a
tonalidade. Como uma armadura serve à tonalidade maior **e** à sua relativa menor, o
enunciado sempre diz qual das duas está pedindo.

### Configurações

Nomes das notas em **C D E** ou **Dó Ré Mi** (é configuração, não idioma), som ligado ou
desligado, e por módulo: quantas **linhas suplementares** entram na faixa (de 0 a 5 de cada
lado), de onde vêm os **acidentes** (nenhum · desenhados na nota · impostos pela armadura,
que é o padrão) e até quantos a armadura pode ter. Em "Intervalos", ainda o tipo (melódico,
harmônico ou os dois) e se a resposta é só o número ou também a qualidade. A tonalidade tem
o modo perguntado (maior/menor/os dois), o limite de acidentes e em quais claves a armadura é desenhada.

Interface em português e inglês.

## Rodando

```bash
npm install      # instala dependências
npm run dev      # servidor de desenvolvimento (http://localhost:5173)
npm run build    # type-check + build de produção (dist/)
npm run preview  # serve o build de produção
npm test         # testes do núcleo musical (Vitest)
node scripts/shot.mjs   # confere a UI num Chromium de verdade (precisa do dev rodando)
```

Android — o mesmo build web dentro de um WebView. O Gradle 8.14 não aceita o JDK 26, daí o
`JAVA_HOME` apontando para o 21; o APK sai em `android/app/build/outputs/apk/debug/`:

```bash
JAVA_HOME=/usr/lib/jvm/java-21-openjdk npm run android:apk  # gera o APK de debug
npm run android:install                                     # instala no aparelho via adb
./scripts/gen-icons.sh                                      # ícones e splash a partir de src/assets/brand/*.svg
```

Deploy no homelab: `./bin/deploy` (Docker + nginx, porta `SHEETWISE_PORT`, padrão 8081).

## Estrutura

A pauta é desenhada com **VexFlow** e o som é um soundfont de piano pelo **smplr**, com os samples
dentro do app (`public/samples`, `npm run samples`) — funciona sem internet. O chassi — React, Tailwind v4, Zustand, i18next, Capacitor —
é o da família (wisekit).

```
src/
  core/          lógica musical pura, sem React, testada
    pitch.ts       nota escrita (letra + acidente + oitava) e o índice diatônico
    clef.ts        cada clave é o diatônico da sua linha inferior; geometria da pauta
    clefSet.ts     conjuntos de clave (Sol, Fá, Dó, piano, violoncelo, viola)
    keys.ts        as 15 armaduras, tônicas maior e menor, ordem dos acidentes
    interval.ts    intervalo entre duas notas escritas (número + qualidade)
    module.ts      identidade dos módulos (tarefa × conjunto de claves)
    exercise.ts    gera as questões e valida as respostas
  components/
    Staff/         a pauta (VexFlow), com notas soltas ou em acorde
    ExercisePanel  enunciado, resposta e feedback de cada tarefa
    NotePicker     as 7 letras, com o acidente da questão estampado
    Sidebar, TopBar, Settings, ui/Segmented
  hooks/         useExercise (sessão), useRoute (URL), useMediaQuery
  store/         configurações persistidas
  lib/           rotas e utilitários
  i18n/          pt/en
  audio/         player de soundfont (samples locais em public/samples)
```

## O que ainda não tem

Histórico de progresso e o módulo inverso de tonalidade (dada a tonalidade, montar a armadura).
