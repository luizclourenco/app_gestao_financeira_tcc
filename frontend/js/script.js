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
  const listaAtual = document.querySelectorAll('.lancamento'); // busca atualizada!

  listaAtual.forEach((lancamento) => {
    const tipoDoLancamento = lancamento.getAttribute('data-tipo');
    const descricaoLancamento = lancamento.querySelector('.info-lancamento strong').textContent.toLowerCase();

    const passaFiltroTipo = (filtroEscolhido === 'todas') || (filtroEscolhido === tipoDoLancamento);
    const passaBusca = termoBusca === '' || descricaoLancamento.includes(termoBusca);

    lancamento.classList.toggle('lancamento-escondido', !(passaFiltroTipo && passaBusca));
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


/*
  ================================================
  PARTE 4 - ESTADO FINANCEIRO (os "dados" do app)
  ================================================

  Como ainda não temos back-end, guardamos os valores aqui numa
  variável de JavaScript. Ela começa com os mesmos números que já
  estavam fixos no HTML. Sempre que um lançamento novo é
  adicionado, atualizamos esses números e "repintamos" a tela.

  OBS pro futuro: quando o back-end existir, em vez de calcular
  tudo aqui na mão, essas informações virão prontas de uma
  chamada fetch('sua-api/resumo') — a função atualizarResumoNaTela()
  continua útil do mesmo jeito, só muda de onde os dados vêm.
*/

let estadoFinanceiro = {
  receitas: 6250,
  despesas: 1930,
  saldo: 4320,
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

const CATEGORIAS_DE_DESPESA = ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Outros'];

// Mesmas cores já usadas nos ícones/barrinhas de categoria da Tela 1
const corPorCategoria = {
  'Moradia': 'moradia',
  'Alimentação': 'alimentacao',
  'Transporte': 'transporte',
  'Lazer': 'lazer',
  'Saúde': 'saude',
  'Outros': 'outros',
};

function obterLimitesCategoria() {
  const limitesSalvos = JSON.parse(localStorage.getItem(CHAVE_LIMITES_CATEGORIA)) || {};
  return { ...limitesPadrao, ...limitesSalvos };
}

function salvarLimiteCategoria(categoria, novoLimite) {
  const limites = obterLimitesCategoria();
  limites[categoria] = novoLimite;
  localStorage.setItem(CHAVE_LIMITES_CATEGORIA, JSON.stringify(limites));
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
  return JSON.parse(localStorage.getItem(CHAVE_RECORRENTES)) || [];
}

function salvarRegrasRecorrentes(regras) {
  localStorage.setItem(CHAVE_RECORRENTES, JSON.stringify(regras));
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
document.getElementById('botao-simular-mes').addEventListener('click', () => {
  const regras = obterRegrasRecorrentes();

  if (regras.length === 0) {
    mostrarToast('Nenhum lançamento recorrente cadastrado ainda.');
    return;
  }

  regras.forEach((regra) => {
    adicionarLancamento({
      tipo: regra.tipo,
      descricao: regra.descricao,
      categoria: regra.categoria,
      valor: regra.valor,
      recorrente: true,
    }, true);
  });

  mostrarToast(`${regras.length} lançamento(s) recorrente(s) gerado(s) para o próximo mês! 🔁`);
});


/*
  ================================================
  PARTE 7 - NOVO LANÇAMENTO (formulário + salvar + listar)
  ================================================
*/

// Ícone simples por categoria, só pra ficar mais visual (poderia
// virar um <select> de ícones no futuro)
const iconesPorCategoria = {
  'Alimentação': 'fa-cart-shopping',
  'Transporte': 'fa-gas-pump',
  'Moradia': 'fa-house',
  'Lazer': 'fa-gamepad',
  'Saúde': 'fa-briefcase-medical',
  'Receita': 'fa-sack-dollar',
  'Outros': 'fa-ellipsis',
};

const listaHoje = document.getElementById('lista-hoje');
const CHAVE_LOCALSTORAGE = 'meu-bolso:lancamentos-extras';

// Monta (mas NÃO insere na página ainda) o <li> de um lançamento.
// Reaproveitada tanto pra criar um lançamento novo quanto pra
// reconstruir um lançamento editado.
function construirNoLancamento(dados) {
  const item = document.createElement('li');
  item.className = 'lancamento';
  item.setAttribute('data-tipo', dados.tipo);

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

// Junta: cria o elemento na tela + atualiza os totais + (opcionalmente) salva
function adicionarLancamento(dados, salvarNoLocalStorage) {
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
  // "limite de receita"), então só repintamos o card nesse caso.
  if (dados.tipo === 'despesa') {
    renderizarOrcamentoPorCategoria();
  }

  if (salvarNoLocalStorage) {
    const lancamentosSalvos = JSON.parse(localStorage.getItem(CHAVE_LOCALSTORAGE)) || [];
    lancamentosSalvos.push(dados);
    localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(lancamentosSalvos));
  }
}

// HTML do formulário que aparece dentro do modal
function htmlFormularioNovoLancamento() {
  return `
    <form id="form-novo-lancamento">
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
          <option>Alimentação</option>
          <option>Transporte</option>
          <option>Moradia</option>
          <option>Lazer</option>
          <option>Saúde</option>
          <option>Outros</option>
        </select>
      </div>

      <div class="campo-formulario">
        <label for="campo-valor">Valor (R$)</label>
        <input type="number" id="campo-valor" placeholder="0,00" step="0.01" min="0.01" required>
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
  document.getElementById('form-novo-lancamento').addEventListener('submit', (evento) => {
    evento.preventDefault(); // impede a página de recarregar (comportamento padrão de forms)

    const tipoEscolhido = document.querySelector('input[name="tipo"]:checked').value;
    const descricao = document.getElementById('campo-descricao').value.trim();
    const categoria = tipoEscolhido === 'receita' ? 'Receita' : document.getElementById('campo-categoria').value;
    const valor = parseFloat(document.getElementById('campo-valor').value);
    const recorrente = document.getElementById('campo-recorrente').checked;

    if (!descricao || !valor || valor <= 0) {
      mostrarToast('Preencha descrição e valor corretamente.');
      return;
    }

    adicionarLancamento({ tipo: tipoEscolhido, descricao, categoria, valor, recorrente }, true);

    if (recorrente) {
      registrarRegraRecorrente({ tipo: tipoEscolhido, descricao, categoria, valor });
    }

    fecharModal();

    // Se esse lançamento fez a categoria passar do limite definido, o
    // aviso de orçamento é mais importante que o toast de sucesso comum
    // — por isso ele toma o lugar do "Lançamento adicionado!" nesse caso.
    const avisoDeLimite = tipoEscolhido === 'despesa' ? verificarLimiteExcedido(categoria) : null;
    mostrarToast(avisoDeLimite || 'Lançamento adicionado! 🎉');
  });
});

// Ao carregar a página, recupera lançamentos salvos em visitas anteriores
function carregarLancamentosSalvos() {
  const lancamentosSalvos = JSON.parse(localStorage.getItem(CHAVE_LOCALSTORAGE)) || [];
  lancamentosSalvos.forEach((dados) => adicionarLancamento(dados, false));
}

carregarLancamentosSalvos();

// Primeira pintura dos cards de orçamento/recorrentes, já com os
// lançamentos carregados acima (precisa vir depois de
// iconesPorCategoria existir, por isso só aqui e não na PARTE 6.5/6.6)
renderizarOrcamentoPorCategoria();
renderizarRecorrentes();


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
  const categorias = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros'];
  const opcoesCategoria = categorias
    .map((cat) => `<option ${cat === dadosAtuais.categoria ? 'selected' : ''}>${cat}</option>`)
    .join('');

  return `
    <form id="form-editar-lancamento">
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
  };

  abrirModal('Editar lançamento', htmlFormularioEditarLancamento(dadosAtuais));

  // --- Salvar alterações ---
  document.getElementById('form-editar-lancamento').addEventListener('submit', (eventoSubmit) => {
    eventoSubmit.preventDefault();

    const tipoNovo = document.querySelector('input[name="tipo-edicao"]:checked').value;
    const descricaoNova = document.getElementById('campo-descricao-edicao').value.trim();
    const categoriaNova = tipoNovo === 'receita' ? 'Receita' : document.getElementById('campo-categoria-edicao').value;
    const valorNovo = parseFloat(document.getElementById('campo-valor-edicao').value);

    if (!descricaoNova || !valorNovo || valorNovo <= 0) {
      mostrarToast('Preencha descrição e valor corretamente.');
      return;
    }

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
    });
    li.replaceWith(noAtualizado);

    atualizarResumoNaTela(estadoAntigo);
    renderizarOrcamentoPorCategoria();
    aplicarFiltrosMovimentacoes();
    fecharModal();
    mostrarToast('Lançamento atualizado! ✏️');
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

const categoriasExemplo = [
  { nome: 'Moradia', valor: 650, porcentagem: 33, icone: 'fa-house', cor: 'moradia' },
  { nome: 'Alimentação', valor: 420, porcentagem: 22, icone: 'fa-cart-shopping', cor: 'alimentacao' },
  { nome: 'Transporte', valor: 280, porcentagem: 14, icone: 'fa-gas-pump', cor: 'transporte' },
  { nome: 'Outros', valor: 580, porcentagem: 31, icone: 'fa-ellipsis', cor: 'outros' },
];

document.getElementById('link-ver-todas-categorias').addEventListener('click', (evento) => {
  evento.preventDefault(); // link <a> não deve navegar de verdade

  const htmlLista = categoriasExemplo.map((categoria) => `
    <div class="modal-lista-item">
      <div class="linha-categoria-topo">
        <span><span class="icone-categoria icone-categoria-inline" data-cor="${categoria.cor}"><i class="fa-solid ${categoria.icone}"></i></span> ${categoria.nome}</span>
        <span class="valor-sensivel">${formatarMoeda(categoria.valor)}</span>
      </div>
      <div class="barra-progresso">
        <div class="barra-progresso-preenchida" data-cor="${categoria.cor}" style="width: ${categoria.porcentagem}%;"></div>
      </div>
    </div>
  `).join('');

  abrirModal('Todas as categorias', htmlLista);
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

// Usado só na primeira visita (quando ainda não existe nada salvo),
// pra o card não aparecer vazio antes da pessoa criar a dela mesma
const metasPadrao = [
  { id: 1, nome: 'Reserva de Emergência', meta: 10000, atual: 6000, icone: 'fa-piggy-bank' },
  { id: 2, nome: 'Viagem para a praia', meta: 3000, atual: 900, icone: 'fa-umbrella-beach' },
  { id: 3, nome: 'Notebook novo', meta: 5000, atual: 4000, icone: 'fa-laptop' },
];

function obterMetas() {
  const metasSalvas = localStorage.getItem(CHAVE_METAS);

  if (metasSalvas === null) {
    // Primeira vez: semeia com os exemplos e já salva, pra próxima
    // visita ler os mesmos dados (inclusive se a pessoa editar algo)
    localStorage.setItem(CHAVE_METAS, JSON.stringify(metasPadrao));
    return metasPadrao;
  }

  return JSON.parse(metasSalvas);
}

function salvarMetas(metas) {
  localStorage.setItem(CHAVE_METAS, JSON.stringify(metas));
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
let instanciaGraficoCategorias = null;

// Lê o valor atual de uma variável de cor do CSS (ex: "--cor-texto"),
// pra o gráfico usar as cores certas tanto no tema claro quanto escuro
function lerCorCSS(nomeVariavel) {
  return getComputedStyle(document.documentElement).getPropertyValue(nomeVariavel).trim();
}

/*
  Gráfico de linha mostrando como o saldo foi mudando nos últimos
  dias (dado de exemplo, já que ainda não temos histórico real
  vindo de um back-end). Fica na Tela 1, visível direto — por isso,
  diferente do gráfico de categorias, não espera um modal abrir;
  ele já é desenhado assim que a página carrega.
*/
let instanciaGraficoEvolucao = null;

/*
  Como o app não tem back-end com histórico de datas de verdade, os
  5 primeiros pontos continuam sendo "dados de antes" fixos (dias que
  nem existem na tela de Movimentações). Só os 2 últimos pontos
  ("Ontem" e "Hoje") são calculados de verdade, a partir da soma dos
  lançamentos que realmente estão nas listas #lista-ontem e
  #lista-hoje — então se a pessoa adicionar, editar ou excluir um
  lançamento, o gráfico muda junto.
*/
const evolucaoSaldoExemplo = {
  dias: ['Qui', 'Sex', 'Sáb', 'Dom', 'Seg'],
  valores: [3850, 4200, 3980, 4450, 4100],
};

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

// Pega os 5 pontos fixos de exemplo e completa com os 2 pontos reais
// (Ontem e Hoje), calculados em cima do saldo de partida (último
// ponto fixo) + o que realmente está lançado em cada dia
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

function desenharGraficoCategorias() {
  const canvas = document.getElementById('grafico-categorias');
  if (!canvas) return;

  // Mesma proteção do gráfico de evolução: sem Chart.js carregado,
  // não dá pra desenhar — mas isso não pode travar o resto do app.
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js não carregou — gráfico de categorias não será exibido.');
    return;
  }

  if (instanciaGraficoCategorias) {
    instanciaGraficoCategorias.destroy();
  }

  instanciaGraficoCategorias = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: categoriasExemplo.map((categoria) => categoria.nome),
      datasets: [{
        data: categoriasExemplo.map((categoria) => categoria.valor),
        // Mesmas cores usadas nos ícones de categoria (CORES_POR_CATEGORIA),
        // só que aqui precisam ser string de cor mesmo (o Chart.js não lê
        // variável CSS direto) — por isso repetidas na mesma ordem.
        backgroundColor: ['#BF6E4D', '#D9A23B', '#5B7A9D', '#9B9388'],
        borderColor: lerCorCSS('--cor-branco'),
        borderWidth: 3,
      }],
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: lerCorCSS('--cor-texto'),
            font: { family: 'Inter', size: 12 },
            padding: 14,
          },
        },
      },
    },
  });
}

