# CPU design and Gwent research

The initial opponent is independently written JavaScript. No third-party Gwent code, trained weights or commercial game source is included.

## Relevant primary sources

- Jakub Majer, *Hraní karetní hry Gwent počítačem*, Brno University of Technology: https://dspace.vut.cz/items/3ac0b30d-d675-4998-8577-f563e4289b5f — describes implementing and evaluating an MCTS agent for Gwent.
- Independent `brittain9/gwent-ai` project: https://github.com/brittain9/gwent-ai — describes information-set MCTS, beliefs about hidden cards, learned move ordering and value estimates. Its advertised strength and timings are author-reported; they are not benchmarks for this game or evidence of how CD Projekt's original CPU works.
- Stefano Di Palma and Pier Luca Lanzi, *Traditional Wisdom and Monte Carlo Tree Search Face-to-Face in the Card Game Scopone*: https://arxiv.org/abs/1807.06813 — compares expert rules, MCTS and information-set MCTS in an imperfect-information card game.

These support simulation and uncertainty-aware planning as useful directions. We did not find an authoritative technical description of CD Projekt's original Gwent CPU during the initial search.

## Kids level

Kids (`kids`) uses a separate reactive policy. It branches before the sampled search, requests legal plays from `engine.actions` using only the public view, and chooses randomly by card, then randomly among that card’s retained target/placement options. Grouping by card prevents a card with several row choices from being artificially more likely.

A few deliberately rough visible-board guidelines avoid obvious waste when alternatives exist: destruction Spells are favoured only while level or behind on power; weather should not favour the rival’s current row; War Chant prefers a populated row without Ironward; Decoy prefers low-power or Infiltration units. When no moves meet these guidelines, it still chooses a legal play. It passes if no legal plays remain or the human has passed and it is strictly ahead. It does not ration its best cards for later rounds.

Kids never samples hidden hands/deck orders, simulates a play with `engine.play`, predicts an opponent response or calls the continuation search. Its sample count is always zero. Its legal-target rules are identical to every other level. It is intended to be easier and less predictable, but its playing strength has not been measured.

## Search levels (Beginner, Intermediate, Difficult)

1. The app removes the human hand and real deck order before dispatching a CPU job. Only their counts remain.
2. Publicly returned/recovered cards are remembered. Remaining unseen cards from the configured match pool are sampled without replacement into plausible opposing hands and deck orders. A shared, one-copy deck makes this simpler than guessing collectible deck archetypes.
3. Enumerate legal plays, row placements and target choices through the same rules engine used by the human. Cap alternative CPU target combinations for responsiveness; human selection is not capped.
4. Shortlist promising moves while retaining a representative of each playable card and Pass.
5. Evaluate those candidates against the same sampled deals, using greedy alternating continuations. Score match outcomes first, then round wins, remaining hand value and field advantage. This is a heuristic approximation, not an optimal solver.
6. Pass immediately to secure an already-won round after the human passes. A separate conservative concession rule can save cards in a costly round when losing it would not end the match.

Budgets: Beginner uses 2 sampled deals, 2 continuation turns and modest selection noise; Intermediate uses 5 samples and 4 turns; Difficult uses 10 samples and 6 turns with no rating noise. Candidate breadth also increases. The internal keys casual/tactician/strategist remain unchanged for saved-game compatibility. These budgets define distinct behavior but playing strength still needs human feedback and measurement; no win-rate guarantee is implied.

CPU work runs in a Web Worker over HTTP, with a yielding fallback when opened directly from disk. Everything runs locally. No chat model, cloud requests, subscription or live training is used.

## Limitations and useful next steps

The three search levels use sampled lookahead, **not full MCTS or ISMCTS**. It uses uniform guesses for unrevealed cards, heuristic leaf values and a greedy opponent model. It does not learn from the human's playing history. Stopping at the current round values future material heuristically rather than solving all future rounds.

Natural improvements are full information-set tree search with a bounded thinking time, better match-level passing evaluation, explicit combo planning (for example Decoy/Infiltration), opponent-policy variety, and self-play measurement against fixed baselines. Changes should be evaluated with an agreed testing scope, without giving harder opponents hidden information or extra cards.
