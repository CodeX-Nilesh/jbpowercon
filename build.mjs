// Dev-only static site builder: assembles /src/pages/*.html (with {{tokens}},
// {{#each}}/{{#if}} blocks and {{> partial}} includes) into /dist, copies
// static assets, and generates sitemap.xml + robots.txt from site.config.json.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const PAGES = join(SRC, 'pages');

const site = JSON.parse(readFileSync(join(SRC, 'site.config.json'), 'utf8'));

const data = {};
for (const file of readdirSync(join(SRC, 'data'))) {
  if (!file.endsWith('.json')) continue;
  data[file.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(SRC, 'data', file), 'utf8'));
}

if (data.products && Array.isArray(data.products.items)) {
  data.productsBySlug = Object.fromEntries(data.products.items.map((p) => [p.slug, p]));
}

const now = { year: new Date().getFullYear() };
const rootContext = { site, data, now };

// ---------- mini template engine ----------

function tokenize(str) {
  const re = /{{\s*([^}]+?)\s*}}/g;
  const tokens = [];
  let last = 0, m;
  while ((m = re.exec(str))) {
    if (m.index > last) tokens.push({ type: 'text', value: str.slice(last, m.index) });
    tokens.push({ type: 'tag', value: m[1] });
    last = re.lastIndex;
  }
  if (last < str.length) tokens.push({ type: 'text', value: str.slice(last) });
  return tokens;
}

function parse(tokens) {
  let i = 0;
  function parseBlock(endTag) {
    const nodes = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'text') { nodes.push({ type: 'text', value: t.value }); i++; continue; }
      const tagStr = t.value;
      if (endTag && tagStr === endTag) { i++; return nodes; }
      if (tagStr.startsWith('#each ')) {
        i++;
        nodes.push({ type: 'each', path: tagStr.slice(6).trim(), children: parseBlock('/each') });
      } else if (tagStr.startsWith('#if ')) {
        i++;
        nodes.push({ type: 'if', path: tagStr.slice(4).trim(), children: parseBlock('/if') });
      } else if (tagStr.startsWith('> ')) {
        i++;
        nodes.push({ type: 'partial', path: tagStr.slice(2).trim() });
      } else {
        i++;
        nodes.push({ type: 'var', path: tagStr.trim() });
      }
    }
    return nodes;
  }
  return parseBlock(null);
}

function resolvePath(path, stack) {
  if (path === '.' || path === 'this') return stack[stack.length - 1];
  const segments = path.split('.');
  // Only the innermost (current item) frame and the outermost (global
  // site/data/now) frame are checked — intermediate ancestor frames in a
  // recursive partial (e.g. org-chart nodes) are deliberately NOT
  // shadowed into, so a leaf node's missing `children` doesn't fall
  // through to a parent node's `children` array and recurse forever.
  const candidates = stack.length > 1 ? [stack[stack.length - 1], stack[0]] : [stack[0]];
  for (const cur of candidates) {
    if (cur && typeof cur === 'object' && segments[0] in cur) {
      let val = cur;
      for (const seg of segments) {
        if (val == null) return undefined;
        val = val[seg];
      }
      return val;
    }
  }
  return undefined;
}

function render(nodes, stack) {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') {
      out += node.value;
    } else if (node.type === 'var') {
      const val = resolvePath(node.path, stack);
      out += (val === undefined || val === null) ? '' : String(val);
    } else if (node.type === 'if') {
      const val = resolvePath(node.path, stack);
      if (val) out += render(node.children, stack);
    } else if (node.type === 'each') {
      const arr = resolvePath(node.path, stack) || [];
      for (const item of arr) out += render(node.children, [...stack, item]);
    } else if (node.type === 'partial') {
      const partialSrc = readFileSync(join(SRC, node.path), 'utf8');
      out += render(parse(tokenize(partialSrc)), stack);
    }
  }
  return out;
}

function renderString(str, stack) {
  return render(parse(tokenize(str)), stack);
}

// ---------- fs helpers ----------

function walk(dir) {
  let results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results = results.concat(walk(full));
    else results.push(full);
  }
  return results;
}

function copyDir(from, to) {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const src = join(from, entry);
    const dest = join(to, entry);
    if (statSync(src).isDirectory()) copyDir(src, dest);
    else {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
    }
  }
}

function outputPathFor(relPagePath) {
  const parts = relPagePath.split(/[\\/]/);
  const base = parts.pop();
  const dir = parts.join('/');
  if (base === 'styleguide.html') return 'styleguide.html';
  if (base === 'index.html') return join(dir, 'index.html');
  const name = base.replace(/\.html$/, '');
  return join(dir, name, 'index.html');
}

// ---------- build ----------

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const pageFiles = walk(PAGES).filter((f) => extname(f) === '.html');
const builtPages = [];

for (const file of pageFiles) {
  const relPath = relative(PAGES, file);
  const src = readFileSync(file, 'utf8');
  const html = renderString(src, [rootContext]);
  const outRel = outputPathFor(relPath);
  const outFull = join(DIST, outRel);
  mkdirSync(dirname(outFull), { recursive: true });
  writeFileSync(outFull, html);
  builtPages.push(outRel);
}

// static assets
// CSS is concatenated into a single file (performance budget: one CSS file site-wide)
const CSS_ORDER = ['tokens.css', 'fonts.css', 'base.css', 'layout.css', 'components.css', 'pages.css'];
mkdirSync(join(DIST, 'css'), { recursive: true });
const cssBundle = CSS_ORDER
  .filter((f) => existsSync(join(SRC, 'css', f)))
  .map((f) => `/* ---- ${f} ---- */\n` + readFileSync(join(SRC, 'css', f), 'utf8'))
  .join('\n\n');
writeFileSync(join(DIST, 'css', 'main.css'), cssBundle);

copyDir(join(SRC, 'js'), join(DIST, 'js'));
copyDir(join(SRC, 'fonts'), join(DIST, 'fonts'));
copyDir(join(SRC, 'images'), join(DIST, 'images'));

// privacy dialog partial is fetched client-side on demand, not inlined
mkdirSync(join(DIST, 'partials'), { recursive: true });
const privacySrc = readFileSync(join(SRC, 'partials', 'privacy-dialog.html'), 'utf8');
writeFileSync(join(DIST, 'partials', 'privacy-dialog.html'), renderString(privacySrc, [rootContext]));

// sitemap.xml + robots.txt
const siteUrl = site.SITE_URL.replace(/\/$/, '');
const urlFor = (outRel) => {
  const posix = outRel.split('\\').join('/');
  if (posix === 'index.html') return `${siteUrl}/`;
  if (posix === 'styleguide.html') return null; // noindex
  return `${siteUrl}/${posix.replace(/index\.html$/, '')}`;
};

const urls = builtPages.map(urlFor).filter(Boolean).sort();
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${u}</loc></url>`)
  .join('\n')}\n</urlset>\n`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);

const robots = `User-agent: *\nAllow: /\nDisallow: /styleguide.html\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
writeFileSync(join(DIST, 'robots.txt'), robots);

console.log(`Built ${builtPages.length} pages to /dist`);
