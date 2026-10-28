import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, stat} from 'node:fs/promises';
import {dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'out/v3-layout-audit');
await mkdir(output, {recursive: true});
const bundled = await bundle({entryPoint: resolve(root, 'src/Root.tsx'), outDir: resolve(output, 'bundle')});
const types = {'.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.ttc': 'font/collection'};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    let target = resolve(bundled, `.${decodeURIComponent(url.pathname)}`);
    if (!(await stat(target)).isFile()) target = resolve(target, 'index.html');
    const data = await readFile(target);
    response.writeHead(200, {'Content-Type': types[extname(target)] ?? 'application/octet-stream'});
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const serveUrl = `http://127.0.0.1:${server.address().port}`;
const require = createRequire(import.meta.url);
const rendererPath = dirname(require.resolve('@remotion/renderer'));
// Keep Remotion's ready/font gates when checking intermediate animation frames.
const {seekToFrame} = require(resolve(rendererPath, 'seek-to-frame.js'));
const browser = await openBrowser('chrome', {logLevel: 'error'});
const results = [];
try {
  for (const id of ['DSHMobilePortrait', 'DSHMobileLandscape']) {
    const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser, logLevel: 'error'});
    const newPage = browser.newPage.bind(browser);
    let auditPage;
    let closePage;
    browser.newPage = async (options) => {
      const page = await newPage(options);
      auditPage = page;
      closePage = page.close.bind(page);
      page.close = async () => {};
      return page;
    };
    await renderStill({serveUrl, composition, frame: 0, output: resolve(output, `${id}-first.png`), puppeteerInstance: browser, logLevel: 'error'});
    browser.newPage = newPage;
    const failures = [];
    let minimumGap = Infinity;
    // All 2640 frames, not just the still-image sample points.
    for (let frame = 0; frame < composition.durationInFrames; frame++) {
      await seekToFrame({frame, page: auditPage, composition: id, timeoutInMilliseconds: 30000, indent: false, logLevel: 'error', attempt: 0});
      const audit = await auditPage.evaluate(({width, height}) => {
        const portrait = height > width;
        const safe = portrait ? {left: 65, right: width - 65, top: 230, bottom: height - 346} : {left: 96, right: width - 96, top: 54, bottom: height - 54};
        const stage = document.querySelector('[data-safe-stage]');
        const errors = [];
        const fontFloor = portrait ? 36 : 24;
        const numericFloor = portrait ? 40 : 28;
        const rect = (element) => {
          const box = element.getBoundingClientRect();
          return {left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height};
        };
        const name = (element) => element.getAttribute('data-layout-block') ?? element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 52) ?? element.tagName;
        const inside = (box, bounds, label) => {
          const overflow = Math.max(bounds.left - box.left, box.right - bounds.right, bounds.top - box.top, box.bottom - bounds.bottom, 0);
          if (overflow > 1) errors.push({type: 'overflow', label, pixels: Math.round(overflow * 100) / 100, box});
        };
        let gap = Infinity;
        for (const group of stage.querySelectorAll('[data-layout-stack], [data-layout-siblings]')) {
          const elements = [...group.children].filter((element) => rect(element).width > 0 && rect(element).height > 0);
          for (let i = 0; i < elements.length; i++) {
            const a = rect(elements[i]);
            inside(a, safe, name(elements[i]));
            for (let j = i + 1; j < elements.length; j++) {
              const b = rect(elements[j]);
              const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (x > 1 && y > 1) errors.push({type: 'overlap', a: name(elements[i]), b: name(elements[j]), width: x, height: y});
              else if (x > 0) gap = Math.min(gap, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
              else if (y > 0) gap = Math.min(gap, Math.max(a.left, b.left) - Math.min(a.right, b.right));
            }
          }
        }
        const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
        let node;
        let textCount = 0;
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const box of range.getClientRects()) {
            const textBox = {left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height};
            inside(textBox, safe, node.textContent.trim().slice(0, 52));
            textCount++;
          }
        }
        const bar = document.querySelector('[data-chapter-bar]');
        if (bar) inside(rect(bar), safe, 'chapter-bar');
        const textElements = new Set();
        const textWalker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
        let textNode;
        while ((textNode = textWalker.nextNode())) {
          if (textNode.textContent.trim()) textElements.add(textNode.parentElement);
        }
        for (const element of textElements) {
          if (!element || element.closest('[data-device="phone"]')) continue;
          const computed = getComputedStyle(element);
          const size = parseFloat(computed.fontSize);
          if (!Number.isFinite(size)) continue;
          const isNumeric = computed.fontFamily.includes('DSHSegoe') && /^[\d≈,.×%\s]+$/.test(element.textContent?.trim() ?? '');
          const floor = isNumeric ? numericFloor : fontFloor;
          if (size + 0.01 < floor) errors.push({type: 'font-size', label: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 52), pixels: size, floor});
        }
        for (const bar of stage.querySelectorAll('[data-volume-bar]')) {
          const height = rect(bar).height;
          const floor = portrait ? 16 : 12;
          if (height + 0.01 < floor) errors.push({type: 'bar-height', pixels: height, floor});
        }
        const images = [...stage.querySelectorAll('img')];
        for (const image of images) {
          if (!image.closest('[data-device="phone"]')) errors.push({type: 'unframed-image'});
          inside(rect(image), safe, 'phone-screenshot');
          if (!image.complete || image.naturalWidth === 0) errors.push({type: 'missing-image'});
        }
        return {errors, gap: Number.isFinite(gap) ? gap : null, textCount, fontStatus: document.fonts.status};
      }, {width: composition.width, height: composition.height});
      if (audit.errors.length) failures.push({frame, errors: audit.errors});
      if (audit.gap !== null) minimumGap = Math.min(minimumGap, audit.gap);
      if (frame % 600 === 0) console.log(`${id}: checked frame ${frame}; failures=${failures.length}`);
    }
    await closePage();
    results.push({composition: id, frames: composition.durationInFrames, minimumSiblingGap: minimumGap, failingFrames: failures.length, failures});
    console.log(`${id}: ${composition.durationInFrames} frames, ${failures.length} failing frames, min sibling gap=${minimumGap}`);
  }
} finally {
  await browser.close({silent: true});
  await new Promise((done) => server.close(done));
}
await writeFile(resolve(output, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
if (results.some((result) => result.failingFrames > 0)) process.exitCode = 1;
