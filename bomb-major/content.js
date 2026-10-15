'use strict';
// Shared vector art and shop data. No downloaded assets or runtime dependencies.
window.BombContent = (() => {
    const svg = body => '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + body + '</svg>';
    const icons = {
        treadmill: svg('<path d="M10 44L49 44L58 54H6Z" fill="#8eaa98" stroke="#5d7e6b" stroke-width="2" stroke-linejoin="round"/><path d="M15 46H47L52 51H11Z" fill="#65786a"/><path d="M23 48H30M36 48H43" stroke="#d9e3c8" stroke-width="2" stroke-linecap="round"/><path d="M46 44L39 12H28M40 17L18 26L13 43" fill="none" stroke="#aa8b64" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><rect x="24" y="6" width="20" height="12" rx="3" fill="#c79570" stroke="#a67c57" stroke-width="2"/><rect x="28" y="9" width="8" height="5" rx="1" fill="#e8eccd"/><circle cx="40" cy="12" r="2" fill="#e7c374"/><circle cx="13" cy="55" r="3" fill="#8c785e"/><circle cx="49" cy="55" r="3" fill="#8c785e"/>'),
        shield: svg('<path d="M32 6L52 14V32Q49 48 32 58Q15 48 12 32V14Z" fill="#8eafa6" stroke="#527c74" stroke-width="3"/><path d="M32 14L44 19V32Q42 42 32 49Q22 42 20 32V19Z" fill="#d7e8cc"/><path d="M24 30L30 36L41 24" fill="none" stroke="#6a9277" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
        banana: svg('<path d="M46 12Q48 36 17 43L9 39Q13 54 30 52Q53 48 54 20L50 10Z" fill="#edce76" stroke="#b79143" stroke-width="2.5"/><path d="M47 18Q47 38 23 47M14 39L8 33M50 11L51 6" fill="none" stroke="#b79143" stroke-width="3" stroke-linecap="round"/><path d="M14 40Q23 27 28 18Q35 34 45 32" fill="#f4e6a6" stroke="#b79143" stroke-width="2" stroke-linejoin="round"/>'),
        string: svg('<path d="M16 17Q1 40 23 45Q44 49 49 33Q52 19 37 18Q21 17 24 32Q26 42 37 34Q49 25 54 49" fill="none" stroke="#b48b5a" stroke-width="5" stroke-linecap="round"/><path d="M15 16L19 13M52 49L55 53" stroke="#8e704e" stroke-width="3" stroke-linecap="round"/>'),
        book: svg('<path d="M10 12Q22 8 32 16Q42 8 54 12V50Q42 46 32 54Q22 46 10 50Z" fill="#e9d9b0" stroke="#9d8260" stroke-width="2.5"/><path d="M32 16V54M16 20Q23 18 27 22M16 27Q23 25 27 29M38 22Q44 18 49 20M38 29Q44 25 49 27" fill="none" stroke="#b69c77" stroke-width="2" stroke-linecap="round"/>'),
        slowness: svg('<path d="M13 40Q14 22 32 22Q50 22 51 40Z" fill="#9db795" stroke="#708e6b" stroke-width="2"/><path d="M22 39L27 24M40 39L36 24M15 32H49" stroke="#dbe4bb" stroke-width="2"/><circle cx="54" cy="39" r="6" fill="#bfc6a0"/><circle cx="56" cy="37" r="1.5" fill="#4b5f43"/><path d="M20 42V47M41 42V47" stroke="#708e6b" stroke-width="4" stroke-linecap="round"/>'),
        freeze: svg('<g stroke="#719b9e" stroke-width="3" stroke-linecap="round"><path d="M32 8V56M11 20L53 44M11 44L53 20M25 12L32 19L39 12M25 52L32 45L39 52M14 28L22 27L22 18M42 46L42 37L50 36M14 36L22 37L22 46M42 18L42 27L50 28"/></g>'),
        speed: svg('<path d="M12 19H26M7 31H21M12 43H26" stroke="#a7b390" stroke-width="3" stroke-linecap="round"/><path d="M40 7L25 34H38L31 57L56 25H42L48 7Z" fill="#e4c578" stroke="#b18b45" stroke-width="2" stroke-linejoin="round"/>'),
        awareness: svg('<path d="M6 32Q32 4 58 32Q32 60 6 32Z" fill="#dae4d1" stroke="#839e7d" stroke-width="2.5"/><circle cx="32" cy="32" r="11" fill="#8ea48a"/><circle cx="32" cy="32" r="5" fill="#456b51"/><circle cx="35" cy="29" r="2" fill="#faf2d6"/>'),
        poop: svg('<ellipse cx="32" cy="52" rx="24" ry="5" fill="#7c6b4c" opacity=".2"/><path d="M14 47Q9 39 20 36Q15 29 27 25Q23 18 35 10Q34 22 43 25Q50 29 46 35Q58 39 50 48Z" fill="#9a7757" stroke="#75583f" stroke-width="2"/><path d="M20 36H43M25 26Q32 29 40 26" fill="none" stroke="#ba9570" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="40" r="2" fill="#443d30"/><circle cx="39" cy="40" r="2" fill="#443d30"/><path d="M29 46Q33 49 37 46" fill="none" stroke="#e3c8a2" stroke-width="2" stroke-linecap="round"/>')
    };
    const cow = svg('<ellipse cx="33" cy="59" rx="23" ry="3" fill="#70815e" opacity=".2"/><path d="M17 37L15 55M46 37L48 55" stroke="#766d5d" stroke-width="8" stroke-linecap="round"/><ellipse cx="32" cy="38" rx="22" ry="17" fill="#f4ead7"/><path d="M13 31Q28 22 26 38Q17 48 12 41M38 25Q53 24 52 38Q37 40 38 25" fill="#768075"/><path d="M16 16Q6 18 8 26L20 26M47 16Q58 18 56 26L44 26" fill="#9ca18b"/><path d="M20 15L18 5L27 14M44 15L46 5L37 14" fill="#d5bd91"/><path d="M17 17Q32 9 47 17L46 37H18Z" fill="#f4ead7"/><path d="M18 18Q30 13 28 26L18 29Z" fill="#768075"/><circle cx="24" cy="25" r="2" fill="#424c40"/><circle cx="40" cy="25" r="2" fill="#424c40"/><ellipse cx="32" cy="36" rx="17" ry="10" fill="#d9ab96"/><ellipse cx="26" cy="35" rx="2" ry="2.5" fill="#996f60"/><ellipse cx="38" cy="35" rx="2" ry="2.5" fill="#996f60"/><path d="M27 41Q32 44 37 41" fill="none" stroke="#996f60" stroke-width="1.5" stroke-linecap="round"/>');
    const body = (shirt, skin, hair, hat = '', extra = '') => svg(
        '<ellipse cx="32" cy="59" rx="17" ry="3" fill="#7b8060" opacity=".2"/><path d="M25 44L24 54M39 44L40 54" stroke="#697b70" stroke-width="8" stroke-linecap="round"/><path d="M19 57H27M37 57H45" stroke="#8e6c53" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M22 31L14 41M42 31L50 41" stroke="' + skin + '" stroke-width="7" stroke-linecap="round"/><rect x="20" y="27" width="24" height="21" rx="8" fill="' + shirt + '"/><path d="M28 29Q32 34 36 29M32 36V44" stroke="#fff1d4" stroke-width="2" fill="none"/>' +
        '<ellipse cx="32" cy="17" rx="14" ry="15" fill="' + skin + '"/><path d="M18 16Q14 2 28 2Q40 -3 46 10L46 19L41 13Q34 17 26 9Q25 16 18 16Z" fill="' + hair + '"/><circle cx="27" cy="18" r="1.6" fill="#4c493a"/><circle cx="37" cy="18" r="1.6" fill="#4c493a"/><path d="M28 24Q32 28 36 24" fill="none" stroke="#946850" stroke-width="1.8" stroke-linecap="round"/>' + extra + hat);
    const models = [
        { id: 'explorer', name: 'Explorer', art: body('#759a87','#edc49e','#7a5b48') },
        { id: 'gardener', name: 'Gardener', art: body('#bd8279','#a97957','#57453b','<path d="M17 8L21 1H42L47 8Z" fill="#d6b779"/><path d="M12 9H51" stroke="#b38b51" stroke-width="5" stroke-linecap="round"/>','<path d="M25 35H39V44H25Z" fill="#dbb38e"/><path d="M25 29V37M39 29V37" stroke="#dbb38e" stroke-width="3"/>') },
        { id: 'scholar', name: 'Scholar', art: body('#a18fac','#dfb39c','#b29d79','','<g fill="none" stroke="#5d6e65" stroke-width="1.7"><circle cx="26" cy="18" r="5"/><circle cx="38" cy="18" r="5"/><path d="M31 18H33"/></g><path d="M22 31L32 37L42 31" fill="none" stroke="#ebd6a5" stroke-width="3"/>') },
        { id: 'astronaut', name: 'Astronaut', art: body('#d9dfce','#c99770','#625445','<circle cx="32" cy="17" r="17" fill="none" stroke="#a0b4ad" stroke-width="4"/><path d="M16 10Q18 2 27 1" fill="none" stroke="#fff4d9" stroke-width="3" stroke-linecap="round"/>','<rect x="25" y="34" width="14" height="9" rx="2" fill="#8ba49d"/><circle cx="29" cy="38" r="1.5" fill="#e8c273"/>') }
    ];
    const tiers = Array.from({ length: 5 }, (_, tier) => Math.min(5000, 20 * 4 ** tier));
    const balance = {
        slowness: [0, 2, 4, 7, 12, 20],
        freeze: [.25, .5, .8, 1.4, 2.6, 5],
        speed: [0, 5, 7, 10, 15, 25],
        awareness: [44, 50, 70, 110, 180, 300],
        bookStep: [0, 1, 1.2, 1.6, 2.4, 4],
        dropOdds: [0, 1, 1.5, 2.5, 4.5, 8],
        cowPiles: [0, 1, 2, 3, 5, 8],
        cowRepelDuration: [0, 3, 4, 5, 7, 10],
        treadmillDuration: [0, 5, 7, 10, 14, 20],
        treadmillGainPerSecond: .05
    };
    const dropChance = (id, tier) => tier === 0 ? 0 : (id === 'cow' || id === 'treadmill') ? .02 : balance.dropOdds[tier] / 100;
    icons.cow = cow;
    icons.cat = document.querySelector('#catTemplate').content.firstElementChild.outerHTML;
    icons.magnet = document.querySelector('#magnetTemplate').content.querySelector('svg').outerHTML;
    const upgrades = [
        { id: 'slowness', name: 'Slow bomb', icon: 'slowness', effect: tier => balance.slowness[tier] + '% slower bomb', desc: 'Slows the chase, including speed gained from jumps.' },
        { id: 'freeze', name: 'Bomb freeze', icon: 'freeze', effect: tier => balance.freeze[tier] + 's base freeze time', desc: 'Sets the starting freeze time. Jumps still shorten it.' },
        { id: 'speed', name: 'Fast block', icon: 'speed', effect: tier => '+' + balance.speed[tier] + '% block speed', desc: 'A modest speed boost for collecting coins and helping friends.' },
        { id: 'awareness', name: 'Safe jump', icon: 'awareness', effect: tier => balance.awareness[tier] + 'px safe teleport radius', desc: 'Keeps clicked friends farther away from the bomb.' },
        { id: 'book', name: 'A little book of courage', icon: 'book', effect: tier => tier === 0 ? 'Not owned · no automatic movement' : balance.bookStep[tier] + 'px every 0.2s · ' + (balance.bookStep[tier] * 5) + 'px/s', desc: 'Humans take small steps away from the bomb every 0.2 seconds. Later tiers make them braver.' }
    ];
    const drops = [
        { id: 'magnet', name: 'Magnet', desc: 'Unlock a magnet drop to pull current coins toward the block.' },
        { id: 'cat', name: 'Cat', desc: 'Unlock the cat. More tiers increase its odds of appearing.' },
        { id: 'cow', name: 'Cow', desc: 'Unlock a wandering cow. More tiers add poop piles and make their repel effect last longer.' },
        { id: 'shield', name: 'Shield', desc: 'Unlock a drop that protects the next human hit, once.' },
        { id: 'banana', name: 'Banana peel', desc: 'Unlock a drop that sends the bomb around two tight circles.' },
        { id: 'string', name: 'String', desc: 'Unlock a 10-second, 100px tether. The bomb can still kill humans.' },
        { id: 'treadmill', name: 'Treadmill', desc: 'Unlock a drop that keeps accelerating the block by 5% of normal speed each second, then resets.' }
    ].map(drop => ({ ...drop, icon: drop.id, unlock: true,
        effect: tier => tier === 0 ? 'Locked · will not spawn' : drop.id === 'cow'
            ? balance.cowPiles[tier] + (tier === 1 ? ' pile' : ' piles') + ' every 6s · ' + balance.cowRepelDuration[tier] + 's repel · 2% spawn roll'
            : drop.id === 'treadmill' ? balance.treadmillDuration[tier] + 's acceleration · 2% spawn roll'
            : balance.dropOdds[tier] + '% spawn roll' }));
    return { svg, icons, cow, models, tiers, balance, upgrades, drops, dropChance };
})();
