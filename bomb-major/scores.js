'use strict';
window.BombScores = (() => {
    const key = 'bomb-major-scores-v1';
    let records = [], notice = '', pending = null, lastName = '';
    const form = document.querySelector('#score-name-form');
    const nameInput = document.querySelector('#score-player-name');
    const entryNote = document.querySelector('#score-entry-note');
    const cleanName = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20) : '';
    const rank = (a, b) => b.seconds - a.seconds || b.coins - a.coins || b.jumps - a.jumps || b.date - a.date;
    try {
        const data = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(data)) records = data.filter(entry => entry && Number.isFinite(entry.seconds) && entry.seconds >= 0 && entry.seconds <= Number.MAX_SAFE_INTEGER / 10 &&
            Number.isSafeInteger(entry.coins) && entry.coins >= 0 && Number.isSafeInteger(entry.jumps) && entry.jumps >= 0 &&
            Number.isSafeInteger(entry.date) && entry.date >= 0 && entry.date <= 8640000000000000)
            .map(entry => ({ name: cleanName(entry.name) || 'Player', seconds: Math.floor(entry.seconds * 10) / 10, coins: entry.coins, jumps: entry.jumps, date: entry.date }))
            .sort(rank).slice(0, 10);
    } catch (_) { notice = 'Score saving is unavailable. Scores will stay for this session only.'; }
    if (records.length) lastName = records.reduce((latest, entry) => entry.date > latest.date ? entry : latest).name;
    function render() {
        const rows = document.querySelector('#local-score-rows'); rows.replaceChildren();
        if (!records.length) {
            const row = document.createElement('tr'), cell = document.createElement('td');
            cell.colSpan = 6; cell.className = 'scores-empty'; cell.textContent = 'Finish a round to save your first escape.';
            row.append(cell); rows.append(row);
        }
        records.forEach((entry, index) => {
            const row = document.createElement('tr');
            const values = [index + 1, entry.name, entry.seconds.toFixed(1) + 's', entry.coins, entry.jumps,
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
        clearPending();
        if (records.length === 10 && rank(record, records[9]) > 0) {
            entryNote.textContent = 'Keep going! Your next round could reach the top ten.';
            return;
        }
        pending = record;
        form.hidden = false;
        entryNote.textContent = 'Enter your name and choose Save score to keep this round.';
    }
    function clearPending() {
        pending = null;
        form.hidden = true;
        nameInput.value = lastName;
        nameInput.setCustomValidity('');
        entryNote.textContent = '';
    }
    function focusEntry() {
        if (!pending) return false;
        nameInput.focus(); nameInput.select();
        return true;
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!pending) return;
        const name = cleanName(nameInput.value);
        if (!name) {
            nameInput.setCustomValidity('Please enter a player name.');
            nameInput.reportValidity();
            return;
        }
        const record = { ...pending, name };
        records.push(record); records.sort(rank); records = records.slice(0, 10);
        try { localStorage.setItem(key, JSON.stringify(records)); notice = ''; }
        catch (_) { notice = 'Score saving is unavailable. Scores will stay for this session only.'; }
        lastName = name;
        clearPending();
        entryNote.textContent = notice ? 'Score kept for ' + name + ' this session. Saving is unavailable.' : 'Score saved for ' + name + '!';
        render();
        document.querySelector('.restart').focus();
    });
    nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));
    render();
    return { add, clearPending, focusEntry };
})();
