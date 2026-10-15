'use strict';
window.BombScores = (() => {
    const key = 'bomb-major-scores-v1';
    let records = [], notice = '';
    const rank = (a, b) => b.seconds - a.seconds || b.coins - a.coins || b.jumps - a.jumps || b.date - a.date;
    try {
        const data = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(data)) records = data.filter(entry => entry && Number.isFinite(entry.seconds) && entry.seconds >= 0 && entry.seconds <= Number.MAX_SAFE_INTEGER / 10 &&
            Number.isSafeInteger(entry.coins) && entry.coins >= 0 && Number.isSafeInteger(entry.jumps) && entry.jumps >= 0 &&
            Number.isSafeInteger(entry.date) && entry.date >= 0 && entry.date <= 8640000000000000)
            .map(entry => ({ seconds: Math.floor(entry.seconds * 10) / 10, coins: entry.coins, jumps: entry.jumps, date: entry.date }))
            .sort(rank).slice(0, 10);
    } catch (_) { notice = 'Score saving is unavailable. Scores will stay for this session only.'; }
    function render() {
        const rows = document.querySelector('#local-score-rows'); rows.replaceChildren();
        if (!records.length) {
            const row = document.createElement('tr'), cell = document.createElement('td');
            cell.colSpan = 5; cell.className = 'scores-empty'; cell.textContent = 'Finish a round to save your first escape.';
            row.append(cell); rows.append(row);
        }
        records.forEach((entry, index) => {
            const row = document.createElement('tr');
            const values = [index + 1, entry.seconds.toFixed(1) + 's', entry.coins, entry.jumps,
                new Date(entry.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })];
            values.forEach((value, column) => {
                const cell = document.createElement(column === 0 ? 'th' : 'td');
                if (column === 0) cell.scope = 'row';
                cell.textContent = value; row.append(cell);
            });
            rows.append(row);
        });
        document.querySelector('#score-save-note').textContent = notice;
    }
    function add(entry) {
        const record = { seconds: Math.floor(entry.seconds * 10) / 10, coins: entry.coins, jumps: entry.jumps, date: Date.now() };
        records.push(record); records.sort(rank); records = records.slice(0, 10);
        try { localStorage.setItem(key, JSON.stringify(records)); notice = ''; }
        catch (_) { notice = 'Score saving is unavailable. Scores will stay for this session only.'; }
        render();
    }
    render();
    return { add };
})();
