import { render, screen } from '@testing-library/react-native';
import type { Card } from '../content/card';
import { CardView } from './CardView';

const card = (overrides: Partial<Card> = {}): Card => ({
  pageId: 38011,
  title: 'Squid',
  description: 'Superorder of cephalopod molluscs',
  extract: 'A squid is a mollusc with an elongated soft body.',
  thumbnail: { url: 'https://upload.wikimedia.org/squid.jpg', width: 500, height: 300 },
  topic: { tileId: 'animals', territory: 'life' },
  topicIsFallback: false,
  incomingLinks: null,
  source: 'link',
  visited: false,
  read: false,
  ...overrides,
});

describe('CardView', () => {
  it('shows the title, extract and why the card is here', async () => {
    await render(<CardView card={card()} seedTitle="Octopus" />);

    expect(screen.getByText('Squid')).toBeOnTheScreen();
    expect(screen.getByText('A squid is a mollusc with an elongated soft body.')).toBeOnTheScreen();
    expect(screen.getByText('↳ LINKED FROM OCTOPUS')).toBeOnTheScreen();
  });

  it('labels the topic when the card has one', async () => {
    await render(<CardView card={card()} seedTitle="Octopus" />);

    expect(screen.getByText('● ANIMALS')).toBeOnTheScreen();
  });

  it('shows only the colour dot while the card has a territory but no topic', async () => {
    await render(<CardView card={card({ topic: { tileId: null, territory: 'cosmos' } })} seedTitle="Octopus" />);

    expect(screen.getByText('●')).toBeOnTheScreen();
    expect(screen.queryByText(/ANIMALS/)).toBeNull();
  });

  it('describes the image for screen readers', async () => {
    await render(<CardView card={card()} seedTitle="Octopus" />);

    expect(screen.getByLabelText('Superorder of cephalopod molluscs')).toBeOnTheScreen();
  });

  it('draws a typographic card when there is no image', async () => {
    await render(<CardView card={card({ thumbnail: null })} seedTitle="Octopus" />);

    expect(screen.queryByLabelText('Superorder of cephalopod molluscs')).toBeNull();
    expect(screen.getByText('Squid')).toBeOnTheScreen();
  });
});