// Atalhos de relatório (Mensal / Categorias / Comparativos)
document.querySelectorAll('.atalho-relatorio').forEach((botao) => {
  botao.addEventListener('click', () => {
    const nomeRelatorio = botao.getAttribute('data-relatorio');

    if (nomeRelatorio === 'Categorias') {
      abrirModal('Relatório: Categorias', `
        <canvas id="grafico-categorias" height="220"></canvas>
        <p style="color: var(--cor-texto-suave); font-size: 12px; text-align: center; margin-top: 14px;">
          Dados de exemplo — quando o back-end existir, o gráfico passa a usar os lançamentos reais.
        </p>
      `);
      // O <canvas> só existe no HTML depois que abrirModal() o inseriu
      desenharGraficoCategorias();
      return;
    }

    abrirModal(`Relatório: ${nomeRelatorio}`, `
      <p style="color: var(--cor-texto-suave); font-size: 14px; line-height: 1.5;">
        🚧 Esse relatório vai ser gerado com dados reais assim que o back-end
        estiver pronto. Por enquanto, essa é só a "portinha" (o botão) já
        funcionando — a parte de gerar o gráfico vem depois.
      </p>
    `);
  });
});


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

  Como ainda não existe back-end, "entrar" ou "criar conta" aqui
  não checa senha nem nada de verdade — só guarda o nome/e-mail no
  localStorage e esconde a tela de login. O objetivo é mostrar o
  FLUXO (tela existe, formulário funciona, app reconhece "logado"),
  pra depois só trocar essa parte por uma chamada de API de
  verdade (fetch pra uma rota tipo /login).
