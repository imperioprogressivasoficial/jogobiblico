# Jogo Bíblico (DAVID RUNNER): resumo para o dono do produto

*Avaliação feita lendo o código em `david-runner/` (nenhum arquivo foi alterado). Os números marcados com (est.) são estimativas; o resto vem direto do código.*

## 1. O que é

Um jogo de corrida 3D, no estilo Subway Surfers, em que a criança corre com heróis da Bíblia (Davi, Moisés, Ester...) por cenários bíblicos, desviando de obstáculos e juntando moedas. Nas corridas ela pega **pergaminhos**, e cada pergaminho revela a próxima das **68 histórias da Bíblia**, em ordem, da Criação até a Igreja. Cada história tem livro narrado, lição, versículo e um quiz. É feito para crianças de 4 a 12 anos. O app é grátis na loja e o jogo completo é liberado com um **código** que a família compra fora do app.

## 2. Tudo o que tem no jogo

- **Telas:** 22 no total (`src/App.tsx`): abertura, cadastro, lobby, corrida, Jornada Bíblica, Modos, Loja, Heróis, Mapas, Missões, Conquistas, Recordes, Ajustes, Moedas da Bíblia, Painel dos Pais, Jogo completo (código), Mundo Aberto e 5 telas de minijogo.
- **7 modos** (`src/data/modes.ts`):
  - **Corrida Bíblica**: correr, pular, deslizar e trocar de pista.
  - **Mundo Aberto**: andar numa praça de Jerusalém com outras crianças online. Só existem 8 frases prontas e 4 gestos, sem chat livre.
  - **Show da Fé**: 10 perguntas de 3 opções, com 20 segundos cada.
  - **Memória da Arca**: achar pares em 3 fases (4, 6 e 8 pares).
  - **Monte o Versículo**: pôr as palavras em ordem em 5 versículos.
  - **Exército de Gideão**: escolher portões com contas (+, −, ×, ÷) durante 40 segundos.
  - **Funda de Davi**: puxar e mirar em 3 rodadas de 5 pedras.
- **9 heróis** (`characters.ts`): Davi e o herói escolhido no cadastro vêm grátis. Os outros se ganham com denários (Moisés, Ester, Rute e Miriã custam 2.500 cada; José custa 6.000), com distância (Noé pede 3.000 m em uma corrida), com 8 pergaminhos (Daniel) ou com 3 talentos (Sansão). Há **15 roupas extras**, pagas em talentos.
- **5 cenários** (`maps.ts`): Jerusalém, Deserto, Vale de Elá, Egito e Babilônia. Cada um abre correndo uma certa distância no cenário anterior (1.000 a 2.500 m) ou pagando de 1.500 a 8.000 denários.
- **6 poderes** (`powers.ts`), usados com dois toques na tela: Carruagem de Fogo, Funda, Cajado de Moisés, Manto de Elias, Harpa de Davi e Força de Sansão. Quatro deles abrem quando a história ligada a eles é revelada.
- **Jornada do Dia:** são 3 passos por dia (a história do dia, um minijogo sorteado e uma corrida de 150 m). Quem completa abre um **baú com 250 denários** e mantém a **sequência de dias**. A cada 7 dias seguidos o baú dá 1 talento.
- **Loja e moedas:** são duas moedas. O **denário** é a moeda comum e o **talento** é a moeda rara. A Loja tem 5 abas: Destaque (a Loja do Dia, com roupas em desconto), Heróis, Roupas, Poderes e Melhorias. As melhorias são 3 (Ímã, Harpa Dourada e Escudo da Fé), com 5 níveis cada. Há também uma enciclopédia com 8 "Moedas da Bíblia". Nada é vendido por dinheiro dentro do app.
- **Missões e conquistas:** 3 missões por dia, que dão de 100 a 220 denários e +1 carga de poder. Completar as 3 dá 1 talento e aumenta o multiplicador de pontos. Há **22 conquistas**, que somam cerca de 8.800 denários.
- **Painel dos Pais** (com PIN): mostra o que a criança fez hoje, uma "pergunta para o jantar" com a resposta, a lição, o versículo, o progresso (histórias lidas de 68) e os dados da conta.
- **Grátis vs. código** (`access.ts`): sem código, a criança tem a Corrida, o minijogo sorteado do dia e "viver" as 3 primeiras histórias, além da história do dia enquanto ela for uma das 7 primeiras. Com o código abrem os outros minijogos, o Mundo Aberto e todas as histórias.

## 3. Quanto tempo dura

