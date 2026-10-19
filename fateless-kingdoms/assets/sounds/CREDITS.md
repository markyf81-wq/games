# Sound effects credits

These selected samples are released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). They are third-party assets, not recordings made by the game author. Sources retrieved 19 October 2026.

| Pack | Creator | Source |
| --- | --- | --- |
| RPG Audio | Kenney | https://kenney.nl/assets/rpg-audio |
| Impact Sounds | Kenney | https://kenney.nl/assets/impact-sounds |
| 80 CC0 RPG SFX | rubberduck | https://opengameart.org/content/80-cc0-rpg-sfx |
| 100 CC0 SFX #2 | rubberduck | https://opengameart.org/content/100-cc0-sfx-2 |

## Included samples

| Bank key | Original pack/file |
| --- | --- |
| `cloth1` | `rpg/Audio/cloth1.ogg` |
| `cloth2` | `rpg/Audio/cloth2.ogg` |
| `page1` | `rpg/Audio/bookFlip1.ogg` |
| `page2` | `rpg/Audio/bookFlip2.ogg` |
| `leather` | `rpg/Audio/dropLeather.ogg` |
| `blade1` | `rpg/Audio/drawKnife1.ogg` |
| `blade2` | `rpg/Audio/knifeSlice2.ogg` |
| `coin1` | `rpg/Audio/handleCoins.ogg` |
| `coin2` | `rpg/Audio/handleCoins2.ogg` |
| `metal1` | `impact/Audio/impactMetal_heavy_000.ogg` |
| `metal2` | `impact/Audio/impactMetal_heavy_002.ogg` |
| `wood1` | `impact/Audio/impactWood_heavy_000.ogg` |
| `wood2` | `impact/Audio/impactWood_heavy_002.ogg` |
| `stone` | `impact/Audio/impactMining_000.ogg` |
| `shield` | `impact/Audio/impactPlate_heavy_001.ogg` |
| `chain` | `rubberduck/chain_01.ogg` |
| `fire1` | `rubberduck/spell_fire_03.ogg` |
| `fire2` | `rubberduck/spell_fire_05.ogg` |
| `spell` | `rubberduck/spell_01.ogg` |
| `roar` | `rubberduck/creature_roar_01.ogg` |
| `wind` | `nature/sfx100v2_air_01.ogg` |
| `thunder` | `nature/sfx100v2_thunder_01.ogg` |
| `water` | `nature/sfx100v2_loop_water_01.ogg` |

## Edits and delivery

Selected excerpts are trimmed, high/low-pass filtered, level-adjusted, given short edge fades and encoded as 64 kbps mono MP3 at 32 kHz. The game layers them, varies playback speed slightly and applies per-cue gains. The `roar` sample is used quietly at a lower pitch for Dread. Music and result fanfares use separate Scott Buckley recordings under CC BY 4.0; see the music credits.

The compressed samples are embedded once in `sound-effects.js`, then decoded on the first audio-enabled gesture. This supports HTTP and direct `file://` play without fetching/decode CORS restrictions. No external audio URLs are requested at runtime.