*/

const CHAVE_USUARIO = 'meu-bolso:usuario';
const telaLogin = document.getElementById('tela-login');
const textoSaudacao = document.getElementById('texto-saudacao');
const textoUsuarioLogado = document.getElementById('texto-usuario-logado');

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
}

// --- Formulário de login ---
document.getElementById('form-login').addEventListener('submit', (evento) => {
  evento.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  if (!email) return;

  // Se a pessoa já tinha se cadastrado antes (mesmo e-mail), usa o nome
  // salvo. Senão, usa a parte antes do "@" do e-mail como nome provisório.
  const usuarioSalvo = JSON.parse(localStorage.getItem(CHAVE_USUARIO));
  const nome = (usuarioSalvo && usuarioSalvo.email === email) ? usuarioSalvo.nome : email.split('@')[0];

  localStorage.setItem(CHAVE_USUARIO, JSON.stringify({ nome, email }));
  entrarNoApp(nome, email);
});

// --- Formulário de cadastro ---
document.getElementById('form-cadastro').addEventListener('submit', (evento) => {
  evento.preventDefault();

  const nome = document.getElementById('cadastro-nome').value.trim();
  const email = document.getElementById('cadastro-email').value.trim();
  if (!nome || !email) return;

  localStorage.setItem(CHAVE_USUARIO, JSON.stringify({ nome, email }));
  entrarNoApp(nome, email);
});