**Ver todo o conteúdo uma vez: cerca de 4 a 6 horas (est.)**
- As histórias somam 68 histórias, 271 páginas e cerca de 8.250 palavras. Com narração, página de lição e quiz, isso dá uns 3 minutos por história, ou **~3,5 h** no total (est.).
- Para revelar todas é preciso achar 68 pergaminhos. Na pista, o 1º aparece entre 110 e 150 m e depois vem um a cada 250 a 420 m (`TrackGenerator.ts`). Uma corrida de criança de ~600 m (~2 min) rende uns 2 pergaminhos, então são **~35 corridas, ou ~1h15 de corrida** (est.).
- Jogar cada minijogo uma vez leva ~15 min, e dar uma volta no Mundo Aberto leva ~10 min.

**Jornada do Dia: 68 dias para passar por todas as histórias**
- A história do dia é a próxima história revelada que ainda não foi lida (`ensureDaily`). Uma criança que só segue a Jornada do Dia leva **~68 dias**. Depois disso, o jogo repete histórias já lidas.
- Na versão grátis, a Jornada do Dia completa dura **cerca de 1 semana** (até a história 7).

**Liberar tudo: cerca de 2,5 a 3 meses jogando ~20 min por dia (est.)**
- **Gastos em denários:** heróis somam 16.000, cenários 17.500 (ou zero, se abertos por distância), melhorias 42.200 e melhorias de poderes 58.600. O total fica em **~134.000 denários**.
- **Ganhos em denários por dia (est.):** a criança ganha uns 100 por corrida de ~600 m, considerando ~0,2 denário por metro (`COIN_SPACING = 2.4`, com 68% das fileiras tendo moedas). Também ganha de 100 a 250 por minijogo, ~450 nas 3 missões, 250 no baú e 50 por quiz novo. Com ~5 corridas por dia, isso dá **~1.400 denários por dia**. Descontados os ~8.800 das conquistas, são **~80 a 95 dias**.
- **Talentos:** as roupas pedem 26 talentos e Sansão pede mais 3, o que dá 29 no total. O cadastro dá 3 de presente. Depois, a criança ganha ~1 talento por dia nas missões e mais 1 por semana no baú, então são **~25 dias**. Um detalhe: o talento da pista só aparece depois de 900 a 1.500 m, e corridas curtas de criança quase nunca chegam lá.
- **Pontos difíceis para os pequenos:** o Noé pede 3.000 m em uma única corrida, e o Babilônia pede 2.500 m no Egito (ou 8.000 denários).

## 4. Coerência: o que está confuso ou contraditório

**O que está bom:** os nomes das moedas (denário e talento) têm base bíblica e vêm com explicação (`currency.ts`). As histórias são curtas, fiéis e em linguagem de criança. O Mundo Aberto foi pensado com cuidado para a segurança das crianças.

**Problemas encontrados:**
1. **Botão de equipe na primeira tela, liberando tudo.** Em `OnboardingScreen.tsx` aparece *"Acesso rápido (equipe) · PIN 1234"*. Esse botão dá 50.000 denários e 50 talentos e libera o jogo completo (`quickTestAccount`). Ele aparece para qualquer pessoa, sem filtro de versão de teste. Precisa sair antes de publicar.
2. **O bloqueio pago tem buracos.** O livro de qualquer história revelada pode ser lido, e o quiz respondido, sem código. Só o botão "Viver a história" pede o código (`UIManager.startStoryRun`; `StoryReader.tsx` não confere nada). Além disso, a tela de venda promete *"Painel dos pais com o que a criança aprendeu"* (`AccessScreen.tsx`), mas o Painel dos Pais já é grátis.
3. **Textos que falam de compras que não existem mais.** `docs/PLANO-PRODUTO.md` diz *"Pacotes de denários/talentos (já na loja)"*, *"Compras sempre atrás do PIN (já feito)"* e *"escudo de sequência comprável"*. A auditoria de UX cita *"Pacotes: preço em verde vivo"*. Mas `access.ts` diz *"não vende nada lá dentro"*. O plano também fala em "5 modos", e hoje são 7.
4. **A auditoria de UX não bate com o código.** O arquivo `AUDITORIA-UX.md` só existe numa cópia de trabalho (`.claude/worktrees/.../docs/`), não em `docs/`. Ele marca como "Resolvido" coisas que o código atual ainda tem:
   - a Jornada do Dia com botões só numerados (`<small>{i + 1}</small>` em `MainMenu.tsx`);
   - o botão "TOQUE PARA JOGAR" em verde;
   - o selo "NOVO" em todos os modos (`ModesScreen.tsx`);
   - o texto "Desbloqueie {nome}" na Loja.
