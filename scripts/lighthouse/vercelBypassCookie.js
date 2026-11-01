// Lighthouse CI puppeteerScript: runs in the audit browser before each Lighthouse run.
// Vercel Deployment Protection would otherwise serve its login page to Lighthouse.
//
// The secret goes in a header on one request for a static file; Vercel answers with a bypass
// cookie, which Lighthouse keeps (its storage reset leaves cookies alone). Passing the secret as
// Lighthouse `extraHeaders` instead would copy it into every report, and the reports are public.
const SECRET_ENV = 'VERCEL_AUTOMATION_BYPASS_SECRET';
const STATIC_FILE = '/favicon.ico';

module.exports = async function setVercelBypassCookie(browser, { url }) {
  const secret = process.env[SECRET_ENV];
  if (!secret) throw new Error(`${SECRET_ENV} is not set; Lighthouse would audit Vercel's login page.`);

  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': secret, 'x-vercel-set-bypass-cookie': 'true' });
    const response = await page.goto(new URL(STATIC_FILE, url).href);
    if (!response || !response.ok()) {
      throw new Error(`Vercel refused the protection bypass (HTTP ${response ? response.status() : 'no response'}).`);
    }
  } finally {
    await page.close();
  }
};
