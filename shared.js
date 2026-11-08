(() => {
  if (new URLSearchParams(location.search).get("marca") === "maison") document.body.classList.add("brand-maison");
  const data = window.RDV_DATA;
  if (!data) return;

  const escape = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
  let previousFocus;

  const player = document.createElement('dialog');
  player.className = 'rdv-dialog';
  player.id = 'video-dialog';
  player.setAttribute('aria-labelledby', 'player-title');
  player.innerHTML = '<div class="dialog-head"><div><p class="dialog-kicker">RENDEZVOUS · Filme do acervo</p><h2 id="player-title"></h2></div><button class="dialog-close" aria-label="Fechar vídeo">×</button></div><div class="video-frame"></div><div class="video-footer"><p id="player-description"></p><a id="youtube-link" target="_blank" rel="noopener noreferrer">Assistir no YouTube ↗</a></div>';
  document.body.append(player);

  function openVideo(id) {
    const video = data.videos.find(item => item.id === id);
    if (!video) return;
    previousFocus = document.activeElement;
    player.querySelector('h2').textContent = video.title;
    player.querySelector('#player-description').textContent = video.person + ' · ' + video.duration;
    player.querySelector('#youtube-link').href = video.url;
    const frame = document.createElement('iframe');
    frame.title = video.originalTitle;
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(video.id) + '?autoplay=1&rel=0';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    player.querySelector('.video-frame').replaceChildren(frame);
    player.showModal();
  }
  player.querySelector('.dialog-close').addEventListener('click', () => player.close());
  player.addEventListener('close', () => {
    player.querySelector('.video-frame').replaceChildren();
    previousFocus?.focus();
  });
  player.addEventListener('click', event => { if (event.target === player) player.close(); });

  document.addEventListener('click', event => {
    const play = event.target.closest('[data-play]');
    if (play) {
      event.preventDefault();
      openVideo(play.dataset.play);
    }
    const menuButton = event.target.closest('[data-menu]');
    if (menuButton) {
      const menu = document.querySelector('#mobile-menu');
      if (menu) {
        menu.hidden = !menu.hidden;
        menuButton.setAttribute('aria-expanded', String(!menu.hidden));
      }
    }
    const mobileLink = event.target.closest('#mobile-menu a');
    if (mobileLink) {
      document.querySelector('#mobile-menu').hidden = true;
      document.querySelector('[data-menu]')?.setAttribute('aria-expanded', 'false');
    }
  });
})();
