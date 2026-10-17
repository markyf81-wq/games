/* Responsive measurement is separate from game rules and DOM rendering. */
(() => {
  const $ = (id) => document.getElementById(id);
  window.FKTableLayout = class TableLayout {
    constructor({ getState, onBeforeLayout }) {
      this.getState = getState;
      this.onBeforeLayout = onBeforeLayout;
      this.frame = null;
      this.observer = null;
      this.onResize = () => {
        if (this.frame !== null) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = null;
          this.update();
        });
      };
    }
    observe() {
      if (typeof ResizeObserver !== 'undefined') {
        this.observer = new ResizeObserver(this.onResize);
        [$('hand'), $('battlefield'), $('rival-hand'), document.querySelector('.sidebar')].forEach(
          (element) => this.observer.observe(element)
        );
      } else window.addEventListener('resize', this.onResize);
    }
    destroy() {
      this.observer?.disconnect();
      window.removeEventListener('resize', this.onResize);
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    update() {
      this.onBeforeLayout();
      const hand = $('hand'),
        count = hand.children.length;
      const handStyle = getComputedStyle(hand),
        handPixels = (name) => parseFloat(handStyle[name]) || 0;
      const handHeight = hand.clientHeight - handPixels('paddingTop') - handPixels('paddingBottom');
      const handWidth = hand.clientWidth - handPixels('paddingLeft') - handPixels('paddingRight');
      // Straight cards fill the available hand height without rotation or a curved drop.
      const cardWidth = Math.max(1, Math.floor(Math.min(handWidth, (handHeight - 4) / 1.414)));
      hand.style.setProperty('--hand-card-width', `${cardWidth}px`);
      // Hover previews render outside the hand, so only the overlapping cards need to fit here.
      const overlap =
        count > 1
          ? Math.min(
              cardWidth - 2,
              Math.max(cardWidth * 0.22, (count * cardWidth - hand.clientWidth + 40) / (count - 1))
            )
          : 0;
      hand.style.setProperty('--hand-overlap', `${overlap}px`);
      const rival = $('rival-hand'),
        backs = rival.children.length,
        backWidth = rival.firstElementChild?.offsetWidth || 30;
      const rivalOverlap =
        backs > 1
          ? Math.min(
              backWidth - 2,
              Math.max(backWidth * 0.25, (backs * backWidth - rival.clientWidth + 12) / (backs - 1))
            )
          : 0;
      rival.style.setProperty('--rival-overlap', `${rivalOverlap}px`);
      let largestBoardWidth = 0;
      document.querySelectorAll('.row-cards').forEach((lane) => {
        const cards = lane.querySelectorAll('.board-card');
        if (!cards.length) return;
        const style = getComputedStyle(lane),
          pixels = (name) => parseFloat(style[name]) || 0;
        const height = lane.clientHeight - pixels('paddingTop') - pixels('paddingBottom');
        const width = lane.clientWidth - pixels('paddingLeft') - pixels('paddingRight');
        const gap = pixels('columnGap'),
          heightLimit = (Math.min(110, height - 2) * 877) / 1240;
        const minimum = Math.min(48, heightLimit, width);
        const fit = (width - (cards.length - 1) * gap) / cards.length;
        const cardWidth = Math.max(1, Math.floor(Math.min(heightLimit, width, Math.max(minimum, fit))));
        largestBoardWidth = Math.max(largestBoardWidth, cardWidth);
        const overlap =
          cards.length > 1
            ? Math.max(0, (cards.length * cardWidth + (cards.length - 1) * gap - width) / (cards.length - 1))
            : 0;
        lane.style.setProperty('--board-card-width', `${cardWidth}px`);
        lane.style.setProperty('--row-card-overlap', `${overlap}px`);
        lane.style.setProperty('--power-badge-size', `${Math.max(10, Math.min(17, cardWidth * 0.5))}px`);
        lane.style.setProperty('--power-badge-font', `${Math.max(7, Math.min(10, cardWidth * 0.3))}px`);
        lane.style.setProperty('--bonus-marker-font', `${Math.max(4, Math.min(10, cardWidth * 0.24))}px`);
      });
      if (this.getState().weather.length && window.matchMedia('(max-width: 980px)').matches) {
        const strip = document.querySelector('.aligned-weather'),
          style = getComputedStyle(strip);
        const pixels = (name) => parseFloat(style[name]) || 0;
        const height = strip.clientHeight - pixels('paddingTop') - pixels('paddingBottom');
        const width =
          strip.clientWidth -
          pixels('paddingLeft') -
          pixels('paddingRight') -
          (this.getState().weather.length - 1) * pixels('columnGap');
        const weatherWidth = Math.max(
          1,
          Math.floor(
            Math.min(
              largestBoardWidth || (110 * 877) / 1240,
              (height * 877) / 1240,
              width / this.getState().weather.length
            )
          )
        );
        $('battlefield').style.setProperty('--weather-card-width', `${weatherWidth}px`);
      }
      this.layoutSidebar();
    }
    layoutSidebar() {
      const sidebar = document.querySelector('.sidebar');
      if (window.matchMedia('(max-width: 980px)').matches) {
        sidebar.style.removeProperty('--inspector-art-height');
        sidebar.style.removeProperty('--history-gap');
        return;
      }
      const inspector = $('inspector'),
        art = inspector.querySelector('.inspect-art'),
        history = document.querySelector('.history-panel');
      const historyStyle = getComputedStyle(history),
        sidebarStyle = getComputedStyle(sidebar);
      // Reserve space for a readable preview; older entries scroll instead of shrinking the artwork.
      const items = [...$('history').children].slice(0, 7);
      const itemHeight = items.reduce((sum, item) => sum + item.offsetHeight, 0);
      const label = history.querySelector('.section-label');
      const historyHeading =
        label.offsetHeight +
        (parseFloat(getComputedStyle(label).marginBottom) || 0) +
        (parseFloat(historyStyle.paddingTop) || 0) +
        (parseFloat(historyStyle.borderTopWidth) || 0);
      const gap = parseFloat(sidebarStyle.rowGap) || 0;
      const fixed =
        inspector.offsetHeight - (art?.offsetHeight || 0) + $('current-settings').offsetHeight + gap * 2;
      if (art) {
        const width =
          sidebar.clientWidth -
          (parseFloat(sidebarStyle.paddingLeft) || 0) -
          (parseFloat(sidebarStyle.paddingRight) || 0);
        const available =
          sidebar.clientHeight - fixed - historyHeading - itemHeight - Math.max(0, items.length - 1) * 10;
        const height = Math.max(30, Math.min((width - 12) * 1.414 + 10, available));
        sidebar.style.setProperty('--inspector-art-height', `${height}px`);
      }
      const artHeight = art?.offsetHeight || 0;
      const spacing =
        (sidebar.clientHeight - fixed - artHeight - historyHeading - itemHeight) /
        Math.max(1, items.length - 1);
      sidebar.style.setProperty('--history-gap', `${Math.max(6, Math.min(36, spacing))}px`);
    }
  };
})();
