/* Only the generic offline shell is cached; never API responses or signed-in pages. */
const CACHE = 'dwc-attendance-shell-v1';
const SHELL = '/attendance/offline.html';
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([SHELL])).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/attendance/')) return;
  event.respondWith(fetch(request).catch(async () => (await caches.match(SHELL)) || Response.error()));
});
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* Generic notification only. */ }
  event.waitUntil(self.registration.showNotification('Attendance needs attention', { body: typeof data.body === 'string' ? data.body : 'Open your instructor workspace to review a check-in problem.', tag: 'attendance-failure', data: { url: '/attendance/instructor' } }));
});
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(self.clients.openWindow('/attendance/instructor')); });
