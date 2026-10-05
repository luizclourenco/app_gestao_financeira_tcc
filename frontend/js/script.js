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

abasFiltro.forEach((aba) => {
  aba.addEventListener('click', () => {
    abasFiltro.forEach((a) => a.classList.remove('aba-ativa'));
    aba.classList.add('aba-ativa');

    const filtroEscolhido = aba.getAttribute('data-filtro');
    const listaAtual = document.querySelectorAll('.lancamento'); // busca atualizada!

    listaAtual.forEach((lancamento) => {
      const tipoDoLancamento = lancamento.getAttribute('data-tipo');
      const deveAparecer = (filtroEscolhido === 'todas') || (filtroEscolhido === tipoDoLancamento);

      lancamento.classList.toggle('lancamento-escondido', !deveAparecer);
    });

    atualizarEstadoVazioLancamentos();
  });
});


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

  item.innerHTML = `
    <span class="icone-lancamento ${classeIcone}"><i class="fa-solid ${nomeIcone}"></i></span>
    <div class="info-lancamento">
      <strong>${dados.descricao}</strong>
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
  atualizarEstadoVazioLancamentos(); // o item novo pode ter sido o primeiro da lista

  // "Fotografa" os valores atuais ANTES de mudar — é esse retrato que
  // vai ser o ponto de partida da animação dos números.
  const estadoAntigo = { ...estadoFinanceiro };

  if (dados.tipo === 'receita') {
    estadoFinanceiro.receitas += dados.valor;
  } else {
    estadoFinanceiro.despesas += dados.valor;
  }
  atualizarResumoNaTela(estadoAntigo);

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

    if (!descricao || !valor || valor <= 0) {
      mostrarToast('Preencha descrição e valor corretamente.');
      return;
    }

    adicionarLancamento({ tipo: tipoEscolhido, descricao, categoria, valor }, true);
    fecharModal();
    mostrarToast('Lançamento adicionado! 🎉');
  });
});

// Ao carregar a página, recupera lançamentos salvos em visitas anteriores
function carregarLancamentosSalvos() {
  const lancamentosSalvos = JSON.parse(localStorage.getItem(CHAVE_LOCALSTORAGE)) || [];
  lancamentosSalvos.forEach((dados) => adicionarLancamento(dados, false));
}

carregarLancamentosSalvos();


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
    });
    li.replaceWith(noAtualizado);

    atualizarResumoNaTela(estadoAntigo);
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
  { nome: 'Moradia', valor: 650, porcentagem: 33, icone: 'fa-house' },
  { nome: 'Alimentação', valor: 420, porcentagem: 22, icone: 'fa-cart-shopping' },
  { nome: 'Transporte', valor: 280, porcentagem: 14, icone: 'fa-gas-pump' },
  { nome: 'Outros', valor: 580, porcentagem: 31, icone: 'fa-ellipsis' },
];

document.getElementById('link-ver-todas-categorias').addEventListener('click', (evento) => {
  evento.preventDefault(); // link <a> não deve navegar de verdade

  const htmlLista = categoriasExemplo.map((categoria) => `
    <div class="modal-lista-item">
      <div class="linha-categoria-topo">
        <span><i class="fa-solid ${categoria.icone}"></i> ${categoria.nome}</span>
        <span class="valor-sensivel">${formatarMoeda(categoria.valor)}</span>
      </div>
      <div class="barra-progresso">
        <div class="barra-progresso-preenchida" style="width: ${categoria.porcentagem}%;"></div>
      </div>
    </div>
  `).join('');

  abrirModal('Todas as categorias', htmlLista);
});

const metasExemplo = [
  { nome: 'Reserva de Emergência', meta: 10000, atual: 6000, porcentagem: 60, icone: 'fa-piggy-bank' },
  { nome: 'Viagem para a praia', meta: 3000, atual: 900, porcentagem: 30, icone: 'fa-umbrella-beach' },
  { nome: 'Notebook novo', meta: 5000, atual: 4000, porcentagem: 80, icone: 'fa-laptop' },
];

document.getElementById('link-ver-todas-metas').addEventListener('click', (evento) => {
  evento.preventDefault();

  const htmlLista = metasExemplo.map((meta) => `
    <div class="modal-lista-item">
      <div class="linha-meta-topo">
        <strong><i class="fa-solid ${meta.icone}"></i> ${meta.nome}</strong>
        <span class="porcentagem-meta valor-sensivel">${meta.porcentagem}%</span>
      </div>
      <div class="barra-progresso">
        <div class="barra-progresso-preenchida" style="width: ${meta.porcentagem}%;"></div>
      </div>
      <span class="meta-valor-atual valor-sensivel">${formatarMoeda(meta.atual)} / ${formatarMoeda(meta.meta)}</span>
    </div>
  `).join('');

  abrirModal('Todas as metas', htmlLista);
});

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

const evolucaoSaldoExemplo = {
  dias: ['Qui', 'Sex', 'Sáb', 'Dom', 'Seg', 'Ter', 'Hoje'],
  valores: [3850, 4200, 3980, 4450, 4100, 4280, 4320],
};

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

  instanciaGraficoEvolucao = new Chart(canvas, {
    type: 'line',
    data: {
      labels: evolucaoSaldoExemplo.dias,
      datasets: [{
        data: evolucaoSaldoExemplo.valores,
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
        backgroundColor: ['#2F6FED', '#1AA260', '#F59E0B', '#9AA0AC'],
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