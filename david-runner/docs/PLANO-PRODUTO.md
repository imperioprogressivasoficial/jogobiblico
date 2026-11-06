# Plano do produto — "Duolingo + Fortnite + histórias bíblicas" para crianças

Documento vivo. Objetivo: transformar o DAVID RUNNER (nome provisório) num app diário que a
criança quer abrir e que o pai/mãe paga com tranquilidade, porque vê o que o filho aprendeu.

## 1. A promessa (uma frase)

**Todo dia, 10 minutos de aventura bíblica: a criança joga, aprende uma história e os pais
veem o que ela aprendeu.**

Duas pessoas no centro:
- **A criança (4 a 12 anos)** quer: correr, colecionar, vestir o herói, ganhar prêmios, voltar amanhã.
- **O responsável** quer: saber que o conteúdo é bom, ver progresso, ter controle das compras e uma
  pergunta pronta para a mesa do jantar: "o que você aprendeu hoje?".

## 2. O fio que amarra tudo: a Jornada do Dia

Hoje o app já tem corrida, Jornada Bíblica, 5 modos, loja e missões. O que falta é **um único caminho
diário** que ordena essas peças. Proposta: a tela inicial mostra a **Jornada do Dia** com 3 passos
fixos, sempre na mesma ordem, com um "baú" no final:

1. **História do dia** (devocional kids, 2 a 3 min): uma história da Jornada Bíblica, narrada,
   no modo "Viver a história" (corrida no cenário) ou no livro. Termina com a **lição do dia** em uma
   frase e o **versículo do dia**.
2. **Desafio do dia** (2 a 4 min): um dos modos rápidos sorteado (Show da Fé, Monte o Versículo,
   Memória da Arca, Funda de Davi), sempre com perguntas **da história de hoje**.
3. **Corrida livre** (quanto quiser): a corrida sem limite, para ganhar denários e pergaminhos.

Completou os 3 = **Baú do Dia** (denários, 1 talento em dias especiais, carga de poder) +
**sequência de dias** (o "fogo" do Duolingo). Perdeu um dia, perde a sequência (com um "escudo de
sequência" comprável, como no Duolingo).

Regra de coerência: **nada novo entra no app sem dizer em qual desses 3 passos ele mora.**

## 3. Painel dos Pais (atrás do PIN)

Tela própria, acessada pelo ícone do responsável no lobby + PIN. Mostra:
- **Hoje**: história lida, lição do dia, versículo, acertos do desafio, minutos jogados.
- **A pergunta de hoje**: 1 pergunta pronta para o pai fazer ao filho
  ("Pergunte: por que Davi não teve medo de Golias?") com a resposta esperada.
- **Semana**: sequência de dias, histórias concluídas (x de 68), quizzes acertados, tempo total.
- **Controles**: limite de tempo por dia, PIN, compras, e-mail de relatório semanal (quando houver backend).
- **Assinatura**: plano família (ver seção 6).

## 4. NPCs que andam e falam (vida no mundo)

Personagens secundários no lobby e nas corridas, com falas curtas em balões e voz do narrador:
- **Lobby**: 2 a 3 NPCs passeando pela rua (mercador, pastor com ovelha, criança). Ao tocar, falam
  uma frase ligada à história do dia ou dão uma dica ("Hoje tem baú se você terminar o desafio!").
- **Corrida**: figurantes à beira da pista (já existe a base: as figuras da história). Evoluir para
  bonecos 3D animados que acenam e comentam ("Vai, Davi!").
- **"Inteligente" na prática**: cada NPC tem uma lista de falas por contexto (manhã/noite, história
  do dia, item novo na loja, sequência em risco) e escolhe a mais relevante. Não precisa de IA em tempo
  real no celular. Uma fase 2 pode usar IA para gerar falas novas por semana, revisadas por vocês.

## 5. Heróis e personalização

- Já feito: escolha menino/menina no cadastro; 6 heróis e 3 heroínas (Ester, Rute, Miriã);
  o primeiro herói é grátis; retratos 3D de verdade.
- Próximo: **personalizar** o herói escolhido (cor de pele, cabelo, roupa) numa tela "Meu herói",
  com itens desbloqueados por denários e roupas raras por talentos. A Loja do Dia passa a mostrar
  roupas para o herói da criança (mais vontade de comprar).

## 6. Como ganhar dinheiro sem irritar os pais

- **Assinatura Família** (mensal/anual): tudo liberado, sem anúncios, relatório semanal por e-mail,
  até 3 crianças. É o modelo que o pai entende ("pago para o meu filho usar").
- **Pacotes de denários/talentos** (já na loja) para quem não assina.
- **Sem anúncios** para crianças. Nunca.
- Compras sempre atrás do PIN (já feito).

## 7. O que precisa de servidor (fase 2)

Hoje tudo fica no aparelho. Para ter conta de verdade, relatório por e-mail, vários aparelhos e
assinatura, entra o backend (sugestão: Supabase, que a Império já usa):
- Conta do responsável (e-mail + senha ou Google/Apple) → perfis das crianças.
- Progresso sincronizado (histórias, quizzes, sequência).
- Relatório semanal por e-mail e compras validadas pela App Store/Google Play.
- LGPD: dados da criança sempre ligados ao consentimento do responsável, mínimo necessário.

## 8. Ordem de construção (proposta)

| Etapa | O que entrega | Por que primeiro |
|---|---|---|
| A | Jornada do Dia + Baú + sequência de dias | É o coração do hábito diário |
| B | Painel dos Pais (local, com PIN) e "pergunta de hoje" | É o argumento de venda para o pai |
| C | NPCs no lobby com falas por contexto | Vida no mundo, sensação de jogo "grande" |
| D | Tela "Meu herói" (personalização) | Retenção e vontade de comprar |
| E | Backend: conta, sincronização, assinatura | Só depois de validar A–D com famílias reais |
| F | Nome, ícone, loja da Apple/Google, vídeo de divulgação | Lançamento |

Cada etapa é jogável no Expo ao terminar, para o Bruno e a Tássia testarem com crianças de verdade.

## 9. Perguntas em aberto (decidir juntos)

1. Nome do jogo.
2. Faixa de idade principal (4–7 ou 8–12 muda o texto e a dificuldade padrão).
3. Preço da assinatura e se haverá versão só com pacotes.
4. Quais NPCs (nomes, personalidades) e a voz do narrador (voz do aparelho ou gravada).
