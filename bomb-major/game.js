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
        const magnetChance = 0.1;
        const coinPullSpeed = 900;
        const bombSpeed = 48;
        const speedPerJump = 4;
        const collisionDistance = 42;
        const freezeDuration = 5;
        const freezeReductionPerJump = 0.1;
        const minimumFreezeDuration = 0.5;
        const coinInterval = 1;
        const maximumCoins = 20;
        const catChance = 0.05; // Chance of a cat replacing a timed coin drop.
        const coinStorageKey = 'bomb-major-coins';
        const shirtColours = ['#759a87', '#a18fac', '#bd8279', '#c39b60', '#829eaf'];
        let characters = [];
        let targetedCat = null;
        let coins = [];
        let magnet = null;
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

        try {
            const saved = Number(localStorage.getItem(coinStorageKey));
            if (Number.isSafeInteger(saved) && saved >= 0) coinTotal = saved;
        } catch (error) {
            coinSaveNote.hidden = false;
        }
        function saveCoins() {
            try {
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
            return Math.hypot(position.x - bombPosition.x, position.y - bombPosition.y) > 100 &&
                !overlaps(position, size, blockPosition, blockSize) &&
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
                element.querySelector('rect').setAttribute('fill', shirtColours[(id - 1) % shirtColours.length]);
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
            return Math.max(minimumFreezeDuration, freezeDuration - jumps * freezeReductionPerJump);
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
                if (overlaps(blockPosition, blockSize, bombPosition, size)) {
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
            const roll = Math.random();
            const isMagnet = !magnet && roll < magnetChance;
            const hasCat = characters.some(character => character.isCat) ||
                playSpace.querySelector('.cat-running');
            const isCat = !hasCat && roll >= magnetChance && roll < magnetChance + catChance;
            if (isCat) {
                const position = findCharacterPosition();
                if (position) {
                    addCharacter(position, true);
                    sound.play('cat');
                }
                return;
            }
            if (!isMagnet && coins.length >= maximumCoins) return;
            const dropSize = isMagnet ? magnetSize : coinSize;
            const limit = bounds(dropSize);
            for (let attempt = 0; attempt < 100; attempt++) {
                const position = { x: Math.random() * limit.x, y: Math.random() * limit.y };
                if (overlaps(position, dropSize, blockPosition, blockSize) ||
                    overlaps(position, dropSize, bombPosition, size) ||
                    characters.some(character => overlaps(position, dropSize, character.position, size)) ||
                    coins.some(coin => overlaps(position, dropSize, coin.position, coinSize, 4)) ||
                    (magnet && overlaps(position, dropSize, magnet.position, magnetSize, 4))) continue;
                if (isMagnet) addMagnet(position);
                else {
                    addCoin(position);
                    sound.play('drop');
                }
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
        function draw() {
            for (const character of characters) {
                character.element.style.transform = `translate(${character.position.x}px, ${character.position.y}px)`;
                character.element.classList.toggle('bomb-target', character === targetedCat);
            }
            bomb.style.transform = `translate(${bombPosition.x}px, ${bombPosition.y}px)`;
            clickyBlock.style.transform = `translate(${blockPosition.x}px, ${blockPosition.y}px)`;
            clickyBlock.classList.toggle('magnet-active', coins.some(coin => coin.attracted));
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
            blockVelocity = { x: 180, y: 140 };
            frozenRemaining = 0;
            activeFreezeDuration = 0;
            clickyBlock.classList.remove('clicked');
            clickyBlock.textContent = 'Click Me';
            playing = false;
            ended = false;
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
            characters = characters.filter(character => {
                if (Math.hypot(character.position.x - bombPosition.x,
                    character.position.y - bombPosition.y) > collisionDistance) return true;
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
            if (playing || ended) return;
            sound.play('start');
            playing = true;
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
            const currentSpeed = bombSpeed + bombSpeedBoost;
            // Small movement steps keep the fast bomb and block from tunnelling.
            const pullSpeed = coins.some(coin => coin.attracted) ? coinPullSpeed : 0;
            const steps = Math.max(1, Math.ceil(Math.max(currentSpeed, pullSpeed,
                Math.abs(blockVelocity.x), Math.abs(blockVelocity.y)) * seconds / 4));
            const stepSeconds = seconds / steps;
            for (let i = 0; i < steps; i++) {
                const previousFreezeRemaining = frozenRemaining;
                const movingSeconds = Math.max(0, stepSeconds - frozenRemaining);
                frozenRemaining = Math.max(0, frozenRemaining - stepSeconds);
                moveBlock(stepSeconds);
                if (previousFreezeRemaining > 0 && frozenRemaining <= 0) {
                    sound.play('thaw');
                } else if (frozenRemaining > 0 && Math.ceil(frozenRemaining) <= 3 &&
                    Math.ceil(frozenRemaining) < Math.ceil(previousFreezeRemaining)) {
                    sound.play('tick');
                }
                pullCoins(stepSeconds);
                collectCoins();
                if (frozenRemaining <= 0 && movingSeconds > 0) {
                    const target = chooseBombTarget();
                    if (target) {
                        const dx = target.position.x - bombPosition.x;
                        const dy = target.position.y - bombPosition.y;
                        const distance = Math.hypot(dx, dy);
                        const step = Math.min((bombSpeed + bombSpeedBoost) * movingSeconds, distance);
                        if (distance > 0) {
                            const next = {
                                x: bombPosition.x + dx / distance * step,
                                y: bombPosition.y + dy / distance * step
                            };
                            if (overlaps(next, size, blockPosition, blockSize)) freezeBomb();
                            else bombPosition = next;
                        }
                    }
                }
                killCaughtCharacters();
                if (ended) {
                    draw();
                    return;
                }
            }
            draw();
            setText(status, `Jumps: ${jumps} · Survived: ${elapsed.toFixed(1)}s`);
            animationFrame = requestAnimationFrame(chase);
        }
        function jumpCharacter(character) {
            if (ended || !characters.includes(character)) return;
            sound.unlock();
            sound.play(character.isCat ? 'cat' : 'jump');
            if (character.isCat) targetedCat = character;
            const next = findCharacterPosition(character, false);
            if (!next) {
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
            if (overlaps(blockPosition, blockSize, bombPosition, size)) {
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
            nudgeCharactersApart();
            draw();
        });
        clickyBlock.addEventListener('click', () => {
            if (ended) return;
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
        reset();