// --- Logout ---
// Existem 2 botões de sair (um na Tela 1, outro no card "Conta" da
// Tela 3). Em vez de um id único, os dois usam a MESMA classe
// (.botao-sair-trigger), e aqui a gente escuta o clique nos dois de
// uma vez com querySelectorAll — assim clicar em qualquer um dá logout.
document.querySelectorAll('.botao-sair-trigger').forEach((botao) => {
  botao.addEventListener('click', () => {
    localStorage.removeItem(CHAVE_USUARIO);
    telaLogin.classList.remove('tela-auth-escondida');
    textoUsuarioLogado.textContent = '—';

    // Volta pro formulário de login (caso tivesse ficado na aba de cadastro)
    document.querySelector('[data-formulario="form-login"]').click();

    // Some com os campos preenchidos, pra não ficar o e-mail/senha da pessoa anterior
    document.getElementById('form-login').reset();
    document.getElementById('form-cadastro').reset();

    // Volta pra Tela 1, pra da próxima vez que logar já abrir no Resumo
    document.querySelector('[data-tela="tela-resumo"]').click();
  });
});

// --- Ao carregar a página: se já tinha usuário salvo, pula o login ---
const usuarioJaLogado = JSON.parse(localStorage.getItem(CHAVE_USUARIO));
if (usuarioJaLogado) {
  entrarNoApp(usuarioJaLogado.nome, usuarioJaLogado.email);
}


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