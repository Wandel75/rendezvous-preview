/* Curtas do Caderno: as setas rolam a fileira uma "página" por vez. */
(() => {
  const row = document.querySelector('.curtas-row');
  if (!row) return;
  document.querySelector('.curtas')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-curtas]');
    if (!button) return;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollBy({ left: Number(button.dataset.curtas) * row.clientWidth * 0.8, behavior: smooth ? 'smooth' : 'auto' });
  });
})();
