/* Hero em tela cheia: menu sobre o hero, saída ao rolar e pausa do movimento. */
(() => {
  const hero = document.querySelector('.cinema-hero');
  const header = document.querySelector('.cinema-header');
  if (!hero || !header) return;

  // Botão quadrado: pausa e retoma o movimento da imagem.
  const square = hero.querySelector('[data-hero-motion]');
  const PAUSE = '<path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/>';
  const PLAY = '<path d="M4 2.5v11l9-5.5z" fill="currentColor"/>';
  let userPaused = false;
  if (square) square.addEventListener('click', () => {
    userPaused = !userPaused;
    hero.classList.toggle('is-paused', userPaused);
    square.setAttribute('aria-pressed', String(userPaused));
    square.setAttribute('aria-label', userPaused ? 'Retomar o movimento da imagem' : 'Pausar o movimento da imagem');
    square.querySelector('svg').innerHTML = userPaused ? PLAY : PAUSE;
  });

  // Ao rolar: o hero escurece e some; o menu ganha fundo; fora da tela, o movimento para.
  let ticking = false;
  const update = () => {
    ticking = false;
    const h = hero.offsetHeight || 1;
    const p = Math.min(1, Math.max(0, scrollY / h));
    hero.style.setProperty('--p', p.toFixed(3));
    header.classList.toggle('is-solid', scrollY > h - 120);
    if (!userPaused) hero.classList.toggle('is-paused', p >= .98);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();
