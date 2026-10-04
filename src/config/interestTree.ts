/**
 * Hand-curated interest trees below some tiles (SPEC.md §3.9, §5.5): tile → subfield → leaf.
 *
 * Every node is a shallow `incategory:` search — never `deepcat:`, which wanders far off topic. A subfield
 * searches its leaves' categories plus its own extra ones. Pool sizes and sample articles were checked live
 * on 2026-10-04 (relevance order); `npm run test:live` re-checks that every node still returns articles.
 */

export interface InterestLeaf {
  id: string;
  label: string;
  /** A Wikipedia category, without the `Category:` prefix. */
  category: string;
  /** Approximate number of articles in the category, shown on the leaf's chip. */
  poolSize: number;
}

export interface InterestSubfield {
  id: string;
  label: string;
  /** Three well-known articles from the subfield, shown on its card. */
  examples: readonly [string, string, string];
  leaves: readonly InterestLeaf[];
  /** Categories searched for the subfield on top of its leaves'. */
  extraCategories?: readonly string[];
}

export const INTEREST_TREES: Readonly<Record<string, readonly InterestSubfield[]>> = {
  philosophy: [
    {
      id: 'ethics',
      label: 'Ethics',
      examples: ['Memento mori', 'Act utilitarianism', 'Moral relativism'],
      leaves: [
        { id: 'stoicism', label: 'Stoicism', category: 'Stoicism', poolSize: 37 },
        { id: 'epicureanism', label: 'Epicureanism', category: 'Epicureanism', poolSize: 17 },
        { id: 'utilitarianism', label: 'Utilitarianism', category: 'Utilitarianism', poolSize: 40 },
        { id: 'virtue-ethics', label: 'Virtue ethics', category: 'Virtue ethics', poolSize: 35 },
        { id: 'metaethics', label: 'Metaethics', category: 'Metaethics', poolSize: 45 },
        { id: 'moral-psychology', label: 'Moral psychology', category: 'Moral psychology', poolSize: 128 },
      ],
    },
    {
      id: 'logic',
      label: 'Logic & reasoning',
      examples: ['Ship of Theseus', "Prisoner's dilemma", 'Problem of induction'],
      extraCategories: ['Logic'],
      leaves: [
        { id: 'paradoxes', label: 'Paradoxes', category: 'Paradoxes', poolSize: 73 },
        { id: 'fallacies', label: 'Fallacies', category: 'Fallacies', poolSize: 18 },
        { id: 'dilemmas', label: 'Dilemmas', category: 'Dilemmas', poolSize: 53 },
        { id: 'skepticism', label: 'Skepticism', category: 'Philosophical skepticism', poolSize: 26 },
      ],
    },
    {
      id: 'big-questions',
      label: 'Big questions',
      examples: ['Meaning of life', 'Butterfly effect', 'Eternal return'],
      extraCategories: ['Philosophical problems'],
      leaves: [
        { id: 'free-will', label: 'Free will', category: 'Free will', poolSize: 65 },
        { id: 'determinism', label: 'Determinism', category: 'Determinism', poolSize: 63 },
        { id: 'existentialism', label: 'Existentialism', category: 'Existentialist concepts', poolSize: 57 },
        { id: 'nihilism', label: 'Nihilism', category: 'Nihilism', poolSize: 23 },
        { id: 'time', label: 'Time', category: 'Philosophy of time', poolSize: 51 },
      ],
    },
    {
      id: 'mind',
      label: 'Mind & machines',
      examples: ['Chinese room', 'Turing test', 'Allegory of the cave'],
      leaves: [
        { id: 'consciousness', label: 'Consciousness', category: 'Consciousness', poolSize: 127 },
        { id: 'thought-experiments', label: 'Thought experiments', category: 'Thought experiments in philosophy', poolSize: 29 },
        { id: 'ai', label: 'Philosophy of AI', category: 'Philosophy of artificial intelligence', poolSize: 67 },
      ],
    },
    {
      id: 'ancient',
      label: 'Ancient thought',
      examples: ['Theory of forms', 'Pythagoreanism', 'Hylomorphism'],
      leaves: [
        { id: 'presocratics', label: 'Presocratics', category: 'Presocratic philosophy', poolSize: 15 },
        { id: 'platonism', label: 'Platonism', category: 'Platonism', poolSize: 21 },
        { id: 'aristotelianism', label: 'Aristotelianism', category: 'Aristotelianism', poolSize: 41 },
      ],
    },
    {
      id: 'eastern',
      label: 'Eastern philosophy',
      examples: ['Zazen', 'Rectification of names', 'Yoga (philosophy)'],
      leaves: [
        { id: 'confucianism', label: 'Confucianism', category: 'Confucianism', poolSize: 18 },
        { id: 'taoism', label: 'Taoism', category: 'Taoism', poolSize: 21 },
        { id: 'zen', label: 'Zen', category: 'Zen', poolSize: 65 },
        { id: 'buddhist', label: 'Buddhist philosophy', category: 'Buddhist philosophy', poolSize: 33 },
        { id: 'hindu', label: 'Hindu philosophy', category: 'Hindu philosophy', poolSize: 33 },
      ],
    },
    {
      id: 'political',
      label: 'Political philosophy',
      examples: ['Secularism', 'Freedom of thought', 'Libertarian socialism'],
      extraCategories: ['Political philosophy'],
      leaves: [
        { id: 'anarchism', label: 'Anarchism', category: 'Anarchism', poolSize: 27 },
        { id: 'liberalism', label: 'Liberalism', category: 'Liberalism', poolSize: 95 },
      ],
    },
  ],
  science: [
    {
      id: 'quantum',
      label: 'Quantum world',
      examples: ['Uncertainty principle', 'Quantum tunnelling', 'Neutrino'],
      leaves: [
        { id: 'quantum-mechanics', label: 'Quantum mechanics', category: 'Quantum mechanics', poolSize: 334 },
        { id: 'particles', label: 'Elementary particles', category: 'Elementary particles', poolSize: 20 },
        { id: 'particle-physics', label: 'Particle physics', category: 'Particle physics', poolSize: 144 },
        { id: 'nuclear', label: 'Nuclear physics', category: 'Nuclear physics', poolSize: 252 },
      ],
    },
    {
      id: 'forces',
      label: 'Forces & energy',
      examples: ['Spacetime', 'Iridescence', 'Flatness problem'],
      leaves: [
        { id: 'relativity', label: 'Relativity', category: 'Theory of relativity', poolSize: 74 },
        { id: 'electromagnetism', label: 'Electromagnetism', category: 'Electromagnetism', poolSize: 178 },
        { id: 'optics', label: 'Optics', category: 'Optics', poolSize: 120 },
        { id: 'thermodynamics', label: 'Thermodynamics', category: 'Thermodynamics', poolSize: 244 },
        { id: 'unsolved', label: 'Unsolved problems', category: 'Unsolved problems in physics', poolSize: 58 },
      ],
    },
    {
      id: 'chemistry',
      label: 'Chemistry',
      examples: ['Periodic table', 'Redox', 'Combustion'],
      leaves: [
        { id: 'elements', label: 'Chemical elements', category: 'Chemical elements', poolSize: 125 },
        { id: 'reactions', label: 'Chemical reactions', category: 'Chemical reactions', poolSize: 150 },
      ],
    },
    {
      id: 'history',
      label: 'History of science',
      examples: ['Scientific method', 'Davisson–Germer experiment', 'History of gunpowder'],
      leaves: [
        { id: 'physics', label: 'History of physics', category: 'History of physics', poolSize: 115 },
        { id: 'chemistry', label: 'History of chemistry', category: 'History of chemistry', poolSize: 91 },
        { id: 'scientific-revolution', label: 'Scientific Revolution', category: 'Scientific Revolution', poolSize: 29 },
        { id: 'experiments', label: 'Famous experiments', category: 'Physics experiments', poolSize: 109 },
      ],
    },
    {
      id: 'scientists',
      label: 'Scientists',
      examples: ['Albert Einstein', 'Marie Curie', 'Richard Feynman'],
      leaves: [
        { id: 'physics-nobel', label: 'Physics Nobel laureates', category: 'Nobel laureates in Physics', poolSize: 229 },
        { id: 'element-discoverers', label: 'Element discoverers', category: 'Discoverers of chemical elements', poolSize: 101 },
      ],
    },
  ],
  maths: [
    {
      id: 'numbers',
      label: 'Numbers',
      examples: ['Riemann hypothesis', 'Fibonacci sequence', 'Pi'],
      leaves: [
        { id: 'primes', label: 'Prime numbers', category: 'Prime numbers', poolSize: 115 },
        { id: 'unsolved', label: 'Unsolved problems', category: 'Unsolved problems in number theory', poolSize: 122 },
        { id: 'sequences', label: 'Integer sequences', category: 'Integer sequences', poolSize: 222 },
        { id: 'constants', label: 'Constants', category: 'Mathematical constants', poolSize: 83 },
        { id: 'infinity', label: 'Infinity', category: 'Infinity', poolSize: 65 },
      ],
    },
    {
      id: 'shapes',
      label: 'Shapes & space',
      examples: ['Mandelbrot set', 'Coastline paradox', 'Borromean rings'],
      leaves: [
        { id: 'polyhedra', label: 'Polyhedra', category: 'Polyhedra', poolSize: 163 },
        { id: 'fractals', label: 'Fractals', category: 'Fractals', poolSize: 126 },
        { id: 'topology', label: 'Topology', category: 'Topology', poolSize: 207 },
        { id: 'knots', label: 'Knot theory', category: 'Knot theory', poolSize: 102 },
        { id: 'tessellation', label: 'Tessellation', category: 'Tessellation', poolSize: 44 },
      ],
    },
    {
      id: 'logic',
      label: 'Logic & foundations',
      examples: ["Zeno's paradoxes", "Gödel's incompleteness theorems", "Cantor's diagonal argument"],
      leaves: [
        { id: 'paradoxes', label: 'Paradoxes', category: 'Mathematical paradoxes', poolSize: 35 },
        { id: 'set-theory', label: 'Set theory', category: 'Set theory', poolSize: 154 },
        { id: 'mathematical-logic', label: 'Mathematical logic', category: 'Mathematical logic', poolSize: 207 },
      ],
    },
    {
      id: 'chance',
      label: 'Chance & games',
      examples: ['Monty Hall problem', 'Tragedy of the commons', "Gambler's fallacy"],
      leaves: [
        { id: 'game-theory', label: 'Game theory', category: 'Game theory', poolSize: 160 },
        { id: 'probability-problems', label: 'Probability puzzles', category: 'Probability problems', poolSize: 32 },
        { id: 'statistical-paradoxes', label: 'Statistical paradoxes', category: 'Statistical paradoxes', poolSize: 17 },
        { id: 'probability', label: 'Probability theory', category: 'Probability theory', poolSize: 93 },
      ],
    },
    {
      id: 'codes',
      label: 'Codes & networks',
      examples: ['Advanced Encryption Standard', 'Markov chain', 'Graph coloring'],
      leaves: [
        { id: 'cryptography', label: 'Cryptography', category: 'Cryptography', poolSize: 213 },
        { id: 'graph-theory', label: 'Graph theory', category: 'Graph theory', poolSize: 106 },
      ],
    },
    {
      id: 'play',
      label: 'Puzzles & play',
      examples: ['Möbius strip', 'Magic square', 'Squaring the square'],
      leaves: [
        { id: 'recreational', label: 'Recreational maths', category: 'Recreational mathematics', poolSize: 66 },
        { id: 'magic-squares', label: 'Magic squares', category: 'Magic squares', poolSize: 47 },
      ],
    },
    {
      id: 'history',
      label: 'History & people',
      examples: ['Antikythera mechanism', 'Hypatia', 'Diophantus'],
      leaves: [
        { id: 'history', label: 'History of maths', category: 'History of mathematics', poolSize: 159 },
        { id: 'greek', label: 'Greek mathematicians', category: 'Ancient Greek mathematicians', poolSize: 23 },
        { id: 'indian', label: 'Indian mathematicians', category: 'Indian mathematicians', poolSize: 35 },
        { id: 'women', label: 'Women in maths', category: 'Women mathematicians', poolSize: 95 },
      ],
    },
  ],
  history: [
    {
      id: 'ancient',
      label: 'Ancient world',
      examples: ['Library of Alexandria', 'Sea Peoples', 'Indus script'],
      extraCategories: ['Ancient history'],
      leaves: [
        { id: 'egypt', label: 'Ancient Egypt', category: 'Ancient Egypt', poolSize: 65 },
        { id: 'rome', label: 'Ancient Rome', category: 'Ancient Rome', poolSize: 32 },
        { id: 'greece', label: 'Ancient Greece', category: 'Ancient Greece', poolSize: 63 },
        { id: 'mesopotamia', label: 'Mesopotamia', category: 'Mesopotamia', poolSize: 22 },
        { id: 'indus', label: 'Indus Valley', category: 'Indus Valley civilisation', poolSize: 23 },
        { id: 'libraries', label: 'Ancient libraries', category: 'Ancient libraries', poolSize: 25 },
      ],
    },
    {
      id: 'medieval',
      label: 'Middle Ages',
      examples: ['Berserker', 'Baphomet', 'Serfdom'],
      leaves: [
        { id: 'vikings', label: 'Vikings', category: 'Vikings', poolSize: 17 },
        { id: 'crusades', label: 'Crusades', category: 'Crusades', poolSize: 69 },
        { id: 'templars', label: 'Knights Templar', category: 'Knights Templar', poolSize: 43 },
        { id: 'black-death', label: 'Black Death', category: 'Black Death', poolSize: 18 },
        { id: 'feudalism', label: 'Feudalism', category: 'Feudalism', poolSize: 103 },
      ],
    },
    {
      id: 'empires',
      label: 'Empires',
      examples: ['Din-i Ilahi', 'Pax Britannica', 'Secret History of the Mongols'],
      leaves: [
        { id: 'mughal', label: 'Mughal Empire', category: 'Mughal Empire', poolSize: 32 },
        { id: 'ottoman', label: 'Ottoman Empire', category: 'Ottoman Empire', poolSize: 31 },
        { id: 'mongol', label: 'Mongol Empire', category: 'Mongol Empire', poolSize: 37 },
        { id: 'british', label: 'British Empire', category: 'British Empire', poolSize: 95 },
        { id: 'inca', label: 'Inca Empire', category: 'Inca Empire', poolSize: 38 },
      ],
    },
    {
      id: 'revolutions',
      label: 'Revolutions',
      examples: ['Luddites', 'Sans-culottes', 'October Revolution'],
      leaves: [
        { id: 'french', label: 'French Revolution', category: 'French Revolution', poolSize: 78 },
        { id: 'russian', label: 'Russian Revolution', category: 'Russian Revolution', poolSize: 40 },
        { id: 'industrial', label: 'Industrial Revolution', category: 'Industrial Revolution', poolSize: 132 },
      ],
    },
    {
      id: 'twentieth-century',
      label: 'The 20th century',
      examples: ['Détente', 'Handover of Hong Kong', 'Direct Action Day'],
      leaves: [
        { id: 'cold-war', label: 'Cold War', category: 'Cold War', poolSize: 153 },
        { id: 'decolonisation', label: 'Decolonisation', category: 'Decolonization', poolSize: 108 },
        { id: 'partition', label: 'Partition of India', category: 'Partition of India', poolSize: 56 },
      ],
    },
    {
      id: 'exploration',
      label: 'Exploration',
      examples: ['Columbian exchange', 'Farthest South', 'Caravanserai'],
      leaves: [
        { id: 'age-of-discovery', label: 'Age of Discovery', category: 'Age of Discovery', poolSize: 27 },
        { id: 'polar', label: 'Polar exploration', category: 'Polar exploration', poolSize: 20 },
        { id: 'antarctica', label: 'Antarctic explorers', category: 'Explorers of Antarctica', poolSize: 49 },
        { id: 'silk-road', label: 'Silk Road', category: 'Silk Road', poolSize: 60 },
      ],
    },
  ],
};
