/*
  SERVICE WORKER
  ================================================
  Isso aqui é um script que o navegador roda "por trás" da página,
  mesmo quando ela está fechada. Ele é o responsável por:
    1. Deixar o app instalável (vira um "app de verdade" no celular)
    2. Guardar os arquivos principais num cache, pra funcionar
       mesmo sem internet (ou com internet ruim)

  Trocar o número da versão (ex: 'v1' pra 'v2') força o navegador a
  baixar os arquivos de novo — útil quando você atualiza o projeto
  e quer que o cache antigo seja descartado.
*/

const CACHE_NOME = 'meu-bolso-v3';

const ARQUIVOS_PARA_GUARDAR_OFFLINE = [
  './',
  './index.html',
  './css/style.css',
  './js/script.js',
  './manifest.json',
  './icons/icon.svg',
];

// Evento "install": roda uma vez, quando o Service Worker é instalado
// pela primeira vez (ou quando uma versão NOVA dele é detectada).
// Aqui a gente já baixa e guarda os arquivos no cache.
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_PARA_GUARDAR_OFFLINE))
  );

  // Sem isso, um Service Worker novo fica "esperando" (estado waiting)
  // até TODAS as abas do site serem fechadas, pra só então assumir.
  // Com skipWaiting(), ele pula essa espera e assume assim que instala.
  self.skipWaiting();
});

// Evento "activate": roda quando o Service Worker novo assume o controle.
// Aproveitamos pra apagar caches de versões antigas (ex: 'meu-bolso-v1'),
// pra não acumular lixo no navegador da pessoa.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nomesDeCache) =>
      Promise.all(
        nomesDeCache
          .filter((nome) => nome !== CACHE_NOME)
          .map((nome) => caches.delete(nome))
      )
    )
  );

  // clients.claim() faz esse Service Worker assumir o controle das abas
  // que JÁ estavam abertas, sem precisar recarregar a página duas vezes.
  self.clients.claim();
});

/*
  Evento "fetch": roda toda vez que a página pede algum arquivo
  (html, css, js, imagem...).

  IMPORTANTE — isso mudou de estratégia:
  Antes era "cache primeiro" (caches.match → só se não achar, busca
  na internet). Isso causava um problema chato: toda vez que a gente
  atualizava um arquivo (CSS, JS), o navegador continuava servindo a
  cópia VELHA do cache pra sempre, mesmo com Ctrl+F5 — porque o
  cache sempre "ganhava" da internet.

  Agora é "internet primeiro": tenta buscar a versão mais nova na
  internet; só se der erro (sem internet mesmo) é que usa a cópia
  salva no cache como plano B. Assim, enquanto você tem internet
  (ou o Live Server rodando), sempre pega a versão mais recente — e
  o modo offline continua funcionando do mesmo jeito.
*/
self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    fetch(evento.request)
      .then((respostaDaInternet) => {
        // Deu certo buscar na internet: atualiza o cache com essa
        // cópia fresca, pra usar como plano B da próxima vez que
        // estiver offline.
        const copiaParaCache = respostaDaInternet.clone();
        caches.open(CACHE_NOME).then((cache) => cache.put(evento.request, copiaParaCache));
        return respostaDaInternet;
      })
      .catch(() => {
        // Não deu pra buscar na internet (provavelmente offline):
        // usa a última cópia salva no cache como plano B.
        return caches.match(evento.request);
      })
  );
});