5. **Coisas repetidas com nomes parecidos.**
   - A *Harpa Dourada* (melhoria) e a *Harpa de Davi* (poder) fazem quase a mesma coisa.
   - O *Escudo da Fé* (melhoria) e o *Manto de Elias* (poder) também.
   - *Funda de Davi* é ao mesmo tempo um modo e um poder.
   - *Sansão* é ao mesmo tempo um herói e um poder.
   - *Jornada Bíblica* e *Jornada do Dia* são coisas diferentes com o mesmo nome.
   - Heróis aparecem em dois lugares: a tela Heróis e a aba Heróis da Loja.
6. **Termos difíceis para quem tem 4 a 6 anos:**
   - *"Pegue 25 power-ups"* (em inglês), em `progression.ts`;
   - *"Multiplicador aumentado! Agora sua pontuação é x2"*;
   - *"(beta online)"*, em `modes.ts`;
   - *"Corrida 150 m"*, porque a criança pequena não sabe o que são metros;
   - as contas com × e ÷ do Gideão.
   - Há ainda um erro de português: *"Acumule 5.000 denários coletadas"* (deveria ser "coletados").
7. **Tema bíblico invertido no Gideão.** O minijogo premia **juntar** o maior exército possível. Na Bíblia, a lição é que Deus **reduziu** o exército para 300 (Juízes 7). O jogo termina com 300, mas a pontuação vem do pico de soldados.

## 5. Simplicidade

- **No lobby há 12 toques possíveis:**
  - o perfil, que leva ao Painel dos Pais;
  - as 2 moedas;
  - Loja, Jornada, Modos, Heróis e Mais;
  - a pílula da Jornada do Dia;
  - "trocar modo";
  - o poder;
  - JOGAR.
  - Além disso, os personagens que andam no lobby também respondem ao toque, e o "Mais" abre outros 6 botões. Ao todo são ~17 destinos.
- **Toques até jogar:** quem volta ao jogo precisa de **2 toques** (abertura e JOGAR), o que está ótimo. Na primeira vez são **~15 toques**, mais digitar nome, e-mail e um PIN de 4 dígitos duas vezes, em 7 etapas, e isso exige um adulto.
- **Opinião honesta:** para quem tem 8 a 12 anos, o lobby funciona. Para quem tem 4 a 6, há coisa demais. São 22 telas e três telas só de progresso (Missões, Conquistas e Recordes), além de duas moedas, poderes com cargas e melhorias. A própria Loja tem 5 abas.

**Os 5 maiores pontos de confusão e uma sugestão simples para cada:**
1. *O lobby tem 12 botões.* Deixar só JOGAR, a Jornada do Dia e a Loja à vista, e guardar o resto em "Mais".
2. *A Jornada do Dia aparece como 3 botões numerados (1, 2, 3).* Trocar os números por um desenho e uma palavra em cada passo ("Ouvir", "Jogar", "Correr").
3. *Melhorias e poderes se repetem.* Juntar os dois numa aba só, "Poderes", e cortar a Harpa Dourada e o Escudo da Fé.
4. *Duas "Jornadas".* Renomear uma delas, por exemplo "Livro de Histórias" para a trilha e "Missão de Hoje" para a diária.
5. *O cadastro é longo antes de jogar.* Deixar a criança jogar a primeira corrida logo, e pedir os dados do adulto só ao abrir o Painel dos Pais ou ativar o código.

## 6. Vertical ou horizontal

- **Hoje o jogo está travado em vertical** nestes lugares:
  - `src/platform/native.ts`: `ScreenOrientation.lock({ orientation: 'portrait' })`;
  - `android/.../AndroidManifest.xml`: `screenOrientation="portrait"`;
  - `public/manifest.webmanifest`: `"orientation": "portrait"`;
  - `david-runner-expo/app.json`: `"orientation": "portrait"`;
  - `capacitor.config.ts` não define orientação.
- **Há uma incoerência:** `ios/App/App/Info.plist` permite a posição horizontal no iPhone. Hoje quem segura é a trava feita pelo código, mas vale alinhar o arquivo com o resto.
- **Funcionaria deitado?** Em parte. A câmera 3D se ajusta à proporção da tela (`CameraController.ts`), então a corrida rodaria. Já os minijogos Gideão e Funda são desenhados em 400×640 (em pé) e ficariam com faixas vazias nos lados. Todo o resto da interface também foi ajustado para a tela em pé.
- **Recomendação: manter vertical.** Os grandes jogos de corrida infinita (Subway Surfers, Temple Run) são verticais, porque com o celular em pé a criança desliza com o polegar de uma só mão. Mãos pequenas seguram melhor o celular em pé. O livro de histórias, com texto grande, também lê melhor assim. A posição horizontal só valeria a pena no futuro, para tablets.
