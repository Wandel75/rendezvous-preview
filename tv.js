(() => {
  for (const details of document.querySelectorAll('details[data-map]')) {
    details.addEventListener('toggle', () => {
      const slot = details.querySelector('.tv-map-frame');
      if (!details.open || slot.firstChild) return;
      const frame = document.createElement('iframe');
      frame.src = details.dataset.map;
      frame.title = 'Mapa interativo da região · OpenStreetMap';
      slot.append(frame);
    });
  }

  // Trechos da entrevista em áudio: cada botão leva ao minuto indicado.
  const audio = document.querySelector('.tv-audio audio');
  if (audio) {
    document.querySelector('.tv-chapters')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-seek]');
      if (!button) return;
      const at = Number(button.dataset.seek);
      const jump = () => { audio.currentTime = at; audio.play(); };
      if (audio.readyState >= 1) jump();
      else { audio.addEventListener('loadedmetadata', jump, { once: true }); audio.load(); }
    });
  }

  // Link da busca para um trecho (#t=113): rola até o áudio, marca o trecho e deixa o minuto pronto.
  const moment = /^#t=(\d+)$/.exec(location.hash);
  if (audio && moment) {
    const at = Number(moment[1]);
    const section = document.querySelector('.tv-audio');
    const chapter = document.querySelector(`.tv-chapters [data-seek="${at}"]`);
    chapter?.classList.add('is-current');
    requestAnimationFrame(() => section?.scrollIntoView({ block: 'start' }));
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => { audio.currentTime = at; }, { once: true });
    audio.load();
  }

  const screen = document.querySelector('.tv-screen');
  if (!screen) return;

  const episodes = Array.from(document.querySelectorAll('[data-episode]'));
  const title = document.querySelector('.tv-now-playing');
  const youtube = document.querySelector('.tv-youtube');

  function play(id, label, moveFocus, start) {
    if (!/^[\w-]{11}$/.test(id)) return;
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1' + (start ? '&start=' + start : '');
    frame.title = 'YouTube · ' + label;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    screen.replaceChildren(frame);
    if (title) title.textContent = label;
    youtube.href = 'https://www.youtube.com/watch?v=' + id;
    for (const episode of episodes) {
      if (episode.dataset.episode === id) episode.setAttribute('aria-current', 'true');
      else episode.removeAttribute('aria-current');
    }
    if (moveFocus) frame.focus();
  }

  screen.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tv-play]');
    if (button) play(button.dataset.tvPlay, button.dataset.title, true, Number(button.dataset.start) || 0);
  });

  // Link da busca para uma fala do filme (#v=222): o botão passa a começar no minuto certo.
  const speech = /^#v=(\d+)$/.exec(location.hash);
  const poster = screen.querySelector('[data-tv-play]');
  if (speech && poster) {
    const at = Number(speech[1]);
    poster.dataset.start = at;
    const label = poster.querySelector('span');
    if (label) label.lastChild.textContent = 'Assistir a partir de ' + Math.floor(at / 60) + ':' + String(at % 60).padStart(2, '0');
    requestAnimationFrame(() => screen.scrollIntoView({ block: 'center' }));
  }

  for (const episode of episodes) {
    episode.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      play(episode.dataset.episode, episode.dataset.title, false);
    });
  }
})();
