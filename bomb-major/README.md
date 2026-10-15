# Chicken Major

A cozy click-to-dodge arcade game. Open `index.html` in Google Chrome, or select it from the Games library. No installation, build, server or internet connection is needed.

Click a human to teleport somewhere safe. Every successful teleport adds 2px/s to the chicken’s speed before the Slow chicken reduction and shortens freezes. Click the bouncing **Click Me** block to redirect it at the chicken; a hit freezes the chicken temporarily. Characters and the block collect coins, and every ten coins collected in the current round adds another human. Humans randomly spawn as explorers, gardeners, scholars or astronauts, all with the same abilities.

When caught, characters run off-screen; nobody dies or explodes. The round ends when all humans have left the courtyard. **One more try** starts a fresh attempt. There are no timed levels. The marketplace is available before starting and after game over. **Sound on/off** controls music and effects; audio starts after an interaction.

## A steadily rising chase

The chicken starts at **48px/s**. Its baseline gains **0.5px/s for every active second**—**30px/s per minute**, with no cap. Successful teleports add another **2px/s** each. **Slow chicken reduces the whole total**, including the time-based baseline, so it stays useful without stopping the difficulty ramp.

Cats reset only teleport-earned extra speed, and poop removes 1px/s of that extra speed per hit. Neither resets the rising baseline. With no teleport boost, the baseline is 78px/s after one minute, 138px/s after three minutes and 198px/s after five minutes; maxed Slow chicken reduces those to 62.4, 110.4 and 158.4px/s. The HUD shows chase speed and its current minimum. Time pressure resets for a new round and uses active round time, rather than time spent on menus or away from the tab.

Poop repel cannot be refreshed while already active. After it ends, the chicken resists another repel for **3 seconds**. Hits during active repel or resistance still remove teleport-earned speed but do not restart immunity. Cow tiers retain their 3–10 second repel durations. Other items can still help during resistance.

## Marketplace

Coins always spawn. All other drops, including the cat and cow, must first be unlocked in the marketplace. Each ability and drop has five tiers, bought in order for **20, 80, 320, 1,280 and 5,000 coins**. Later tiers give larger improvements. Purchases are permanent, work together and carry over between attempts.

| Ability | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
| --- | --- | --- | --- | --- | --- |
| Slow chicken | 2% slower | 4% | 7% | 12% | 20% |
| Chicken freeze | 1s | 1.5s | 2.25s | 3.5s | 5s |
| Fast block | 5% faster | 7% | 10% | 15% | 25% |
| Safe jump | 50px | 70px | 110px | 180px | 300px |
| A little book of courage | 1px/tick | 1.2px/tick | 1.6px/tick | 2.4px/tick | 4px/tick |

Chicken freeze values are the base freeze duration, before jumps shorten it. Without upgrades the chicken freezes for 0.25s and the teleport safety radius is 44px. Freeze duration has a 0.1s floor. Slow chicken also reduces speed gained from jumps. A crowded or small courtyard can expand to make room for a safe jump; if no safe position fits, the character stays put.

Five-segment bars show your progress: green is purchased, gold outlines the next tier and pale segments are still unpurchased. The shop shows current and next benefits before buying. Locked drops show an **Unlock tier 1** button.

**A little book of courage** is grouped under **Permanent abilities** with the four other stats. It has the same five-tier prices and progress bar. Each human attempts its tier’s movement step every **0.2 seconds**, when there is space: **5, 6, 8, 12 or 20px/s** overall. Existing book purchases become tier 1 for free. It works on every future run and with every upgrade. All character models are free and randomized on spawn.

## Unlockable finds

