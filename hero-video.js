/* Vídeos em loop no hero: cada destaque do carrossel tem o seu, feito com trechos do próprio filme.
   A imagem do slide continua por baixo; o vídeo entra com uma fusão quando começa a tocar.
   Troca junto com o slide; para quando o hero sai da tela ou quando o leitor aperta a pausa.
   Não carrega com "reduzir movimento", economia de dados ou conexão lenta.
   Usa AV1 (cerca de 30% menor) só onde o aparelho o decodifica com fluidez e em hardware;
   nos demais, H.264. Depois que o vídeo atual carrega, adianta o download do próximo slide. */
(() => {
  const hero = document.querySelector('.cinema-hero');
  const video = hero && hero.querySelector('.cinema-hero-video');
  const data = window.RDV_DATA;
  if (!hero || !video || !data) return;
  const reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rede = navigator.connection || {};
  if (reduz || rede.saveData || /(^|-)2g$/.test(rede.effectiveType || '')) return;

  const FILMES = {
    OMC0Q5PHGa8: 'chablis',
    wNMc4HsDYaM: 'hospices',
    VACW0HGiJU4: 'caroline-frey',
    fHlo60GJWpM: 'margaux',
    Fa8v7zUV4DQ: 'soutard'
  };
  const ids = Array.isArray(data.heroVideoIds) ? data.heroVideoIds : [];
  const largura = innerWidth <= 850 ? '1280' : '1920';
  const VERSAO = 6;
  let atual = null;
  let indiceAtual = 0;
  let sufixo = '';
  const adiantados = new Set();

  // AV1 só com decodificação em hardware: em software, o próprio formato poderia engasgar.
  const av1 = (async () => {
    try {
      if (!navigator.mediaCapabilities || !video.canPlayType('video/mp4; codecs="av01.0.08M.10"')) return false;
      const info = await navigator.mediaCapabilities.decodingInfo({
        type: 'file',
        video: { contentType: 'video/mp4; codecs="av01.0.08M.10"', width: +largura, height: largura === '1920' ? 1080 : 720, bitrate: 2000000, framerate: 24 }
      });
      return info.supported && info.smooth && info.powerEfficient;
    } catch (e) { return false; }
  })();

  const arquivo = (nome) => `assets/video/${nome}-hero-${largura}${sufixo}.mp4?v=${VERSAO}`;
  const adiantar = () => {
    const prox = FILMES[ids[(indiceAtual + 1) % ids.length]];
    if (!prox || prox === atual || adiantados.has(prox)) return;
    adiantados.add(prox);
    const link = document.createElement('link');
    link.rel = 'prefetch'; link.as = 'video'; link.href = arquivo(prox);
    document.head.appendChild(link);
  };

  const tocar = () => {
    if (!atual || hero.classList.contains('is-paused')) { if (!video.paused) video.pause(); return; }
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  };
  const escolher = (indice) => {
    indiceAtual = indice;
    const nome = FILMES[ids[indice]] || null;
    if (nome === atual) return tocar();
    atual = nome;
    hero.classList.remove('has-video');
    video.pause();
    if (!nome) { video.removeAttribute('src'); video.load(); return; }
    video.src = arquivo(nome);
    video.load();
    tocar();
  };

  video.addEventListener('playing', () => { if (atual) hero.classList.add('has-video'); });
  video.addEventListener('canplaythrough', adiantar);
  new MutationObserver(tocar).observe(hero, { attributes: true, attributeFilter: ['class'] });

  // o primeiro slide já foi mostrado antes deste script carregar
  const ativo = [...hero.querySelectorAll('.cinema-carousel-dots button')].findIndex((b) => b.classList.contains('is-active'));
  av1.then((ok) => {
    sufixo = ok ? '-av1' : '';
    hero.addEventListener('rdv:slide', (e) => escolher(e.detail));
    escolher(atual === null && ativo >= 0 ? ativo : indiceAtual);
  });
})();
