'use strict';
(() => {
  const grid = document.getElementById('game-grid');
  const search = document.getElementById('game-search');
  const filterBar = document.getElementById('game-filters');
  const categories = ['All games', ...new Set(GAME_CATALOG.map(game => game.category))];
  let category = 'All games';

  function renderGames() {
    const query = search.value.trim().toLowerCase();
    const visible = GAME_CATALOG.filter(game => {
      const text = [game.title, game.subtitle, game.description, game.category, ...game.tags].join(' ').toLowerCase();
      return (category === 'All games' || category === game.category) && text.includes(query);
    });
    grid.replaceChildren();
    for (const game of visible) {
      const card = document.createElement('article');
      card.className = 'game-card';
      const link = document.createElement('a');
      link.href = game.path;
      link.className = 'game-link';
      link.setAttribute('aria-label', 'Play ' + game.title);
      const preview = document.createElement('div');
      preview.className = 'game-preview';
      preview.style.backgroundColor = game.accent;
      const image = document.createElement('img');
      image.src = game.image; image.alt = game.imageAlt; image.loading = 'lazy';
      image.width = 900; image.height = 660;
      const badge = document.createElement('span');
      badge.className = 'category-badge'; badge.textContent = game.category;
      preview.append(image, badge);
      const body = document.createElement('div'); body.className = 'game-body';
      const tags = document.createElement('div'); tags.className = 'game-tags';
      for (const tag of game.tags) { const label = document.createElement('span'); label.textContent = tag; tags.append(label); }
      const title = document.createElement('h3'); title.textContent = game.title;
      const subtitle = document.createElement('p'); subtitle.className = 'game-subtitle'; subtitle.textContent = game.subtitle;
      const description = document.createElement('p'); description.className = 'game-description'; description.textContent = game.description;
      const bottom = document.createElement('div'); bottom.className = 'game-bottom';
      const detail = document.createElement('span'); detail.textContent = game.detail;
      const play = document.createElement('span'); play.className = 'play-button'; play.textContent = 'Let’s play ↗';
      bottom.append(detail, play); body.append(tags, title, subtitle, description, bottom);
      link.append(preview, body); card.append(link); grid.append(card);
    }
    document.getElementById('game-count').textContent = visible.length + (visible.length === 1 ? ' game' : ' games');
    document.getElementById('empty-message').hidden = visible.length > 0;
    if (!query && category === 'All games') {
      const coming = document.createElement('div'); coming.className = 'coming-card';
      const star = document.createElement('span'); star.className = 'coming-star'; star.textContent = '✧'; star.setAttribute('aria-hidden', 'true');
      const heading = document.createElement('h3'); heading.textContent = 'Room for another adventure.';
      const copy = document.createElement('p'); copy.textContent = 'This little library is just getting started. More games will find a home here.';
      coming.append(star, heading, copy); grid.append(coming);
    }
  }
  for (const label of categories) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.className = label === category ? 'active' : '';
    button.setAttribute('aria-pressed', String(label === category));
    button.addEventListener('click', () => {
      category = label;
      for (const filter of filterBar.children) {
        const active = filter === button;
        filter.classList.toggle('active', active); filter.setAttribute('aria-pressed', String(active));
      }
      renderGames();
    });
    filterBar.append(button);
  }
  search.addEventListener('input', renderGames);
  renderGames();
})();
