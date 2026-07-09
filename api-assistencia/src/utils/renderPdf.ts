import { existsSync } from 'node:fs';

import puppeteer, { PDFOptions } from 'puppeteer';

const defaultTimeoutMs = Number(process.env.PUPPETEER_TIMEOUT_MS || 30000);

function resolveExecutablePath() {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  if (configuredPath) {
    if (existsSync(configuredPath)) {
      return configuredPath;
    }

    console.warn(`PUPPETEER_EXECUTABLE_PATH ignorado porque o arquivo nao existe: ${configuredPath}`);
  }

  if (process.platform === 'linux') {
    const candidates = ['/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome-stable'];
    return candidates.find((candidate) => existsSync(candidate));
  }

  return undefined;
}

export async function renderHtmlToPdf(html: string, options: PDFOptions = {}) {
  const executablePath = resolveExecutablePath();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
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
