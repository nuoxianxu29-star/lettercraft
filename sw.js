/**
 * TextCraft Service Worker v1.0
 * 离线缓存策略：Cache-First（静态资源） / Network-First（API 请求）
 */

const CACHE_NAME = 'textcraft-v2';
const STATIC_ASSETS = [
  '.',
  'index.html',
  'css/style.css',
  'js/core/app.js',
  'js/core/router.js',
  'js/services/transformerService.js',
  'js/services/exportService.js',
  'js/services/aiService.js',
  'js/store/state.js',
  'js/templates.js',
  'js/styles.js',
  'js/transformer.js',
  'manifest.json',
];

// Google Fonts 缓存
const FONT_CACHE = 'textcraft-fonts-v1';
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@300;400;500;600;700&family=ZCOOL+XiaoWei&family=ZCOOL+KuaiLe&family=Long+Cang&display=swap',
];

// 安装阶段：预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      // 预缓存字体 CSS
      try {
        const fontCache = await caches.open(FONT_CACHE);
        await fontCache.addAll(FONT_URLS);
      } catch (e) {
        console.warn('Font pre-cache failed (offline first run):', e);
      }
    })()
  );
  self.skipWaiting();
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== FONT_CACHE)
          .map((key) => caches.delete(key))
      );
    })()
  );
  self.clients.claim();
});

// 网络请求拦截：Cache-First 策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 只处理同源请求和 Google Fonts
  if (url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Vue CDN：网络优先，退回到缓存
  if (url.hostname === 'unpkg.com') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 其他请求：默认不拦截
});

// Cache-First 策略
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      // 克隆响应：一份用于缓存，一份用于返回
      const clone = response.clone();
      cache.put(request, clone).catch(() => {});
    }
    return response;
  } catch (e) {
    // 离线且无缓存时返回离线页面
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match('index.html');
      if (cachedResponse) return cachedResponse;
    }
    return new Response('离线模式：资源不可用', { status: 503 });
  }
}

// Network-First 策略
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('网络不可用', { status: 503 });
  }
}
