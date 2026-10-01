import type { Article } from '../wiki-api/types';
import { createBlocklistMatcher, isLowValueTitle, isUsableArticle } from './quality';

const article = (overrides: Partial<Article> = {}): Article => ({
  pageId: 1,
  title: 'Knot theory',
  description: 'Study of mathematical knots',
  extract: 'In topology, knot theory is the study of mathematical knots.',
  thumbnail: null,
  isDisambiguation: false,
  ...overrides,
});

describe('isLowValueTitle', () => {
  it.each(['List of cephalopods', 'Lists of animals', 'Index of physics articles', 'Outline of chemistry'])('rejects list-style page "%s"', (title) => {
    expect(isLowValueTitle(title)).toBe(true);
  });

  it.each(['1998', '44 BC', '79 AD', 'October 1', 'March 31'])('rejects bare year or date "%s"', (title) => {
    expect(isLowValueTitle(title)).toBe(true);
  });

  it.each(['Knot theory', '1984 (novel)', 'Apollo 11', 'List (abstract data type)'])('keeps real article "%s"', (title) => {
    expect(isLowValueTitle(title)).toBe(false);
  });
});

describe('isUsableArticle', () => {
  it('keeps an article with a description and extract', () => {
    expect(isUsableArticle(article())).toBe(true);
  });

  it('keeps an article with only an extract', () => {
    expect(isUsableArticle(article({ description: null }))).toBe(true);
  });

  it('rejects disambiguation pages', () => {
    expect(isUsableArticle(article({ title: 'Mercury', isDisambiguation: true }))).toBe(false);
  });

  it('rejects stubs with neither description nor extract', () => {
    expect(isUsableArticle(article({ description: null, extract: '' }))).toBe(false);
  });

  it('rejects low-value titles even when they have text', () => {
    expect(isUsableArticle(article({ title: '1998' }))).toBe(false);
  });
});

describe('createBlocklistMatcher', () => {
  const matchesBlocklist = createBlocklistMatcher(['sex', 'porn', 'c++']);

  it('matches a blocked whole word, ignoring case', () => {
    expect(matchesBlocklist('Anal Sex')).toBe(true);
  });

  it('does not match blocked text inside a longer word', () => {
    expect(matchesBlocklist('Sussex')).toBe(false);
  });

  it('treats regex characters in terms literally', () => {
    expect(matchesBlocklist('c++ programming')).toBe(true);
  });

  it('matches nothing with an empty blocklist', () => {
    expect(createBlocklistMatcher([])('Anything')).toBe(false);
  });

  it('does not match clean titles', () => {
    expect(matchesBlocklist('Polar bear')).toBe(false);
  });
});
