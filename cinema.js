(() => {
  const data = window.RDV_DATA;
  if (!data) return;

  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  const hero = document.querySelector('.cinema-hero');
  const defaultHeroIds = ['OMC0Q5PHGa8', 'VACW0HGiJU4', 'fHlo60GJWpM', 'Fa8v7zUV4DQ'];
  const heroIds = Array.isArray(data.heroVideoIds) ? data.heroVideoIds : defaultHeroIds;
  const slides = heroIds.map(id => data.videos.find(video => video.id === id)).filter(Boolean);
  const heroImages = {
    'fHlo60GJWpM': ['assets/archive-7b97a37bf32dc05a46127162.png', 'Château Margaux · Acervo RENDEZVOUS'],
    'OMC0Q5PHGa8': [innerWidth <= 850 ? 'assets/hero-chablis-1080.webp' : 'assets/hero-chablis-1920.webp', 'Chablis · Acervo RENDEZVOUS'],
    '490JTEYLM-M': ['assets/archive-bc1f05b87056edc4b34159e2.png', 'Château de La Tour · Acervo RENDEZVOUS']
  };
  const player = hero.querySelector('.cinema-hero-player');
  const playerImage = player.querySelector('img');
  const playerInfo = player.querySelector('small');
  const playerTitle = player.querySelector('strong');
  const dots = hero.querySelector('.cinema-carousel-dots');
  const status = hero.querySelector('.cinema-slide-status');
  let activeSlide = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  function showSlide(index) {
    activeSlide = (index + slides.length) % slides.length;
    const video = slides[activeSlide];
    const chablis = video.id === 'OMC0Q5PHGa8';
    const picture = heroImages[video.id] || [video.image, video.person + ' · Acervo RENDEZVOUS'];
    const landscape = hero.querySelector('.cinema-hero-landscape');
    landscape.src = picture[0];
    landscape.alt = picture[1];
    hero.classList.toggle('is-chablis', chablis);
    hero.classList.toggle('is-video-poster', !heroImages[video.id]);
    hero.querySelector('.cinema-eyebrow').textContent = video.region + ' · Encontros RENDEZVOUS';
    const headlines = {
      OMC0Q5PHGa8: 'Chablis.<br><em>O lugar do vinho.</em>',
      VACW0HGiJU4: 'Caroline Frey.<br><em>Entre dois mundos.</em>',
      fHlo60GJWpM: 'A arte<br>de <em>Margaux.</em>',
      Fa8v7zUV4DQ: 'Saint-Émilion.<br><em>Por quem conhece.</em>'
    };
    hero.querySelector('h1').innerHTML = headlines[video.id] || escape(video.title);
    hero.querySelector('.cinema-hero-intro').textContent = video.description;
    const series = data.heroSeries?.[video.id];
    const destination = series || video.pageUrl;
    const action = series ? 'Ver a série' : 'Assistir ao filme';
    const heroLink = hero.querySelector('.cinema-hero-link');
    heroLink.href = destination;
    heroLink.firstChild.textContent = action + ' ';
    player.href = destination;
    player.setAttribute('aria-label', action + ' · ' + video.title);
    playerImage.src = video.image;
    playerInfo.textContent = (series ? 'SÉRIE' : 'EM CARTAZ') + ' · ' + video.duration;
    playerTitle.textContent = video.title;
    hero.querySelector('.cinema-landscape-credit').textContent = picture[1];
    status.textContent = String(activeSlide + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    dots.querySelectorAll('button').forEach((button, position) => {
      button.setAttribute('aria-pressed', String(position === activeSlide));
      button.classList.toggle('is-active', position === activeSlide);
    });
    hero.dispatchEvent(new CustomEvent('rdv:slide', { detail: activeSlide }));

  }

  if (slides.length) {
    dots.innerHTML = slides.map((video, index) => '<button type="button" data-slide="' + index + '" aria-label="Destaque ' + (index + 1) + ': ' + escape(video.title) + '"><span>' + String(index + 1).padStart(2, '0') + '</span></button>').join('');
    hero.querySelector('[data-slide-prev]').addEventListener('click', () => showSlide(activeSlide - 1));
    hero.querySelector('[data-slide-next]').addEventListener('click', () => showSlide(activeSlide + 1));
    dots.addEventListener('click', event => {
      const button = event.target.closest('[data-slide]');
      if (button) showSlide(Number(button.dataset.slide));
    });
    hero.addEventListener('keydown', event => {
      if (!event.target.closest('.cinema-carousel-controls')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showSlide(activeSlide + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    hero.addEventListener('touchstart', event => {
      touchStartX = event.changedTouches[0].clientX;
      touchStartY = event.changedTouches[0].clientY;
    }, { passive: true });
    hero.addEventListener('touchend', event => {
      const dx = event.changedTouches[0].clientX - touchStartX;
      const dy = event.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) showSlide(activeSlide + (dx < 0 ? 1 : -1));
    }, { passive: true });
    showSlide(0);
  }

})();
