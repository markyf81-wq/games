/* Owns mouse/focus previews, touch dragging and compatibility-click suppression. */
window.FKCardPreview = class CardPreviewController {
  constructor({ hand, isAnimating, onSelect, onGesture }) {
    this.hand = hand;
    this.isAnimating = isAnimating;
    this.onSelect = onSelect;
    this.onGesture = onGesture;
    this.preview = null;
    this.source = null;
    this.hold = null;
    this.keyboardNavigation = false;
    this.suppressUntil = 0;
    this.suppressPointer = null;
    this.listeners = [];
    this.bindEvents();
  }
  bindEvents() {
    this.listen(document, 'pointerover', (event) => {
      const card = event.target.closest('.board-card,.hand-card,.weather-card');
      if (card && event.pointerType !== 'touch' && !this.hold) this.show(card);
    });
    this.listen(document, 'pointerout', (event) => {
      if (
        event.pointerType !== 'touch' &&
        this.source &&
        !this.source.contains(event.relatedTarget) &&
        this.source.contains(event.target)
      )
        this.clear();
    });
    this.listen(document, 'focusin', (event) => {
      if (this.hold) return;
      const card = event.target.closest('.board-card,.hand-card,.weather-card');
      if (card && this.keyboardNavigation) this.show(card);
      else this.clear();
    });
    this.listen(document, 'focusout', (event) => {
      if (event.target === this.source) this.clear();
    });
    this.listen(
      document,
      'pointerdown',
      (event) => {
        this.keyboardNavigation = false;
        this.clear();
        if (event.isPrimary) {
          this.suppressUntil = 0;
          this.suppressPointer = null;
        }
        this.onGesture();
        if (
          event.pointerType !== 'touch' ||
          !event.isPrimary ||
          this.isAnimating() ||
          document.querySelector('dialog[open]')
        )
          return;
        const card = event.target.closest('.board-card,.hand-card,.weather-card');
        if (!card) return;
        const hold = {
          pointer: event.pointerId,
          card,
          hand: card.classList.contains('hand-card'),
          x: event.clientX,
          y: event.clientY,
          shown: false,
          timer: null
        };
        this.hold = hold;
        if (hold.hand) {
          // Start immediately so a thumb can slide straight across the overlapping hand.
          this.show(card, true);
          hold.shown = this.source === card;
        } else
          hold.timer = setTimeout(() => {
            if (this.hold !== hold || !card.isConnected) return;
            this.show(card, true);
            hold.shown = this.source === card;
          }, 420);
      },
      { passive: true }
    );
    this.listen(
      document,
      'pointermove',
      (event) => {
        const hold = this.hold;
        if (hold?.pointer !== event.pointerId) return;
        if (hold.hand) {
          // Pointer capture keeps event.target on the first card; hit-test the thumb instead.
          const card = this.handCardAtPoint(event.clientX, event.clientY);
          hold.card = card;
          if (card) {
            this.show(card, true);
            hold.shown = hold.shown || this.source === card;
          } else this.clear(false);
        } else if (Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 10) this.clear();
      },
      { passive: true }
    );
    this.listen(
      document,
      'pointerup',
      (event) => {
        const hold = this.hold;
        const card =
          hold?.pointer === event.pointerId && hold.hand && hold.shown
            ? this.handCardAtPoint(event.clientX, event.clientY)
            : null;
        if (hold?.pointer === event.pointerId) this.clear();
        if (this.suppressPointer === event.pointerId) this.suppressUntil = performance.now() + 800;
        if (card) this.onSelect(card.dataset.card);
      },
      { passive: true }
    );
    ['pointercancel', 'lostpointercapture'].forEach((type) =>
      this.listen(
        document,
        type,
        (event) => {
          if (this.hold?.pointer === event.pointerId) this.clear();
          if (this.suppressPointer === event.pointerId) this.suppressUntil = performance.now() + 800;
        },
        { passive: true }
      )
    );
    // Release handles a hand selection once; swallow the browser's follow-up click.
    this.listen(
      document,
      'click',
      (event) => {
        if (performance.now() < this.suppressUntil && (event.detail > 0 || event.pointerType === 'touch')) {
          this.suppressUntil = 0;
          this.suppressPointer = null;
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true
    );
    this.listen(document, 'contextmenu', (event) => {
      if (
        (this.hold || performance.now() < this.suppressUntil) &&
        event.target.closest('.board-card,.hand-card,.weather-card')
      )
        event.preventDefault();
    });
    this.listen(
      window,
      'scroll',
      () => {
        if (this.hold) this.clear();
      },
      { capture: true, passive: true }
    );
    this.listen(document, 'keydown', (event) => {
      if (event.key === 'Tab') this.keyboardNavigation = true;
    });
    this.listen(window, 'blur', () => this.clear());
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) this.clear();
    });
  }
  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.listeners.push(() => target.removeEventListener(type, handler, options));
  }
  destroy() {
    this.clear();
    this.listeners.forEach((remove) => remove());
    this.listeners = [];
  }
  clear(cancelHold = true) {
    if (cancelHold && this.hold) {
      clearTimeout(this.hold.timer);
      if (this.hold.shown) {
        this.suppressPointer = this.hold.pointer;
        this.suppressUntil = Infinity;
      }
      this.hold = null;
    }
    this.source?.classList.remove('touch-previewed');
    this.preview?.remove();
    this.preview = null;
    this.source = null;
  }
  show(card, touch = false) {
    if (card === this.source || this.isAnimating() || document.querySelector('dialog[open]')) return;
    this.clear(!touch);
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // All cards share a viewport-relative size, independent of their lane size or overlap.
    const ratio = 877 / 1240;
    const width = Math.max(
      1,
      Math.min(
        window.innerWidth * (touch ? 0.65 : 0.306),
        window.innerHeight * (touch ? 0.6 : 0.378) * ratio,
        window.innerWidth - 16,
        (window.innerHeight - 16) * ratio
      )
    );
    const height = width / ratio;
    const left = Math.max(
      8,
      Math.min(
        window.innerWidth - width - 8,
        touch ? (window.innerWidth - width) / 2 : rect.left + (rect.width - width) / 2
      )
    );
    const top = Math.max(
      8,
      Math.min(
        window.innerHeight - height - 8,
        touch ? rect.top - height - 18 : rect.top + (rect.height - height) / 2 - 6
      )
    );
    const preview = document.createElement('div');
    preview.className = `${card.className.replace(/\b(board-card|hand-card|weather-card|selected|unplayable)\b/g, '')} row-card-preview`;
    preview.setAttribute('aria-hidden', 'true');
    [...card.children].forEach((child) => preview.append(child.cloneNode(true)));
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
    preview.style.width = `${width}px`;
    preview.style.height = `${height}px`;
    preview.style.setProperty('--bonus-marker-font', `${Math.max(6, Math.min(12, width * 0.24))}px`);
    preview.style.setProperty('--preview-offset-x', `${rect.left - left}px`);
    preview.style.setProperty('--preview-offset-y', `${rect.top - top}px`);
    preview.style.setProperty('--preview-start-scale-x', String(rect.width / width));
    preview.style.setProperty('--preview-start-scale-y', String(rect.height / height));
    this.preview = preview;
    this.source = card;
    document.body.append(preview);
    if (touch && card.classList.contains('hand-card')) card.classList.add('touch-previewed');
  }
  handCardAtPoint(x, y) {
    const card = document.elementFromPoint(x, y)?.closest('.hand-card');
    return card && this.hand.contains(card) ? card : null;
  }
};
