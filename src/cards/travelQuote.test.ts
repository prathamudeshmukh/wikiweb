import { travelQuote } from './travelQuote';

const DEFINITION = 'Mercury is the first planet from the Sun.';
const SHORT_FACT = 'A year on Mercury lasts 88 Earth days.';
const LONG_SENTENCE =
  'It is the smallest planet in the Solar System, a rocky body with a heavily cratered surface that resembles the Moon, and it has no natural satellites at all.';

describe('travelQuote', () => {
  it('prefers the second sentence, which is usually past the definition', () => {
    expect(travelQuote({ extract: `${DEFINITION} ${SHORT_FACT}`, description: 'Planet' })).toBe(SHORT_FACT);
  });

  it('falls back to the first sentence when the second is too long', () => {
    expect(travelQuote({ extract: `${DEFINITION} ${LONG_SENTENCE}`, description: 'Planet' })).toBe(DEFINITION);
  });

  it('uses a lone first sentence', () => {
    expect(travelQuote({ extract: DEFINITION, description: 'Planet' })).toBe(DEFINITION);
  });

  it('trims an overlong first sentence at a word boundary', () => {
    const quote = travelQuote({ extract: LONG_SENTENCE, description: 'Planet' });

    expect(quote).toMatch(/^It is the smallest planet in the Solar System,.*\w…$/);
    expect(quote!.length).toBeLessThanOrEqual(141);
  });

  it('does not split on initials such as U.S.', () => {
    const extract = 'The U.S. Navy launched it in 1798. It sank twice.';

    expect(travelQuote({ extract, description: null })).toBe('It sank twice.');
  });

  it('uses the description when there is no extract', () => {
    expect(travelQuote({ extract: null, description: 'Smallest planet in the Solar System' })).toBe('Smallest planet in the Solar System');
  });

  it('uses the description when the extract is blank', () => {
    expect(travelQuote({ extract: '   ', description: 'Planet' })).toBe('Planet');
  });

  it('has no quote when the card has no text', () => {
    expect(travelQuote({ extract: null, description: null })).toBeNull();
  });
});
