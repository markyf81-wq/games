# Bomb Major

A cozy click-to-survive arcade game. Open `index.html` in Google Chrome, or select it from the Games library. No installation, build, server or internet connection is needed.

Click a human to teleport somewhere safe. Every successful teleport adds 2px/s to the bomb’s speed before the Slow bomb reduction and shortens freezes. Click the bouncing **Click Me** block to redirect it at the bomb; a hit freezes the bomb temporarily. Characters and the block collect coins, and every ten coins collected in the current round adds another human. Humans randomly spawn as explorers, gardeners, scholars or astronauts, all with the same abilities.

The round ends when no humans remain. **One more try** starts a fresh attempt. There are no timed levels. The marketplace is available before starting and after game over. **Sound on/off** controls music and effects; audio starts after an interaction.

## Marketplace

Coins always spawn. All other drops, including the cat and cow, must first be unlocked in the marketplace. Each ability and drop has five tiers, bought in order for **20, 80, 320, 1,280 and 5,000 coins**. Later tiers give larger improvements. Purchases are permanent, work together and carry over between attempts.

| Ability | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
| --- | --- | --- | --- | --- | --- |
| Slow bomb | 2% slower | 4% | 7% | 12% | 20% |
| Bomb freeze | 0.5s | 0.8s | 1.4s | 2.6s | 5s |
| Fast block | 5% faster | 7% | 10% | 15% | 25% |
| Safe jump | 50px | 70px | 110px | 180px | 300px |
| A little book of courage | 1px/tick | 1.2px/tick | 1.6px/tick | 2.4px/tick | 4px/tick |

Bomb freeze values are the base freeze duration, before jumps shorten it. Without upgrades the bomb freezes for 0.25s and the teleport safety radius is 44px. Freeze duration has a 0.1s floor. Slow bomb also reduces speed gained from jumps. A crowded or small courtyard can expand to make room for a safe jump; if no safe position fits, the character stays put.

Five-segment bars show your progress: green is purchased, gold outlines the next tier and pale segments are still unpurchased. The shop shows current and next benefits before buying. Locked drops show an **Unlock tier 1** button.

**A little book of courage** is grouped under **Permanent abilities** with the four other stats. It has the same five-tier prices and progress bar. Each human attempts its tier’s movement step every **0.2 seconds**, when there is space: **5, 6, 8, 12 or 20px/s** overall. Existing book purchases become tier 1 for free. It works on every future run and with every upgrade. All character models are free and randomized on spawn.

## Unlockable finds

| Find | What to do | Benefit |
| --- | --- | --- |
| Magnet | Click it | Pulls existing coins toward the block. |
| Cat | Click it to lure the bomb | If caught, it escapes, drops five coins and resets the bomb's extra speed. |
| Cow | Let it wander | Leaves poop batches every 6 seconds. The bomb never targets it, but touching the bomb makes it leave. |
| Cow poop | Let the bomb touch a pile, or throw it with the block | Consumes the pile and repels the bomb for **3, 4, 5, 7 or 10 seconds**, based on cow tier. |
| Shield | Click to activate | Saves the next human hit, once. One shared charge for the crew. |
| Banana peel | Click it | Sends the bomb around **two tight circles** over 1.2 seconds. It can still hit humans. |
| String | Click it | Tethers the bomb within **100px** of the moving block for **10 seconds**. It can still kill humans. |
| Treadmill | Click it | The block gets faster continuously, then returns to its normal upgraded speed. |

Magnet, cat, shield, banana and string tiers increase spawn-roll odds to **1%, 1.5%, 2.5%, 4.5% and 8%**. Cow tiers increase each batch to **1, 2, 3, 5 and 8 piles**; its spawn-roll chance stays at 2% after unlocking. Cow tiers also increase poop repel duration to **3, 4, 5, 7 and 10 seconds**. Stationary and thrown piles both work, and further hits refresh the duration rather than adding time together. Treadmill tiers last **5, 7, 10, 14 and 20 seconds**, with a 2% spawn-roll chance after unlocking. While active, each second adds 5% of the block’s normal speed. It combines with Fast block, and expiry restores that upgraded speed without changing direction. The effect strip shows time and speed; another treadmill cannot spawn while one is active. Round end/restart also clears the boost.

Only one drop of each type, cat or cow can be present at once. Blocked spawn attempts may be skipped. Poop piles last 25 seconds, with up to 24 present.

The strip above the courtyard shows active effects and remaining time/banana turns. Effect timers run together. String and banana do not give invulnerability; the shield can still be consumed while they are active. Only poop repel prevents catches for its cow-tier duration. New rounds clear drops and temporary effects. The cat and cow do not keep a round alive after the last human is gone.

## Saves and files

The courtyard uses the full page width and a taller play area, with the help panels underneath.

**Local high scores** save your ten best completed rounds on this browser. Longest survival wins; round coins, then jumps, break ties. Results include a link to the table. No account or database is required. Restarting keeps your records.

Existing saved coins, book ownership and purchased tiers are kept. New drop tiers begin locked. The combined wallet, book and upgrade tiers save under `bomb-major-market-v1`; `bomb-major-coins` remains as the legacy balance mirror. Sound preference stays under `bomb-major-sound`; local scores use `bomb-major-scores-v1`. Saves belong to this browser and page origin. Storage failures allow session play but may prevent changes surviving a reload.

`index.html` holds markup/templates; `content.js` holds vector art, models, prices, shared balance tables and drop odds; `marketplace.js` owns purchases and wallet saving; `scores.js` owns the local top-ten scoreboard; `game.js` contains gameplay/audio; `styles.css` and `assets/courtyard.svg` provide the presentation. [AGENTS.md](AGENTS.md) is the guide for AI agents.

Shared online high scores are parked for now, as requested. No database or network service has been added.

The game was imported from original Bomb Major commit `790779f7b3084c2cea53337a9a6268dc12a1af35`. Changes have received source/diff review; browser testing is left to Mark.
