# Sources and acknowledgements

This is an unofficial, non-commercial Pokémon fan game. Pokémon, Pokémon names
and character artwork belong to Nintendo, Creatures Inc. and GAME FREAK inc.
This game is not affiliated with or endorsed by those companies.

## Artwork

The local files `assets/pokemon/1.png` through `151.png` are the official-artwork
PNGs distributed by the [PokéAPI sprites project](https://github.com/PokeAPI/sprites),
downloaded on 28 October 2026 from:

`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`

The library thumbnail embeds the same Bulbasaur, Charmander and Pikachu artwork.
Distribution through PokéAPI does not transfer ownership of Pokémon artwork.

## Game data

Names, Pokédex numbers, measurements, types and evolution relationships were
prepared from the [PokéAPI data CSVs](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv)
on 28 October 2026: `pokemon.csv`, `pokemon_species.csv`,
`pokemon_species_names.csv`, `pokemon_types.csv` and `types.csv`.
See the [PokéAPI documentation](https://pokeapi.co/docs/v2).

The game intentionally restores original Kanto typings and restricts evolution
relationships to the original 151. Observation clues are original paraphrases
of familiar character traits, not copied Pokédex passages. All game data is
bundled in `pokemon.js`; PokéAPI is not contacted during play.
