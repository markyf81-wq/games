// The library catalog. Add a record only once the game's folder exists.
// Paths are relative to this repository's root, so the library also works offline.
const GAME_CATALOG = [
  {
    id: 'guess-the-pokemon',
    title: 'Guess the Pokémon',
    subtitle: 'Five clues. One familiar face.',
    description: 'Meet a mystery Pokémon from the original 151. Follow five clues from hard to easy, guess early for more points, and reveal its artwork. Build your collection across ten-round expeditions.',
    category: 'Trivia',
    tags: ['Pokémon', 'Guessing', 'Kanto'],
    path: 'guess-the-pokemon/index.html',
    image: 'previews/guess-the-pokemon.svg',
    imageAlt: 'Pikachu, Bulbasaur and Charmander on a cream and coral Kanto guessing game card',
    accent: '#eaf0e8',
    detail: '151 Pokémon · 5 clues · 10 rounds'
  },
  {
    id: 'type-tails',
    title: 'Type & Tails',
    subtitle: 'A little practice. A lot of personality.',
    description: 'Practice touch typing with Pip, your playful cat. Try fresh word selections from home-row and keyboard-reach practice pools, unlock new difficulties by speed, earn coins, and decorate your cozy little room.',
    category: 'Learning',
    tags: ['Typing', 'Pets', 'Cozy'],
    path: 'type-tails/index.html',
    image: 'previews/type-tails.svg',
    imageAlt: 'Pip the cat in a sunny room with a sofa, window, and toys',
    accent: '#dce7d8',
    detail: '20 random words · 8 difficulties'
  },
  {
    id: 'bomb-major',
    title: 'Chicken Major',
    subtitle: 'A chasing chicken. A bouncing block. One more try.',
    description: 'Keep your characters safe with a bouncing block, helpful cats and cows, shields, banana peels and string. Collect coins for permanent marketplace upgrades between attempts and beat your local high scores.',
    category: 'Arcade',
    tags: ['Chasing', 'Clicking', 'Coins'],
    path: 'bomb-major/index.html',
    image: 'previews/bomb-major.svg',
    imageAlt: 'An illustrated courtyard with a chasing chicken, sage block, characters, Pip the cat, and gold coins',
    accent: '#d3ddc3',
    detail: 'Dodge · collect · upgrade your abilities'
  },
  {
    id: 'fateless-kingdoms',
    title: 'Fateless Kingdoms',
    subtitle: 'Your kingdom. Your last card.',
    description: 'A tactical card game of three rows, powerful Omens and knowing when to pass. Face a CPU rival across up to three rounds, with 62 original cards and three difficulty levels.',
    category: 'Strategy',
    tags: ['Cards', 'Tactics', 'Single player'],
    path: 'fateless-kingdoms/index.html',
    image: 'previews/fateless-kingdoms.jpg',
    imageAlt: 'King Ethoroc, Queen Krath and Dreadhold on the original Fateless Kingdoms cards',
    accent: '#d9bb77',
    detail: '62 cards · 3 CPU difficulties'
  }
];
