'use strict';

const internals = {};

internals.crawlerUserAgents = [
  'googlebot', 'yahoo', 'bingbot', 'baiduspider',
  'facebookexternalhit', 'twitterbot', 'rogerbot', 'linkedinbot',
  'embedly', 'quora link preview', 'showyoubot', 'outbrain',
  'pinterest', 'slackbot', 'developers.google.com/+/web/snippet',
  'w3c_validator', 'perplexity', 'oai-searchbot', 'chatgpt-user',
  'gptbot', 'claudebot', 'amazonbot'
];

internals.extensionsToIgnore = [
  '.js', '.css', '.xml', '.less', '.png', '.jpg', '.jpeg', '.gif',
  '.pdf', '.doc', '.txt', '.ico', '.rss', '.zip', '.mp3', '.rar',
  '.exe', '.wmv', '.avi', '.ppt', '.mpg', '.mpeg', '.tif', '.wav',
  '.mov', '.psd', '.ai', '.xls', '.mp4', '.m4a', '.swf', '.dat',
  '.dmg', '.iso', '.flv', '.m4v', '.torrent', '.ttf', '.woff', '.svg'
];

internals.defaults = {
  serviceUrl: process.env.PRERENDER_SERVICE_URL || 'https://service.prerender.io/',
  token: process.env.PRERENDER_TOKEN || null,
  protocol: null
};

function isBot(userAgent) {
  const ua = userAgent.toLowerCase();
  return internals.crawlerUserAgents.some((bot) => ua.includes(bot));
}

function isStaticAsset(path) {
  return internals.extensionsToIgnore.some((ext) => path.endsWith(ext));
}

function shouldPrerender(ctx) {
  const userAgent = ctx.get('user-agent');
  if (!userAgent || ctx.method !== 'GET') return false;
  if (isStaticAsset(ctx.path)) return false;

  return '_escaped_fragment_' in ctx.query
    || isBot(userAgent)
    || !!ctx.get('x-bufferbot');
}

function buildApiUrl(ctx, settings) {
  const protocol = settings.protocol || ctx.protocol;
  const base = settings.serviceUrl.endsWith('/')
    ? settings.serviceUrl
    : settings.serviceUrl + '/';
  return `${base}${protocol}://${ctx.host}${ctx.url}`;
}

async function fetchPrerendered(apiUrl, ctx, settings) {
  const headers = { 'User-Agent': ctx.get('user-agent') };
  if (settings.token) {
    headers['X-Prerender-Token'] = settings.token;
  }
  const response = await fetch(apiUrl, { headers, redirect: 'manual' });
  const body = await response.text();
  return { status: response.status, body };
}

module.exports = function prerenderMiddleware(options = {}) {
  const settings = { ...internals.defaults, ...options };

  return async function prerender(ctx, next) {
    if (!shouldPrerender(ctx)) {
      ctx.set('X-Prerender', 'false');
      return next();
    }

    try {
      const apiUrl = buildApiUrl(ctx, settings);
      const prerendered = await fetchPrerendered(apiUrl, ctx, settings);
      ctx.status = prerendered.status;
      ctx.body = prerendered.body;
      ctx.set('X-Prerender', 'true');
    } catch (err) {
      console.error('Prerender error, falling back:', err.message);
      ctx.set('X-Prerender', 'false');
      return next();
    }
  };
};
