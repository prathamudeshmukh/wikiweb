const setVercelBypassCookie = require('./vercelBypassCookie.js');

const PREVIEW_URL = 'https://tangent-abc123.vercel.app/';
const SECRET_ENV = 'VERCEL_AUTOMATION_BYPASS_SECRET';

const fakeBrowser = (status: number) => {
  const page = {
    setExtraHTTPHeaders: jest.fn(),
    goto: jest.fn().mockResolvedValue({ ok: () => status < 400, status: () => status }),
    close: jest.fn(),
  };
  return { page, browser: { newPage: jest.fn().mockResolvedValue(page) } };
};

describe('setVercelBypassCookie', () => {
  const savedSecret = process.env[SECRET_ENV];

  afterEach(() => {
    process.env[SECRET_ENV] = savedSecret;
  });

  it('asks Vercel for the bypass cookie on a static file, so the app itself never loads beforehand', async () => {
    process.env[SECRET_ENV] = 'shh';
    const { browser, page } = fakeBrowser(200);

    await setVercelBypassCookie(browser, { url: PREVIEW_URL });

    expect(page.setExtraHTTPHeaders).toHaveBeenCalledWith({ 'x-vercel-protection-bypass': 'shh', 'x-vercel-set-bypass-cookie': 'true' });
    expect(page.goto).toHaveBeenCalledWith(`${PREVIEW_URL}favicon.ico`);
    expect(page.close).toHaveBeenCalled();
  });

  it('refuses to run without the secret, rather than auditing the login page', async () => {
    delete process.env[SECRET_ENV];
    const { browser } = fakeBrowser(200);

    await expect(setVercelBypassCookie(browser, { url: PREVIEW_URL })).rejects.toThrow(SECRET_ENV);
  });

  it('fails when Vercel rejects the secret', async () => {
    process.env[SECRET_ENV] = 'wrong';
    const { browser } = fakeBrowser(401);

    await expect(setVercelBypassCookie(browser, { url: PREVIEW_URL })).rejects.toThrow('401');
  });
});
