import { Linking } from 'react-native';
import { setErrorSink } from '../services/reportError';
import { feedbackMailto, openFeedbackMail } from './feedbackMail';

describe('feedbackMailto', () => {
  it('addresses the feedback inbox with a subject', () => {
    const url = feedbackMailto({ version: '1.0.0', platform: 'web' });

    expect(url.startsWith('mailto:feedback@gotangent.app?subject=Tangent%20feedback')).toBe(true);
  });

  it('signs the body with the version and platform only, below room to write', () => {
    const url = feedbackMailto({ version: '1.2.3', platform: 'ios' });

    expect(decodeURIComponent(url.split('&body=')[1])).toBe('\n\n— Tangent 1.2.3 · ios');
  });
});

describe('openFeedbackMail', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setErrorSink(null);
  });

  it('reports a mail app that will not open', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no mail app'));
    const sink = jest.fn();
    setErrorSink(sink);

    await openFeedbackMail();

    expect(sink).toHaveBeenCalledWith('feedback.mailto', expect.any(Error));
  });
});