| Find | What to do | Benefit |
| --- | --- | --- |
| Magnet | Click it | Pulls existing coins toward the block. |
| Cat | Click it to lure the chicken | If caught, it escapes, drops five coins and resets the chicken's extra speed. |
| Cow | Let it wander | Leaves poop batches every 6 seconds. The chicken never targets it, but touching the chicken makes it leave. |
| Cow poop | Let the chicken touch a pile, or throw it with the block | Thrown piles home in on the chicken. Every hit consumes the pile, removes **1px/s of accumulated speed boost**, and can repel it for **3, 4, 5, 7 or 10 seconds** by cow tier, when repel is ready. |
| Shield | Click to activate | Saves the next human hit, once. One shared charge for the characters. |
| Banana peel | Click it | Sends the chicken around **two tight circles** over 1.2 seconds. It can still hit humans. |
| String | Click it | Tethers the chicken within **100px** of the moving block for **10 seconds**. It can still make humans run off. |
| Treadmill | Click it | The block gets faster continuously, then returns to its normal upgraded speed. |

Magnet, cat, shield, banana and string tiers increase spawn-roll odds to **1%, 1.5%, 2.5%, 4.5% and 8%**. Cow tiers increase each batch to **1, 2, 3, 5 and 8 piles**; its spawn-roll chance stays at 2% after unlocking. Cow tiers also increase poop repel duration to **3, 4, 5, 7 and 10 seconds**. Stationary and thrown piles both work. Hits do not extend an active repel; after it ends the chicken resists new repels for 3 seconds. Thrown poop keeps seeking until it hits or the round ends. Each hit removes half a teleport’s extra speed; it cannot lower the chicken below its current rising, Slow chicken-adjusted minimum speed. The cat still clears all teleport-earned speed, but never the time-based baseline. Treadmill tiers last **5, 7, 10, 14 and 20 seconds**, with a 2% spawn-roll chance after unlocking. While active, each second adds 20% of the block’s normal speed, reaching almost 2× over five seconds or 5× over twenty seconds. It combines with Fast block, and expiry restores that upgraded speed without changing direction. The effect strip shows time and speed; another treadmill cannot spawn while one is active. Round end/restart also clears the boost.

Only one drop of each type, cat or cow can be present at once. Blocked spawn attempts may be skipped. Stationary poop piles last 25 seconds; launched poop stays until it hits or the round is cleared, with up to 24 piles/projectiles present.

The strip above the courtyard shows active effects and remaining time/banana turns. Effect timers run together. String and banana do not give invulnerability; the shield can still be consumed while they are active. Only poop repel prevents catches for its cow-tier duration. New rounds clear drops and temporary effects. The cat and cow do not keep a round alive after the last human is gone.

## Saves and files

The courtyard uses the full page width and a taller play area, with the help panels underneath.

**Local high scores** save your ten best completed rounds on this browser. Longest round wins; round coins, then jumps, break ties. Results include a link to the table. No account or database is required. Restarting keeps your records.

Existing saved coins, book ownership and purchased tiers are kept. New drop tiers begin locked. The combined wallet, book and upgrade tiers save under `bomb-major-market-v1`; `bomb-major-coins` remains as the legacy balance mirror. Sound preference stays under `bomb-major-sound`; local scores use `bomb-major-scores-v1`. Saves belong to this browser and page origin. Storage failures allow session play but may prevent changes surviving a reload.

`index.html` holds markup/templates; `content.js` holds vector art, models, prices, shared balance tables and drop odds; `marketplace.js` owns purchases and wallet saving; `scores.js` owns the local top-ten scoreboard; `game.js` contains gameplay/audio; `styles.css` and `assets/courtyard.svg` provide the presentation. [AGENTS.md](AGENTS.md) is the guide for AI agents.

Shared online high scores are parked for now, as requested. No database or network service has been added.

The game was imported from original standalone game commit `790779f7b3084c2cea53337a9a6268dc12a1af35`. Changes have received source/diff review; browser testing is left to Mark.

Chicken Major keeps the legacy `bomb-major/` URL, `bomb-major-*` save keys, catalog ID, and internal `Bomb*`/`bomb*` identifiers for compatibility. Use chicken wording throughout the player interface; never reintroduce explosions or character death. Existing purchases and scores remain intact.
