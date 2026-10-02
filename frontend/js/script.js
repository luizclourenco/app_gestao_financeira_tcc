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

botoesMenu.forEach((botao) => {
  botao.addEventListener('click', () => {
    const idTelaEscolhida = botao.getAttribute('data-tela');

    telas.forEach((tela) => tela.classList.remove('tela-ativa'));

    const telaEscolhida = document.getElementById(idTelaEscolhida);
    telaEscolhida.classList.add('tela-ativa');

    botoesMenu.forEach((b) => b.classList.remove('item-menu-ativo'));
    botao.classList.add('item-menu-ativo');
  });
});


/*
  ================================================
  PARTE 2 - ESCONDER/MOSTRAR O SALDO (ícone do olho)
  ================================================
*/

const botaoOlho = document.getElementById('botao-olho');
const valorSaldoElemento = document.getElementById('valor-saldo');
let saldoEstaVisivel = true;

botaoOlho.addEventListener('click', () => {
  saldoEstaVisivel = !saldoEstaVisivel;

  if (saldoEstaVisivel) {
    valorSaldoElemento.textContent = formatarMoeda(estadoFinanceiro.saldo);
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

  Importante: aqui a gente busca os ".lancamento" DE NOVO a cada
  clique (document.querySelectorAll dentro do addEventListener),
  em vez de guardar numa variável só uma vez lá em cima. Isso é
  necessário porque, quando adicionamos um lançamento novo pelo
  formulário, ele é criado depois que a página já carregou — se a
  lista fosse "fotografada" só uma vez no início, o item novo
  nunca seria filtrado.
*/

const abasFiltro = document.querySelectorAll('.aba');

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

// Repinta todos os lugares da tela que mostram Receitas/Despesas/Saldo
function atualizarResumoNaTela() {
  estadoFinanceiro.saldo = estadoFinanceiro.receitas - estadoFinanceiro.despesas;

  // Economia % = quanto sobrou em relação ao que entrou (regra de 3 simples)
  const economiaPercentual = estadoFinanceiro.receitas > 0
    ? Math.round((estadoFinanceiro.saldo / estadoFinanceiro.receitas) * 100)
    : 0;

  // Card de saldo (topo da Tela 1)
  valorSaldoElemento.textContent = formatarMoeda(estadoFinanceiro.saldo);

  // Mini-cards Receitas/Despesas
  document.getElementById('mini-total-receitas').textContent = formatarMoeda(estadoFinanceiro.receitas);
  document.getElementById('mini-total-despesas').textContent = formatarMoeda(estadoFinanceiro.despesas);

  // Card "Resumo do mês"
  document.getElementById('resumo-total-receitas').textContent = formatarMoeda(estadoFinanceiro.receitas);
  document.getElementById('resumo-total-despesas').textContent = formatarMoeda(estadoFinanceiro.despesas);
  document.getElementById('resumo-saldo').textContent = formatarMoeda(estadoFinanceiro.saldo);

  // Gráfico donut: a variável --percentual é o que o CSS usa pra desenhar a fatia
  const donut = document.getElementById('donut-grafico');
  donut.style.setProperty('--percentual', economiaPercentual);
  document.getElementById('donut-texto').textContent = economiaPercentual + '%';
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
  'Alimentação': '🛒',
  'Transporte': '⛽',
  'Moradia': '🏠',
  'Lazer': '🎮',
  'Saúde': '💊',
  'Receita': '💰',
  'Outros': '🔘',
};

const listaHoje = document.getElementById('lista-hoje');
const CHAVE_LOCALSTORAGE = 'meu-bolso:lancamentos-extras';

// Cria o <li> de um lançamento e coloca no topo da lista de "Hoje"
function criarElementoLancamento(dados) {
  const item = document.createElement('li');
  item.className = 'lancamento';
  item.setAttribute('data-tipo', dados.tipo);

  const icone = iconesPorCategoria[dados.categoria] || '🔘';
  const classeIcone = dados.tipo === 'receita' ? 'icone-receita' : 'icone-despesa';
  const classeValor = dados.tipo === 'receita' ? 'valor-positivo' : 'valor-negativo';
  const prefixoValor = dados.tipo === 'receita' ? '' : '- ';

  item.innerHTML = `
    <span class="icone-lancamento ${classeIcone}">${icone}</span>
    <div class="info-lancamento">
      <strong>${dados.descricao}</strong>
      <span class="categoria-lancamento">${dados.categoria}</span>
    </div>
    <strong class="${classeValor}">${prefixoValor}${formatarMoeda(dados.valor)}</strong>
    <span class="seta-lancamento">›</span>
  `;

  listaHoje.prepend(item); // "prepend" coloca no TOPO da lista, não no final
}

// Junta: cria o elemento na tela + atualiza os totais + (opcionalmente) salva
function adicionarLancamento(dados, salvarNoLocalStorage) {
  criarElementoLancamento(dados);

  if (dados.tipo === 'receita') {
    estadoFinanceiro.receitas += dados.valor;
  } else {
    estadoFinanceiro.despesas += dados.valor;
  }
  atualizarResumoNaTela();

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
  PARTE 8 - "VER TODAS" (categorias e metas) + RELATÓRIOS
  ================================================

  Esses modais, por enquanto, só reorganizam dados que já existem
  na própria tela (categorias) ou usam mais 2 metas de exemplo.
  Quando o back-end existir, a ideia é a mesma: só troca de onde
  vem a lista (em vez de fixo aqui no JS, viria de um fetch).
*/

const categoriasExemplo = [
  { nome: 'Moradia', valor: 650, porcentagem: 33, icone: '🏠' },
  { nome: 'Alimentação', valor: 420, porcentagem: 22, icone: '🛒' },
  { nome: 'Transporte', valor: 280, porcentagem: 14, icone: '⛽' },
  { nome: 'Outros', valor: 580, porcentagem: 31, icone: '🔘' },
];

document.getElementById('link-ver-todas-categorias').addEventListener('click', (evento) => {
  evento.preventDefault(); // link <a> não deve navegar de verdade

  const htmlLista = categoriasExemplo.map((categoria) => `
    <div class="modal-lista-item">
      <div class="linha-categoria-topo">
        <span>${categoria.icone} ${categoria.nome}</span>
        <span>${formatarMoeda(categoria.valor)}</span>
      </div>
      <div class="barra-progresso">
        <div class="barra-progresso-preenchida" style="width: ${categoria.porcentagem}%;"></div>
      </div>
    </div>
  `).join('');

  abrirModal('Todas as categorias', htmlLista);
});

const metasExemplo = [
  { nome: 'Reserva de Emergência', meta: 10000, atual: 6000, porcentagem: 60, icone: '🐷' },
  { nome: 'Viagem para a praia', meta: 3000, atual: 900, porcentagem: 30, icone: '🏖️' },
  { nome: 'Notebook novo', meta: 5000, atual: 4000, porcentagem: 80, icone: '💻' },
];

document.getElementById('link-ver-todas-metas').addEventListener('click', (evento) => {
  evento.preventDefault();

  const htmlLista = metasExemplo.map((meta) => `
    <div class="modal-lista-item">
      <div class="linha-meta-topo">
        <strong>${meta.icone} ${meta.nome}</strong>
        <span class="porcentagem-meta">${meta.porcentagem}%</span>
      </div>
      <div class="barra-progresso">
        <div class="barra-progresso-preenchida" style="width: ${meta.porcentagem}%;"></div>
      </div>
      <span class="meta-valor-atual">${formatarMoeda(meta.atual)} / ${formatarMoeda(meta.meta)}</span>
    </div>
  `).join('');

  abrirModal('Todas as metas', htmlLista);
});

// Atalhos de relatório (Mensal / Categorias / Comparativos)
document.querySelectorAll('.atalho-relatorio').forEach((botao) => {
  botao.addEventListener('click', () => {
    const nomeRelatorio = botao.getAttribute('data-relatorio');
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
const CHAVE_TEMA = 'meu-bolso:tema';

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema);
  botaoTema.textContent = tema === 'escuro' ? '☀️' : '🌙';
  localStorage.setItem(CHAVE_TEMA, tema);
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