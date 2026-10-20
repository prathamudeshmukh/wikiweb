import { base64FromBytes } from './base64FromBytes';

const bytesOf = (text: string) => new TextEncoder().encode(text);

describe('base64FromBytes', () => {
  it('encodes bytes as base64, padding the last group', () => {
    expect(base64FromBytes(bytesOf('Man'))).toBe('TWFu');
    expect(base64FromBytes(bytesOf('Ma'))).toBe('TWE=');
  });

  it('encodes a font-sized file whole, past the size one call can spread', () => {
    const bytes = Uint8Array.from({ length: 300_000 }, (_, i) => (i * 31) % 256);

    expect(base64FromBytes(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  });

  it('encodes nothing as nothing', () => {
    expect(base64FromBytes(new Uint8Array())).toBe('');
  });
});
