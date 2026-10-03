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

const CACHE_NOME = 'meu-bolso-v1';

const ARQUIVOS_PARA_GUARDAR_OFFLINE = [
  './',
  './index.html',
  './css/style.css',
  './js/script.js',
  './manifest.json',
  './icons/icon.svg',
];

// Evento "install": roda uma vez, quando o Service Worker é instalado
// pela primeira vez. Aqui a gente já baixa e guarda os arquivos no cache.
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_PARA_GUARDAR_OFFLINE))
  );
});

// Evento "activate": roda quando o Service Worker novo assume o controle.
// Aproveitamos pra apagar caches de versões antigas (ex: 'meu-bolso-v0'),
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
});

// Evento "fetch": roda toda vez que a página pede algum arquivo
// (html, css, js, imagem...). Primeiro tenta achar no cache (rápido,
// funciona offline); se não achar, busca na internet normalmente.
self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    caches.match(evento.request).then((respostaDoCache) => {
      return respostaDoCache || fetch(evento.request);
    })
  );
});