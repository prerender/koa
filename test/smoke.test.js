'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const Koa = require('koa');
const request = require('supertest');
const prerender = require('../index');

const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1)';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
const PRERENDERED_HTML = '<html><body>prerendered</body></html>';

function mockFetch(body = PRERENDERED_HTML, status = 200) {
  global.fetch = async () => ({
    status,
    text: async () => body
  });
}

function createApp(options = {}) {
  const app = new Koa();
  app.use(prerender(options));
  app.use((ctx) => { ctx.body = 'original'; });
  return app;
}

test('normal browser passes through', async () => {
  const app = createApp({ token: 'test-token' });
  const res = await request(app.callback()).get('/').set('User-Agent', BROWSER_UA);
  assert.equal(res.status, 200);
  assert.equal(res.text, 'original');
  assert.equal(res.headers['x-prerender'], 'false');
});

test('bot receives prerendered response', async () => {
  mockFetch();
  const app = createApp({ token: 'test-token' });
  const res = await request(app.callback()).get('/').set('User-Agent', BOT_UA);
  assert.equal(res.status, 200);
  assert.equal(res.text, PRERENDERED_HTML);
  assert.equal(res.headers['x-prerender'], 'true');
});

test('static asset with bot UA is not prerendered', async () => {
  const app = createApp();
  const res = await request(app.callback()).get('/style.css').set('User-Agent', BOT_UA);
  assert.equal(res.status, 200);
  assert.equal(res.text, 'original');
  assert.equal(res.headers['x-prerender'], 'false');
});

test('_escaped_fragment_ triggers prerender for any user agent', async () => {
  mockFetch();
  const app = createApp({ token: 'test-token' });
  const res = await request(app.callback()).get('/?_escaped_fragment_=').set('User-Agent', BROWSER_UA);
  assert.equal(res.status, 200);
  assert.equal(res.text, PRERENDERED_HTML);
  assert.equal(res.headers['x-prerender'], 'true');
});

test('fetch error falls back to normal response', async () => {
  global.fetch = async () => { throw new Error('network error'); };
  const app = createApp({ token: 'test-token' });
  const res = await request(app.callback()).get('/').set('User-Agent', BOT_UA);
  assert.equal(res.status, 200);
  assert.equal(res.text, 'original');
  assert.equal(res.headers['x-prerender'], 'false');
});
