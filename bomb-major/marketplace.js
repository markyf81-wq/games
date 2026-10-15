'use strict';
window.BombMarket = (() => {
    const key = 'bomb-major-market-v1';
    const content = window.BombContent;
    const offers = [...content.upgrades, ...content.drops];
    const state = { wallet: 0, book: false, upgrades: Object.fromEntries(offers.map(item => [item.id, 0])) };
    let hooks, notice = '';
    try {
        const legacyCoins = Number(localStorage.getItem('bomb-major-coins'));
        if (Number.isSafeInteger(legacyCoins) && legacyCoins >= 0) state.wallet = legacyCoins;
        const data = JSON.parse(localStorage.getItem(key));
        if (data && typeof data === 'object') {
            if (Number.isSafeInteger(data.wallet) && data.wallet >= 0) state.wallet = data.wallet;
            state.book = data.book === true;
            for (const id of Object.keys(state.upgrades)) {
                const tier = data.upgrades?.[id];
                if (Number.isInteger(tier) && tier >= 0 && tier <= 5) state.upgrades[id] = tier;
            }
            // Original one-time book purchases become tier 1 without another charge.
            if (data.upgrades?.book === undefined && data.book === true) state.upgrades.book = 1;
        }
    } catch (_) { notice = 'Shop saving is unavailable. Purchases will stay for this session only.'; }
    function save() {
        state.book = state.upgrades.book > 0; // Legacy ownership mirror.
        try { localStorage.setItem(key, JSON.stringify(state)); notice = ''; return true; }
        catch (_) { notice = 'Shop saving is unavailable. Purchases will stay for this session only.'; return false; }
    }
    function card(art, title, description, label, disabled, action, detail = '') {
        const element = document.createElement('article'); element.className = 'market-item';
        const picture = document.createElement('div'); picture.className = 'market-art'; picture.innerHTML = art;
        const heading = document.createElement('h3'); heading.textContent = title;
        const copy = document.createElement('p'); copy.textContent = description;
        const status = document.createElement('small'); status.textContent = detail;
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.disabled = disabled;
        button.addEventListener('click', action);
        element.append(picture, heading, copy, status, button); return element;
    }
    function buy(price, change, focusIndex) {
        if (!hooks.canOpen() || hooks.balance() < price) return;
        // Ownership and the new wallet are saved together by spend/updateWallet.
        const previous = JSON.parse(JSON.stringify(state));
        change();
        if (!hooks.spend(price)) { Object.assign(state, previous); return; }
        hooks.changed(); render();
        const replacement = document.querySelectorAll('#market-grid button')[focusIndex];
        (replacement && !replacement.disabled ? replacement : document.querySelector('#market-close')).focus({ preventScroll: true });
    }
    function upgradeProgress(upgrade, tier) {
        const progress = document.createElement('div'); progress.className = 'upgrade-progress';
        const caption = document.createElement('div'); caption.className = 'upgrade-progress-caption';
        const label = document.createElement('span'); label.textContent = upgrade.unlock && tier === 0 ? 'Locked' : 'Purchased';
        const count = document.createElement('strong'); count.textContent = tier + ' / 5';
        caption.append(label, count);
        const bar = document.createElement('div'); bar.className = 'upgrade-segments';
        bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', upgrade.name + ' purchased tiers');
        bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '5');
        bar.setAttribute('aria-valuenow', String(tier)); bar.setAttribute('aria-valuetext', tier + ' of 5 tiers purchased');
        for (let level = 1; level <= 5; level++) {
            const segment = document.createElement('span');
            segment.className = 'upgrade-segment' + (level <= tier ? ' purchased' : level === tier + 1 ? ' next' : '');
            segment.textContent = level; segment.setAttribute('aria-hidden', 'true');
            segment.title = 'Tier ' + level + (level <= tier ? ' · Purchased' : level === tier + 1 ? ' · Next upgrade' : ' · Not purchased');
            bar.append(segment);
        }
        progress.append(caption, bar); return progress;
    }
    function render() {
        document.querySelector('#market-wallet').textContent = hooks.balance();
        const grid = document.querySelector('#market-grid'); grid.replaceChildren();
        offers.forEach((upgrade, index) => {
            if (index === 0 || index === content.upgrades.length) {
                const heading = document.createElement('h3'); heading.className = 'market-section-title';
                heading.textContent = index === 0 ? 'Permanent abilities' : 'Unlock your courtyard finds'; grid.append(heading);
            }
            const tier = state.upgrades[upgrade.id], price = content.tiers[tier], full = tier === 5;
            const item = card(content.icons[upgrade.icon], upgrade.name, upgrade.desc,
                full ? '✓ Fully upgraded' : '✦ ' + price + (upgrade.unlock && tier === 0 ? ' · Unlock tier 1' : ' · Buy tier ' + (tier + 1)),
                full || hooks.balance() < price, () => buy(price, () => state.upgrades[upgrade.id]++, index),
                upgrade.effect(tier) + (full ? '' : ' → ' + upgrade.effect(tier + 1)));
            item.querySelector('small').before(upgradeProgress(upgrade, tier));
            grid.append(item);
        });
        document.querySelector('#market-save-note').textContent = notice;
    }
    function open() {
        if (!hooks.canOpen()) return;
        render(); document.querySelector('#market-dialog').showModal();
    }
    function init(callbacks) {
        hooks = callbacks;
        document.querySelector('#market-button').addEventListener('click', open);
        document.querySelector('#result-market').addEventListener('click', open);
        document.querySelector('#market-close').addEventListener('click', () => document.querySelector('#market-dialog').close());
    }
    return { wallet: () => state.wallet, updateWallet: coins => { state.wallet = coins; return save(); }, init, tier: id => state.upgrades[id] || 0, hasBook: () => state.upgrades.book > 0, open };
})();
