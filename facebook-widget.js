// Reflexo de luz no widget do Facebook: uma vez depois da entrada e a cada troca de slide do hero.
(function () {
  var widget = document.querySelector('.fbw');
  var hero = document.querySelector('.cinema-hero');
  if (!widget || !hero) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function brilhar() {
    widget.classList.remove('is-brilho');
    void widget.offsetWidth; // reinicia a animação
    widget.classList.add('is-brilho');
  }

  widget.addEventListener('animationend', function (event) {
    if (event.animationName === 'fbw-entra') brilhar();
    if (event.animationName === 'fbw-brilho') widget.classList.remove('is-brilho');
  });
  hero.addEventListener('rdv:slide', brilhar);
})();
