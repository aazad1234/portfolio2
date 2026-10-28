import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'assets', 'files', 'john-anderson-cv.pdf');
const resumePath = path.join(root, 'resume.html');

function commandExists(command) {
  const lookup = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(lookup, [command], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return null;
  const firstLine = String(result.stdout || '').split(/\r?\n/).find(Boolean);
  return firstLine ? firstLine.trim() : null;
}

function findBrowser() {
  const candidates = [];

  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);

  if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    );
    ['chrome.exe', 'msedge.exe'].forEach((command) => {
      const resolved = commandExists(command);
      if (resolved) candidates.push(resolved);
    });
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
    ['google-chrome', 'chromium', 'microsoft-edge'].forEach((command) => {
      const resolved = commandExists(command);
      if (resolved) candidates.push(resolved);
    });
  } else {
    ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'].forEach((command) => {
      const resolved = commandExists(command);
      if (resolved) candidates.push(resolved);
    });
  }

  return candidates.find((candidate) => candidate && existsSync(candidate)) || null;
}

function removeProfile(profilePath) {
  try {
    rmSync(profilePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {
    // A locked temporary profile is harmless.
  }
}

function main() {
  if (!existsSync(resumePath)) {
    throw new Error(`Resume source not found: ${resumePath}`);
  }

  const browser = findBrowser();
  if (!browser) {
    throw new Error('Chrome or Edge was not found. Set CHROME_PATH to a Chromium-based browser executable.');
  }

  mkdirSync(path.dirname(outputPath), { recursive: true });
  if (existsSync(outputPath)) rmSync(outputPath, { force: true });

  const resumeUrl = pathToFileURL(resumePath).href;
  const attempts = [['--headless=new'], ['--headless']];
  let lastOutput = '';

  for (const headlessArgs of attempts) {
    const profilePath = path.join(os.tmpdir(), `portfolio-cv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const result = spawnSync(browser, [
      ...headlessArgs,
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--no-pdf-header-footer',
      '--print-to-pdf-no-header',
      '--virtual-time-budget=5000',
      '--run-all-compositor-stages-before-draw',
      `--user-data-dir=${profilePath}`,
      `--print-to-pdf=${outputPath}`,
      resumeUrl
    ], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120000,
      windowsHide: true
    });

    lastOutput = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    removeProfile(profilePath);

    if (existsSync(outputPath) && statSync(outputPath).size > 10000) {
      const header = readFileSync(outputPath).subarray(0, 5).toString('utf8');
      if (header === '%PDF-') {
        const size = Math.round(statSync(outputPath).size / 1024);
        console.log(`Generated ${path.relative(root, outputPath)} (${size} KB).`);
        console.log(`Source: ${path.relative(root, resumePath)}`);
        return;
      }
    }
  }

  if (lastOutput) console.error(lastOutput);
  throw new Error('PDF generation failed. Open resume.html in Chrome, choose Print, and save as PDF.');
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
