const playSpace = document.querySelector('.playSpace');
        const characterTemplate = document.querySelector('.character');
        characterTemplate.remove();
        const catTemplate = document.querySelector('#catTemplate');
        const magnetTemplate = document.querySelector('#magnetTemplate');
        const bomb = document.querySelector('.bomb');
        const clickyBlock = document.querySelector('.clickyBlock');
        const gameOver = document.querySelector('.gameOver');
        const restart = document.querySelector('.restart');
        const status = document.querySelector('#status');
        const result = document.querySelector('#result');
        const freezeMeter = document.querySelector('.freeze-meter');
        const freezeCountdown = document.querySelector('#freezeCountdown');
        const freezeFill = document.querySelector('.freeze-fill');
        const coinTotalDisplay = document.querySelector('#coinTotal');
        const roundCoinsDisplay = document.querySelector('#roundCoins');
        const aliveCountDisplay = document.querySelector('#aliveCount');
        const nextCharacterDisplay = document.querySelector('#nextCharacter');
        const coinSaveNote = document.querySelector('#coinSaveNote');
        const sound = (() => {
            const button = document.querySelector('#soundToggle');
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const preferenceKey = 'bomb-major-sound';
            let enabled = true;
            let available = Boolean(AudioContextClass);
            let context;
            let master;
            let noiseBuffer;
            let unlocking = false;
            const voices = new Set();
            const musicVoices = new Set();
            let musicWanted = false;
            let musicTimer = null;
            let musicStep = 0;
            let nextMusicTime = 0;
            const lastPlayed = new Map();
            const cooldowns = { coin: 0.065, bounce: 0.12, drop: 0.15, tick: 0.2, cat: 0.2 };
            try { enabled = localStorage.getItem(preferenceKey) !== 'off'; } catch (error) {}

            function updateButton() {
                button.disabled = !available;
                button.textContent = available ? (enabled ? 'Sound on' : 'Sound off') : 'Sound unavailable';
                button.setAttribute('aria-pressed', String(enabled && available));
                button.setAttribute('aria-label', available ?
                    (enabled ? 'Mute game sounds' : 'Enable game sounds') : 'Game sounds are unavailable in this browser');
            }
            function unlock() {
                if (!enabled || !available || document.hidden) return;
                try {
                    if (!context) {
                        context = new AudioContextClass();
                        master = context.createGain();
                        master.gain.value = 0.4;
                        const compressor = context.createDynamicsCompressor();
                        compressor.threshold.value = -18;
                        compressor.ratio.value = 6;
                        master.connect(compressor);
                        compressor.connect(context.destination);
                        noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.6), context.sampleRate);
                        const data = noiseBuffer.getChannelData(0);
                        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
                    }
                    if (context.state === 'suspended' && !unlocking) {
                        unlocking = true;
                        Promise.resolve(context.resume()).then(() => {
                            unlocking = false;
                            if (musicWanted) startMusic();
                        }, () => { unlocking = false; });
                    }
                    if (musicWanted) startMusic();
                } catch (error) {
                    available = false;
                    updateButton();
                }
            }
            function track(source, gain, filter = null, isMusic = false) {
                voices.add(source);
                if (isMusic) musicVoices.add(source);
                source.onended = () => {
                    voices.delete(source);
                    musicVoices.delete(source);
                    source.disconnect();
                    gain.disconnect();
                    if (filter) filter.disconnect();
                };
            }
            function envelope(gain, time, duration, volume) {
                gain.gain.setValueAtTime(0.0001, time);
                gain.gain.linearRampToValueAtTime(volume, time + Math.min(0.008, duration / 4));
                gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
            }
            function tone(type, from, to, duration, volume = 0.1, delay = 0, isMusic = false) {
                if (voices.size >= 48) return;
                const time = context.currentTime + 0.006 + delay;
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                oscillator.type = type;
                oscillator.frequency.setValueAtTime(from, time);
                oscillator.frequency.exponentialRampToValueAtTime(to, time + duration);
                envelope(gain, time, duration, volume);
                oscillator.connect(gain);
                gain.connect(master);
                track(oscillator, gain, null, isMusic);
                oscillator.start(time);
                oscillator.stop(time + duration + 0.02);
            }
            function noise(duration, from, to, volume = 0.15, delay = 0, isMusic = false) {
                if (voices.size >= 48) return;
                const time = context.currentTime + 0.006 + delay;
                const source = context.createBufferSource();
                const filter = context.createBiquadFilter();
                const gain = context.createGain();
                source.buffer = noiseBuffer;
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(from, time);
                filter.frequency.exponentialRampToValueAtTime(to, time + duration);
                envelope(gain, time, duration, volume);
                source.connect(filter);
                filter.connect(gain);
                gain.connect(master);
                track(source, gain, filter, isMusic);
                source.start(time);
                source.stop(time + duration + 0.02);
            }
            function melody(frequencies, spacing = 0.09, duration = 0.15, volume = 0.1) {
                frequencies.forEach((frequency, index) =>
                    tone('sine', frequency, frequency, duration, volume, index * spacing));
            }
            // An original four-bar arcade loop, quieter than the sound effects.
            const musicLead = [
                [76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 0, 79, 76, 74, 0],
                [77, 0, 81, 0, 84, 81, 77, 0, 76, 0, 77, 0, 81, 77, 76, 0],
                [79, 0, 83, 0, 86, 83, 79, 0, 77, 0, 79, 0, 83, 79, 77, 0],
                [76, 0, 79, 0, 84, 79, 76, 0, 74, 76, 79, 0, 72, 0, 0, 0]
            ];
            const musicBass = [48, 53, 55, 48];
            function noteFrequency(note) { return 440 * Math.pow(2, (note - 69) / 12); }
            function scheduleMusic() {
                if (!musicWanted || !enabled || !available || document.hidden ||
                    !context || (context.state !== 'running' && !unlocking)) {
                    stopMusic();
                    return;
                }
                try {
                    if (nextMusicTime < context.currentTime) nextMusicTime = context.currentTime + 0.03;
                    while (nextMusicTime < context.currentTime + 0.22) {
                        const bar = Math.floor(musicStep / 16);
                        const beat = musicStep % 16;
                        const delay = Math.max(0, nextMusicTime - context.currentTime);
                        const note = musicLead[bar][beat];
                        if (note) {
                            const frequency = noteFrequency(note);
                            tone('triangle', frequency, frequency, 0.11, 0.04, delay, true);
                        }
                        if (beat % 4 === 0) {
                            const bass = noteFrequency(musicBass[bar] + (beat % 8 === 4 ? 12 : 0));
                            tone('triangle', bass, bass, 0.22, 0.065, delay, true);
                        }
                        if (beat === 0 || beat === 8) tone('sine', 100, 40, 0.08, 0.085, delay, true);
                        if (beat % 2 === 1) noise(0.035, 3500, 1500, 0.022, delay, true);
                        nextMusicTime += 0.125;
                        musicStep = (musicStep + 1) % 64;
                    }
                } catch (error) {
                    available = false;
                    stopAll();
                    updateButton();
                }
            }
            function startMusic() {
                if (musicTimer !== null || !musicWanted || !enabled || !available || document.hidden ||
                    !context || (context.state !== 'running' && !unlocking)) return;
                musicStep = 0;
                nextMusicTime = context.currentTime + 0.07;
                musicTimer = window.setInterval(scheduleMusic, 75);
                scheduleMusic();
            }
            function stopMusic() {
                if (musicTimer !== null) window.clearInterval(musicTimer);
                musicTimer = null;
                for (const source of musicVoices) {
                    try { source.stop(); } catch (error) {}
                }
                musicVoices.clear();
            }
            function music(playing) {
                musicWanted = playing;
                if (playing) startMusic();
                else stopMusic();
            }
            function play(name) {
                if (!enabled || !available || !context || document.hidden ||
                    (context.state !== 'running' && !unlocking)) return;
                const now = context.currentTime;
                const cooldown = cooldowns[name] || 0.035;
                if (lastPlayed.has(name) && now - lastPlayed.get(name) < cooldown) return;
                lastPlayed.set(name, now);
                try {
                    switch (name) {
                        case 'start': melody([330, 440, 660], 0.08, 0.12, 0.08); break;
                        case 'jump': tone('triangle', 230, 750, 0.13, 0.12); break;
                        case 'block':
                            tone('triangle', 420, 110, 0.14, 0.11);
                            noise(0.08, 1800, 300, 0.06);
                            break;
                        case 'bounce': tone('triangle', 160, 85, 0.065, 0.05); break;
                        case 'drop': tone('sine', 950, 650, 0.06, 0.035); break;
                        case 'coin': melody([880, 1320], 0.055, 0.1, 0.09); break;
                        case 'arrival': melody([523, 659, 784], 0.08, 0.17, 0.1); break;
                        case 'cat':
                            tone('sawtooth', 550, 850, 0.1, 0.035);
                            tone('sawtooth', 850, 430, 0.2, 0.035, 0.1);
                            break;
                        case 'escape':
                            tone('triangle', 380, 1100, 0.2, 0.1);
                            melody([660, 990, 1320], 0.06, 0.12, 0.07);
                            break;
                        case 'magnetDrop': melody([900, 1350], 0.1, 0.14, 0.06); break;
                        case 'magnet':
                            tone('sine', 90, 700, 0.45, 0.12);
                            tone('triangle', 180, 1000, 0.35, 0.055);
                            break;
                        case 'freeze':
                            melody([1568, 1175, 784], 0.055, 0.17, 0.075);
                            noise(0.12, 3200, 900, 0.05);
                            break;
                        case 'tick': tone('sine', 1200, 1000, 0.035, 0.055); break;
                        case 'thaw': tone('triangle', 220, 600, 0.18, 0.08); break;
                        case 'explosion':
                            noise(0.45, 2400, 90, 0.28);
                            tone('triangle', 90, 30, 0.35, 0.2);
                            break;
                        case 'gameOver': melody([392, 330, 262, 131], 0.15, 0.28, 0.12); break;
                    }
                } catch (error) {
                    // Audio failure must never interrupt the game.
                    available = false;
                    stopAll();
                    updateButton();
                }
            }
            function stopAll() {
                stopMusic();
                for (const source of voices) {
                    try { source.stop(); } catch (error) {}
                }
                voices.clear();
            }
            function reset() {
                musicWanted = false;
                stopAll();
                lastPlayed.clear();
            }
            function suspend() {
                stopAll();
                if (context && context.state === 'running') {
                    try { Promise.resolve(context.suspend()).catch(() => {}); } catch (error) {}
                }
            }
            button.addEventListener('click', () => {
                enabled = !enabled;
                try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch (error) {}
                updateButton();
                if (enabled) {
                    unlock();
                    if (master) master.gain.setValueAtTime(0.4, context.currentTime);
                    play('coin');
                } else {
                    if (master) master.gain.setValueAtTime(0, context.currentTime);
                    stopAll();
                }
            });
            updateButton();
            function resume() { if (context) unlock(); }
            return { unlock, play, reset, suspend, resume, music };
        })();

        const size = 64;
        const blockSize = 96;
        const coinSize = 24;
        const magnetSize = 40;
        const coinPullSpeed = 900;
        const bombSpeed = 48;
        const speedPerJump = 2;
        const collisionDistance = 42;
        const freezeReductionPerJump = 0.1;
        const minimumFreezeDuration = 0.1;
        const coinInterval = 1;
        const maximumCoins = 20;
        const coinStorageKey = 'bomb-major-coins';
        const shirtColours = ['#759a87', '#a18fac', '#bd8279', '#c39b60', '#829eaf'];
        let characters = [];
        let targetedCat = null;
        let coins = [];
        let magnet = null;
        const content = window.BombContent, market = window.BombMarket;
        const powerSize = 40, poopSize = 24, ropeLength = 100;
        const powerDrops = new Map();
        let cow = null, poops = [], shieldReady = false;
        let bananaRemaining = 0, bananaSpin = null, repelRemaining = 0, tetherRemaining = 0;
        let treadmillRemaining = 0, treadmillElapsed = 0;
        let bookElapsed = 0, evasionTarget = null, evasionElapsed = 0;
        let noticeRemaining = 0, noticeText = '';

        let bombPosition = { x: 0, y: 0 };
        let blockPosition = { x: 0, y: 0 };
        let blockVelocity = { x: 180, y: 140 };
        let frozenRemaining = 0;
        let activeFreezeDuration = 0;
        let playing = false;
        let ended = false;
        let jumps = 0;
        let bombSpeedBoost = 0;
        let elapsed = 0;
        let coinSpawnElapsed = 0;
        let roundCoins = 0;
        let coinTotal = 0;
        let nextCharacterId = 1;
        let pendingCharacters = 0;
        let joinRetryElapsed = 0;
        let previousTime = 0;
        let animationFrame;
        let gameOverTimeout;
        let blockClickedTimeout;

        coinTotal = market.wallet();
        function saveCoins() {
            try {
                if (!market.updateWallet(coinTotal)) throw new Error('Saving unavailable');
                // Keep the legacy balance available to previous versions of the game.
                localStorage.setItem(coinStorageKey, String(coinTotal));
                coinSaveNote.hidden = true;
            } catch (error) {
                coinSaveNote.hidden = false;
            }
        }
        function setText(element, text) {
            if (element.textContent !== String(text)) element.textContent = text;
        }
        function bounds(objectSize = size) {
            return {
                x: Math.max(0, playSpace.clientWidth - objectSize),
                y: Math.max(0, playSpace.clientHeight - objectSize)
            };
        }
        function clampPosition(position, objectSize = size) {
            const limit = bounds(objectSize);
            position.x = Math.max(0, Math.min(position.x, limit.x));
            position.y = Math.max(0, Math.min(position.y, limit.y));
        }
        function overlaps(a, aSize, b, bSize, gap = 0) {
            return a.x < b.x + bSize + gap && a.x + aSize + gap > b.x &&
                a.y < b.y + bSize + gap && a.y + aSize + gap > b.y;
        }
        function freeCharacterPosition(position, ignore = null, avoidCharacters = true) {
            return Math.hypot(position.x - bombPosition.x, position.y - bombPosition.y) > awarenessRadius() &&
                !overlaps(position, size, blockPosition, blockSize) &&
                (!cow || ignore === cow || !overlaps(position, size, cow.position, size, 4)) &&
                (!avoidCharacters || characters.every(character => character === ignore ||
                    !overlaps(position, size, character.position, size, 4)));
        }
        function findCharacterPosition(ignore = null, avoidCharacters = true) {
            const limit = bounds();
            for (let attempt = 0; attempt < 150; attempt++) {
                const position = { x: Math.random() * limit.x, y: Math.random() * limit.y };
                if (freeCharacterPosition(position, ignore, avoidCharacters) &&
                    (!ignore || Math.hypot(position.x - ignore.position.x,
                        position.y - ignore.position.y) > 90)) return position;
            }
            // Search systematically too, rather than using an overlapping fallback.
            for (let y = 0; y <= limit.y; y += 8) {
                for (let x = 0; x <= limit.x; x += 8) {
                    const position = { x, y };
                    if (freeCharacterPosition(position, ignore, avoidCharacters)) return position;
                }
            }
            return null;
        }
        function findCharacterPositionWithRoom(ignore = null) {
            let position = findCharacterPosition(ignore);
            // Give a crowded arena another row instead of stacking characters.
            for (let attempt = 0; !position && attempt < 2; attempt++) {
                playSpace.style.minHeight = `${playSpace.clientHeight + size + 32}px`;
                position = findCharacterPosition(ignore);
            }
            return position;
        }
        function nudgeCharactersApart() {
            const limit = bounds();
            for (let pass = 0; pass < characters.length * 4; pass++) {
                let moved = false;
                for (let i = 0; i < characters.length; i++) {
                    for (let j = i + 1; j < characters.length; j++) {
                        const a = characters[i].position;
                        const b = characters[j].position;
                        if (!overlaps(a, size, b, size, 4)) continue;
                        const pushX = size + 4 - Math.abs(a.x - b.x);
                        const pushY = size + 4 - Math.abs(a.y - b.y);
                        const axis = pushX < pushY ? 'x' : 'y';
                        const depth = axis === 'x' ? pushX : pushY;
                        const direction = a[axis] < b[axis] ? -1 : 1;
                        const oldA = a[axis];
                        a[axis] = Math.max(0, Math.min(limit[axis], oldA + direction * depth / 2));
                        const movedA = Math.abs(a[axis] - oldA);
                        const oldB = b[axis];
                        b[axis] = Math.max(0, Math.min(limit[axis], oldB - direction * (depth - movedA)));
                        const remaining = Math.max(0, depth - movedA - Math.abs(b[axis] - oldB));
                        a[axis] = Math.max(0, Math.min(limit[axis], a[axis] + direction * remaining));
                        moved = true;
                    }
                }
                if (!moved) break;
            }
            // Resolve crowded corners where wall constraints stopped a small nudge.
            for (const character of characters) {
                if (characters.some(other => other !== character &&
                    overlaps(character.position, size, other.position, size, 4))) {
                    const position = findCharacterPositionWithRoom(character);
                    if (position) character.position = position;
                }
            }
        }
        function addCharacter(position, isCat = false) {
            const id = nextCharacterId++;
            const element = characterTemplate.cloneNode(true);
            element.setAttribute('aria-label', `Move ${isCat ? 'cat' : 'character'} ${id} to a random position`);
            if (isCat) {
                element.classList.add('cat');
                element.replaceChild(catTemplate.content.firstElementChild.cloneNode(true), element.querySelector('svg'));
            } else {
                const model = content.models[Math.floor(Math.random() * content.models.length)];
                element.querySelector('svg').outerHTML = model.art;
                if (model.id === 'explorer') element.querySelector('rect').setAttribute('fill', shirtColours[(id - 1) % shirtColours.length]);
            }
            const label = document.createElement('span');
            label.className = 'character-number';
            label.textContent = id;
            label.setAttribute('aria-hidden', 'true');
            element.appendChild(label);
            const character = { id, position, element, isCat };
            characters.push(character);
            playSpace.appendChild(element);
            element.addEventListener('click', () => jumpCharacter(character));
            return character;
        }
        function addPendingCharacters() {
            while (pendingCharacters > 0) {
                const position = findCharacterPositionWithRoom();
                if (!position) break;
                addCharacter(position);
                sound.play('arrival');
                pendingCharacters--;
            }
        }
        function currentFreezeDuration() {
            return Math.max(minimumFreezeDuration, content.balance.freeze[market.tier('freeze')] - jumps * freezeReductionPerJump);
        }
        function freezeBomb() {
            if (frozenRemaining <= 0) {
                activeFreezeDuration = currentFreezeDuration();
                frozenRemaining = activeFreezeDuration;
                sound.play('freeze');
            }
        }
        function moveBlock(seconds) {
            const limit = bounds(blockSize);
            for (const axis of ['x', 'y']) {
                const oldPosition = blockPosition[axis];
                blockPosition[axis] += blockVelocity[axis] * seconds;
                if (blockPosition[axis] < 0 || blockPosition[axis] > limit[axis]) {
                    blockPosition[axis] = Math.max(0, Math.min(blockPosition[axis], limit[axis]));
                    blockVelocity[axis] *= -1;
                    sound.play('bounce');
                }
                if (tetherRemaining <= 0 && overlaps(blockPosition, blockSize, bombPosition, size)) {
                    blockPosition[axis] = oldPosition;
                    blockVelocity[axis] *= -1;
                    freezeBomb();
                }
            }
        }
        function addCoin(position) {
            if (coins.length >= maximumCoins) return;
            const element = document.createElement('div');
            element.className = 'coin';
            element.textContent = '✦';
            element.setAttribute('aria-label', 'Coin');
            element.style.transform = `translate(${position.x}px, ${position.y}px)`;
            playSpace.appendChild(element);
            coins.push({ position, element, attracted: false });
        }
        function addMagnet(position) {
            if (magnet) return;
            const element = magnetTemplate.content.firstElementChild.cloneNode(true);
            const drop = { position, element };
            magnet = drop;
            element.style.transform = `translate(${position.x}px, ${position.y}px)`;
            playSpace.appendChild(element);
            sound.play('magnetDrop');
            element.addEventListener('click', () => {
                if (!playing || ended || magnet !== drop) return;
                sound.unlock();
                sound.play('magnet');
                for (const coin of coins) {
                    coin.attracted = true;
                    coin.element.classList.add('attracted');
                }
                element.remove();
                magnet = null;
                draw();
            });
        }
        function spawnDrop() {
            const roll = Math.random(); let cutoff = 0, type = 'coin';
            for (const drop of content.drops) {
                cutoff += content.dropChance(drop.id, market.tier(drop.id));
                if (roll < cutoff) { type = drop.id; break; }
            }
            if (type === 'cat') {
                if (!characters.some(character => character.isCat) && !playSpace.querySelector('.cat-running')) {
                    const position = findCharacterPosition();
                    if (position) { addCharacter(position, true); sound.play('cat'); }
                }
                return;
            }
            if (type === 'cow') { spawnCow(); return; }
            if ((type === 'magnet' && magnet) || powerDrops.has(type) || (type === 'shield' && shieldReady) || (type === 'treadmill' && treadmillRemaining > 0)) return;
            if (type === 'coin' && coins.length >= maximumCoins) return;
            const dropSize = type === 'coin' ? coinSize : powerSize;
            const limit = bounds(dropSize);
            for (let attempt = 0; attempt < 100; attempt++) {
                const position = { x: Math.random() * limit.x, y: Math.random() * limit.y };
                if (overlaps(position, dropSize, blockPosition, blockSize) ||
                    overlaps(position, dropSize, bombPosition, size) ||
                    characters.some(character => overlaps(position, dropSize, character.position, size)) ||
                    (cow && overlaps(position, dropSize, cow.position, size)) ||
                    coins.some(coin => overlaps(position, dropSize, coin.position, coinSize, 4)) ||
                    poops.some(poop => overlaps(position, dropSize, poop.position, poopSize, 4)) ||
                    [...powerDrops.values()].some(drop => overlaps(position, dropSize, drop.position, powerSize, 4)) ||
                    (magnet && overlaps(position, dropSize, magnet.position, magnetSize, 4))) continue;
                if (type === 'magnet') addMagnet(position);
                else if (type === 'coin') { addCoin(position); sound.play('drop'); }
                else addPower(type, position);
                return;
            }
        }
        function pullCoins(seconds) {
            const target = {
                x: blockPosition.x + (blockSize - coinSize) / 2,
                y: blockPosition.y + (blockSize - coinSize) / 2
            };
            for (const coin of coins) {
                if (!coin.attracted) continue;
                const dx = target.x - coin.position.x;
                const dy = target.y - coin.position.y;
                const distance = Math.hypot(dx, dy);
                if (distance === 0) continue;
                const step = Math.min(coinPullSpeed * seconds, distance);
                coin.position.x += dx / distance * step;
                coin.position.y += dy / distance * step;
                coin.element.style.transform = `translate(${coin.position.x}px, ${coin.position.y}px)`;
            }
        }
        function collectCoins() {
            let collected = 0;
            coins = coins.filter(coin => {
                const touched = overlaps(blockPosition, blockSize, coin.position, coinSize) ||
                    (!coin.attracted && characters.some(character => overlaps(character.position, size, coin.position, coinSize)));
                if (!touched) return true;
                coin.element.remove();
                collected++;
                return false;
            });
            if (!collected) return;
            sound.play('coin');
            const previousMilestone = Math.floor(roundCoins / 10);
            roundCoins += collected;
            coinTotal += collected;
            pendingCharacters += Math.floor(roundCoins / 10) - previousMilestone;
            saveCoins();
            addPendingCharacters();
        }
        function chooseBombTarget() {
            if (targetedCat && characters.includes(targetedCat)) return targetedCat;
            targetedCat = null;
            let closest = null;
            let shortest = Infinity;
            for (const character of characters) {
                const distance = Math.hypot(character.position.x - bombPosition.x,
                    character.position.y - bombPosition.y);
                if (distance < shortest) {
                    closest = character;
                    shortest = distance;
                }
            }
            return closest;
        }
        function awarenessRadius() { return content.balance.awareness[market.tier('awareness')]; }
        function blockMultiplier() { return 1 + content.balance.speed[market.tier('speed')] / 100; }
        function currentBombSpeed() { return (bombSpeed + bombSpeedBoost) * (1 - content.balance.slowness[market.tier('slowness')] / 100); }
        function setBlockBoost(multiplier) {
            const magnitude = Math.hypot(blockVelocity.x, blockVelocity.y);
            const normalSpeed = Math.hypot(180, 140) * blockMultiplier();
            if (magnitude > 0) {
                const ratio = normalSpeed * multiplier / magnitude;
                blockVelocity.x *= ratio; blockVelocity.y *= ratio;
            } else blockVelocity = { x: 180 * blockMultiplier() * multiplier, y: 140 * blockMultiplier() * multiplier };
        }
        function stopTreadmill() {
            treadmillRemaining = 0; treadmillElapsed = 0; setBlockBoost(1);
        }
        function updateTreadmill(seconds) {
            if (treadmillRemaining <= 0) return;
            const activeSeconds = Math.min(seconds, treadmillRemaining);
            treadmillElapsed += activeSeconds;
            treadmillRemaining = Math.max(0, treadmillRemaining - activeSeconds);
            if (treadmillRemaining <= 0) {
                stopTreadmill(); sound.play('thaw'); announce('Treadmill finished. Block speed back to normal.');
            } else setBlockBoost(1 + content.balance.treadmillGainPerSecond * treadmillElapsed);
        }
        function announce(message) { noticeText = message; noticeRemaining = 3; setText(status, message); }
        function positionElement(object) { object.element.style.transform = `translate(${object.position.x}px, ${object.position.y}px)`; }
        function addPower(type, position) {
            const element = document.createElement('button');
            element.type = 'button'; element.className = 'power-drop power-' + type;
            const label = { shield: 'Shield: protect the next human hit', banana: 'Banana peel: make the bomb circle twice', string: 'String: tether the dangerous bomb for 10 seconds', treadmill: 'Treadmill: temporarily accelerate the block' }[type];
            element.setAttribute('aria-label', label); element.title = label; element.innerHTML = content.icons[type];
            const drop = { position, element }; powerDrops.set(type, drop); positionElement(drop); playSpace.append(element); sound.play('magnetDrop');
            element.addEventListener('click', () => {
                if (!playing || ended || powerDrops.get(type) !== drop) return;
                sound.unlock(); element.remove(); powerDrops.delete(type);
                if (type === 'treadmill') { treadmillRemaining = content.balance.treadmillDuration[market.tier('treadmill')]; treadmillElapsed = 0; setBlockBoost(1); announce('Treadmill! The block keeps getting faster for ' + treadmillRemaining + ' seconds.'); }
                if (type === 'shield') { shieldReady = true; announce('Shield ready. The next human hit is protected.'); }
                if (type === 'banana') { startBananaSpin(); announce('Banana slip! Two tight circles. Watch out—it can still hit friends.'); }
                if (type === 'string') { tetherRemaining = 10; dragBomb(); announce('Tethered for 10 seconds. The bomb can still hit friends!'); }
                sound.play('freeze'); draw();
            });
        }
        function spawnCow() {
            if (cow || market.tier('cow') === 0) return;
            const position = findCharacterPosition(); if (!position) return;
            const element = document.createElement('button'); element.type = 'button'; element.className = 'cow';
            element.innerHTML = content.cow; element.title = 'A wandering cow. Let the block send its poop toward the bomb!';
            element.setAttribute('aria-label', 'Wandering cow. Its poop can be deflected by the block.');
            const angle = Math.random() * Math.PI * 2;
            cow = { position, element, vx: Math.cos(angle) * 24, vy: Math.sin(angle) * 24, turn: 3, poop: 6 };
            playSpace.append(element); positionElement(cow); sound.play('arrival'); announce('A cow wandered in. Send its poop at the bomb with your block!');
            element.addEventListener('click', () => { if (playing) { sound.unlock(); sound.play('cat'); announce('Moo! The bomb never targets the cow.'); } });
        }
        function leavePoop() {
            if (!cow) return;
            const count = content.balance.cowPiles[market.tier('cow')], spacing = poopSize + 4;
            for (let pile = 0; pile < count && poops.length < 24; pile++) {
                const position = { x: cow.position.x + 20 + (pile - (count - 1) / 2) * spacing, y: cow.position.y + 39 };
                clampPosition(position, poopSize);
                if (poops.some(poop => overlaps(position, poopSize, poop.position, poopSize))) continue;
                const element = document.createElement('div'); element.className = 'cow-poop'; element.innerHTML = content.icons.poop;
                element.setAttribute('aria-label', 'Cow poop. Deflect with the block.');
                const poop = { position, element, flying: false, life: 25 };
                poops.push(poop); positionElement(poop); playSpace.append(element);
            }
        }
        function startBananaSpin() {
            const limit = bounds(), radius = Math.min(14, limit.x / 2, limit.y / 2);
            const center = {
                x: Math.max(radius, Math.min(limit.x - radius, bombPosition.x - radius)),
                y: Math.max(radius, Math.min(limit.y - radius, bombPosition.y))
            };
            bananaRemaining = 1.2;
            bananaSpin = { center, phase: Math.atan2(bombPosition.y - center.y, bombPosition.x - center.x), elapsed: 0, duration: 1.2, radius };
        }
        function moveBanana(seconds) {
            if (!bananaSpin) return;
            bananaSpin.elapsed = Math.min(bananaSpin.duration, bananaSpin.elapsed + seconds);
            const angle = bananaSpin.phase + bananaSpin.elapsed / bananaSpin.duration * Math.PI * 4;
            bombPosition = {
                x: bananaSpin.center.x + Math.cos(angle) * bananaSpin.radius,
                y: bananaSpin.center.y + Math.sin(angle) * bananaSpin.radius
            };
            clampPosition(bombPosition);
            bananaRemaining = Math.max(0, bananaSpin.duration - bananaSpin.elapsed);
            if (bananaRemaining <= 0) { bananaSpin = null; untangleBomb(); }
        }
        function safestBombPoint() {
            const limit = bounds(); let best = { ...bombPosition }, distance = -1;
            for (let row = 0; row <= 4; row++) for (let column = 0; column <= 4; column++) {
                const point = { x: limit.x * column / 4, y: limit.y * row / 4 };
                if (overlaps(point, size, blockPosition, blockSize)) continue;
                const nearest = Math.min(...characters.map(character => Math.hypot(point.x - character.position.x, point.y - character.position.y)));
                if (nearest > distance) { best = point; distance = nearest; }
            }
            return best;
        }
        function moveBombAway(seconds) {
            if (!evasionTarget) evasionTarget = safestBombPoint();
            const dx = evasionTarget.x - bombPosition.x, dy = evasionTarget.y - bombPosition.y, distance = Math.hypot(dx, dy);
            if (!distance) return;
            const step = Math.min(distance, Math.max(160, currentBombSpeed() * 1.4) * seconds);
            const next = { x: bombPosition.x + dx / distance * step, y: bombPosition.y + dy / distance * step };
            if (!overlaps(next, size, blockPosition, blockSize)) bombPosition = next;
        }
        function dragBomb() {
            const anchor = { x: blockPosition.x + (blockSize - size) / 2, y: blockPosition.y + (blockSize - size) / 2 };
            const dx = bombPosition.x - anchor.x, dy = bombPosition.y - anchor.y, distance = Math.hypot(dx, dy);
            if (distance > ropeLength) bombPosition = { x: anchor.x + dx / distance * ropeLength, y: anchor.y + dy / distance * ropeLength };
            clampPosition(bombPosition);
        }
        function untangleBomb() {
            if (!overlaps(bombPosition, size, blockPosition, blockSize)) return;
            const options = [
                { x: blockPosition.x - size - 2, y: bombPosition.y }, { x: blockPosition.x + blockSize + 2, y: bombPosition.y },
                { x: bombPosition.x, y: blockPosition.y - size - 2 }, { x: bombPosition.x, y: blockPosition.y + blockSize + 2 }
            ];
            options.forEach(point => clampPosition(point));
            const safe = options.filter(point => !overlaps(point, size, blockPosition, blockSize));
            safe.sort((a, b) => Math.hypot(a.x - bombPosition.x, a.y - bombPosition.y) - Math.hypot(b.x - bombPosition.x, b.y - bombPosition.y));
            if (safe.length) bombPosition = safe[0];
            freezeBomb();
        }
        function moveReaders() {
            const step = content.balance.bookStep[market.tier('book')];
            for (const character of characters) {
                if (character.isCat) continue;
                const dx = character.position.x - bombPosition.x, dy = character.position.y - bombPosition.y, distance = Math.hypot(dx, dy) || 1;
                for (const [x, y] of [[dx / distance * step, dy / distance * step], [dx / distance * step, 0], [0, dy / distance * step]]) {
                    const point = { x: character.position.x + x, y: character.position.y + y }; clampPosition(point);
                    if (Math.hypot(point.x - bombPosition.x, point.y - bombPosition.y) <= distance ||
                        overlaps(point, size, blockPosition, blockSize) || (cow && overlaps(point, size, cow.position, size)) ||
                        characters.some(other => other !== character && overlaps(point, size, other.position, size, 4))) continue;
                    character.position = point; break;
                }
            }
        }
        function poopFlightSpeed() {
            const targetSpeed = tetherRemaining > 0 ? Math.max(currentBombSpeed(), Math.hypot(blockVelocity.x, blockVelocity.y)) : currentBombSpeed();
            return Math.max(280, targetSpeed * 1.25);
        }
        function poopHitsBomb(poop) {
            if (!overlaps(poop.position, poopSize, bombPosition, size)) return false;
            const duration = content.balance.cowRepelDuration[Math.max(1, market.tier('cow'))];
            const previousBoost = bombSpeedBoost;
            bombSpeedBoost = Math.max(0, bombSpeedBoost - content.balance.poopSpeedReduction);
            const shaved = previousBoost - bombSpeedBoost;
            // Another pile refreshes the timer; it does not add durations together.
            repelRemaining = Math.max(repelRemaining, duration);
            evasionTarget = safestBombPoint(); evasionElapsed = .3;
            announce('Poop hit! ' + duration + 's repel' + (shaved > 0 ? ' · speed boost −' + shaved + 'px/s' : '') + '.'); sound.play('freeze');
            return true;
        }
        function checkPoopBombContacts() {
            poops = poops.filter(poop => {
                if (!poopHitsBomb(poop)) return true;
                poop.element.remove(); return false;
            });
        }
        function updateExtras(seconds) {
            for (const character of characters) character.invulnerable = Math.max(0, (character.invulnerable || 0) - seconds);
            repelRemaining = Math.max(0, repelRemaining - seconds);
            const wasTethered = tetherRemaining > 0; tetherRemaining = Math.max(0, tetherRemaining - seconds);
            if (wasTethered && tetherRemaining <= 0) untangleBomb();
            if (cow) {
                const limit = bounds(); cow.turn -= seconds; cow.poop -= seconds;
                if (cow.turn <= 0) { const angle = Math.random() * Math.PI * 2; cow.vx = Math.cos(angle) * 24; cow.vy = Math.sin(angle) * 24; cow.turn = 3; }
                const next = { x: cow.position.x + cow.vx * seconds, y: cow.position.y + cow.vy * seconds };
                if (next.x < 0 || next.x > limit.x) cow.vx *= -1;
                if (next.y < 0 || next.y > limit.y) cow.vy *= -1;
                clampPosition(next);
                if (!overlaps(next, size, blockPosition, blockSize) && !characters.some(character => overlaps(next, size, character.position, size))) cow.position = next;
                else { cow.vx *= -1; cow.vy *= -1; }
                if (cow.poop <= 0) { leavePoop(); cow.poop = 6; }
                if (Math.hypot(cow.position.x - bombPosition.x, cow.position.y - bombPosition.y) < collisionDistance) {
                    cow.element.remove(); cow = null; sound.play('escape'); announce('The cow wandered off. Its poop is still useful!');
                }
            }
            poops = poops.filter(poop => {
                if (!poop.flying) poop.life -= seconds;
                if (poop.life <= 0 || poopHitsBomb(poop)) { poop.element.remove(); return false; }
                if (!poop.flying && overlaps(poop.position, poopSize, blockPosition, blockSize)) {
                    poop.flying = true;
                    poop.element.classList.add('flying'); sound.play('block');
                }
                if (poop.flying) {
                    // Retarget every physics step so a moving or tethered bomb cannot dodge the shot.
                    const dx = bombPosition.x + size / 2 - poop.position.x - poopSize / 2;
                    const dy = bombPosition.y + size / 2 - poop.position.y - poopSize / 2;
                    const distance = Math.hypot(dx, dy);
                    if (distance > 0) {
                        const step = Math.min(poopFlightSpeed() * seconds, distance);
                        poop.position.x += dx / distance * step; poop.position.y += dy / distance * step;
                    }
                    if (poopHitsBomb(poop)) { poop.element.remove(); return false; }
                    clampPosition(poop.position, poopSize);
                }
                return true;
            });
        }
        function drawExtras() {
            if (cow) positionElement(cow);
            poops.forEach(positionElement); powerDrops.forEach(positionElement);
            const rope = document.querySelector('#tether-line');
            rope.parentElement.toggleAttribute('hidden', tetherRemaining <= 0);
            // Use a real SVG width/height so its coordinates match the arena's CSS pixels.
            rope.parentElement.setAttribute('viewBox', `0 0 ${playSpace.clientWidth} ${playSpace.clientHeight}`);
            rope.setAttribute('x1', blockPosition.x + blockSize / 2); rope.setAttribute('y1', blockPosition.y + blockSize / 2);
            rope.setAttribute('x2', bombPosition.x + size / 2); rope.setAttribute('y2', bombPosition.y + size / 2);
            const effects = [];
            if (shieldReady) effects.push('Shield · 1 hit');
            if (tetherRemaining > 0) effects.push('String · ' + tetherRemaining.toFixed(1) + 's');
            if (bananaSpin) effects.push('Banana · ' + (2 * (1 - bananaSpin.elapsed / bananaSpin.duration)).toFixed(1) + ' turns left');
            if (repelRemaining > 0) effects.push('Poop repel · ' + repelRemaining.toFixed(1) + 's');
            if (treadmillRemaining > 0) effects.push('Treadmill · ' + treadmillRemaining.toFixed(1) + 's · ' + (1 + content.balance.treadmillGainPerSecond * treadmillElapsed).toFixed(2) + '× speed');
            if (market.hasBook()) effects.push('Book · tier ' + market.tier('book'));
            setText(document.querySelector('#active-effects'), effects.length ? effects.join('  ·  ') : 'Unlock helpful drops in the marketplace.');
        }
        function clearExtras() {
            stopTreadmill();
            if (cow) cow.element.remove(); cow = null;
            poops.forEach(poop => poop.element.remove()); poops = [];
            powerDrops.forEach(drop => drop.element.remove()); powerDrops.clear();
            shieldReady = false; bananaRemaining = 0; bananaSpin = null; repelRemaining = 0; tetherRemaining = 0;
            bookElapsed = 0; evasionElapsed = 0; evasionTarget = null; noticeRemaining = 0;
        }
        function draw() {
            for (const character of characters) {
                character.element.style.transform = `translate(${character.position.x}px, ${character.position.y}px)`;
                character.element.classList.toggle('bomb-target', character === targetedCat);
                character.element.classList.toggle('shielded', !character.isCat && shieldReady);
                character.element.classList.toggle('invulnerable', character.invulnerable > 0);
            }
            drawExtras();
            bomb.classList.toggle('slipping', bananaRemaining > 0);
            bomb.querySelector('.bomb-art').style.rotate = bananaSpin ? (bananaSpin.elapsed / bananaSpin.duration * 720) + 'deg' : '';
            bomb.classList.toggle('repelled', repelRemaining > 0);
            bomb.classList.toggle('tethered', tetherRemaining > 0);
            bomb.style.transform = `translate(${bombPosition.x}px, ${bombPosition.y}px)`;
            clickyBlock.style.transform = `translate(${blockPosition.x}px, ${blockPosition.y}px)`;
            clickyBlock.classList.toggle('magnet-active', coins.some(coin => coin.attracted));
            clickyBlock.classList.toggle('treadmill-active', treadmillRemaining > 0);
            const frozen = frozenRemaining > 0;
            bomb.classList.toggle('frozen', frozen);
            freezeMeter.hidden = !frozen;
            if (frozen) {
                setText(freezeCountdown, `${frozenRemaining.toFixed(1)}s`);
                freezeFill.style.transform = `scaleX(${Math.min(1, frozenRemaining / activeFreezeDuration)})`;
            }
            setText(coinTotalDisplay, coinTotal);
            setText(roundCoinsDisplay, roundCoins);
            setText(aliveCountDisplay, characters.filter(character => !character.isCat).length);
            setText(nextCharacterDisplay, pendingCharacters > 0 ?
                `${pendingCharacters} waiting for space · Next in ${10 - roundCoins % 10} coins` :
                `Next character in ${10 - roundCoins % 10} coins`);
        }
        function reset() {
            sound.reset();
            clearExtras();
            cancelAnimationFrame(animationFrame);
            clearTimeout(gameOverTimeout);
            clearTimeout(blockClickedTimeout);
            for (const character of characters) character.element.remove();
            for (const coin of coins) coin.element.remove();
            if (magnet) magnet.element.remove();
            for (const effect of playSpace.querySelectorAll('.explosion')) effect.remove();
            for (const cat of playSpace.querySelectorAll('.cat-running')) cat.remove();
            characters = [];
            targetedCat = null;
            coins = [];
            magnet = null;
            playSpace.style.minHeight = '';
            const limit = bounds();
            bombPosition = { x: limit.x * 0.1, y: limit.y * 0.5 };
            blockPosition = { x: bounds(blockSize).x * 0.5, y: 0 };
            blockVelocity = { x: 180 * blockMultiplier(), y: 140 * blockMultiplier() };
            frozenRemaining = 0;
            activeFreezeDuration = 0;
            clickyBlock.classList.remove('clicked');
            clickyBlock.textContent = 'Click Me';
            playing = false;
            ended = false;
            document.querySelector('#market-button').disabled = false;
            jumps = 0;
            bombSpeedBoost = 0;
            elapsed = 0;
            coinSpawnElapsed = 0;
            roundCoins = 0; // Saved coins never count toward this round's new characters.
            pendingCharacters = 0;
            joinRetryElapsed = 0;
            nextCharacterId = 1;
            previousTime = 0;
            bomb.hidden = false;
            gameOver.hidden = true;
            addCharacter({ x: limit.x * 0.75, y: limit.y * 0.5 });
            setText(status, 'Click a character or Click Me block to start.');
            draw();
        }
        function showExplosion(position) {
            sound.play('explosion');
            const effect = document.createElement('div');
            effect.className = 'explosion';
            effect.appendChild(document.querySelector('#explosionTemplate').content.firstElementChild.cloneNode(true));
            effect.setAttribute('aria-hidden', 'true');
            effect.style.left = `${position.x + size / 2 - 60}px`;
            effect.style.top = `${position.y + size / 2 - 60}px`;
            effect.addEventListener('animationend', () => effect.remove(), { once: true });
            playSpace.appendChild(effect);
        }
        function releaseCat(character) {
            sound.play('escape');
            if (targetedCat === character) targetedCat = null;
            character.element.classList.remove('bomb-target');
            bombSpeedBoost = 0;
            const centre = {
                x: character.position.x + (size - coinSize) / 2,
                y: character.position.y + (size - coinSize) / 2
            };
            const spread = coinSize + 4;
            const limit = bounds(coinSize);
            centre.x = Math.max(spread, Math.min(centre.x, limit.x - spread));
            centre.y = Math.max(spread, Math.min(centre.y, limit.y - spread));
            const offsets = [[0, 0], [-spread, -spread], [spread, -spread],
                [-spread, spread], [spread, spread]];
            // Make room for all five drops while keeping the 20-coin field limit.
            while (coins.length + offsets.length > maximumCoins) coins.shift().element.remove();
            for (const [x, y] of offsets) {
                const position = { x: centre.x + x, y: centre.y + y };
                clampPosition(position, coinSize);
                addCoin(position);
            }
            const element = character.element;
            element.disabled = true;
            element.style.transform = `translate(${character.position.x}px, ${character.position.y}px)`;
            element.classList.add('cat-running');
            element.addEventListener('transitionend', () => element.remove(), { once: true });
            // Commit the starting position before setting the off-screen destination.
            element.getBoundingClientRect();
            const exitX = character.position.x < playSpace.clientWidth / 2 ? -size - 20 : playSpace.clientWidth + 20;
            element.style.transform = `translate(${exitX}px, ${character.position.y}px)`;
        }
        function killCaughtCharacters() {
            if (repelRemaining > 0) return;
            characters = characters.filter(character => {
                if (Math.hypot(character.position.x - bombPosition.x,
                    character.position.y - bombPosition.y) > collisionDistance) return true;
                if (character.invulnerable > 0) return true;
                if (!character.isCat && shieldReady) {
                    shieldReady = false; character.invulnerable = 1.5;
                    const safe = findCharacterPosition(character);
                    if (safe) character.position = safe;
                    announce('Shield saved a friend! One charge used.'); sound.play('freeze');
                    return true;
                }
                if (character.isCat) {
                    releaseCat(character);
                } else {
                    showExplosion(character.position);
                    character.element.remove();
                }
                return false;
            });
            if (!characters.some(character => !character.isCat)) {
                playing = false;
                ended = true;
                window.BombScores.add({ seconds: elapsed, coins: roundCoins, jumps });
                stopTreadmill();
                document.querySelector('#market-button').disabled = false;
                sound.music(false);
                bomb.hidden = true;
                setText(status, 'No characters left. Game over!');
                result.textContent = `Survived ${elapsed.toFixed(1)}s · ${roundCoins} coins this round · ${coinTotal} saved coins`;
                gameOverTimeout = setTimeout(() => {
                    gameOver.hidden = false;
                    sound.play('gameOver');
                    restart.focus();
                }, 650);
            }
        }
        function start() {
            if (playing || ended || document.querySelector('#market-dialog').open) return;
            sound.play('start');
            playing = true;
            document.querySelector('#market-button').disabled = true;
            sound.music(true);
            previousTime = 0;
            animationFrame = requestAnimationFrame(chase);
        }
        function chase(time) {
            if (!playing) return;
            const seconds = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
            previousTime = time;
            elapsed += seconds;
            coinSpawnElapsed += seconds;
            joinRetryElapsed += seconds;
            while (coinSpawnElapsed >= coinInterval) {
                coinSpawnElapsed -= coinInterval;
                spawnDrop();
            }
            if (pendingCharacters > 0 && joinRetryElapsed >= 0.5) {
                joinRetryElapsed = 0;
                addPendingCharacters();
            }
            noticeRemaining = Math.max(0, noticeRemaining - seconds);
            evasionElapsed -= seconds;
            if (repelRemaining > 0 && evasionElapsed <= 0) {
                evasionTarget = safestBombPoint(); evasionElapsed = .3;
            }
            bookElapsed += seconds;
            while (bookElapsed >= .2) { bookElapsed -= .2; if (market.hasBook()) moveReaders(); }
            updateTreadmill(seconds);
            const currentSpeed = currentBombSpeed();
            // Small movement steps keep the fast bomb and block from tunnelling.
            const pullSpeed = coins.some(coin => coin.attracted) ? coinPullSpeed : 0;
            const steps = Math.max(1, Math.ceil(Math.max(currentSpeed * (repelRemaining > 0 ? 1.4 : 1), pullSpeed,
                poops.some(poop => poop.flying) ? poopFlightSpeed() : 0, (bananaRemaining > 0 || repelRemaining > 0) ? 160 : 0,
                Math.abs(blockVelocity.x), Math.abs(blockVelocity.y)) * seconds / 4));
            const stepSeconds = seconds / steps;
            for (let i = 0; i < steps; i++) {
                const previousFreezeRemaining = frozenRemaining;
                const movingSeconds = Math.max(0, stepSeconds - frozenRemaining);
                frozenRemaining = Math.max(0, frozenRemaining - stepSeconds);
                moveBlock(stepSeconds);
                updateExtras(stepSeconds);
                if (previousFreezeRemaining > 0 && frozenRemaining <= 0) {
                    sound.play('thaw');
                } else if (frozenRemaining > 0 && Math.ceil(frozenRemaining) <= 3 &&
                    Math.ceil(frozenRemaining) < Math.ceil(previousFreezeRemaining)) {
                    sound.play('tick');
                }
                pullCoins(stepSeconds);
                collectCoins();
                if (bananaSpin) moveBanana(stepSeconds);
                else if (tetherRemaining > 0) dragBomb();
                else if (repelRemaining > 0) moveBombAway(stepSeconds);
                else if (frozenRemaining <= 0 && movingSeconds > 0) {
                    const target = chooseBombTarget();
                    if (target) {
                        const dx = target.position.x - bombPosition.x;
                        const dy = target.position.y - bombPosition.y;
                        const distance = Math.hypot(dx, dy);
                        const step = Math.min(currentBombSpeed() * movingSeconds, distance);
                        if (distance > 0) {
                            const next = { x: bombPosition.x + dx / distance * step, y: bombPosition.y + dy / distance * step };
                            if (overlaps(next, size, blockPosition, blockSize)) freezeBomb();
                            else bombPosition = next;
                        }
                    }
                }
                if (tetherRemaining > 0) dragBomb();
                // Contact with a pile applies before catches in this same movement step.
                checkPoopBombContacts();
                killCaughtCharacters();
                if (ended) {
                    draw();
                    return;
                }
            }
            draw();
            setText(status, noticeRemaining > 0 ? noticeText : `Jumps: ${jumps} · Survived: ${elapsed.toFixed(1)}s`);
            animationFrame = requestAnimationFrame(chase);
        }
        function jumpCharacter(character) {
            if (ended || document.querySelector('#market-dialog').open || !characters.includes(character)) return;
            sound.unlock();
            sound.play(character.isCat ? 'cat' : 'jump');
            if (character.isCat) targetedCat = character;
            const next = findCharacterPositionWithRoom(character);
            if (!next) {
                announce('No safe spot in your Safe jump radius. Try again in a moment.');
                draw();
                start();
                return;
            }
            character.position = next;
            nudgeCharactersApart();
            const previousFreezeDuration = currentFreezeDuration();
            jumps++;
            bombSpeedBoost += speedPerJump;
            const wasFrozen = frozenRemaining > 0;
            frozenRemaining = Math.max(0, frozenRemaining -
                (previousFreezeDuration - currentFreezeDuration()));
            if (wasFrozen && frozenRemaining <= 0) sound.play('thaw');
            collectCoins();
            draw();
            start();
        }
        window.addEventListener('resize', () => {
            clampPosition(bombPosition);
            for (const character of characters) clampPosition(character.position);
            clampPosition(blockPosition, blockSize);
            const limit = bounds();
            const blockLimit = bounds(blockSize);
            if (tetherRemaining <= 0 && overlaps(blockPosition, blockSize, bombPosition, size)) {
                blockPosition.y = bombPosition.y < limit.y / 2 ? blockLimit.y : 0;
                freezeBomb();
            }
            for (const coin of coins) {
                clampPosition(coin.position, coinSize);
                coin.element.style.transform = `translate(${coin.position.x}px, ${coin.position.y}px)`;
            }
            if (magnet) {
                clampPosition(magnet.position, magnetSize);
                magnet.element.style.transform = `translate(${magnet.position.x}px, ${magnet.position.y}px)`;
            }
            if (bananaSpin) {
                bananaSpin.radius = Math.min(14, limit.x / 2, limit.y / 2);
                const radius = bananaSpin.radius;
                bananaSpin.center.x = Math.max(radius, Math.min(limit.x - radius, bananaSpin.center.x));
                bananaSpin.center.y = Math.max(radius, Math.min(limit.y - radius, bananaSpin.center.y));
            }
            if (cow) clampPosition(cow.position);
            for (const drop of powerDrops.values()) clampPosition(drop.position, powerSize);
            for (const poop of poops) clampPosition(poop.position, poopSize);
            if (tetherRemaining > 0) dragBomb();
            nudgeCharactersApart();
            draw();
        });
        clickyBlock.addEventListener('click', () => {
            if (ended || document.querySelector('#market-dialog').open) return;
            sound.unlock();
            sound.play('block');
            const dx = bombPosition.x + size / 2 - blockPosition.x - blockSize / 2;
            const dy = bombPosition.y + size / 2 - blockPosition.y - blockSize / 2;
            const distance = Math.hypot(dx, dy);
            const speed = Math.hypot(blockVelocity.x, blockVelocity.y);
            if (distance > 0) blockVelocity = { x: dx / distance * speed, y: dy / distance * speed };
            clickyBlock.classList.add('clicked');
            clickyBlock.textContent = 'Clicked!';
            clearTimeout(blockClickedTimeout);
            blockClickedTimeout = setTimeout(() => {
                clickyBlock.classList.remove('clicked');
                clickyBlock.textContent = 'Click Me';
            }, 1000);
            start();
        });
        document.addEventListener('visibilitychange', () => {
            previousTime = 0;
            if (document.hidden) sound.suspend();
            else if (playing) sound.resume();
        });
        restart.addEventListener('click', () => {
            sound.unlock();
            reset();
            sound.play('start');
            characters[0].element.focus();
        });
        market.init({
            canOpen: () => !playing,
            balance: () => coinTotal,
            spend: price => {
                if (playing || !Number.isSafeInteger(price) || price < 0 || coinTotal < price) return false;
                coinTotal -= price; saveCoins(); sound.unlock(); sound.play('coin'); return true;
            },
            changed: () => {
                if (!playing && !ended) {
                    blockVelocity = { x: 180 * blockMultiplier(), y: 140 * blockMultiplier() };
                }
                draw();
            }
        });
        reset();
