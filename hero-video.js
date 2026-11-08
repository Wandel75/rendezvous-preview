/* Vídeos em loop no hero: cada destaque do carrossel tem o seu, feito com trechos do próprio filme.
   A imagem do slide continua por baixo; o vídeo entra com uma fusão quando começa a tocar.
   Troca junto com o slide; para quando o hero sai da tela ou quando o leitor aperta a pausa.
   Não carrega com "reduzir movimento", economia de dados ou conexão lenta. */
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
  let atual = null;

  const tocar = () => {
    if (!atual || hero.classList.contains('is-paused')) { if (!video.paused) video.pause(); return; }
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  };
  const escolher = (indice) => {
    const nome = FILMES[ids[indice]] || null;
    if (nome === atual) return tocar();
    atual = nome;
    hero.classList.remove('has-video');
    video.pause();
    if (!nome) { video.removeAttribute('src'); video.load(); return; }
    video.src = `assets/video/${nome}-hero-${largura}.mp4?v=5`;
    video.load();
    tocar();
  };

  video.addEventListener('playing', () => { if (atual) hero.classList.add('has-video'); });
  hero.addEventListener('rdv:slide', (e) => escolher(e.detail));
  new MutationObserver(tocar).observe(hero, { attributes: true, attributeFilter: ['class'] });

  // o primeiro slide já foi mostrado antes deste script carregar
  const ativo = [...hero.querySelectorAll('.cinema-carousel-dots button')].findIndex((b) => b.classList.contains('is-active'));
  escolher(ativo >= 0 ? ativo : 0);
})();
