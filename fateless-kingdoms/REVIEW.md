# Code review and cleanup — 17 October 2026

Scope: the Fateless Kingdoms game, its rules/search/presentation/persistence code, markup and stylesheet. Other games and card/music assets were left untouched.

## Findings addressed

- Save validation checked card conservation but did not fully validate records consumed by the UI. Null player/weather records could throw during validation; malformed log entries, last-card references or round scores could reach rendering. Validation now returns false for malformed data and checks result/win/phase consistency while retaining optional legacy fields and existing storage keys.
- CPU scheduling, worker error handling, fallback search and cancellation were mixed into the UI. `CPUController` now owns that lifecycle, guards each pending job and releases completion once. It cancels delayed work and stops an obsolete yielded fallback after reset.
- Card preview state and document listeners were interleaved with game orchestration. `CardPreviewController` now owns mouse/focus/touch behavior, preview cleanup and release-click suppression. Existing gesture timing and modal routing are preserved.
- Responsive measurement lived in the main renderer. `TableLayout` now owns it, batches resize notifications into a frame and exposes observer cleanup. Render-time measurements remain synchronous for accurate card-flight destinations.
- UI bonus descriptions duplicated engine formulas. The engine now exposes `powerSources` and shares the ability-bonus calculation with scoring.
- Audio settings merged arbitrary patch values and had repeated normalization/storage logic. Normalization now accepts only known, correctly typed, finite values. Disabling sound effects silences their bus immediately. Playlist defaults use one factory.
- Animation ownership used parallel arrays. `EffectSession` now owns active animations, transient elements, hidden destinations and cancellable waits, with one cancellation path.
- Collection and destroyed-pile browsing repeated search/grid rendering. A shared renderer preserves their separate scopes and return links; the rival pile remains private.
- The stylesheet retained removed components and superseded declarations. Removed 155 obsolete selectors, 69 identical declaration duplicates and 238 earlier declarations overridden in matching selector/media contexts. Final-rule browser fallbacks and media-query order were retained.
- Source files were reformatted for readability. Stale click routes with no producing markup were removed. Runtime dependencies and deployment/build requirements did not change.

## Verification status

Source and focused diffs were reviewed. Formatting was applied using an existing local formatter. No tests, lint, build, browser automation or screenshots were run during this refactor; approval for focused rules/save/CPU checks and a Chrome desktop/mobile play-through was requested separately.

## Remaining limits

This is a source review, not a claim that the game has no defects. Browser-native pull-to-refresh, real-device touch behavior, legacy OS/browser support and perceived animation/music quality need appropriate device checks. Keep `game.js` as orchestration and view composition; further view extraction should follow concrete maintenance needs rather than introducing a framework or an all-purpose application class.
