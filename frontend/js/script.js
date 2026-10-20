let usuarioIdAtual = null;
let tokenAcessoAtual = null;

function chaveDeDadosDoUsuario(chave) {
  return usuarioIdAtual === null ? null : `${chave}:usuario-${usuarioIdAtual}`;
}

function lerDadoDoUsuario(chave) {
  const chaveCompleta = chaveDeDadosDoUsuario(chave);
  return chaveCompleta === null ? null : localStorage.getItem(chaveCompleta);
}

function salvarDadoDoUsuario(chave, valor) {
  const chaveCompleta = chaveDeDadosDoUsuario(chave);
  if (chaveCompleta === null) {
    throw new Error('É necessário entrar em uma conta para salvar esses dados.');
  }
  localStorage.setItem(chaveCompleta, valor);
}

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

const botoesMenu = document.querySelectorAll('.item-menu');
const telas = document.querySelectorAll('.tela');

// Quanto tempo o skeleton fica visível antes de "revelar" a tela de verdade
const DURACAO_SKELETON_MS = 500;

/*
  Pra saber se a tela nova deve "deslizar" entrando da direita ou da
  esquerda, precisamos saber a ORDEM das abas e qual estava ativa
  antes. Ex: indo de Resumo (índice 0) pra Planejamento (índice 2),
  o índice aumentou, então a entrada é "pela direita" — como se
  estivesse avançando. Voltando pro Resumo, entra "pela esquerda".
*/
const ORDEM_DAS_TELAS = ['tela-resumo', 'tela-movimentacoes', 'tela-planejamento'];
let indiceTelaAtual = 0; // Resumo é a tela inicial (índice 0)

botoesMenu.forEach((botao) => {
  botao.addEventListener('click', () => {
    const idTelaEscolhida = botao.getAttribute('data-tela');
    const indiceNovo = ORDEM_DAS_TELAS.indexOf(idTelaEscolhida);

    if (indiceNovo === indiceTelaAtual) return; // já está nessa aba, não faz nada

    const direcao = indiceNovo > indiceTelaAtual ? 'direita' : 'esquerda';
    indiceTelaAtual = indiceNovo;

    const telaEscolhida = document.getElementById(idTelaEscolhida);

    telas.forEach((tela) => tela.classList.remove('tela-ativa', 'anim-direita', 'anim-esquerda'));
    telaEscolhida.classList.add('tela-ativa', `anim-${direcao}`);

    // Sempre abre a aba nova "do zero", começando do topo — sem isso,
    // se a pessoa tivesse rolado bem pra baixo na aba anterior, a
    // aba nova já apareceria rolada também (fica estranho).
    telaEscolhida.scrollTop = 0;

    // Mostra o skeleton assim que a tela aparece...
    telaEscolhida.classList.add('tela-carregando');

    // ...e depois de um tempinho curto, tira ele e revela o conteúdo real.
    // (clearTimeout evita bug se a pessoa clicar rápido em várias abas seguidas)
    clearTimeout(telaEscolhida._temporizadorSkeleton);
    telaEscolhida._temporizadorSkeleton = setTimeout(() => {
      telaEscolhida.classList.remove('tela-carregando');
    }, DURACAO_SKELETON_MS);

    botoesMenu.forEach((b) => b.classList.remove('item-menu-ativo'));
    botao.classList.add('item-menu-ativo');

    // O botão flutuante (FAB) só faz sentido nas telas de Resumo e
    // Movimentações — na de Planejamento não tem lançamento pra criar.
    botaoFab.classList.toggle('botao-fab-escondido', idTelaEscolhida === 'tela-planejamento');
  });
});

/*
  ================================================
  PARTE 1.5 - BOTÃO FLUTUANTE (FAB) DE NOVO LANÇAMENTO
  ================================================

  Em vez de duplicar toda a lógica de abrir o formulário, a gente só
  "aperta" o botão normal de "+ Novo lançamento" por código quando o
  FAB é clicado. Assim, os dois botões continuam fazendo exatamente
  a mesma coisa, sem copiar e colar nada.
*/
const botaoFab = document.getElementById('botao-fab-novo-lancamento');

botaoFab.addEventListener('click', () => {
  document.getElementById('botao-novo-lancamento').click();
});


/*
  ================================================
  PARTE 2 - MODO PRIVADO (esconder TODOS os números)
  ================================================

  Antes, o ícone de olho só escondia o saldo. Agora ele ativa um
  "modo privado" que borra (efeito de desfoque) TODO número em
  dinheiro ou porcentagem do app de uma vez — saldo, receitas,
  despesas, categorias, metas, tudo.

  Como isso funciona: todo elemento que mostra um valor sensível
  tem a classe "valor-sensivel" no HTML. Aqui a gente só liga/
  desliga um atributo na tag <html> (data-privado="ativo"), e
  quem realmente aplica o desfoque é uma regra no style.css —
  mesmo truque que já usamos pro tema claro/escuro.
*/

const botaoOlho = document.getElementById('botao-olho');
const iconeOlho = document.getElementById('icone-olho');
const valorSaldoElemento = document.getElementById('valor-saldo');
let modoPrivadoAtivo = false;

botaoOlho.addEventListener('click', () => {
  modoPrivadoAtivo = !modoPrivadoAtivo;

  document.documentElement.setAttribute('data-privado', modoPrivadoAtivo ? 'ativo' : 'inativo');
  iconeOlho.classList.toggle('fa-eye', !modoPrivadoAtivo);
  iconeOlho.classList.toggle('fa-eye-slash', modoPrivadoAtivo);
});


/*
  ================================================
  PARTE 3 - FILTROS DA TELA DE MOVIMENTAÇÕES
  ================================================

  Importante: aqui a gente busca os ".lancamento" DE NOVO a cada
  clique (document.querySelectorAll dentro do addEventListener),
  em vez de guardar numa variável só uma vez lá em cima. Isso é
  necessário porque, quando adicionamos um lançamento novo pelo
  formulário, ele é criado depois que a página já carregou — se a
  lista fosse "fotografada" só uma vez no início, o item novo
  nunca seria filtrado.
*/

const abasFiltro = document.querySelectorAll('.aba');
const containerLancamentos = document.getElementById('container-lancamentos');
const estadoVazioLancamentos = document.getElementById('estado-vazio-lancamentos');
const campoBuscaLancamentos = document.getElementById('campo-busca-lancamentos');
const campoFiltroMes = document.getElementById('campo-filtro-mes');

/*
  Reconstrói as opções do seletor de mês com base nos meses que
  realmente aparecem nos lançamentos na tela (data-data="AAAA-MM-DD").
  Chamamos isso toda vez que um lançamento pode ter mudado de mês:
  ao carregar a página, criar, editar, excluir ou simular o próximo mês.
*/
function atualizarOpcoesFiltroMes() {
  const mesSelecionadoAntes = campoFiltroMes.value || 'todos';

  const mesesEncontrados = new Set();
  document.querySelectorAll('.lancamento[data-data]').forEach((lancamento) => {
    mesesEncontrados.add(lancamento.getAttribute('data-data').slice(0, 7)); // "AAAA-MM"
  });

  // Mais recente primeiro
  const mesesOrdenados = [...mesesEncontrados].sort().reverse();

  const opcoesHtml = ['<option value="todos">Todos os meses</option>']
    .concat(mesesOrdenados.map((chave) => `<option value="${chave}">${formatarMesEAno(chave)}</option>`))
    .join('');

  campoFiltroMes.innerHTML = opcoesHtml;

  // Mantém o mês que a pessoa já tinha escolhido, se ele ainda existir
  campoFiltroMes.value = mesesEncontrados.has(mesSelecionadoAntes) || mesSelecionadoAntes === 'todos'
    ? mesSelecionadoAntes
    : 'todos';
}

/*
  Estado vazio: olha quantos ".lancamento" estão realmente visíveis
  (sem a classe "lancamento-escondido", que o filtro usa) e decide
  se mostra a mensagem de "nenhum lançamento encontrado" ou a lista
  normal. Chamamos essa função sempre que algo pode ter mudado a
  quantidade de itens visíveis: trocar de filtro, excluir um
  lançamento, adicionar um novo.
*/
function atualizarEstadoVazioLancamentos() {
  const existemLancamentosVisiveis = document.querySelectorAll('.lancamento:not(.lancamento-escondido)').length > 0;

  containerLancamentos.style.display = existemLancamentosVisiveis ? '' : 'none';
  estadoVazioLancamentos.classList.toggle('estado-vazio-visivel', !existemLancamentosVisiveis);
}

/*
  Junta os dois filtros num lugar só: a aba escolhida (Todas/Receitas/
  Despesas) E o texto digitado na busca. Um lançamento só aparece se
  passar nos DOIS ao mesmo tempo. Chamamos essa função sempre que
  qualquer um dos dois critérios pode ter mudado — clique na aba,
  digitação na busca, ou um lançamento novo sendo criado/editado.
*/
function aplicarFiltrosMovimentacoes() {
  const filtroEscolhido = document.querySelector('.aba-ativa').getAttribute('data-filtro');
  const termoBusca = campoBuscaLancamentos.value.trim().toLowerCase();
  const mesEscolhido = campoFiltroMes.value;
  const listaAtual = document.querySelectorAll('.lancamento'); // busca atualizada!

  listaAtual.forEach((lancamento) => {
    const tipoDoLancamento = lancamento.getAttribute('data-tipo');
    const descricaoLancamento = lancamento.querySelector('.info-lancamento strong').textContent.toLowerCase();
    const mesDoLancamento = (lancamento.getAttribute('data-data') || '').slice(0, 7);

    const passaFiltroTipo = (filtroEscolhido === 'todas') || (filtroEscolhido === tipoDoLancamento);
    const passaBusca = termoBusca === '' || descricaoLancamento.includes(termoBusca);
    const passaMes = mesEscolhido === 'todos' || mesEscolhido === mesDoLancamento;

    lancamento.classList.toggle('lancamento-escondido', !(passaFiltroTipo && passaBusca && passaMes));
  });

  atualizarEstadoVazioLancamentos();
}

abasFiltro.forEach((aba) => {
  aba.addEventListener('click', () => {
    abasFiltro.forEach((a) => a.classList.remove('aba-ativa'));
    aba.classList.add('aba-ativa');
    aplicarFiltrosMovimentacoes();
  });
});

campoBuscaLancamentos.addEventListener('input', aplicarFiltrosMovimentacoes);
campoFiltroMes.addEventListener('change', aplicarFiltrosMovimentacoes);


/*
  ================================================
  PARTE 4 - ESTADO FINANCEIRO (os "dados" do app)
  ================================================

  Os totais começam zerados e são preenchidos pelo resumo do backend.
*/

let estadoFinanceiro = {
  receitas: 0,
  despesas: 0,
  saldo: 0,
};

