# Fateless Kingdoms code map

The game uses ordinary deferred scripts, relative asset URLs and browser APIs. There is no build step or runtime dependency. It must continue to work over HTTP and directly from `file://`.

## Boundaries

| File | Owns | Must not own |
| --- | --- | --- |
| `cards.js` | Immutable card definitions, names, artwork and ability text | UI or mutable match state |
| `engine.js` | Pure state transitions, scoring, protection, legal choices, save validation | DOM, audio, storage or CPU policy |
| `cpu.js` | Reactive Kids choices and sampled search for higher levels | Real opponent hand or deck order |
| `cpu-worker.js` | Message bridge for background CPU search | Separate rules or alternate move validation |
| `cpu-controller.js` | Delayed search, worker/fallback lifecycle and single completion | Move legality or DOM rendering |
| `storage.js` | Existing storage keys and nonthrowing JSON persistence | State validation or UI messages |
| `game.js` | Match orchestration, views, dialog drafts and event routing | Independent copies of rules or controller lifecycle state |
| `card-preview.js` | Mouse/keyboard previews, touch gestures and click suppression | Playing a card directly |
| `table-layout.js` | Responsive measurements and resize observation | Match rules or UI selection state |
| `effects.js` | Card presentation, transient overlays and animation cleanup | Mutating the match or revealing hidden cards |
| `audio.js` | Sampled effects, activation cue selection, decoding/voice lifecycle and normalized audio preferences | Turn progression or music-deck state |
| `music-player.js` | Local native music voices, playlist/phase crossfades, results and pause positions | Game rules or saved preferences |
| `sound-effects.js` | Embedded compressed Sonniss-licensed and CC0 sample data for direct-file-safe playback | Playback state |
| `styles.css` | Presentation, responsive layouts and reduced-motion styles | Game rules |

## Why classes here

`CardPreviewController` and `TableLayout` own long-lived event listeners/observers and expose cleanup methods. `CPUController` owns a pending job, a delay timer, a worker and cooperative fallback cancellation. `EffectSession`, internal to the effects service, owns transient animations, overlays, hidden destinations, cancellable waits and canvas render frames. Shared effect-type sets avoid rebuilding membership lists each frame; secondary audio uses the same session waits as visuals. `MusicPlayer` owns native audio voices and their pending play requests, crossfade timers and cleanup; audio preferences and effect samples remain in the audio service.

These classes encapsulate state with a lifecycle. Card definitions, rules, search evaluation, storage helpers and rendering helpers remain functions where an instance would add no useful ownership.

## A play from selection to resolution

1. A hand tap or preview release calls `selectHandCard`; it creates a dialog draft.
2. `engine.prompt` returns `blocked`, `choice` or `ready`. Both humans and CPU use this same API. Every required nonempty choice is explicit, including a single possible target.
3. `engine.play` revalidates the proposed choices and creates the next state without mutating the previous state.
4. `game.js` plays the activation cue for the validated card (Spell, Omen, ability unit, or ordinary selection), stores the committed next state as `pendingState` and saves it before presentation starts.
5. `effects.showPlayed` reveals the card; the displayed match then advances to the saved state and `effects.transition` presents the changes. The primary flight plays one common soft landing cue on arrival. Effects owns sound timing: boss accents accompany the centre crown reveal; cinematic card sounds accompany their actual visual beats; remaining non-boss abilities play on field arrival. Each primary sound has one owner; destruction/draw and result cues remain separate.
6. Only after presentation finishes does the next turn or result dialog become available.

A new game cancels CPU work and effects, increments the presentation token and removes only the match save. Old async work cannot revive the previous match. Refresh during an animation restores the committed move.

## CPU isolation and cancellation

Only `engine.publicView(state, 1)` goes into `CPUController`. The three search levels reconstruct possible unknown cards from the public pool and observations. Kids bypasses that path and randomly chooses legal current-board plays without sampling or turn simulation. Worker errors fall back once to the same local search. A completed job releases its callback before invoking it, preventing a second response from playing again. Reset invalidates the pending job and terminates its worker; yielded fallback searches exit when their job is no longer current.

## Persistence compatibility

Keep `fateless-kingdoms.match.v1`, `fateless-kingdoms.settings.v1`, `fateless-kingdoms.audio.v1`, state version 1 and the `printed-v1` rules fingerprint. Optional old-save fields remain optional. The match envelope also stores an optional musicTrack filename; MusicPlayer accepts only a filename from its local three-track pool. This does not enter the pure engine state or CPU view. URL-only `?debug=1` selects a separate debug-match key and a conserved 26-card effects hand; it never adds duplicate IDs or replaces the ordinary saved match. The optional engine option debug:true is normalized and validated while ordinary saves retain their existing format. `storage.js` handles unavailable/corrupt JSON; `engine.validState` checks card conservation, row types, player records, public knowledge, log entries, round scores/outcomes, win totals and phase consistency before rendering a saved match.

UI bonus explanations call `engine.powerSources`; `engine.power` and that explanation use the same ability-bonus calculation. Do not recreate Accuracy/Blood Rage/Fortified formulas in the view.

## CSS maintenance

Keep selectors grouped with their components and preserve media-query order. CSS fallback declarations such as `vh` followed by `dvh` belong together in the final applicable rule. Do not restore removed footer/hint/status-tag components or the old pseudo-element row animations; ongoing effects use the local SVG scenes. Keep hand hit areas stable during hover and touch previews.

When changing script dependencies, update both `index.html` and the worker import/URL versions. Preserve the declaration order: storage/cards, engine, CPU, sound sample data and MusicPlayer, audio/effects, controllers, then game bootstrap.
