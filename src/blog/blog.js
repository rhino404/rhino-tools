// blog.js — progressive track filter for blog index
// Cards are statically rendered (crawlable); this just hides/shows them by data-track.
(function () {
  const filterBtns = document.querySelectorAll('.blog-filter-btn');
  const cards = document.querySelectorAll('.blog-card');
  const emptyMsg = document.querySelector('.blog-empty');
  const featured = document.querySelector('.blog-featured');

  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      let visible = 0;

      cards.forEach(card => {
        const match = filter === 'all' || card.dataset.track === filter;
        card.classList.toggle('is-hidden', !match);
        if (match) visible++;
      });

      if (featured) {
        const featuredTrack = featured.querySelector('.blog-featured-inner')?.className.match(/blog-hero--(\S+)/)?.[1];
        featured.classList.toggle('is-hidden', filter !== 'all' && featuredTrack !== filter);
      }

      if (emptyMsg) emptyMsg.classList.toggle('is-hidden', visible > 0);
    });
  });
})();
