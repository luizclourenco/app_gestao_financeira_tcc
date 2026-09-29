/*
  ================================================
  PARTE 1 - TROCAR DE TELA (navegação do menu inferior)
  ================================================

  Ideia: pegamos TODOS os botões do menu inferior, e para cada um
  deles, "escutamos" o clique. Quando clica, a gente:
    1. Descobre qual tela ele quer abrir (pelo atributo data-tela)
    2. Esconde todas as telas
    3. Mostra só a tela escolhida
    4. Atualiza qual botão do menu fica destacado (azul)
*/

// document.querySelectorAll pega TODOS os elementos que combinam com o seletor
// (aqui, todo botão que tem a classe "item-menu")
const botoesMenu = document.querySelectorAll('.item-menu');

// document.querySelectorAll('.tela') pega as 3 <section class="tela">
const telas = document.querySelectorAll('.tela');

// Agora, para cada botão do menu, adicionamos um "ouvinte de clique"
botoesMenu.forEach((botao) => {
  botao.addEventListener('click', () => {

    // getAttribute lê o valor de data-tela do botão clicado
    // Ex: no botão "Movimentações", data-tela="tela-movimentacoes"
    const idTelaEscolhida = botao.getAttribute('data-tela');

    // Passo 1: esconder todas as telas removendo a classe "tela-ativa"
    telas.forEach((tela) => {
      tela.classList.remove('tela-ativa');
    });

    // Passo 2: mostrar só a tela escolhida, adicionando a classe de novo
    const telaEscolhida = document.getElementById(idTelaEscolhida);
    telaEscolhida.classList.add('tela-ativa');

    // Passo 3: tirar o destaque de todos os botões do menu...
    botoesMenu.forEach((b) => {
      b.classList.remove('item-menu-ativo');
    });

    // ...e colocar o destaque só no botão que foi clicado agora
    botao.classList.add('item-menu-ativo');
  });
});


/*
  ================================================
  PARTE 2 - ESCONDER/MOSTRAR O SALDO (ícone do olho)
  ================================================

  Quando clica no ícone de olho 👁️, o valor vira "R$ ••••••"
  e o ícone muda pra 🙈. Clicando de novo, volta ao normal.

  Isso é só visual por enquanto (o valor real fica guardado
  numa variável). Mais pra frente, quando os dados forem
  dinâmicos, essa lógica vai continuar funcionando do mesmo jeito.
*/

const botaoOlho = document.getElementById('botao-olho');
const valorSaldoElemento = document.getElementById('valor-saldo');

// Guardamos o valor original aqui, pra poder voltar depois
const valorSaldoOriginal = valorSaldoElemento.textContent;
let saldoEstaVisivel = true;

botaoOlho.addEventListener('click', () => {
  saldoEstaVisivel = !saldoEstaVisivel; // inverte true/false

  if (saldoEstaVisivel) {
    valorSaldoElemento.textContent = valorSaldoOriginal;
    botaoOlho.textContent = '👁️';
  } else {
    valorSaldoElemento.textContent = 'R$ ••••••';
    botaoOlho.textContent = '🙈';
  }
});


/*
  ================================================
  PARTE 3 - FILTROS DA TELA DE MOVIMENTAÇÕES
  ================================================

  Ideia parecida com a troca de tela: cada aba (Todas/Receitas/Despesas)
  tem um data-filtro. Quando clica numa aba:
    1. Marca ela como ativa (visualmente)
    2. Passa por TODOS os lançamentos da lista
    3. Se o filtro for "todas", mostra tudo
    4. Se não, só mostra o lançamento se o tipo dele bater com o filtro
*/

const abasFiltro = document.querySelectorAll('.aba');
const listaDeLancamentos = document.querySelectorAll('.lancamento');

abasFiltro.forEach((aba) => {
  aba.addEventListener('click', () => {

    // Atualiza qual aba fica destacada
    abasFiltro.forEach((a) => a.classList.remove('aba-ativa'));
    aba.classList.add('aba-ativa');

    const filtroEscolhido = aba.getAttribute('data-filtro'); // "todas", "receita" ou "despesa"

    listaDeLancamentos.forEach((lancamento) => {
      const tipoDoLancamento = lancamento.getAttribute('data-tipo'); // "receita" ou "despesa"

      const deveAparecer = (filtroEscolhido === 'todas') || (filtroEscolhido === tipoDoLancamento);

      if (deveAparecer) {
        lancamento.classList.remove('lancamento-escondido');
      } else {
        lancamento.classList.add('lancamento-escondido');
      }
    });
  });
});
