import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');

test('index.html has valid JSON-LD @graph (WebApplication + FAQPage), OG/Twitter metas, and zero waitlist form', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(!html.includes('name="waitlist"'), 'Waitlist form must be removed');
  assert.ok(html.includes('property="og:image" content="https://edge-forge.nealfrazier.tech/og-image.png"'));
  assert.ok(html.includes('name="twitter:site" content="@1nc0gn30"'));
  assert.ok(html.includes('name="twitter:creator" content="@1nc0gn30"'));

  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ldMatch, 'Missing JSON-LD script');
  const jsonLd = JSON.parse(ldMatch[1]);
  assert.ok(Array.isArray(jsonLd['@graph']), 'JSON-LD must declare @graph');
  const types = jsonLd['@graph'].map((n: { '@type': string }) => n['@type']);
  assert.ok(types.includes('WebApplication'), 'Missing WebApplication in @graph');
  assert.ok(types.includes('FAQPage'), 'Missing FAQPage in @graph');
});

test('public/og-image.png exists as a valid 1200x630 PNG', () => {
  const pngPath = path.join(ROOT, 'public', 'og-image.png');
  assert.ok(fs.existsSync(pngPath), 'public/og-image.png must exist');
  const buf = fs.readFileSync(pngPath);
  // PNG signature + IHDR width/height at offsets 16..24
  assert.equal(buf.toString('hex', 0, 8), '89504e470d0a1a0a', 'Invalid PNG header');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert.equal(width, 1200);
  assert.equal(height, 630);
});

test('robots.txt allows frontier crawlers with 0 crawl delay and references sitemap.xml', () => {
  const robots = fs.readFileSync(path.join(ROOT, 'public', 'robots.txt'), 'utf8');
  for (const agent of ['*', 'Googlebot', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Applebot']) {
    assert.ok(robots.includes(`User-agent: ${agent}`), `Missing User-agent: ${agent}`);
  }
  assert.ok(robots.includes('Crawl-delay: 0'));
  assert.ok(robots.includes('Sitemap: https://edge-forge.nealfrazier.tech/sitemap.xml'));
});

test('sitemap.xml contains canonical URL and lastmod', () => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes('<loc>https://edge-forge.nealfrazier.tech/</loc>'));
  assert.ok(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap));
});

test('netlify.toml configures SPA redirect and required security headers', () => {
  const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  assert.ok(toml.includes('publish = "dist"'));
  assert.ok(toml.includes('from = "/*"') && toml.includes('to = "/index.html"') && toml.includes('status = 200'));
  assert.ok(toml.includes('X-Frame-Options = "SAMEORIGIN"'));
  assert.ok(toml.includes('X-Content-Type-Options = "nosniff"'));
  assert.ok(toml.includes('Referrer-Policy = "strict-origin-when-cross-origin"'));
});

test('source code enforces open-access support invariants (zero DePay/paywalls/eval, Stripe coffee + Solana tip)', () => {
  const footer = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Footer.tsx'), 'utf8');
  assert.ok(footer.includes('https://buy.stripe.com/3cIfZg27PdKo2D64Ocfw40X'));
  assert.ok(footer.includes('GG2eQbVh8ut1BK6j1A2tz7pSySdLpD38BgyEhGcxdXoK'));
  assert.ok(footer.includes('Neal Frazier Tech'));

  const srcFiles = [
    'src/App.tsx',
    'src/components/Header.tsx',
    'src/components/PipelineWorkspace.tsx',
    'src/components/SkillStudio.tsx',
    'src/components/HardwareInspector.tsx',
    'src/components/Footer.tsx',
    'src/engine/localSkills.ts',
    'src/engine/workflowRunner.ts',
  ];
  for (const rel of srcFiles) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(!/depay/i.test(content), `Unexpected DePay reference in ${rel}`);
    assert.ok(!/\beval\s*\(/.test(content), `Unsafe eval() in ${rel}`);
    assert.ok(!/\bnew Function\s*\(/.test(content), `Unsafe new Function() in ${rel}`);
  }
});
