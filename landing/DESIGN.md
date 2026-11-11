# Página de vendas: design system

Página estática (`index.html` com CSS e JS embutidos, sem build e sem CDN). O deploy copia `landing/`
para a raiz do site e o jogo para `jogar/`, por isso todos os caminhos são relativos.

## Direção de arte: "papel e terra"

A página fala com pai e mãe, não com a criança. Por isso ela é calma (papel marfim, tinta índigo,
pigmentos de terra) e deixa a cor forte para as telas do jogo, que aparecem dentro de celulares.
Seções alternam fundo de papel com "ilhas" arredondadas de cor (noite, verde, água, argila).

## O que trocar e onde

| O quê | Onde |
|---|---|
| Nome do app | `CONFIG.nome` no `<script>` do fim do `index.html`. Atualiza todos os `[data-nome]`, o `<title>` e as metas ao abrir a página. Para quem lê o HTML sem rodar JS (buscadores, prévia de link), troque também o texto "Jogo Bíblico" no próprio arquivo com localizar e substituir, e rode `node landing/tools/og.cjs "Novo Nome"`. |
| "Avise-me no lançamento" | `CONFIG.avisoLancamento`. Vazio = bloco escondido. Aceita WhatsApp (só números com DDI), e-mail ou link. A página não coleta dados. |
| Endereço do site | `canonical`, `og:url` e `og:image` no `<head>` (precisam ser absolutos). |
| Telas do app | `node landing/tools/capturar.cjs` (instruções no topo do arquivo). |
| Imagem de compartilhamento | `node landing/tools/og.cjs` gera `img/og.jpg` (1200x630). |
| Teste | `node landing/tools/testar.cjs [pasta]` confere 360, 390, 430 e 1280 px. |

Não remova `sw.js` nem o trecho final do `<script>`: eles limpam o service worker da versão antiga.

## Tokens (em `:root`, no topo do `<style>`)

- **Cor**: `--paper` / `--paper-2` / `--paper-3` (fundos), `--ink` / `--ink-2` / `--ink-3` (texto),
  `--clay` (ação principal), `--gold` (destaque), `--olive` (confiança), `--sky` e `--teal` (apoio),
  `--night` (ilha escura). Cada pigmento tem versão clara (`-l`) e escura (`-d`).
  Texto normal sempre com contraste AA: use `--ink-2` no papel; `--ink-3` só para notas.
- **Tipografia**: `--f-display` Fraunces (títulos, peso 600, eixo `SOFT` 100), `--f-body` Nunito
  (texto 500, ênfase 700/800), `--f-game` Lilita One (só a marca, para ligar com o jogo).
  Escala fluida: `--t-hero`, `--t-h2`, `--t-h3`, `--t-lead`, `--t-body`, `--t-small`, `--t-micro`.
- **Espaço**: base 4 (`--s1` a `--s9`), `--sec` (respiro vertical de seção), `--gutter`, `--wrap` 1160 px.
- **Raios**: `--r-sm` 10, `--r-md` 16, `--r-lg` 24, `--r-xl` (ilhas), `--r-pill`.
- **Sombras**: `--sh-1` (repouso), `--sh-2` (cartão elevado), `--sh-3` (celular).
- **Movimento**: `--ease`, `--d1` 150 ms (toque), `--d2` 300 ms (estado), `--d3` 700 ms (entrada).
  Tudo desliga com `prefers-reduced-motion`.

## Componentes

| Classe | Uso |
|---|---|
| `.btn` | Botão. Variações: `.btn-sm`, `.btn-ghost` (secundário), `.btn-light` (sobre argila), `.btn-gold`. Uma ação principal por tela. |
| `.tag` | Selo acima do título. Variações: `.tag-gold`, `.tag-night`, `.tag-teal`. |
| `.sec` + `.sec-head` | Seção e cabeçalho (selo, `h2`, parágrafo). `.center` centraliza. |
| `.island` | Seção em bloco arredondado de cor. Com fundo escuro, some `.on-dark`. |
| `.card`, `.tile` | Cartão simples e bloco do mosaico ("o que aprende"). |
| `.checks` | Lista com marca de verificação. |
| `.phone` > `.screen` > `img` | Moldura de celular. Tamanho pela variável `--w`. Imagem 600x1298. |
| `.float` | Cartão flutuante ao lado do celular (com `.bob` para balançar). |
| `.car` + `.shot` | Vitrine com scroll-snap; setas e pontos saem do JS. |
| `.faq` | `details`/`summary`; abre uma por vez. |
| `.cta-bar` | Barra fixa do celular; aparece depois do botão do herói e some no CTA final. |
| `.reveal` | Entrada ao rolar. Sem JS o conteúdo fica visível. |

Ícones: sprite SVG no início do `<body>`, usados com `<svg class="ico"><use href="#i-nome"/></svg>`.

## Regras de conteúdo

- Só fatos do produto. Sem depoimentos, números de usuários ou selos de terceiros enquanto não existirem.
- Preço: "valor de lançamento em breve" até ser definido.
- Imagens: `.webp` com `width`/`height`; só a tela do herói carrega na hora, as demais com `loading="lazy"`.
- Peso da página inteira hoje: cerca de 0,8 MB (limite: 1,5 MB).
