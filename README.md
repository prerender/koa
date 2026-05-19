# prerender-koa

Koa middleware for [Prerender.io](https://prerender.io). Intercepts requests from bots and crawlers and serves prerendered HTML, so your JavaScript-rendered app is fully indexable by search engines and social media scrapers.

Compatible with **Koa v2+** and **Node.js 18+**.

## Installation

```bash
npm install prerender-koa
```

## Usage

```javascript
const Koa = require('koa');
const prerender = require('prerender-koa');

const app = new Koa();

app.use(prerender({
  token: 'YOUR_PRERENDER_TOKEN'
}));

// your other middleware and routes
```

The middleware intercepts bot requests and proxies them to Prerender.io, returning prerendered HTML. Regular browser requests pass through unaffected. All responses include an `X-Prerender: true/false` header.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `token` | `string` | `process.env.PRERENDER_TOKEN` | Your Prerender.io token |
| `serviceUrl` | `string` | `process.env.PRERENDER_SERVICE_URL` or `https://service.prerender.io/` | Prerender service URL (use this for self-hosted Prerender) |
| `protocol` | `string` | `null` | Force a protocol (`http` or `https`). Defaults to the request's protocol |

## Environment variables

```bash
PRERENDER_TOKEN=your_token_here
PRERENDER_SERVICE_URL=https://service.prerender.io/  # optional
```

## Self-hosted Prerender

```javascript
app.use(prerender({
  serviceUrl: 'http://your-prerender-server:3000'
}));
```

## How it works

Requests are prerendered when **all** of the following are true:

- The HTTP method is `GET`
- The `User-Agent` matches a known bot/crawler (Googlebot, Bingbot, Twitterbot, GPTBot, ClaudeBot, etc.)  
  — OR the URL contains `_escaped_fragment_`  
  — OR the `X-Bufferbot` header is present
- The URL does not end with a static asset extension (`.js`, `.css`, `.png`, etc.)

Everything else passes through to your normal Koa middleware.

## License

MIT