// Transforma um número (ex: 1930) em texto de dinheiro (ex: "R$ 1.930,00")
function formatarMoeda(numero) {
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Faz o caminho inverso: pega um texto de dinheiro (ex: "- R$ 1.930,00")
// e devolve só o número (1930). Usamos isso na edição, pra ler o valor
// que já está escrito na tela e colocar pronto no formulário.
function paraNumero(textoMoeda) {
  const apenasDigitosEVirgula = textoMoeda.replace(/[^0-9,]/g, ''); // tira "R$", "-", espaços e pontos de milhar
  const comPontoDecimal = apenasDigitosEVirgula.replace(',', '.');
  return parseFloat(comPontoDecimal);
}

// Data de hoje no formato "AAAA-MM-DD", que é o que o <input type="date">
// usa. Serve de valor padrão pra lançamentos novos e pros antigos que
// foram salvos antes desse campo existir (ver construirNoLancamento).
function obterDataDeHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Mesma coisa, mas um mês à frente — usado pelo botão "Simular
// próximo mês" dos lançamentos recorrentes, pra eles caírem de
// verdade no mês seguinte quando filtrados.
function obterDataDoProximoMes() {
  const hoje = new Date();
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
  const ano = proximoMes.getFullYear();
  const mes = String(proximoMes.getMonth() + 1).padStart(2, '0');
  const dia = String(proximoMes.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

const NOMES_DOS_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Transforma "2025-09" em "Setembro de 2025", pra usar como texto
// das opções do filtro de mês.
function formatarMesEAno(chaveAnoMes) {
  const [ano, mes] = chaveAnoMes.split('-');
  const nomeMes = NOMES_DOS_MESES[parseInt(mes, 10) - 1];
  return `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)} de ${ano}`;
}

/*
  Anima um número subindo (ou descendo) suavemente de um valor pro
  outro, em vez de só "trocar" o texto de repente. Usa
  requestAnimationFrame, que é a forma correta de fazer animações
  em JavaScript (o navegador chama essa função ~60 vezes por
  segundo, sincronizado com a tela, pra não travar nada).
*/
function animarNumero(elemento, valorInicial, valorFinal, duracaoMs = 600) {
  const tempoInicio = performance.now();

  function passo(agora) {
    // "progresso" vai de 0 (começo) até 1 (fim da animação)
    const progresso = Math.min((agora - tempoInicio) / duracaoMs, 1);

    // easeOutQuad: faz a animação começar rápido e desacelerar no
    // final, fica mais natural do que uma velocidade constante
    const progressoSuave = 1 - (1 - progresso) * (1 - progresso);

    const valorAtual = valorInicial + (valorFinal - valorInicial) * progressoSuave;
    elemento.textContent = formatarMoeda(valorAtual);

    if (progresso < 1) {
      requestAnimationFrame(passo); // ainda não terminou, chama de novo no próximo quadro
    } else {
      elemento.textContent = formatarMoeda(valorFinal); // garante o valor certinho no final
    }
  }

  requestAnimationFrame(passo);
}

// Igual à de cima, mas pro gráfico donut (que usa número inteiro + CSS var)
function animarDonut(percentualInicial, percentualFinal, duracaoMs = 600) {
  const donut = document.getElementById('donut-grafico');
  const textoDonut = document.getElementById('donut-texto');
  const tempoInicio = performance.now();

  function passo(agora) {
    const progresso = Math.min((agora - tempoInicio) / duracaoMs, 1);
    const progressoSuave = 1 - (1 - progresso) * (1 - progresso);
    const valorAtual = Math.round(percentualInicial + (percentualFinal - percentualInicial) * progressoSuave);

    donut.style.setProperty('--percentual', valorAtual);
    textoDonut.textContent = valorAtual + '%';

    if (progresso < 1) {
      requestAnimationFrame(passo);
    }
  }

  requestAnimationFrame(passo);
}

// Repinta todos os lugares da tela que mostram Receitas/Despesas/Saldo,
// animando a transição do valor antigo pro novo.
// "estadoAntigo" é uma "foto" de como estava ANTES da mudança atual.
function atualizarResumoNaTela(estadoAntigo) {
  estadoFinanceiro.saldo = estadoFinanceiro.receitas - estadoFinanceiro.despesas;

  // Economia % = quanto sobrou em relação ao que entrou (regra de 3 simples)
  const economiaAntiga = estadoAntigo.receitas > 0
    ? Math.round((estadoAntigo.saldo / estadoAntigo.receitas) * 100)
    : 0;
  const economiaNova = estadoFinanceiro.receitas > 0
    ? Math.round((estadoFinanceiro.saldo / estadoFinanceiro.receitas) * 100)
    : 0;

  // Card de saldo (topo da Tela 1). Pode animar tranquilo mesmo no modo
  // privado: o desfoque é só visual (CSS), o texto por baixo pode mudar.
  animarNumero(valorSaldoElemento, estadoAntigo.saldo, estadoFinanceiro.saldo);

  // Mini-cards Receitas/Despesas
  animarNumero(document.getElementById('mini-total-receitas'), estadoAntigo.receitas, estadoFinanceiro.receitas);
  animarNumero(document.getElementById('mini-total-despesas'), estadoAntigo.despesas, estadoFinanceiro.despesas);

  // Card "Resumo do mês"
  animarNumero(document.getElementById('resumo-total-receitas'), estadoAntigo.receitas, estadoFinanceiro.receitas);
  animarNumero(document.getElementById('resumo-total-despesas'), estadoAntigo.despesas, estadoFinanceiro.despesas);
  animarNumero(document.getElementById('resumo-saldo'), estadoAntigo.saldo, estadoFinanceiro.saldo);

  // Gráfico donut
  animarDonut(economiaAntiga, economiaNova);

  // Gráfico de evolução do saldo (Ontem/Hoje mudam com os lançamentos
  // de verdade, então precisa redesenhar toda vez que algo muda)
  desenharGraficoEvolucaoSaldo();
}


/*
  ================================================
  PARTE 5 - MODAL GENÉRICO (abrir/fechar)
  ================================================
*/

const modalFundo = document.getElementById('modal-fundo');
const modalTitulo = document.getElementById('modal-titulo');
const modalCorpo = document.getElementById('modal-corpo');

// tituloTexto: aparece no topo do modal. htmlConteudo: o que vai dentro dele.
function abrirModal(tituloTexto, htmlConteudo) {
  modalTitulo.textContent = tituloTexto;
  modalCorpo.innerHTML = htmlConteudo;
  modalFundo.classList.remove('modal-escondido');
}

function fecharModal() {
  modalFundo.classList.add('modal-escondido');
}

document.getElementById('botao-fechar-modal').addEventListener('click', fecharModal);

// Clicar no fundo escuro (fora da caixa branca) também fecha o modal
modalFundo.addEventListener('click', (evento) => {
  if (evento.target === modalFundo) {
    fecharModal();
  }
});


/*
  ================================================
  PARTE 6 - TOAST (avisinho que aparece e some sozinho)
  ================================================
*/

const elementoToast = document.getElementById('toast');
let temporizadorToast = null;

function mostrarToast(mensagem) {
  elementoToast.textContent = mensagem;
  elementoToast.classList.add('toast-visivel');

  // Se já tinha um toast programado pra sumir, cancela ele
  // (evita bug de dois toasts brigando pra sumir em momentos diferentes)
  clearTimeout(temporizadorToast);

  temporizadorToast = setTimeout(() => {
    elementoToast.classList.remove('toast-visivel');
  }, 2500);
}


/*
  ================================================
  PARTE 6.1 - MENSAGENS DE ERRO NOS CAMPOS
  ================================================

  Em vez de só um toast genérico tipo "preencha os campos direito",
  mostra a mensagem embaixo do campo específico que está errado (e
  deixa a borda dele vermelha). O <span> da mensagem é criado na
  hora, na primeira vez que aquele campo precisa de um erro — não
  precisa existir um <span> vazio espalhado em todo formulário do
  HTML só esperando ser usado.
*/

// Valida um formato de e-mail simples (não cobre todo caso real de
// e-mail, só o suficiente pra pegar erro de digitação óbvio)
function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mostrarErroCampo(inputElemento, mensagem) {
  const campo = inputElemento.closest('.campo-formulario');
  if (!campo) return;

  campo.classList.add('campo-formulario-com-erro');

  let spanErro = campo.querySelector('.erro-campo');
  if (!spanErro) {
    spanErro = document.createElement('span');
    spanErro.className = 'erro-campo';
    campo.appendChild(spanErro);
  }
  spanErro.textContent = mensagem;
}

function limparErroCampo(inputElemento) {
  const campo = inputElemento.closest('.campo-formulario');
  if (!campo) return;

  campo.classList.remove('campo-formulario-com-erro');
  const spanErro = campo.querySelector('.erro-campo');
  if (spanErro) spanErro.remove();
}

// Limpa todos os erros de uma vez (chamado no começo de cada submit,
// pra não ficar empilhando erro antigo em cima de erro novo)
function limparErrosDoFormulario(formElemento) {
  formElemento.querySelectorAll('.campo-formulario-com-erro').forEach((campo) => {
    campo.classList.remove('campo-formulario-com-erro');
    const spanErro = campo.querySelector('.erro-campo');
    if (spanErro) spanErro.remove();
  });
}

// Assim que a pessoa começa a corrigir o campo errado, o erro some
// sozinho — não precisa esperar tentar enviar de novo pra sumir
function limparErroAoDigitar(inputElemento) {
  inputElemento.addEventListener('input', () => limparErroCampo(inputElemento));
}


/*
  ================================================
  PARTE 6.5 - LIMITES DE ORÇAMENTO POR CATEGORIA
  ================================================

  Cada categoria de despesa pode ter um limite mensal definido pela
  pessoa (ex: "Alimentação: R$ 500"). Guardamos esses limites num
  objeto simples no localStorage — só {categoria: valorLimite}.

  O "gasto atual" de cada categoria não é guardado separado: a gente
  sempre RECALCULA ele na hora, somando os lançamentos de despesa que
  já estão na tela. Assim nunca fica desatualizado, nem precisa
  lembrar de atualizar em dois lugares toda vez que algo muda.
*/

const CHAVE_LIMITES_CATEGORIA = 'meu-bolso:limites-categoria';

// Valores sugeridos pra quem nunca configurou nada ainda
const limitesPadrao = {
  'Moradia': 700,
  'Alimentação': 500,
  'Transporte': 300,
  'Lazer': 200,
  'Saúde': 200,
  'Outros': 300,
};

/*
  Categorias customizáveis: a pessoa pode criar, renomear (trocando
  ícone junto) e excluir categorias de despesa, em vez de ficar presa
  nas 6 que vêm prontas. Cada categoria guarda { nome, icone, cor } —
  "cor" é sempre uma das 6 cores já usadas no resto do app (ver
  PALETA_CORES_CATEGORIA), escolhida sozinha quando a categoria é
  criada, só pra garantir que sempre combina com o visual existente.

  CATEGORIAS_DE_DESPESA, corPorCategoria e iconesPorCategoria (esse
  último declarado mais abaixo, na PARTE 7) são os "mapas" que o
  resto do app já usava antes de categoria ser customizável — pra não
  precisar reescrever tudo que já lia deles, a gente mantém os MESMOS
  array/objetos e só esvazia + repreenche eles (recalcularCategorias),
  em vez de criar um novo com "=".
*/
const CHAVE_CATEGORIAS = 'meu-bolso:categorias';

const PALETA_CORES_CATEGORIA = ['moradia', 'alimentacao', 'transporte', 'lazer', 'saude', 'outros'];

// Ícones disponíveis pra escolher ao criar/editar uma categoria
const ICONES_DISPONIVEIS_CATEGORIA = [
  'fa-house', 'fa-cart-shopping', 'fa-gas-pump', 'fa-gamepad', 'fa-briefcase-medical',
  'fa-ellipsis', 'fa-plane', 'fa-graduation-cap', 'fa-dumbbell', 'fa-paw',
  'fa-gift', 'fa-mobile-screen', 'fa-piggy-bank', 'fa-utensils', 'fa-bus', 'fa-shirt',
];

const categoriasPadrao = [
  { nome: 'Moradia', icone: 'fa-house', cor: 'moradia' },
  { nome: 'Alimentação', icone: 'fa-cart-shopping', cor: 'alimentacao' },
  { nome: 'Transporte', icone: 'fa-gas-pump', cor: 'transporte' },
  { nome: 'Lazer', icone: 'fa-gamepad', cor: 'lazer' },
  { nome: 'Saúde', icone: 'fa-briefcase-medical', cor: 'saude' },
  { nome: 'Outros', icone: 'fa-ellipsis', cor: 'outros' },
];

function obterCategorias() {
  const salvas = JSON.parse(localStorage.getItem(CHAVE_CATEGORIAS));
  return (salvas && salvas.length > 0) ? salvas : categoriasPadrao;
}

function salvarCategorias(lista) {
  localStorage.setItem(CHAVE_CATEGORIAS, JSON.stringify(lista));
}

const CATEGORIAS_DE_DESPESA = [];
const corPorCategoria = {};

// Esvazia e repreenche CATEGORIAS_DE_DESPESA/corPorCategoria/
// iconesPorCategoria com as categorias atuais. Chamado uma vez no
// carregamento da página e de novo toda vez que uma categoria é
// criada, editada ou excluída.
function recalcularCategorias() {
  const categorias = obterCategorias();

  CATEGORIAS_DE_DESPESA.length = 0;
  Object.keys(corPorCategoria).forEach((chave) => delete corPorCategoria[chave]);
  Object.keys(iconesPorCategoria).forEach((chave) => delete iconesPorCategoria[chave]);

  categorias.forEach((categoria) => {
    CATEGORIAS_DE_DESPESA.push(categoria.nome);
    corPorCategoria[categoria.nome] = categoria.cor;
    iconesPorCategoria[categoria.nome] = categoria.icone;
  });

  iconesPorCategoria['Receita'] = 'fa-sack-dollar'; // categoria especial, não é de despesa
}

/*
  UI do card "Categorias" (Planejamento): lista + criar/editar/excluir.
  Usa o mesmo modal genérico e o mesmo padrão de "clique de novo pra
  confirmar" já usado em lançamento/meta/recorrente.
*/
const listaCategoriasElemento = document.getElementById('lista-categorias');

function renderizarListaCategorias() {
  const categorias = obterCategorias();

  listaCategoriasElemento.innerHTML = categorias.map((categoria, indice) => `
    <button type="button" class="item-categoria" data-indice="${indice}">
      <span class="icone-categoria icone-categoria-inline" data-cor="${categoria.cor}">
        <i class="fa-solid ${categoria.icone}"></i>
      </span>
      <span class="nome-item-categoria">${categoria.nome}</span>
      <span class="seta-lancamento">›</span>
    </button>
  `).join('');
}

function htmlOpcoesIconeCategoria(iconeSelecionado) {
  return ICONES_DISPONIVEIS_CATEGORIA.map((icone) => {
    const nomeLegivel = icone.replace('fa-', '').replace(/-/g, ' ');
    return `<option value="${icone}" ${icone === iconeSelecionado ? 'selected' : ''}>${nomeLegivel}</option>`;
  }).join('');
}

function htmlFormularioCategoria(categoriaExistente) {
  const iconeInicial = categoriaExistente ? categoriaExistente.icone : ICONES_DISPONIVEIS_CATEGORIA[0];

  return `
    <form id="form-categoria">
      <div class="campo-formulario">
        <label for="campo-nome-categoria">Nome</label>
        <input type="text" id="campo-nome-categoria" placeholder="Ex: Pet, Assinaturas..." value="${categoriaExistente ? categoriaExistente.nome : ''}" required>
      </div>

      <div class="campo-formulario">
        <label for="campo-icone-categoria">Ícone</label>
        <select id="campo-icone-categoria">${htmlOpcoesIconeCategoria(iconeInicial)}</select>
      </div>

      <button type="submit" class="botao-primario">${categoriaExistente ? 'Salvar alterações' : 'Criar categoria'}</button>
      ${categoriaExistente ? '<button type="button" class="botao-perigo" id="botao-excluir-categoria">Excluir categoria</button>' : ''}
    </form>
  `;
}

function abrirFormularioCategoria(categoriaExistente, indice) {
  abrirModal(categoriaExistente ? 'Editar categoria' : 'Nova categoria', htmlFormularioCategoria(categoriaExistente));

  document.getElementById('form-categoria').addEventListener('submit', (evento) => {
    evento.preventDefault();

    const nome = document.getElementById('campo-nome-categoria').value.trim();
    const icone = document.getElementById('campo-icone-categoria').value;

    if (!nome) {
      mostrarToast('Dá um nome pra categoria.');
      return;
    }

    const botaoSalvar = evento.target.querySelector('button[type="submit"]');

    comLoadingBotao(botaoSalvar, () => {
      const categorias = obterCategorias();

      if (categoriaExistente) {
        categorias[indice] = { ...categoriaExistente, nome, icone };
      } else {
        // Cor escolhida sozinha, ciclando pela paleta — não tem
        // seletor de cor pra manter o formulário simples
        const cor = PALETA_CORES_CATEGORIA[categorias.length % PALETA_CORES_CATEGORIA.length];
        categorias.push({ nome, icone, cor });
      }

      salvarCategorias(categorias);
      recalcularCategorias();
      renderizarListaCategorias();
      renderizarOrcamentoPorCategoria();
      fecharModal();
      mostrarToast(categoriaExistente ? 'Categoria atualizada! ✏️' : 'Categoria criada! 🎉');
    });
  });

  if (categoriaExistente) {
    const botaoExcluir = document.getElementById('botao-excluir-categoria');
    let aguardandoConfirmacao = false;

    botaoExcluir.addEventListener('click', () => {
      const categorias = obterCategorias();

      if (categorias.length <= 1) {
        mostrarToast('Precisa ter pelo menos uma categoria.');
        return;
      }

      if (!aguardandoConfirmacao) {
        aguardandoConfirmacao = true;
        botaoExcluir.textContent = 'Clique de novo para confirmar';
        botaoExcluir.classList.add('botao-perigo-confirmando');
        return;
      }

      categorias.splice(indice, 1);
      salvarCategorias(categorias);
      recalcularCategorias();
      renderizarListaCategorias();
      renderizarOrcamentoPorCategoria();
      fecharModal();
      mostrarToast('Categoria excluída. 🗑️');
    });
  }
}

listaCategoriasElemento.addEventListener('click', (evento) => {
  const item = evento.target.closest('.item-categoria');
  if (!item) return;

  const indice = Number(item.getAttribute('data-indice'));
  const categorias = obterCategorias();
  abrirFormularioCategoria(categorias[indice], indice);
});

document.getElementById('botao-nova-categoria').addEventListener('click', () => {
  abrirFormularioCategoria(null, null);
});

function obterLimitesCategoria() {
  const limitesSalvos = JSON.parse(lerDadoDoUsuario(CHAVE_LIMITES_CATEGORIA) || '{}');
  return { ...limitesPadrao, ...limitesSalvos };
}

function salvarLimiteCategoria(categoria, novoLimite) {
  const limites = obterLimitesCategoria();
  limites[categoria] = novoLimite;
  salvarDadoDoUsuario(CHAVE_LIMITES_CATEGORIA, JSON.stringify(limites));
}

// Soma todos os lançamentos de despesa já exibidos na tela que
// pertencem a uma categoria específica
function calcularGastoPorCategoria(categoria) {
  let total = 0;

  document.querySelectorAll('.lancamento[data-tipo="despesa"]').forEach((item) => {
    const categoriaDoItem = item.querySelector('.categoria-lancamento').textContent;
    if (categoriaDoItem === categoria) {
      total += paraNumero(item.querySelector('.valor-negativo').textContent);
    }
  });

  return total;
}

const listaOrcamentoCategorias = document.getElementById('lista-orcamento-categorias');

// Redesenha o card inteiro de "Limites por categoria", com a barra de
// progresso de cada uma já na cor certa (normal / alerta / estourado)
function renderizarOrcamentoPorCategoria() {
  const limites = obterLimitesCategoria();

  listaOrcamentoCategorias.innerHTML = CATEGORIAS_DE_DESPESA.map((categoria) => {
    const gasto = calcularGastoPorCategoria(categoria);
    const limite = limites[categoria] || 0;
    const porcentagem = limite > 0 ? Math.round((gasto / limite) * 100) : 0;
    const estourou = limite > 0 && gasto > limite;
    const quaseEstourando = !estourou && porcentagem >= 80;

    let classeBarra = '';
    if (estourou) classeBarra = 'barra-progresso-estourada';
    else if (quaseEstourando) classeBarra = 'barra-progresso-alerta';

    return `
      <div class="linha-orcamento-categoria">
        <div class="linha-orcamento-categoria-topo">
          <span class="icone-categoria icone-categoria-inline" data-cor="${corPorCategoria[categoria]}">
            <i class="fa-solid ${iconesPorCategoria[categoria]}"></i>
          </span>
          <span class="nome-orcamento-categoria">${categoria}</span>
          <span class="valor-sensivel valor-gasto-categoria ${estourou ? 'valor-negativo' : ''}">${formatarMoeda(gasto)}</span>
        </div>
        <div class="barra-progresso">
          <div class="barra-progresso-preenchida ${classeBarra}" data-cor="${corPorCategoria[categoria]}" style="width: ${Math.min(porcentagem, 100)}%;"></div>
        </div>
        <div class="linha-orcamento-categoria-rodape">
          <span class="rotulo">${porcentagem}% usado</span>
          <label class="editar-limite">
            Limite: R$
            <input type="number" min="0" step="10" value="${limite}" data-categoria="${categoria}" class="campo-limite-categoria">
          </label>
        </div>
      </div>
    `;
  }).join('');
}

// Quando a pessoa muda o valor do limite de uma categoria, salva e
// repinta tudo (a barra pode mudar de cor na hora, por exemplo)
listaOrcamentoCategorias.addEventListener('change', (evento) => {
  if (!evento.target.classList.contains('campo-limite-categoria')) return;

  const categoria = evento.target.getAttribute('data-categoria');
  const novoLimite = parseFloat(evento.target.value) || 0;

  salvarLimiteCategoria(categoria, novoLimite);
  renderizarOrcamentoPorCategoria();
});

// Verifica se uma categoria passou do limite e, se sim, devolve o
// texto do aviso (ou null se estiver tudo normal). Usado na hora de
// criar um lançamento novo, pra avisar a pessoa na hora.
function verificarLimiteExcedido(categoria) {
  const limites = obterLimitesCategoria();
  const limite = limites[categoria] || 0;
  const gastoAtual = calcularGastoPorCategoria(categoria);

  if (limite > 0 && gastoAtual > limite) {
    return `⚠️ Você passou do limite de ${categoria} (${formatarMoeda(limite)})`;
  }
  return null;
}

/*
  ------------------------------------------------
  Orçamento do MÊS INTEIRO (card "Orçamento do mês")
  ------------------------------------------------
  Mesma ideia do orçamento por categoria, só que somando TODAS as
  despesas de uma vez, não só de uma categoria. Antes esse card tinha
  números fixos de exemplo (inconsistente com o card de categorias
  logo abaixo, que já usava dado real) — agora os dois funcionam do
  mesmo jeito.
*/

const CHAVE_ORCAMENTO_MENSAL = 'meu-bolso:orcamento-mensal';
const ORCAMENTO_MENSAL_PADRAO = 5000;

const campoOrcamentoMensal = document.getElementById('campo-orcamento-mensal');
const orcamentoMensalRealizado = document.getElementById('orcamento-mensal-realizado');
const orcamentoMensalRestante = document.getElementById('orcamento-mensal-restante');
const orcamentoMensalBarra = document.getElementById('orcamento-mensal-barra');

function obterOrcamentoMensal() {
  const valorSalvo = lerDadoDoUsuario(CHAVE_ORCAMENTO_MENSAL);
  return valorSalvo !== null ? parseFloat(valorSalvo) : ORCAMENTO_MENSAL_PADRAO;
}

function calcularTotalDespesas() {
  let total = 0;
  document.querySelectorAll('.lancamento[data-tipo="despesa"]').forEach((item) => {
    total += paraNumero(item.querySelector('.valor-negativo').textContent);
  });
  return total;
}

function renderizarOrcamentoMensal() {
  const orcamento = obterOrcamentoMensal();
  const realizado = calcularTotalDespesas();
  const restante = orcamento - realizado;
  const porcentagem = orcamento > 0 ? Math.round((realizado / orcamento) * 100) : 0;

  campoOrcamentoMensal.value = orcamento;
  orcamentoMensalRealizado.textContent = formatarMoeda(realizado);
  orcamentoMensalRestante.textContent = formatarMoeda(restante);
  orcamentoMensalRestante.classList.toggle('valor-positivo', restante >= 0);
  orcamentoMensalRestante.classList.toggle('valor-negativo', restante < 0);

  orcamentoMensalBarra.style.width = Math.min(porcentagem, 100) + '%';
  orcamentoMensalBarra.classList.remove('barra-progresso-verde', 'barra-progresso-alerta', 'barra-progresso-estourada');
  if (restante < 0) {
    orcamentoMensalBarra.classList.add('barra-progresso-estourada');
  } else if (porcentagem >= 80) {
    orcamentoMensalBarra.classList.add('barra-progresso-alerta');
  } else {
    orcamentoMensalBarra.classList.add('barra-progresso-verde');
  }
}

campoOrcamentoMensal.addEventListener('change', () => {
  const novoValor = parseFloat(campoOrcamentoMensal.value) || 0;
  salvarDadoDoUsuario(CHAVE_ORCAMENTO_MENSAL, novoValor);
  renderizarOrcamentoMensal();
});


/*
  ================================================
  PARTE 6.6 - LANÇAMENTOS RECORRENTES
  ================================================

  Uma "regra recorrente" é só um molde (tipo, descrição, categoria,
  valor) guardado separado dos lançamentos do mês. Ela não aparece
  na lista de Movimentações por si só — só quando a pessoa aperta
  "Simular próximo mês" (ou, no mundo real com back-end, quando o
  servidor detecta que virou o mês) é que um lançamento de verdade é
  criado a partir dela.
*/

const CHAVE_RECORRENTES = 'meu-bolso:lancamentos-recorrentes';
const listaRecorrentesElemento = document.getElementById('lista-recorrentes');
const estadoVazioRecorrentes = document.getElementById('estado-vazio-recorrentes');

function obterRegrasRecorrentes() {
  return JSON.parse(lerDadoDoUsuario(CHAVE_RECORRENTES) || '[]');
}

function salvarRegrasRecorrentes(regras) {
  salvarDadoDoUsuario(CHAVE_RECORRENTES, JSON.stringify(regras));
}

// Guarda uma nova regra (chamada quando a pessoa marca "Repetir
// todo mês" ao criar um lançamento)
function registrarRegraRecorrente(regra) {
  const regras = obterRegrasRecorrentes();
  regras.push({ ...regra, id: Date.now() });
  salvarRegrasRecorrentes(regras);
  renderizarRecorrentes();
}

function renderizarRecorrentes() {
  const regras = obterRegrasRecorrentes();

  estadoVazioRecorrentes.classList.toggle('estado-vazio-recorrentes-visivel', regras.length === 0);

  listaRecorrentesElemento.innerHTML = regras.map((regra) => {
    const nomeIcone = iconesPorCategoria[regra.categoria] || 'fa-ellipsis';
    const prefixoValor = regra.tipo === 'receita' ? '' : '- ';

    return `
      <div class="item-recorrente">
        <div class="info-item-recorrente">
          <strong><i class="fa-solid ${nomeIcone}"></i> ${regra.descricao}</strong>
          <span>${regra.categoria} · ${prefixoValor}${formatarMoeda(regra.valor)} / mês</span>
        </div>
        <button type="button" class="botao-excluir-recorrente" data-id="${regra.id}" aria-label="Parar de repetir">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
  }).join('');
}

// OBS: a primeira chamada de renderizarRecorrentes() (e também de
// renderizarOrcamentoPorCategoria()) só acontece mais abaixo, depois
// que iconesPorCategoria existir (ele é usado lá dentro) — ver o
// final da PARTE 7.

// Delegação de evento: clicar no "lixeirinha" de qualquer regra
// (antigas ou criadas depois) remove ela da lista
listaRecorrentesElemento.addEventListener('click', (evento) => {
  const botao = evento.target.closest('.botao-excluir-recorrente');
  if (!botao) return;

  const idParaRemover = Number(botao.getAttribute('data-id'));
  const regras = obterRegrasRecorrentes().filter((regra) => regra.id !== idParaRemover);

  salvarRegrasRecorrentes(regras);
  renderizarRecorrentes();
  mostrarToast('Lançamento recorrente removido.');
});

// Botão "Simular próximo mês": gera, de uma vez, um lançamento novo
// pra cada regra recorrente cadastrada. Como o app ainda não tem
// back-end nem data real avançando sozinha, esse botão existe pra
// mostrar a lógica funcionando sem precisar esperar um mês de
// verdade passar.
document.getElementById('botao-simular-mes').addEventListener('click', async () => {
  const regras = obterRegrasRecorrentes();

  if (regras.length === 0) {
    mostrarToast('Nenhum lançamento recorrente cadastrado ainda.');
    return;
  }

  const dataDoProximoMes = obterDataDoProximoMes();

  let gerados = 0;
  try {
    for (const regra of regras) {
      const lancamento = {
        tipo: regra.tipo,
        descricao: regra.descricao,
        categoria: regra.categoria,
        valor: regra.valor,
        recorrente: true,
        data: dataDoProximoMes,
      };
      await salvarTransacaoBackend(lancamento);
      adicionarLancamento(lancamento);
      gerados += 1;
    }
  } catch (erro) {
    console.error('Erro ao gerar lançamentos recorrentes:', erro);
    mostrarToast(`Não foi possível gerar todos os lançamentos (${gerados}/${regras.length}).`);
    return;
  }

  await carregarCategoriasBackend();
  atualizarOpcoesFiltroMes();
  mostrarToast(`${gerados} lançamento(s) recorrente(s) gerado(s) para o próximo mês! 🔁`);
});


// Guarda a instância do gráfico e um ponto inicial neutro; ambos precisam
// existir antes da PARTE 7, que pode redesenhar o gráfico.
let instanciaGraficoEvolucao = null;

const evolucaoSaldoExemplo = {
  // Dados fictícios anteriores: dias ['Qui', 'Sex', 'Sáb', 'Dom', 'Seg'],
  // valores [3850, 4200, 3980, 4450, 4100].
  dias: [],
  valores: [0],
};

/*
  ================================================
  PARTE 7 - NOVO LANÇAMENTO (formulário + salvar + listar)
  ================================================
*/

// Ícone por categoria. Preenchido por recalcularCategorias() (PARTE
// 6.5, mais acima) a partir das categorias customizáveis da pessoa —
// fica vazio até essa função rodar, lá no fim da PARTE 7.
const iconesPorCategoria = {};

const listaHoje = document.getElementById('lista-hoje');
const API_BASE_URL = window.location.protocol === 'https:'
  ? `${window.location.origin}/api`
  : `http://${window.location.hostname || 'localhost'}:8000/api`;
let categoriasDoMes = [];

function cabecalhosAutenticados(headers = {}) {
  if (!tokenAcessoAtual) {
    throw new Error('Entre na sua conta para acessar esses dados.');
  }

  return { ...headers, Authorization: `Bearer ${tokenAcessoAtual}` };
}

// Monta (mas NÃO insere na página ainda) o <li> de um lançamento.
// Reaproveitada tanto pra criar um lançamento novo quanto pra
// reconstruir um lançamento editado.
function construirNoLancamento(dados) {
  const item = document.createElement('li');
  item.className = 'lancamento';
  item.setAttribute('data-tipo', dados.tipo);
  // Lançamentos salvos antes desse campo existir não têm "data" —
  // nesse caso, assume hoje, só pra não sumir do filtro de mês.
  item.setAttribute('data-data', dados.data || obterDataDeHoje());

  const nomeIcone = iconesPorCategoria[dados.categoria] || 'fa-ellipsis';
  const classeIcone = dados.tipo === 'receita' ? 'icone-receita' : 'icone-despesa';
  const classeValor = dados.tipo === 'receita' ? 'valor-positivo' : 'valor-negativo';
  const prefixoValor = dados.tipo === 'receita' ? '' : '- ';

  // Selo de "recorrente" (ícone de repetir) ao lado da descrição,
  // só pra deixar claro de relance que esse lançamento se repete
  // todo mês sozinho, sem precisar abrir ele pra descobrir.
  const seloRecorrente = dados.recorrente
    ? '<i class="fa-solid fa-rotate icone-recorrente" title="Lançamento recorrente"></i>'
    : '';

  item.innerHTML = `
    <span class="icone-lancamento ${classeIcone}"><i class="fa-solid ${nomeIcone}"></i></span>
    <div class="info-lancamento">
      <strong>${dados.descricao}${seloRecorrente}</strong>
      <span class="categoria-lancamento">${dados.categoria}</span>
    </div>
    <strong class="${classeValor} valor-sensivel">${prefixoValor}${formatarMoeda(dados.valor)}</strong>
    <span class="seta-lancamento">›</span>
  `;

  return item;
}

// Cria o <li> de um lançamento novo e coloca no topo da lista de "Hoje"
function criarElementoLancamento(dados) {
  const item = construirNoLancamento(dados);
  listaHoje.prepend(item); // "prepend" coloca no TOPO da lista, não no final
}

// Junta: cria o elemento na tela e atualiza os totais.
function adicionarLancamento(dados) {
  criarElementoLancamento(dados);
  aplicarFiltrosMovimentacoes(); // o item novo precisa respeitar o filtro/busca atual

  // "Fotografa" os valores atuais ANTES de mudar — é esse retrato que
  // vai ser o ponto de partida da animação dos números.
  const estadoAntigo = { ...estadoFinanceiro };

  if (dados.tipo === 'receita') {
    estadoFinanceiro.receitas += dados.valor;
  } else {
    estadoFinanceiro.despesas += dados.valor;
  }
  atualizarResumoNaTela(estadoAntigo);

  // Limites de orçamento só fazem sentido pra despesas (não tem
  // "limite de receita"), então só repintamos os cards nesse caso.
  if (dados.tipo === 'despesa') {
    renderizarOrcamentoPorCategoria();
    renderizarOrcamentoMensal();
  }

}

async function salvarTransacaoBackend(dados) {
  const resposta = await fetch(`${API_BASE_URL}/transacoes`, {
    method: 'POST',
    headers: cabecalhosAutenticados({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      categoria: dados.tipo === 'receita' ? 'Salário' : dados.categoria,
      descricao: dados.descricao,
      valor: dados.valor,
      tipo: dados.tipo,
      data: dados.data || obterDataDeHoje(),
    }),
  });
  await lerRespostaApi(resposta, 'Não foi possível salvar o lançamento.');
}

// HTML do formulário que aparece dentro do modal
function htmlFormularioNovoLancamento() {
  return `
    <form id="form-novo-lancamento" novalidate>
      <div class="campo-formulario">
        <label>Tipo</label>
        <div class="grupo-tipo">
          <label class="opcao-tipo">
            <input type="radio" name="tipo" value="despesa" checked> Despesa
          </label>
          <label class="opcao-tipo">
            <input type="radio" name="tipo" value="receita"> Receita
          </label>
        </div>
      </div>

      <div class="campo-formulario">
        <label for="campo-descricao">Descrição</label>
        <input type="text" id="campo-descricao" placeholder="Ex: Cinema" required>
      </div>

      <div class="campo-formulario">
        <label for="campo-categoria">Categoria</label>
        <select id="campo-categoria">
          ${obterCategorias().map((categoria) => `<option>${categoria.nome}</option>`).join('')}
        </select>
      </div>

      <div class="campo-formulario">
        <label for="campo-valor">Valor (R$)</label>
        <input type="number" id="campo-valor" placeholder="0,00" step="0.01" min="0.01" required>
      </div>

      <div class="campo-formulario">
        <label for="campo-data-lancamento">Data</label>
        <input type="date" id="campo-data-lancamento" value="${obterDataDeHoje()}" required>
      </div>

      <div class="campo-formulario">
        <label class="opcao-checkbox">
          <input type="checkbox" id="campo-recorrente">
          <span><i class="fa-solid fa-rotate"></i> Repetir esse lançamento todo mês</span>
        </label>
      </div>

      <button type="submit" class="botao-primario">Salvar lançamento</button>
    </form>
  `;
}

document.getElementById('botao-novo-lancamento').addEventListener('click', () => {
  abrirModal('Novo lançamento', htmlFormularioNovoLancamento());

  // O formulário só existe no HTML depois que abrirModal() o inseriu,
  // então o addEventListener dele tem que ficar AQUI dentro.
  const campoNovoDescricao = document.getElementById('campo-descricao');
  const campoNovoValor = document.getElementById('campo-valor');
  limparErroAoDigitar(campoNovoDescricao);
  limparErroAoDigitar(campoNovoValor);

  document.getElementById('form-novo-lancamento').addEventListener('submit', async (evento) => {
    evento.preventDefault(); // impede a página de recarregar (comportamento padrão de forms)
    limparErrosDoFormulario(evento.target);

    const tipoEscolhido = document.querySelector('input[name="tipo"]:checked').value;
    const descricao = campoNovoDescricao.value.trim();
    const categoria = tipoEscolhido === 'receita' ? 'Receita' : document.getElementById('campo-categoria').value;
    const valor = parseFloat(campoNovoValor.value);
    const recorrente = document.getElementById('campo-recorrente').checked;
    const data = document.getElementById('campo-data-lancamento').value || obterDataDeHoje();
    let temErro = false;

    if (!descricao) {
      mostrarErroCampo(campoNovoDescricao, 'Digite uma descrição.');
      temErro = true;
    }

    if (!valor || valor <= 0) {
      mostrarErroCampo(campoNovoValor, 'Digite um valor maior que zero.');
      temErro = true;
    }

    if (temErro) return;

    const botaoSalvar = evento.target.querySelector('button[type="submit"]');
    const textoOriginalBotao = botaoSalvar.innerHTML;
    botaoSalvar.disabled = true;
    botaoSalvar.innerHTML = '<i class="fa-solid fa-spinner icone-carregando"></i>';

    try {
      const lancamento = { tipo: tipoEscolhido, descricao, categoria, valor, recorrente, data };
      await salvarTransacaoBackend(lancamento);
      adicionarLancamento(lancamento);
      await carregarCategoriasBackend();

      if (recorrente) {
        registrarRegraRecorrente({ tipo: tipoEscolhido, descricao, categoria, valor });
      }

      atualizarOpcoesFiltroMes();
      fecharModal();

      // Se esse lançamento fez a categoria passar do limite definido, o
      // aviso de orçamento é mais importante que o toast de sucesso comum
      // — por isso ele toma o lugar do "Lançamento adicionado!" nesse caso.
      const avisoDeLimite = tipoEscolhido === 'despesa' ? verificarLimiteExcedido(categoria) : null;
      mostrarToast(avisoDeLimite || 'Lançamento adicionado! 🎉');
    } catch (erro) {
      console.error('Erro ao salvar transação no backend:', erro);
      mostrarToast('Não foi possível salvar o lançamento. Verifique sua conexão com o servidor.');
    } finally {
      botaoSalvar.disabled = false;
      botaoSalvar.innerHTML = textoOriginalBotao;
    }
  });
});

// Primeira pintura dos cards vazios; os dados da conta são carregados após o login.
renderizarOrcamentoPorCategoria();
renderizarOrcamentoMensal();
renderizarRecorrentes();
atualizarOpcoesFiltroMes(); // monta o seletor de mês com os meses que já existem
renderizarListaCategorias();


/*
  ================================================
  PARTE 7.5 - EDITAR E EXCLUIR LANÇAMENTO
  ================================================

  Em vez de colocar um addEventListener em cada <li> (o que não
  funcionaria pros lançamentos criados depois), usamos "delegação
  de evento": escutamos o clique na TELA INTEIRA de Movimentações,
  e perguntamos "esse clique foi dentro de algum .lancamento?".
  Isso funciona pra qualquer item, antigo ou novo, sem precisar
  anexar um listener em cada um.

  OBS: isso também funciona pros lançamentos que já vinham prontos
  no HTML (Salário, Supermercado etc) — a gente lê os dados deles
  direto do que está escrito na tela (texto, categoria, classe).
*/

const telaMovimentacoes = document.getElementById('tela-movimentacoes');

// Monta o formulário de edição, já preenchido com os dados atuais do item
function htmlFormularioEditarLancamento(dadosAtuais) {
  const opcoesCategoria = obterCategorias()
    .map((cat) => `<option ${cat.nome === dadosAtuais.categoria ? 'selected' : ''}>${cat.nome}</option>`)
    .join('');

  return `
    <form id="form-editar-lancamento" novalidate>
      <div class="campo-formulario">
        <label>Tipo</label>
        <div class="grupo-tipo">
          <label class="opcao-tipo">
            <input type="radio" name="tipo-edicao" value="despesa" ${dadosAtuais.tipo === 'despesa' ? 'checked' : ''}> Despesa
          </label>
          <label class="opcao-tipo">
            <input type="radio" name="tipo-edicao" value="receita" ${dadosAtuais.tipo === 'receita' ? 'checked' : ''}> Receita
          </label>
        </div>
      </div>

      <div class="campo-formulario">
        <label for="campo-descricao-edicao">Descrição</label>
        <input type="text" id="campo-descricao-edicao" value="${dadosAtuais.descricao}" required>
      </div>

      <div class="campo-formulario">
        <label for="campo-categoria-edicao">Categoria</label>
        <select id="campo-categoria-edicao">${opcoesCategoria}</select>
      </div>

      <div class="campo-formulario">
        <label for="campo-valor-edicao">Valor (R$)</label>
        <input type="number" id="campo-valor-edicao" value="${dadosAtuais.valor}" step="0.01" min="0.01" required>
      </div>

      <div class="campo-formulario">
        <label for="campo-data-edicao">Data</label>
        <input type="date" id="campo-data-edicao" value="${dadosAtuais.data}" required>
      </div>

      <button type="submit" class="botao-primario">Salvar alterações</button>
      <button type="button" class="botao-perigo" id="botao-excluir-lancamento">Excluir lançamento</button>
    </form>
  `;
}

telaMovimentacoes.addEventListener('click', (evento) => {
  // .closest() sobe pelos "pais" do elemento clicado até achar um .lancamento.
  // Se a pessoa clicou em qualquer lugar fora de um lançamento, closest()
  // devolve null, e a gente simplesmente ignora o clique.
  const li = evento.target.closest('.lancamento');
  if (!li) return;

  // Lê os dados ATUAIS direto do que está escrito na tela
  const dadosAtuais = {
    tipo: li.getAttribute('data-tipo'),
    descricao: li.querySelector('.info-lancamento strong').textContent,
    categoria: li.querySelector('.categoria-lancamento').textContent,
    valor: paraNumero(li.querySelector('.valor-positivo, .valor-negativo').textContent),
    recorrente: li.querySelector('.icone-recorrente') !== null,
    data: li.getAttribute('data-data') || obterDataDeHoje(),
  };

  abrirModal('Editar lançamento', htmlFormularioEditarLancamento(dadosAtuais));

  const campoEditarDescricao = document.getElementById('campo-descricao-edicao');
  const campoEditarValor = document.getElementById('campo-valor-edicao');
  limparErroAoDigitar(campoEditarDescricao);
  limparErroAoDigitar(campoEditarValor);

  // --- Salvar alterações ---
  document.getElementById('form-editar-lancamento').addEventListener('submit', (eventoSubmit) => {
    eventoSubmit.preventDefault();
    limparErrosDoFormulario(eventoSubmit.target);

    const tipoNovo = document.querySelector('input[name="tipo-edicao"]:checked').value;
    const descricaoNova = campoEditarDescricao.value.trim();
    const categoriaNova = tipoNovo === 'receita' ? 'Receita' : document.getElementById('campo-categoria-edicao').value;
    const valorNovo = parseFloat(campoEditarValor.value);
    const dataNova = document.getElementById('campo-data-edicao').value || dadosAtuais.data;
    let temErro = false;

    if (!descricaoNova) {
      mostrarErroCampo(campoEditarDescricao, 'Digite uma descrição.');
      temErro = true;
    }

    if (!valorNovo || valorNovo <= 0) {
      mostrarErroCampo(campoEditarValor, 'Digite um valor maior que zero.');
      temErro = true;
    }

    if (temErro) return;

    const botaoSalvarEdicao = eventoSubmit.target.querySelector('button[type="submit"]');

    comLoadingBotao(botaoSalvarEdicao, () => {
      const estadoAntigo = { ...estadoFinanceiro };

      // Primeiro desfaz o efeito do valor ANTIGO...
      if (dadosAtuais.tipo === 'receita') {
        estadoFinanceiro.receitas -= dadosAtuais.valor;
      } else {
        estadoFinanceiro.despesas -= dadosAtuais.valor;
      }

      // ...depois aplica o efeito do valor NOVO
      if (tipoNovo === 'receita') {
        estadoFinanceiro.receitas += valorNovo;
      } else {
        estadoFinanceiro.despesas += valorNovo;
      }

      // Troca o <li> antigo por um novo, construído com os dados atualizados,
      // mantendo a mesma posição na lista (replaceWith faz isso por nós)
      const noAtualizado = construirNoLancamento({
        tipo: tipoNovo,
        descricao: descricaoNova,
        categoria: categoriaNova,
        valor: valorNovo,
        recorrente: dadosAtuais.recorrente,
        data: dataNova,
      });
      li.replaceWith(noAtualizado);

      atualizarResumoNaTela(estadoAntigo);
      renderizarOrcamentoPorCategoria();
      renderizarOrcamentoMensal();
      atualizarOpcoesFiltroMes();
      aplicarFiltrosMovimentacoes();
      fecharModal();
      mostrarToast('Lançamento atualizado! ✏️');
    });
  });

  // --- Excluir lançamento (pede confirmação com um segundo clique) ---
  const botaoExcluir = document.getElementById('botao-excluir-lancamento');
  let aguardandoConfirmacao = false;

  botaoExcluir.addEventListener('click', () => {
    if (!aguardandoConfirmacao) {
      // Primeiro clique: só avisa, ainda não exclui nada
      aguardandoConfirmacao = true;
      botaoExcluir.textContent = 'Clique de novo para confirmar';
      botaoExcluir.classList.add('botao-perigo-confirmando');
      return;
    }

    // Segundo clique: agora sim exclui de verdade
    const estadoAntigo = { ...estadoFinanceiro };

    if (dadosAtuais.tipo === 'receita') {
      estadoFinanceiro.receitas -= dadosAtuais.valor;
    } else {
      estadoFinanceiro.despesas -= dadosAtuais.valor;
    }

    li.remove();
    atualizarResumoNaTela(estadoAntigo);
    renderizarOrcamentoPorCategoria();
    renderizarOrcamentoMensal();
    atualizarOpcoesFiltroMes();
    atualizarEstadoVazioLancamentos(); // pode ter sido o último item da lista
    fecharModal();
    mostrarToast('Lançamento excluído. 🗑️');
  });
});


/*
  ================================================
  PARTE 8 - "VER TODAS" (categorias e metas) + RELATÓRIOS
  ================================================

  Esses modais, por enquanto, só reorganizam dados que já existem
  na própria tela (categorias) ou usam mais 2 metas de exemplo.
  Quando o back-end existir, a ideia é a mesma: só troca de onde
  vem a lista (em vez de fixo aqui no JS, viria de um fetch).
*/

function criarItemCategoria(categoria, totalGastos) {
  const percentual = totalGastos > 0 ? (categoria.total / totalGastos) * 100 : 0;
  const nome = categoria.categoria;
  const categoriaNormalizada = CATEGORIAS_DE_DESPESA.includes(nome) ? nome : 'Outros';
  const item = document.createElement('li');
  item.className = 'item-categoria';

  const icone = document.createElement('span');
  icone.className = 'icone-categoria';
  icone.dataset.cor = corPorCategoria[categoriaNormalizada];
  const elementoIcone = document.createElement('i');
  elementoIcone.className = `fa-solid ${iconesPorCategoria[categoriaNormalizada] || iconesPorCategoria.Outros}`;
  icone.append(elementoIcone);

  const informacoes = document.createElement('div');
  informacoes.className = 'info-categoria';
  const linha = document.createElement('div');
  linha.className = 'linha-categoria-topo';
  const nomeElemento = document.createElement('span');
  nomeElemento.textContent = nome;
  const valorElemento = document.createElement('span');
  valorElemento.className = 'valor-sensivel';
  valorElemento.textContent = formatarMoeda(categoria.total);
  linha.append(nomeElemento, valorElemento);

  const barra = document.createElement('div');
  barra.className = 'barra-progresso';
  const preenchimento = document.createElement('div');
  preenchimento.className = 'barra-progresso-preenchida';
  preenchimento.dataset.cor = corPorCategoria[categoriaNormalizada];
  preenchimento.style.width = `${percentual}%`;
  barra.append(preenchimento);
  informacoes.append(linha, barra);

  const percentualElemento = document.createElement('span');
  percentualElemento.className = 'porcentagem-categoria valor-sensivel';
  percentualElemento.textContent = `${Math.round(percentual)}%`;
  item.append(icone, informacoes, percentualElemento);
  return item;
}

function renderizarCategoriasGastos(categorias, lista) {
  lista.replaceChildren();

  if (categorias.length === 0) {
    const vazio = document.createElement('li');
    vazio.className = 'estado-vazio-categorias';
    vazio.textContent = 'Nenhuma despesa registrada neste mês.';
    lista.append(vazio);
    return;
  }

  const totalGastos = categorias.reduce((total, categoria) => total + categoria.total, 0);
  categorias.forEach((categoria) => {
    lista.append(criarItemCategoria(categoria, totalGastos));
  });
}

document.getElementById('link-ver-todas-categorias').addEventListener('click', (evento) => {
  evento.preventDefault(); // link <a> não deve navegar de verdade

  abrirModal('Todas as categorias', '<ul id="lista-modal-categorias" class="lista-categorias"></ul>');
  renderizarCategoriasGastos(categoriasDoMes, document.getElementById('lista-modal-categorias'));
});

/*
  ================================================
  METAS FINANCEIRAS (criar / editar / excluir)
  ================================================

  Antes só existia UMA meta, fixa no HTML. Agora as metas viram dados
  de verdade: um array guardado no localStorage, que a pessoa pode
  criar, editar e excluir — igual já fizemos com lançamentos e
  lançamentos recorrentes. A primeira meta do array é a que aparece
  em destaque no card da Tela 3; todas aparecem no modal "Ver todas".
*/

const CHAVE_METAS = 'meu-bolso:metas';

const metasPadrao = [];

function obterMetas() {
  const metasSalvas = lerDadoDoUsuario(CHAVE_METAS);

  if (metasSalvas === null) {
    return metasPadrao;
  }

  return JSON.parse(metasSalvas);
}

function salvarMetas(metas) {
  salvarDadoDoUsuario(CHAVE_METAS, JSON.stringify(metas));
}

const containerMetaPrincipal = document.getElementById('container-meta-principal');

// Repinta o card de destaque (Tela 3) com a PRIMEIRA meta do array,
// ou um aviso de "nenhuma meta ainda" se a lista estiver vazia
function renderizarMetaPrincipal() {
  const metas = obterMetas();
  const metaDestaque = metas[0];

  if (!metaDestaque) {
    containerMetaPrincipal.innerHTML = `
      <div class="estado-vazio-meta">
        <p>Nenhuma meta criada ainda</p>
        <span>Toque no "+" ali em cima pra criar a primeira.</span>
      </div>
    `;
    return;
  }

  const porcentagem = metaDestaque.meta > 0
    ? Math.min(Math.round((metaDestaque.atual / metaDestaque.meta) * 100), 100)
    : 0;

  containerMetaPrincipal.innerHTML = `
    <div class="meta" data-meta-id="${metaDestaque.id}">
      <span class="icone-meta"><i class="fa-solid ${metaDestaque.icone}"></i></span>
      <div class="info-meta">
        <div class="linha-meta-topo">
          <strong>${metaDestaque.nome}</strong>
          <span class="porcentagem-meta valor-sensivel">${porcentagem}%</span>
        </div>
        <span class="meta-valor-total valor-sensivel">Meta: ${formatarMoeda(metaDestaque.meta)}</span>
        <div class="barra-progresso">
          <div class="barra-progresso-preenchida" data-cor="meta" style="width: ${porcentagem}%;"></div>
        </div>
        <span class="meta-valor-atual valor-sensivel">${formatarMoeda(metaDestaque.atual)} / ${formatarMoeda(metaDestaque.meta)}</span>
      </div>
    </div>
  `;
}

// Clicar na meta em destaque abre ela pra edição (mesma ideia de
// clicar num lançamento) — delegação de evento pro elemento existir
// mesmo depois de renderizarMetaPrincipal() recriar o HTML de dentro
containerMetaPrincipal.addEventListener('click', (evento) => {
  const elementoMeta = evento.target.closest('.meta');
  if (!elementoMeta) return;

  const id = Number(elementoMeta.getAttribute('data-meta-id'));
  const metaSelecionada = obterMetas().find((meta) => meta.id === id);
  if (metaSelecionada) abrirFormularioMeta(metaSelecionada);
});

// Monta o <select> de ícones disponíveis, já marcando o atual como
// selecionado quando é uma edição
function htmlOpcoesIconeMeta(iconeAtual) {
  const opcoes = [
    ['fa-piggy-bank', '🐷 Poupança / Reserva'],
    ['fa-umbrella-beach', '🏖️ Viagem'],
    ['fa-laptop', '💻 Eletrônico'],
    ['fa-car', '🚗 Carro'],
    ['fa-house', '🏠 Casa'],
    ['fa-graduation-cap', '🎓 Estudos'],
    ['fa-gift', '🎁 Presente'],
  ];

  return opcoes
    .map(([valor, texto]) => `<option value="${valor}" ${valor === iconeAtual ? 'selected' : ''}>${texto}</option>`)
    .join('');
}

// Formulário reaproveitado tanto pra criar quanto pra editar — se
// "metaExistente" vier null, é criação (campos em branco, sem botão
// de excluir); se vier com dados, é edição (campos preenchidos)
function htmlFormularioMeta(metaExistente) {
  const nome = metaExistente ? metaExistente.nome : '';
  const valorMeta = metaExistente ? metaExistente.meta : '';
  const valorAtual = metaExistente ? metaExistente.atual : '';
  const icone = metaExistente ? metaExistente.icone : 'fa-piggy-bank';

  return `
    <form id="form-meta">
      <div class="campo-formulario">
        <label for="campo-meta-nome">Nome da meta</label>
        <input type="text" id="campo-meta-nome" value="${nome}" placeholder="Ex: Viagem para a praia" required>
      </div>

      <div class="campo-formulario">
        <label for="campo-meta-icone">Ícone</label>
        <select id="campo-meta-icone">${htmlOpcoesIconeMeta(icone)}</select>
      </div>

      <div class="campo-formulario">
        <label for="campo-meta-valor-total">Valor da meta (R$)</label>
        <input type="number" id="campo-meta-valor-total" value="${valorMeta}" step="0.01" min="0.01" required>
      </div>

      <div class="campo-formulario">
        <label for="campo-meta-valor-atual">Quanto já guardou (R$)</label>
        <input type="number" id="campo-meta-valor-atual" value="${valorAtual}" step="0.01" min="0" required>
      </div>

      <button type="submit" class="botao-primario">Salvar meta</button>
      ${metaExistente ? '<button type="button" class="botao-perigo" id="botao-excluir-meta">Excluir meta</button>' : ''}
    </form>
  `;
}

// Abre o modal genérico com o formulário de meta (criação ou edição)
// e liga os eventos de salvar/excluir — chamada tanto pelo "+" do
// card quanto pelo clique numa meta (destaque ou na lista "Ver todas")
function abrirFormularioMeta(metaExistente) {
  abrirModal(metaExistente ? 'Editar meta' : 'Nova meta', htmlFormularioMeta(metaExistente));

  document.getElementById('form-meta').addEventListener('submit', (evento) => {
    evento.preventDefault();

    const nome = document.getElementById('campo-meta-nome').value.trim();
    const icone = document.getElementById('campo-meta-icone').value;
    const valorMeta = parseFloat(document.getElementById('campo-meta-valor-total').value);
    const valorAtual = parseFloat(document.getElementById('campo-meta-valor-atual').value);

    if (!nome || !valorMeta || valorMeta <= 0 || isNaN(valorAtual) || valorAtual < 0) {
      mostrarToast('Preencha os campos da meta corretamente.');
      return;
    }

    const botaoSalvarMeta = evento.target.querySelector('button[type="submit"]');

    comLoadingBotao(botaoSalvarMeta, () => {
      const metas = obterMetas();

      if (metaExistente) {
        const indice = metas.findIndex((meta) => meta.id === metaExistente.id);
        metas[indice] = { ...metaExistente, nome, icone, meta: valorMeta, atual: valorAtual };
      } else {
        metas.push({ id: Date.now(), nome, icone, meta: valorMeta, atual: valorAtual });
      }

      salvarMetas(metas);
      renderizarMetaPrincipal();
      fecharModal();
      mostrarToast(metaExistente ? 'Meta atualizada! ✏️' : 'Meta criada! 🎯');
    });
  });

  if (!metaExistente) return;

  // Excluir meta (confirmação com segundo clique, igual lançamentos)
  const botaoExcluirMeta = document.getElementById('botao-excluir-meta');
  let aguardandoConfirmacaoMeta = false;

  botaoExcluirMeta.addEventListener('click', () => {
    if (!aguardandoConfirmacaoMeta) {
      aguardandoConfirmacaoMeta = true;
      botaoExcluirMeta.textContent = 'Clique de novo para confirmar';
      botaoExcluirMeta.classList.add('botao-perigo-confirmando');
      return;
    }

    const metas = obterMetas().filter((meta) => meta.id !== metaExistente.id);
    salvarMetas(metas);
    renderizarMetaPrincipal();
    fecharModal();
    mostrarToast('Meta excluída. 🗑️');
  });
}

document.getElementById('botao-nova-meta').addEventListener('click', () => abrirFormularioMeta(null));

// Monta o HTML de TODAS as metas pro modal "Ver todas" — cada linha é
// clicável e abre a mesma edição usada pela meta em destaque
function htmlListaTodasMetas() {
  const metas = obterMetas();

  if (metas.length === 0) {
    return `
      <div class="estado-vazio-meta">
        <p>Nenhuma meta criada ainda</p>
        <span>Toque no "+" do card "Metas financeiras" pra criar a primeira.</span>
      </div>
    `;
  }

  return metas.map((meta) => {
    const porcentagem = meta.meta > 0 ? Math.min(Math.round((meta.atual / meta.meta) * 100), 100) : 0;

    return `
      <div class="modal-lista-item" data-meta-id="${meta.id}" style="cursor: pointer;">
        <div class="linha-meta-topo">
          <strong><i class="fa-solid ${meta.icone}"></i> ${meta.nome}</strong>
          <span class="porcentagem-meta valor-sensivel">${porcentagem}%</span>
        </div>
        <div class="barra-progresso">
          <div class="barra-progresso-preenchida" data-cor="meta" style="width: ${porcentagem}%;"></div>
        </div>
        <span class="meta-valor-atual valor-sensivel">${formatarMoeda(meta.atual)} / ${formatarMoeda(meta.meta)}</span>
      </div>
    `;
  }).join('');
}

document.getElementById('link-ver-todas-metas').addEventListener('click', (evento) => {
  evento.preventDefault();
  abrirModal('Todas as metas', htmlListaTodasMetas());

  // Liga o clique em cada linha DEPOIS de inserir o HTML no modal
  // (os elementos só existem a partir daqui)
  document.querySelectorAll('.modal-lista-item[data-meta-id]').forEach((item) => {
    item.addEventListener('click', () => {
      const id = Number(item.getAttribute('data-meta-id'));
      const metaSelecionada = obterMetas().find((meta) => meta.id === id);
      if (metaSelecionada) abrirFormularioMeta(metaSelecionada);
    });
  });
});

renderizarMetaPrincipal();

/*
  Gráfico de pizza/rosca de verdade pras categorias, usando a
  biblioteca Chart.js (carregada no index.html). Guardamos a
  "instância" do gráfico numa variável porque, se a pessoa fechar
  e abrir o modal de novo, precisamos destruir o gráfico antigo
  antes de desenhar um novo — senão o Chart.js reclama que já
  existe um gráfico ali.
*/
// Lê o valor atual de uma variável de cor do CSS (ex: "--cor-texto"),
// pra o gráfico usar as cores certas tanto no tema claro quanto escuro
function lerCorCSS(nomeVariavel) {
  return getComputedStyle(document.documentElement).getPropertyValue(nomeVariavel).trim();
}

/*
  Gráfico de linha mostrando como o saldo foi mudando nos últimos dias.
  Fica na Tela 1 e é redesenhado quando os valores mudam.

  OBS: "instanciaGraficoEvolucao" e "evolucaoSaldoExemplo" são
  declaradas lá em cima, ANTES da PARTE 7 — não aqui — porque
  atualizarResumoNaTela() (que roda logo na PARTE 7, ao carregar os
  lançamentos salvos) já chama desenharGraficoEvolucaoSaldo(), e esse
  tipo de variável (let/const) precisa existir ANTES de ser usada,
  mesmo que a função que a usa só seja chamada bem depois.
*/

// Soma (receita soma, despesa subtrai) todos os ".lancamento" que
// estão DENTRO de uma lista específica (ex: só os de "Ontem")
function calcularSaldoDeUmaLista(elementoLista) {
  let total = 0;

  if (!elementoLista) return total;

  elementoLista.querySelectorAll('.lancamento').forEach((item) => {
    const tipo = item.getAttribute('data-tipo');
    const valor = paraNumero(item.querySelector('.valor-positivo, .valor-negativo').textContent);
    total += tipo === 'receita' ? valor : -valor;
  });

  return total;
}

// Completa o ponto inicial com os lançamentos de ontem e de hoje.
function calcularEvolucaoSaldo() {
  const saldoDeReferencia = evolucaoSaldoExemplo.valores[evolucaoSaldoExemplo.valores.length - 1];

  const saldoOntem = saldoDeReferencia + calcularSaldoDeUmaLista(document.getElementById('lista-ontem'));
  const saldoHoje = saldoOntem + calcularSaldoDeUmaLista(listaHoje);

  return {
    dias: [...evolucaoSaldoExemplo.dias, 'Ontem', 'Hoje'],
    valores: [...evolucaoSaldoExemplo.valores, saldoOntem, saldoHoje],
  };
}

function desenharGraficoEvolucaoSaldo() {
  const canvas = document.getElementById('grafico-evolucao-saldo');
  if (!canvas) return;

  // Se o Chart.js não carregou (ex: sem internet, CDN bloqueado por
  // firewall/adblock), "Chart" não existe. Em vez de travar o resto
  // do app inteiro com um erro, a gente só desiste de desenhar esse
  // gráfico específico e segue a vida.
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js não carregou — gráfico de evolução não será exibido.');
    return;
  }

  if (instanciaGraficoEvolucao) {
    instanciaGraficoEvolucao.destroy();
  }

  const corPrimaria = lerCorCSS('--cor-primaria');
  const corTextoSuave = lerCorCSS('--cor-texto-suave');
  const corBorda = lerCorCSS('--cor-borda');
  const evolucao = calcularEvolucaoSaldo();

  instanciaGraficoEvolucao = new Chart(canvas, {
    type: 'line',
    data: {
      labels: evolucao.dias,
      datasets: [{
        data: evolucao.valores,
        borderColor: corPrimaria,
        backgroundColor: corPrimaria + '22', // mesma cor, só que com transparência (preenche embaixo da linha)
        fill: true,
        tension: 0.35, // deixa a linha curva, em vez de quebrada/angulosa
        pointRadius: 3,
        pointBackgroundColor: corPrimaria,
      }],
    },
    options: {
      plugins: {
        legend: { display: false }, // só uma linha, não precisa de legenda
      },
      scales: {
        x: {
          ticks: { color: corTextoSuave, font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: corTextoSuave,
            font: { size: 11 },
            callback: (valor) => 'R$ ' + valor, // mostra "R$ 4000" em vez de só "4000"
          },
          grid: { color: corBorda },
        },
      },
    },
  });
}

desenharGraficoEvolucaoSaldo();

let instanciaGraficoRelatorio = null;

function obterMesSelecionado() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

async function buscarDadosRelatorio(caminho, parametros = '') {
  if (usuarioIdAtual === null) {
    throw new Error('Entre na sua conta para consultar os relatórios.');
  }

  const resposta = await fetch(
    `${API_BASE_URL}/relatorios/${caminho}/${usuarioIdAtual}${parametros}`,
    { headers: cabecalhosAutenticados() },
  );
  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(typeof dados.detail === 'string' ? dados.detail : 'Não foi possível carregar o relatório.');
  }
  return dados;
}

async function carregarCategoriasBackend() {
  if (usuarioIdAtual === null) return;

  const agora = new Date();
  const parametros = `?ano=${agora.getFullYear()}&mes=${agora.getMonth() + 1}`;
  try {
    const categorias = await buscarDadosRelatorio('categorias', parametros);
    categoriasDoMes = categorias.map((categoria) => ({
      categoria: categoria.categoria,
      total: Number(categoria.total),
    }));
    renderizarCategoriasGastos(
      categoriasDoMes,
      document.querySelector('.lista-categorias'),
    );
  } catch (erro) {
    console.error('Erro ao carregar gastos por categoria:', erro);
    mostrarToast('Não foi possível carregar os gastos por categoria.');
  }
}

function destruirGraficoRelatorio() {
  if (instanciaGraficoRelatorio) {
    instanciaGraficoRelatorio.destroy();
    instanciaGraficoRelatorio = null;
  }
}

function exibirErroRelatorio(erro) {
  console.error('Erro ao carregar relatório:', erro);
  const status = document.getElementById('relatorio-status');
  if (status) status.textContent = erro.message || 'Não foi possível carregar o relatório.';
}

function criarOpcoesMesRelatorio() {
  return `<label class="campo-formulario">
    Mês do relatório
    <input type="month" id="mes-relatorio" value="${obterMesSelecionado()}">
  </label>`;
}

async function carregarRelatorioMensal(valorMes = obterMesSelecionado()) {
  if (!/^\d{4}-\d{2}$/.test(valorMes)) {
    document.getElementById('relatorio-status').textContent = 'Selecione um mês válido.';
    return;
  }
  const [ano, mes] = valorMes.split('-').map(Number);
  const status = document.getElementById('relatorio-status');
  status.textContent = 'Carregando dados do mês...';

  try {
    const dias = await buscarDadosRelatorio('mensal', `?ano=${ano}&mes=${mes}`);
    const totalReceitas = dias.reduce((total, dia) => total + dia.receitas, 0);
    const totalDespesas = dias.reduce((total, dia) => total + dia.despesas, 0);
    const resumo = document.getElementById('relatorio-resumo');
    resumo.textContent = `Receitas: ${formatarMoeda(totalReceitas)} | Despesas: ${formatarMoeda(totalDespesas)} | Saldo: ${formatarMoeda(totalReceitas - totalDespesas)}`;
    status.textContent = dias.length ? '' : 'Não há movimentações nesse mês.';

    destruirGraficoRelatorio();
    instanciaGraficoRelatorio = new Chart(document.getElementById('grafico-relatorio'), {
      type: 'line',
      data: {
        labels: dias.map((dia) => new Date(`${dia.data}T00:00:00`).toLocaleDateString('pt-BR')),
        datasets: [
          { label: 'Receitas', data: dias.map((dia) => dia.receitas), borderColor: '#2F9E6E', backgroundColor: '#2F9E6E22', tension: 0.3 },
          { label: 'Despesas', data: dias.map((dia) => dia.despesas), borderColor: '#B5473A', backgroundColor: '#B5473A22', tension: 0.3 },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });
  } catch (erro) {
    exibirErroRelatorio(erro);
  }
}

async function carregarRelatorioCategorias(valorMes = obterMesSelecionado()) {
  if (!/^\d{4}-\d{2}$/.test(valorMes)) {
    document.getElementById('relatorio-status').textContent = 'Selecione um mês válido.';
    return;
  }
  const [ano, mes] = valorMes.split('-').map(Number);
  const status = document.getElementById('relatorio-status');
  status.textContent = 'Carregando gastos por categoria...';

  try {
    const categorias = await buscarDadosRelatorio('categorias', `?ano=${ano}&mes=${mes}`);
    status.textContent = categorias.length ? '' : 'Não há despesas categorizadas nesse mês.';
    destruirGraficoRelatorio();
    instanciaGraficoRelatorio = new Chart(document.getElementById('grafico-relatorio'), {
      type: 'doughnut',
      data: {
        labels: categorias.map((categoria) => categoria.categoria),
        datasets: [{
          data: categorias.map((categoria) => categoria.total),
          backgroundColor: ['#BF6E4D', '#D9A23B', '#5B7A9D', '#9B9388', '#2F9E6E', '#B5473A'],
          borderColor: lerCorCSS('--cor-branco'),
          borderWidth: 3,
        }],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });
  } catch (erro) {
    exibirErroRelatorio(erro);
  }
}

async function carregarRelatorioComparativos() {
  const status = document.getElementById('relatorio-status');
  status.textContent = 'Carregando os últimos seis meses...';

  try {
    const meses = await buscarDadosRelatorio('comparativos');
    status.textContent = meses.length ? '' : 'Não há movimentações para comparar.';
    destruirGraficoRelatorio();
    instanciaGraficoRelatorio = new Chart(document.getElementById('grafico-relatorio'), {
      type: 'bar',
      data: {
        labels: meses.map((item) => {
          const [ano, mes] = item.mes.split('-').map(Number);
          return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        }),
        datasets: [
          { label: 'Receitas', data: meses.map((item) => item.receitas), backgroundColor: '#2F9E6E' },
          { label: 'Despesas', data: meses.map((item) => item.despesas), backgroundColor: '#B5473A' },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });
  } catch (erro) {
    exibirErroRelatorio(erro);
  }
}

function abrirRelatorio(nome, conteudo, carregar) {
  destruirGraficoRelatorio();
  abrirModal(`Relatório: ${nome}`, conteudo);
  carregar();
}

document.querySelectorAll('.atalho-relatorio').forEach((botao) => {
  botao.addEventListener('click', () => {
    const nome = botao.getAttribute('data-relatorio');
    if (nome === 'Exportar') {
      exportarLancamentosCSV();
      return;
    }
    const seletorMes = nome === 'Comparativos' ? '' : criarOpcoesMesRelatorio();
    abrirRelatorio(nome, `
      ${seletorMes}
      <p id="relatorio-resumo" style="color: var(--cor-texto); text-align: center;"></p>
      <p id="relatorio-status" style="color: var(--cor-texto-suave); text-align: center;"></p>
      <canvas id="grafico-relatorio" height="220"></canvas>
    `, () => {
      if (nome === 'Mensal') {
        document.getElementById('mes-relatorio').addEventListener('change', (evento) => {
          carregarRelatorioMensal(evento.target.value);
        });
        carregarRelatorioMensal();
      } else if (nome === 'Categorias') {
        document.getElementById('mes-relatorio').addEventListener('change', (evento) => {
          carregarRelatorioCategorias(evento.target.value);
        });
        carregarRelatorioCategorias();
      } else {
        carregarRelatorioComparativos();
      }
    });
  });
});
/*
  Exporta pra CSV os lançamentos que estão VISÍVEIS na tela de
  Movimentações agora — ou seja, já respeita os filtros de mês,
  tipo (receita/despesa) e busca que a pessoa tiver escolhido. Isso
  faz esse botão funcionar tanto como "exporta tudo" (sem filtro
  nenhum) quanto como "exporta só Setembro" ou "só despesas", sem
  precisar de uma tela separada só pra isso.
*/
function exportarLancamentosCSV() {
  const lancamentosVisiveis = document.querySelectorAll('#tela-movimentacoes .lancamento:not(.lancamento-escondido)');

  if (lancamentosVisiveis.length === 0) {
    mostrarToast('Nenhum lançamento pra exportar com esse filtro 📄');
    return;
  }

  const cabecalho = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)'];

  const linhas = [...lancamentosVisiveis].map((lancamento) => {
    const data = lancamento.getAttribute('data-data') || '';
    const tipo = lancamento.getAttribute('data-tipo') === 'receita' ? 'Receita' : 'Despesa';

    // Clona a descrição e tira o ícone de "recorrente" (se tiver),
    // porque só queremos o texto mesmo pro CSV.
    const noDescricao = lancamento.querySelector('.info-lancamento strong').cloneNode(true);
    noDescricao.querySelectorAll('i').forEach((icone) => icone.remove());
    const descricao = noDescricao.textContent.trim();

    const categoria = lancamento.querySelector('.categoria-lancamento').textContent.trim();

    const valorAbsoluto = paraNumero(lancamento.querySelector('.valor-sensivel').textContent);
    const valorComSinal = tipo === 'Despesa' ? -valorAbsoluto : valorAbsoluto;

    return [data, descricao, categoria, tipo, valorComSinal.toFixed(2).replace('.', ',')];
  });

  // Ponto e vírgula (em vez de vírgula) porque é o separador que o
  // Excel em português espera — com vírgula ele jogaria tudo numa
  // coluna só.
  const textoCSV = [cabecalho, ...linhas]
    .map((colunas) => colunas.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  // O "﻿" no início (BOM) é o que faz o Excel abrir os acentos
  // certinho em vez de virar "Descriç├úo".
  const blob = new Blob(['﻿' + textoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const mesEscolhido = campoFiltroMes.value;
  const sufixoArquivo = mesEscolhido === 'todos' ? obterDataDeHoje() : mesEscolhido;

  const linkDownload = document.createElement('a');
  linkDownload.href = url;
  linkDownload.download = `movimentacoes-${sufixoArquivo}.csv`;
  document.body.appendChild(linkDownload);
  linkDownload.click();
  linkDownload.remove();
  URL.revokeObjectURL(url);

  mostrarToast('Relatório exportado! 📄');
}

/*
  ================================================
  PARTE 9 - SELETOR DE MÊS (aviso de que ainda é mockado)
  ================================================

  Como só temos dados de Setembro por enquanto, trocar o mês só
  mostra um aviso. Quando vier do back-end, aqui entraria um
  fetch('sua-api/resumo?mes=' + mesEscolhido) puxando os números
  daquele mês específico.
*/

document.querySelectorAll('.seletor-mes').forEach((seletor) => {
  seletor.addEventListener('change', () => {
    mostrarToast('Dados de outros meses virão do back-end em breve 🚧');
    seletor.value = 'Setembro'; // volta pro mês que realmente tem dado
  });
});


/*
  ================================================
  PARTE 11 - REGISTRANDO O SERVICE WORKER (PWA)
  ================================================

  Isso "liga" o arquivo sw.js que criamos. A partir daqui, o
  navegador passa a reconhecer esse site como um app instalável
  (vai aparecer um botão de "Instalar" na barra de endereço, ou
  "Adicionar à tela de início" no celular).

  Importante: Service Worker só funciona em HTTPS ou em
  localhost/127.0.0.1 (por segurança). O Live Server do VS Code já
  roda em 127.0.0.1, então funciona normalmente nos testes locais.
*/

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .catch((erro) => console.log('Não foi possível registrar o Service Worker:', erro));
  });
}


/*
  ================================================
  PARTE 12 - LOGIN, CADASTRO E LOGOUT
  ================================================
*/

const CHAVE_USUARIO = 'meu-bolso:usuario';
const telaLogin = document.getElementById('tela-login');
const textoSaudacao = document.getElementById('texto-saudacao');
const textoUsuarioLogado = document.getElementById('texto-usuario-logado');
const avatarUsuario = document.getElementById('avatar-usuario');

/*
  Deixa um botão de formulário "carregando" (ícone girando + travado
  pra não clicar de novo) por um tempinho antes de executar a ação de
  verdade. É só efeito visual — como ainda não tem back-end, não tem
  nada pra "esperar" de verdade — mas simula a sensação de um app
  processando a informação, em vez da ação acontecer instantânea
  demais (o que parece "bugado"/pouco real).
*/
function comLoadingBotao(botao, acao, duracaoMs = 600) {
  const textoOriginal = botao.innerHTML;

  botao.disabled = true;
  botao.innerHTML = '<i class="fa-solid fa-spinner icone-carregando"></i>';

  setTimeout(() => {
    acao();
    botao.disabled = false;
    botao.innerHTML = textoOriginal;
  }, duracaoMs);
}

/*
  Botão de "mostrar/esconder senha" (ícone de olho) nos campos de
  login e cadastro. Mesma ideia do olho que já existe no card de
  saldo: alterna o tipo do campo entre "password" (pontinhos) e
  "text" (letras de verdade), e troca o ícone junto.

  Usamos o atributo "data-campo-senha" pra cada botão saber QUAL
  input ele controla (o de login ou o de cadastro), em vez de
  precisar de uma função separada pra cada um.
*/
document.querySelectorAll('.botao-olho-senha').forEach((botao) => {
  botao.addEventListener('click', () => {
    const campoSenha = document.getElementById(botao.getAttribute('data-campo-senha'));
    const icone = botao.querySelector('i');
    const senhaEstaEscondida = campoSenha.type === 'password';

    campoSenha.type = senhaEstaEscondida ? 'text' : 'password';
    icone.classList.toggle('fa-eye', !senhaEstaEscondida);
    icone.classList.toggle('fa-eye-slash', senhaEstaEscondida);
  });
});

// Troca de aba entre "Entrar" e "Criar conta"
document.querySelectorAll('.auth-aba').forEach((aba) => {
  aba.addEventListener('click', () => {
    document.querySelectorAll('.auth-aba').forEach((a) => a.classList.remove('auth-aba-ativa'));
    aba.classList.add('auth-aba-ativa');

    const idFormularioEscolhido = aba.getAttribute('data-formulario');
    document.querySelectorAll('.auth-form').forEach((formulario) => {
      formulario.classList.toggle('auth-form-escondido', formulario.id !== idFormularioEscolhido);
    });
  });
});

// Esconde a tela de login e mostra o app, já com o nome da pessoa
// em dois lugares: na saudação (Tela 1) e no card "Conta" (Tela 3)
function entrarNoApp(nome, email) {
  telaLogin.classList.add('tela-auth-escondida');
  textoSaudacao.textContent = `Olá, ${nome}!`;
  textoUsuarioLogado.textContent = email ? `${nome} (${email})` : nome;

  // Avatar = primeira letra do nome, maiúscula (se por algum motivo
  // vier vazio, usa "?" pra nunca deixar o círculo sem nada dentro)
  avatarUsuario.textContent = nome.trim().charAt(0).toUpperCase() || '?';
}

function limparDadosDaContaAtual() {
  listaHoje.innerHTML = '';
  document.getElementById('lista-ontem').innerHTML = '';
  categoriasDoMes = [];
  renderizarCategoriasGastos([], document.querySelector('.lista-categorias'));

  const estadoAntigo = { ...estadoFinanceiro };
  estadoFinanceiro = { receitas: 0, despesas: 0, saldo: 0 };
  atualizarResumoNaTela(estadoAntigo);
  renderizarMetaPrincipal();
  renderizarOrcamentoPorCategoria();
  renderizarOrcamentoMensal();
  renderizarRecorrentes();
  aplicarFiltrosMovimentacoes();
}

async function ativarUsuario(usuario, mostrarBoasVindas = false) {
  const idUsuario = Number(usuario.id);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    throw new Error('O servidor não retornou um ID de usuário válido.');
  }
  if (typeof usuario.access_token !== 'string' || !usuario.access_token) {
    throw new Error('O servidor não retornou uma credencial de acesso válida.');
  }
  usuarioIdAtual = idUsuario;
  tokenAcessoAtual = usuario.access_token;
  const perfil = {
    id: idUsuario,
    nome: usuario.nome || usuario.email.split('@')[0],
    email: usuario.email,
  };
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(perfil));

  limparDadosDaContaAtual();
  entrarNoApp(perfil.nome, perfil.email);
  await carregarDadosBackend(idUsuario);
  renderizarMetaPrincipal();

  if (mostrarBoasVindas) mostrarOnboarding();
}

async function lerRespostaApi(resposta, mensagemPadrao) {
  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(typeof dados.detail === 'string' ? dados.detail : mensagemPadrao);
  }
  return dados;
}

/*
  --- Editar perfil ---
  Botão de lápis no card "Conta" abre o mesmo modal genérico com um
  formulário pré-preenchido. As alterações são persistidas no backend.
*/
function htmlFormularioEditarPerfil() {
  return `
    <form id="form-editar-perfil" novalidate>
      <div class="campo-formulario">
        <label for="campo-nome-perfil">Nome</label>
        <input type="text" id="campo-nome-perfil" required>
      </div>
      <div class="campo-formulario">
        <label for="campo-email-perfil">E-mail</label>
        <input type="email" id="campo-email-perfil" required>
      </div>
      <button type="submit" class="botao-primario">Salvar alterações</button>
    </form>
  `;
}

document.getElementById('botao-editar-perfil').addEventListener('click', () => {
  const usuarioAtual = JSON.parse(localStorage.getItem(CHAVE_USUARIO)) || { nome: '', email: '' };

  abrirModal('Editar perfil', htmlFormularioEditarPerfil());

  const campoNomePerfil = document.getElementById('campo-nome-perfil');
  const campoEmailPerfil = document.getElementById('campo-email-perfil');
  campoNomePerfil.value = usuarioAtual.nome || '';
  campoEmailPerfil.value = usuarioAtual.email || '';
  limparErroAoDigitar(campoNomePerfil);
  limparErroAoDigitar(campoEmailPerfil);

  document.getElementById('form-editar-perfil').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErrosDoFormulario(evento.target);

    const nome = campoNomePerfil.value.trim();
    const email = campoEmailPerfil.value.trim();
    let temErro = false;

    if (!nome) {
      mostrarErroCampo(campoNomePerfil, 'Digite seu nome.');
      temErro = true;
    }

    if (!email) {
      mostrarErroCampo(campoEmailPerfil, 'Digite seu e-mail.');
      temErro = true;
    } else if (!emailValido(email)) {
      mostrarErroCampo(campoEmailPerfil, 'Digite um e-mail válido.');
      temErro = true;
    }

    if (temErro) return;

    const botaoSalvar = evento.target.querySelector('button[type="submit"]');
    const textoOriginalBotao = botaoSalvar.innerHTML;
    botaoSalvar.disabled = true;
    botaoSalvar.innerHTML = '<i class="fa-solid fa-spinner icone-carregando"></i>';

    try {
      const resposta = await fetch(`${API_BASE_URL}/auth/perfil`, {
        method: 'PUT',
        headers: cabecalhosAutenticados({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nome, email }),
      });
      const perfilAtualizado = await lerRespostaApi(resposta, 'Não foi possível atualizar o perfil.');
      localStorage.setItem(CHAVE_USUARIO, JSON.stringify({
        id: usuarioIdAtual,
        nome: perfilAtualizado.nome,
        email: perfilAtualizado.email,
      }));
      entrarNoApp(perfilAtualizado.nome, perfilAtualizado.email);
      fecharModal();
      mostrarToast('Perfil atualizado! ✏️');
    } catch (erro) {
      console.error('Erro ao atualizar perfil:', erro);
      mostrarToast(erro.message || 'Não foi possível atualizar o perfil.');
    } finally {
      botaoSalvar.disabled = false;
      botaoSalvar.innerHTML = textoOriginalBotao;
    }
  });
});

// --- Formulário de login ---
const campoLoginEmail = document.getElementById('login-email');
const campoLoginSenha = document.getElementById('login-senha');
limparErroAoDigitar(campoLoginEmail);
limparErroAoDigitar(campoLoginSenha);

document.getElementById('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparErrosDoFormulario(evento.target);

  const email = campoLoginEmail.value.trim();
  const senha = campoLoginSenha.value;
  let temErro = false;

  if (!email) {
    mostrarErroCampo(campoLoginEmail, 'Digite seu e-mail.');
    temErro = true;
  } else if (!emailValido(email)) {
    mostrarErroCampo(campoLoginEmail, 'Digite um e-mail válido.');
    temErro = true;
  }

  if (!senha) {
    mostrarErroCampo(campoLoginSenha, 'Digite sua senha.');
    temErro = true;
  }
  if (temErro) return;

  const botaoEntrar = evento.target.querySelector('button[type="submit"]');
  const textoOriginalBotao = botaoEntrar.innerHTML;
  botaoEntrar.disabled = true;
  botaoEntrar.innerHTML = '<i class="fa-solid fa-spinner icone-carregando"></i>';

  try {
    const resposta = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const usuario = await lerRespostaApi(resposta, 'Não foi possível entrar na conta.');
    await ativarUsuario(usuario);
  } catch (erro) {
    console.error('Erro ao entrar:', erro);
    mostrarToast(erro.message || 'Não foi possível conectar ao servidor.');
  } finally {
    botaoEntrar.disabled = false;
    botaoEntrar.innerHTML = textoOriginalBotao;
  }
});

// --- "Esqueceu a senha?" ---
// Ainda não tem back-end de verdade, então esse fluxo é só visual: abre
// um modal pedindo o e-mail e finge que mandou um link de redefinição.
// Fica fácil trocar pela chamada real quando o back-end existir.
function htmlFormularioEsqueciSenha() {
  return `
    <p class="texto-modal-aviso">Informe seu e-mail e simulamos o envio de um link de redefinição de senha.</p>
    <form id="form-esqueceu-senha" novalidate>
      <div class="campo-formulario">
        <label for="recuperar-email">E-mail</label>
        <input type="email" id="recuperar-email" placeholder="voce@email.com" required>
      </div>
      <button type="submit" class="botao-primario">Enviar instruções</button>
    </form>
  `;
}

document.getElementById('botao-esqueceu-senha').addEventListener('click', () => {
  abrirModal('Recuperar senha', htmlFormularioEsqueciSenha());

  const campoRecuperarEmail = document.getElementById('recuperar-email');
  limparErroAoDigitar(campoRecuperarEmail);

  document.getElementById('form-esqueceu-senha').addEventListener('submit', (evento) => {
    evento.preventDefault();
    limparErrosDoFormulario(evento.target);

    const email = campoRecuperarEmail.value.trim();

    if (!email) {
      mostrarErroCampo(campoRecuperarEmail, 'Digite seu e-mail.');
      return;
    }
    if (!emailValido(email)) {
      mostrarErroCampo(campoRecuperarEmail, 'Digite um e-mail válido.');
      return;
    }

    const botaoEnviar = evento.target.querySelector('button[type="submit"]');

    comLoadingBotao(botaoEnviar, () => {
      fecharModal();
      mostrarToast('📧 Se esse e-mail existir, enviamos um link de redefinição (simulado).');
    });
  });
});

// --- Formulário de cadastro ---
const campoCadastroNome = document.getElementById('cadastro-nome');
const campoCadastroEmail = document.getElementById('cadastro-email');
const campoCadastroSenha = document.getElementById('cadastro-senha');
const campoCadastroConfirmarSenha = document.getElementById('cadastro-confirmar-senha');
limparErroAoDigitar(campoCadastroNome);
limparErroAoDigitar(campoCadastroEmail);
limparErroAoDigitar(campoCadastroSenha);
limparErroAoDigitar(campoCadastroConfirmarSenha);

document.getElementById('form-cadastro').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparErrosDoFormulario(evento.target);

  const nome = campoCadastroNome.value.trim();
  const email = campoCadastroEmail.value.trim();
  const senha = campoCadastroSenha.value;
  let temErro = false;

  if (!nome) {
    mostrarErroCampo(campoCadastroNome, 'Digite seu nome.');
    temErro = true;
  }

  if (!email) {
    mostrarErroCampo(campoCadastroEmail, 'Digite seu e-mail.');
    temErro = true;
  } else if (!emailValido(email)) {
    mostrarErroCampo(campoCadastroEmail, 'Digite um e-mail válido.');
    temErro = true;
  }

  const confirmarSenha = campoCadastroConfirmarSenha.value;

  if (!senha) {
    mostrarErroCampo(campoCadastroSenha, 'Crie uma senha.');
    temErro = true;
  } else if (senha.length < 8) {
    mostrarErroCampo(campoCadastroSenha, 'A senha precisa ter pelo menos 8 caracteres.');
    temErro = true;
  }

  if (!confirmarSenha) {
    mostrarErroCampo(campoCadastroConfirmarSenha, 'Digite a senha de novo.');
    temErro = true;
  } else if (senha && confirmarSenha !== senha) {
    mostrarErroCampo(campoCadastroConfirmarSenha, 'As senhas não são iguais.');
    temErro = true;
  }
  if (temErro) return;

  const botaoCriarConta = evento.target.querySelector('button[type="submit"]');
  const textoOriginalBotao = botaoCriarConta.innerHTML;
  botaoCriarConta.disabled = true;
  botaoCriarConta.innerHTML = '<i class="fa-solid fa-spinner icone-carregando"></i>';

  try {
    const resposta = await fetch(`${API_BASE_URL}/auth/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha }),
    });
    const usuario = await lerRespostaApi(resposta, 'Não foi possível criar a conta.');
    await ativarUsuario(usuario, true);
  } catch (erro) {
    console.error('Erro ao cadastrar usuário:', erro);
    mostrarToast(erro.message || 'Não foi possível conectar ao servidor.');
  } finally {
    botaoCriarConta.disabled = false;
    botaoCriarConta.innerHTML = textoOriginalBotao;
  }
});

/*
  ================================================
  ONBOARDING DE BOAS-VINDAS (só na criação de conta)
  ================================================

  3 telinhas rápidas, uma de cada vez, explicando as partes
  principais do app. Reaproveita a MESMA ideia das abas de
  login/cadastro: todos os slides existem no HTML o tempo todo, só
  troca qual tem a classe "-ativa" (nunca cria/destrói nada).
*/

const telaOnboarding = document.getElementById('tela-onboarding');
const slidesOnboarding = document.querySelectorAll('.onboarding-slide');
const dotsOnboarding = document.querySelectorAll('#onboarding-dots .dot');
const botaoAvancarOnboarding = document.getElementById('botao-avancar-onboarding');
let indiceSlideOnboarding = 0;

function mostrarSlideOnboarding(indice) {
  indiceSlideOnboarding = indice;

  slidesOnboarding.forEach((slide, i) => {
    slide.classList.toggle('onboarding-slide-ativa', i === indice);
  });

  dotsOnboarding.forEach((dot, i) => {
    dot.classList.toggle('dot-ativa', i === indice);
  });

  // No último slide, o botão vira "Começar" em vez de "Próximo"
  const ehUltimoSlide = indice === slidesOnboarding.length - 1;
  botaoAvancarOnboarding.textContent = ehUltimoSlide ? 'Começar' : 'Próximo';
}

function mostrarOnboarding() {
  mostrarSlideOnboarding(0);
  telaOnboarding.classList.remove('tela-auth-escondida');
}

function fecharOnboarding() {
  telaOnboarding.classList.add('tela-auth-escondida');
}

botaoAvancarOnboarding.addEventListener('click', () => {
  const ehUltimoSlide = indiceSlideOnboarding === slidesOnboarding.length - 1;

  if (ehUltimoSlide) {
    fecharOnboarding();
  } else {
    mostrarSlideOnboarding(indiceSlideOnboarding + 1);
  }
});

document.getElementById('botao-pular-onboarding').addEventListener('click', fecharOnboarding);

// --- Logout ---
// Existem 2 botões de sair (um na Tela 1, outro no card "Conta" da
// Tela 3). Em vez de um id único, os dois usam a MESMA classe
// (.botao-sair-trigger), e aqui a gente escuta o clique nos dois de
// uma vez com querySelectorAll — assim clicar em qualquer um dá logout.
document.querySelectorAll('.botao-sair-trigger').forEach((botao) => {
  botao.addEventListener('click', () => {
  localStorage.removeItem(CHAVE_USUARIO);
  usuarioIdAtual = null;
  tokenAcessoAtual = null;
  limparDadosDaContaAtual();
    telaLogin.classList.remove('tela-auth-escondida');
    textoUsuarioLogado.textContent = '—';
    avatarUsuario.textContent = '?';

    // Volta pro formulário de login (caso tivesse ficado na aba de cadastro)
    document.querySelector('[data-formulario="form-login"]').click();

    // Some com os campos preenchidos, pra não ficar o e-mail/senha da pessoa anterior
    document.getElementById('form-login').reset();
    document.getElementById('form-cadastro').reset();

    // Volta pra Tela 1, pra da próxima vez que logar já abrir no Resumo
    document.querySelector('[data-tela="tela-resumo"]').click();
  });
});

/*
  ================================================
  PARTE 9.5 - ESQUEMA DE COR (vinho / azul)
  ================================================

  Parecido com o tema claro/escuro, mas é um atributo DIFERENTE
  (data-esquema) — os dois são independentes, então dá pra ter
  "vinho escuro", "azul claro", etc. Existem botões seletores em
  dois lugares (tela de login e card "Conta"), e os dois têm a
  MESMA classe ".opcao-esquema", então um clique em QUALQUER um
  dos dois funciona igual (e os dois conjuntos ficam sincronizados).
*/

const CHAVE_ESQUEMA = 'meu-bolso:esquema-cor';

function aplicarEsquema(esquema) {
  document.documentElement.setAttribute('data-esquema', esquema);
  localStorage.setItem(CHAVE_ESQUEMA, esquema);

  // Marca visualmente qual botão está selecionado, nos DOIS lugares
  // onde o seletor aparece (login e Conta) ao mesmo tempo.
  document.querySelectorAll('.opcao-esquema').forEach((botao) => {
    botao.classList.toggle('opcao-esquema-ativa', botao.getAttribute('data-esquema') === esquema);
  });
}

// Ao carregar a página, usa o esquema salvo antes (se existir).
// Se a pessoa nunca escolheu, começa no "vinho" por padrão.
const esquemaSalvoAnteriormente = localStorage.getItem(CHAVE_ESQUEMA) || 'vinho';
aplicarEsquema(esquemaSalvoAnteriormente);

document.querySelectorAll('.opcao-esquema').forEach((botao) => {
  botao.addEventListener('click', () => {
    aplicarEsquema(botao.getAttribute('data-esquema'));
    // O gráfico "fotografa" as cores do CSS no momento em que desenha,
    // então precisa redesenhar pra pegar a cor nova do esquema.
    desenharGraficoEvolucaoSaldo();
  });
});


/*
  ================================================
  PARTE 10 - TEMA CLARO / ESCURO
  ================================================

  A ideia é simples: colocamos um atributo data-tema="escuro" (ou
  "claro") na tag <html>. O CSS já está preparado pra, quando esse
  atributo existir, trocar todas as variáveis de cor (olha lá no
  topo do style.css o bloco "html[data-tema='escuro']").

  Ou seja: o JavaScript só decide QUAL tema está ativo e guarda
  essa escolha; quem realmente troca as cores é o CSS.
*/

const botaoTema = document.getElementById('botao-tema');
const iconeTema = document.getElementById('icone-tema');
const CHAVE_TEMA = 'meu-bolso:tema';

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema);

  if (tema === 'escuro') {
    iconeTema.classList.replace('fa-moon', 'fa-sun');
  } else {
    iconeTema.classList.replace('fa-sun', 'fa-moon');
  }

  localStorage.setItem(CHAVE_TEMA, tema);

  // O Chart.js "fotografa" as cores do CSS no momento em que desenha —
  // se não redesenhar aqui, o gráfico continuaria com as cores do tema
  // anterior até a próxima troca de tela.
  desenharGraficoEvolucaoSaldo();
}

// Ao carregar a página, usa o tema salvo antes (se existir).
// Se a pessoa nunca escolheu, começa no "claro" por padrão.
const temaSalvoAnteriormente = localStorage.getItem(CHAVE_TEMA) || 'claro';
aplicarTema(temaSalvoAnteriormente);

botaoTema.addEventListener('click', () => {
  const temaAtual = document.documentElement.getAttribute('data-tema');
  const novoTema = temaAtual === 'escuro' ? 'claro' : 'escuro';
  aplicarTema(novoTema);
});

async function carregarDadosBackend(idUsuario) {
  try {
    const respostaTransacoes = await fetch(`${API_BASE_URL}/transacoes/${idUsuario}`, {
      headers: cabecalhosAutenticados(),
    });
    if (!respostaTransacoes.ok) {
      throw new Error(`A API de transações respondeu com HTTP ${respostaTransacoes.status}.`);
    }

    const transacoes = await respostaTransacoes.json();
    listaHoje.innerHTML = '';
    transacoes.forEach((transacao) => {
      criarElementoLancamento({
        tipo: transacao.tipo,
        descricao: transacao.descricao,
        categoria: transacao.categoria,
        valor: Number(transacao.valor),
        data: transacao.data,
        recorrente: false,
      });
    });
  } catch (erro) {
    console.error('Erro ao carregar transações do FastAPI local:', erro);
    mostrarToast('Não foi possível carregar os lançamentos da conta.');
  }

  try {
    const respostaResumo = await fetch(`${API_BASE_URL}/resumo/${idUsuario}`, {
      headers: cabecalhosAutenticados(),
    });
    if (!respostaResumo.ok) {
      throw new Error(`A API de resumo respondeu com HTTP ${respostaResumo.status}.`);
    }

    const resumo = await respostaResumo.json();
    const estadoAntigo = { ...estadoFinanceiro };
    estadoFinanceiro.receitas = Number(resumo.total_receitas);
    estadoFinanceiro.despesas = Number(resumo.total_despesas);
    estadoFinanceiro.saldo = Number(resumo.saldo_atual);
    atualizarResumoNaTela(estadoAntigo);
  } catch (erro) {
    console.error('Erro ao carregar o resumo do FastAPI local:', erro);
    mostrarToast('Não foi possível carregar o resumo financeiro.');
  }

  await carregarCategoriasBackend();
  renderizarOrcamentoPorCategoria();
  renderizarOrcamentoMensal();
  renderizarRecorrentes();
  aplicarFiltrosMovimentacoes();
}
