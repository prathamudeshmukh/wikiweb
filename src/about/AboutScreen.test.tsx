import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AboutScreen } from './AboutScreen';

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderAbout(options: { sharing?: boolean | undefined; platform?: string } = {}) {
  const { platform = 'web' } = options;
  const onBack = jest.fn();
  // `sharing: undefined` means "not loaded yet", so only a missing key takes the default.
  const usage = { sharing: 'sharing' in options ? options.sharing : true, setSharing: jest.fn() };
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <AboutScreen onBack={onBack} usage={usage} signature={{ version: '1.2.3', platform }} />
    </SafeAreaProvider>,
  );
  return { onBack, usage };
}

describe('AboutScreen', () => {
  it('opens on the pitch', async () => {
    await renderAbout();

    expect(screen.getByRole('header', { name: 'Wikipedia, one swipe at a time' })).toBeOnTheScreen();
  });

  it('says Tangent is not affiliated with Wikipedia', async () => {
    await renderAbout();

    expect(screen.getByText(/Not affiliated with Wikipedia or the Wikimedia Foundation/)).toBeOnTheScreen();
  });

  it('says that usage stats include article titles', async () => {
    await renderAbout();

    expect(screen.getByText(/including those articles' titles/)).toBeOnTheScreen();
  });

  it('says where stats are kept and for how long', async () => {
    await renderAbout();

    expect(screen.getByText(/PostHog in the United States and are deleted after 12 months/)).toBeOnTheScreen();
  });

  it('switches usage sharing off from the page itself', async () => {
    const { usage } = await renderAbout();

    await fireEvent(screen.getByLabelText('Share usage data'), 'valueChange', false);

    expect(usage.setSharing).toHaveBeenCalledWith(false);
  });

  it('holds the switch until the saved choice has loaded', async () => {
    await renderAbout({ sharing: undefined });

    expect(screen.getByLabelText('Share usage data')).toBeDisabled();
  });

  it('credits the icons and fonts', async () => {
    await renderAbout();

    expect(screen.getByText('Phosphor · MIT')).toBeOnTheScreen();
  });

  it('signs off with the version and platform', async () => {
    await renderAbout();

    expect(screen.getByText('TANGENT 1.2.3 · WEB')).toBeOnTheScreen();
  });

  it('says that feedback ratings and notes are sent too', async () => {
    await renderAbout();

    expect(screen.getByText(/any rating or note you send from the feedback card/)).toBeOnTheScreen();
  });

  it('names browser local storage on web', async () => {
    await renderAbout({ platform: 'web' });

    expect(screen.getByText(/Your browser keeps a random ID in local storage/)).toBeOnTheScreen();
  });

  it('names the device on native', async () => {
    await renderAbout({ platform: 'ios' });

    expect(screen.getByText(/The app keeps a random ID on your device/)).toBeOnTheScreen();
  });

  it('keeps touch autocapture off the page, so reading the policy sends nothing', async () => {
    await renderAbout();

    expect(screen.getByTestId('about-screen').props['ph-no-capture']).toBe(true);
  });

  it('goes back', async () => {
    const { onBack } = await renderAbout();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalled();
  });
});
