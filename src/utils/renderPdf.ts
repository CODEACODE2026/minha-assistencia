import puppeteer, { PDFOptions } from 'puppeteer';

const defaultTimeoutMs = Number(process.env.PUPPETEER_TIMEOUT_MS || 30000);

export async function renderHtmlToPdf(html: string, options: PDFOptions = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    timeout: defaultTimeoutMs
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(defaultTimeoutMs);
    page.setDefaultNavigationTimeout(defaultTimeoutMs);
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: defaultTimeoutMs });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      timeout: defaultTimeoutMs,
      ...options
    });

    await page.close().catch(() => undefined);
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => undefined);
  }
}
