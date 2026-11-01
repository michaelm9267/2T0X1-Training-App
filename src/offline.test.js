const {buildWorker} = require('../scripts/build_offline');
const vm = require('vm');
test('offline worker caches all lazy chunks under the deployment subpath and excludes maps/API responses', () => {
  const code = buildWorker({files: {'main.js': '/app/static/js/main.js', lazy: '/app/static/js/lazy.chunk.js', map: '/app/main.js.map', 'index.html': '/app/index.html'}}, '/app/', 'v1');
  expect(code).toContain('/app/static/js/lazy.chunk.js');
  expect(code).not.toContain('main.js.map');
  expect(code).toContain('/app/transitiq-mark.svg');
  const handlers = {}; const match = jest.fn();
  vm.runInNewContext(code, {self: {addEventListener: (name, fn) => {handlers[name] = fn;}, location: {origin: 'https://example.test'}, registration: {scope: 'https://example.test/app/'}}, URL, caches: {open: jest.fn(), match}, fetch: jest.fn()});
  const response = jest.fn();
  handlers.fetch({request: {url: 'https://firestore.googleapis.com/data', method: 'GET'}, respondWith: response});
  expect(response).not.toHaveBeenCalled();
  handlers.fetch({request: {url: 'https://example.test/app/api/private', method: 'GET'}, respondWith: response});
  expect(response).not.toHaveBeenCalled();
});
test('the first installed worker controls the open study tab for immediate offline lazy passages', async () => {
  const code = buildWorker({files:{'index.html':'/app/index.html',main:'/app/main.js'}},'/app/','v1');
  const handlers = {}; let controlled = false, completion;
  vm.runInNewContext(code,{self:{clients:{claim:async()=>{controlled=true;}}, addEventListener:(name,fn)=>{handlers[name]=fn;}},caches:{keys:async()=>[]}});
  handlers.activate({waitUntil:promise=>{completion=promise;}}); await completion;
  expect(controlled).toBe(true);
});
