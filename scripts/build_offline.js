/* Generate a self-contained worker from CRA's complete chunk manifest after production build. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function buildWorker(manifest, base, revision) {
  const assets = [...new Set([...Object.values(manifest.files).filter(url => /\.(?:js|css|html)$/.test(url)), ...['manifest.json', 'favicon.svg', 'transitiq-mark.svg'].map(file => `${base}${file}`)])];
  return `const ASSETS = ${JSON.stringify(assets)};
const CACHE = ${JSON.stringify(`waps-assets:${base}:${revision}`)};
const PREFIX = ${JSON.stringify(`waps-assets:${base}:`)};
const INDEX = ${JSON.stringify(`${base}index.html`)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
// An update waits until existing tabs close, so their bundles and passage chunks stay together.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  const navigation = request.mode === 'navigate' && (url.pathname === scope || url.pathname === INDEX);
  // Only precached public build files are intercepted. Never cache account/API responses.
  if (!navigation && !ASSETS.includes(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(navigation ? INDEX : url.pathname)).then(cached => cached || fetch(request)));
});
`;
}
if (require.main === module) {
  const directory = path.resolve(__dirname, '../build');
  const manifestText = fs.readFileSync(path.join(directory, 'asset-manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText);
  const base = manifest.files['index.html'].replace(/index\.html$/, '');
  const revision = crypto.createHash('sha256').update(manifestText).update(fs.readFileSync(path.join(directory, 'index.html'))).update(fs.readFileSync(path.join(directory, 'transitiq-mark.svg'))).digest('hex').slice(0, 16);
  fs.writeFileSync(path.join(directory, 'service-worker.js'), buildWorker(manifest, base, revision));
  console.log(`Offline cache generated for ${base} (${revision}).`);
}
module.exports = {buildWorker};
