import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { testServices } from '../__testing__/renderWithServices';
import { fakeWikiApi } from '../content/__testing__/fakeWikiApi';
import { AppServicesProvider } from '../services/AppServices';
import { useFeedbackAnswer } from './useFeedbackAnswer';

async function setup() {
  const services = testServices(fakeWikiApi({}).api);
  await services.analyticsConsent.load();
  const onAnswered = jest.fn();
  const wrapper = ({ children }: { children: ReactNode }) => <AppServicesProvider services={services}>{children}</AppServicesProvider>;
  const hook = await renderHook(() => useFeedbackAnswer(onAnswered), { wrapper });
  return { ...hook, services, onAnswered };
}

describe('useFeedbackAnswer', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends a rating, takes the card off Home and opens the note sheet for it', async () => {
    const { result, services, onAnswered } = await setup();

    await act(() => result.current.rate('down'));

    expect(services.analytics.named('feedback_given')).toHaveLength(1);
    expect(onAnswered).toHaveBeenCalled();
    expect(result.current.rating).toBe('down');
  });

  it('sends the note with the rating it follows, then closes', async () => {
    const { result, services } = await setup();
    await act(() => result.current.rate('up'));

    await act(() => result.current.send('Love the atlas'));

    expect(services.analytics.named('feedback_note')).toEqual([{ rating: 'up', note: 'Love the atlas' }]);
    expect(result.current.rating).toBeNull();
  });

  it('opens no note sheet when nothing was sent', async () => {
    const { result, services, onAnswered } = await setup();
    await services.analyticsConsent.setOptedOut(true);

    await act(() => result.current.rate('up'));

    expect(onAnswered).toHaveBeenCalled();
    expect(result.current.rating).toBeNull();
  });

  it('opens the mail app and takes the card off Home on the email path', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { result, onAnswered } = await setup();

    await act(() => result.current.email());

    expect(openURL).toHaveBeenCalledWith(expect.stringMatching(/^mailto:feedback@gotangent\.app/));
    expect(onAnswered).toHaveBeenCalled();
  });
});
