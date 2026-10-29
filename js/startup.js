/* Start core artwork requests in the head; reveal Home only after decoding. */
(() => {
  'use strict';
  // Keep the former splash available behind one release-config switch.
  const splashEnabled = window.BAG_DAY_CONFIG?.splashEnabled === true;
  document.documentElement.dataset.splashEnabled = String(splashEnabled);
  const previews = {"organic":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxODQgMjA4Ij48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9Ii44Ij48c3RvcCBzdG9wLWNvbG9yPSIjZmZmZGY1Ii8+PHN0b3Agb2Zmc2V0PSIuNyIgc3RvcC1jb2xvcj0iI2Q3ZGZkOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2ZmZmRmNSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxlbGxpcHNlIGN4PSI5MyIgY3k9IjE5NiIgcng9IjY1IiByeT0iNyIgZmlsbD0iIzEwMmU0OCIgb3BhY2l0eT0iLjEzIi8+PHBhdGggZD0iTTgwIDQ5QzYyIDQ4IDQzIDU3IDMwIDgwQzE4IDEwMCAxNCAxMjEgMTkgMTQ1QzI0IDE2OSAzOSAxODcgNjMgMTkxQzgwIDE5NSAxMDUgMTk1IDEyMiAxOTFDMTQ3IDE4NSAxNjIgMTY1IDE2NiAxNDFDMTcwIDExOCAxNjEgOTEgMTQ3IDc0QzEzNCA1NyAxMTYgNDggMTAzIDQ5WiIgZmlsbD0idXJsKCNiYWcpIiBzdHJva2U9IiM2YjgxN2MiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTgwIDQ5UTY3IDI1IDYzIDE3UTgzIDE0IDkzIDM5UTEwOSAxNCAxMjIgMThRMTE4IDQwIDEwMyA0OSIgZmlsbD0idXJsKCNiYWcpIiBzdHJva2U9IiM2YjgxN2MiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTc2IDQ5UTkxIDU4IDEwNyA0OEwxMTEgNThROTMgNjYgNzYgNThaIiBmaWxsPSIjNmI4MTdjIi8+PHBhdGggZD0iTTc1IDYyUTQ1IDc5IDM1IDEyNE0xMTAgNjVRMTM2IDgxIDE0NSAxMjFNMzcgMTU3UTQ5IDE3OCA2NiAxODJNMTI2IDE3N1ExNDMgMTY2IDE0OSAxNDQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzZiODE3YyIgc3Ryb2tlLXdpZHRoPSIzIiBvcGFjaXR5PSIuNDIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik00OSA3N1EzMyA5NSAzMCAxMzIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI2IiBvcGFjaXR5PSIuMzgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxnIHN0cm9rZT0iIzk5NzAxYiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik04OSAxMDEgODYgODNROTIgNzcgOTkgODNMOTggMTA0WiIgZmlsbD0iI2VmYzMzMyIvPjxwYXRoIGQ9Ik04NyA4NFE5MiA4MCA5NyA4NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNzM1MjI0IiBzdHJva2Utd2lkdGg9IjUiLz48cGF0aCBkPSJNOTEgMTAwQzc5IDExMyA2MSAxMTkgNDMgMTA5QzQxIDEyOCA1OCAxNDQgNzUgMTM3Qzg2IDEzMyA5MyAxMTkgOTQgMTA1WiIgZmlsbD0iI2ZmZDUyZSIvPjxwYXRoIGQ9Ik05MSAxMDJRNzAgMTI2IDQ4IDExNVE2MyAxMzYgNzcgMTMwUTg5IDEyMyA5NCAxMDUiIGZpbGw9IiNmZmYxYWEiIHN0cm9rZS13aWR0aD0iMS42Ii8+PHBhdGggZD0iTTk2IDEwMEMxMDggMTEzIDEyMyAxMjIgMTQxIDEwOUMxNDggMTIyIDE0MCAxNDMgMTI0IDE0MEMxMDkgMTM5IDk5IDEyMCA5NSAxMDVaIiBmaWxsPSIjZmZjZjI0Ii8+PHBhdGggZD0iTTk3IDEwM1ExMTcgMTI4IDEzNyAxMTZRMTM1IDEzNCAxMjQgMTMzUTEwOCAxMjYgOTUgMTA1IiBmaWxsPSIjZmZmMGEwIiBzdHJva2Utd2lkdGg9IjEuNiIvPjxwYXRoIGQ9Ik05MiAxMDBDODEgMTE2IDc4IDE0NiA4NSAxNjlROTcgMTc5IDExMSAxNjRDMTAyIDE0MyAxMDMgMTE2IDk2IDEwMloiIGZpbGw9IiNmZmRjM2IiLz48cGF0aCBkPSJNOTIgMTA2UTg1IDEzOCA5MSAxNjJROTkgMTY5IDEwNSAxNjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZjNiMyIgc3Ryb2tlLXdpZHRoPSI1Ii8+PHBhdGggZD0iTTg1IDE2OVE5MSAxNzYgOTggMTcxIiBmaWxsPSJub25lIiBzdHJva2U9IiM5MjYzMjkiIHN0cm9rZS13aWR0aD0iNCIvPjxwYXRoIGQ9Ik00MyAxMDkgNDcgMTE4TTE0MSAxMDkgMTQwIDExOCIgc3Ryb2tlPSIjOTI2MzI5IiBzdHJva2Utd2lkdGg9IjQiLz48L2c+PC9zdmc+","mixed":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxODQgMjA4Ij48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9Ii44Ij48c3RvcCBzdG9wLWNvbG9yPSIjNGI1YjZiIi8+PHN0b3Agb2Zmc2V0PSIuNyIgc3RvcC1jb2xvcj0iIzE3MjYzNSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzRiNWI2YiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxlbGxpcHNlIGN4PSI5MyIgY3k9IjE5NiIgcng9IjY1IiByeT0iNyIgZmlsbD0iIzEwMmU0OCIgb3BhY2l0eT0iLjEzIi8+PHBhdGggZD0iTTgwIDQ5QzYyIDQ4IDQzIDU3IDMwIDgwQzE4IDEwMCAxNCAxMjEgMTkgMTQ1QzI0IDE2OSAzOSAxODcgNjMgMTkxQzgwIDE5NSAxMDUgMTk1IDEyMiAxOTFDMTQ3IDE4NSAxNjIgMTY1IDE2NiAxNDFDMTcwIDExOCAxNjEgOTEgMTQ3IDc0QzEzNCA1NyAxMTYgNDggMTAzIDQ5WiIgZmlsbD0idXJsKCNiYWcpIiBzdHJva2U9IiNiOWNiZDkiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTgwIDQ5UTY3IDI1IDYzIDE3UTgzIDE0IDkzIDM5UTEwOSAxNCAxMjIgMThRMTE4IDQwIDEwMyA0OSIgZmlsbD0idXJsKCNiYWcpIiBzdHJva2U9IiNiOWNiZDkiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTc2IDQ5UTkxIDU4IDEwNyA0OEwxMTEgNThROTMgNjYgNzYgNThaIiBmaWxsPSIjYjljYmQ5Ii8+PHBhdGggZD0iTTc1IDYyUTQ1IDc5IDM1IDEyNE0xMTAgNjVRMTM2IDgxIDE0NSAxMjFNMzcgMTU3UTQ5IDE3OCA2NiAxODJNMTI2IDE3N1ExNDMgMTY2IDE0OSAxNDQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2I5Y2JkOSIgc3Ryb2tlLXdpZHRoPSIzIiBvcGFjaXR5PSIuNDIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik00OSA3N1EzMyA5NSAzMCAxMzIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI2IiBvcGFjaXR5PSIuMzgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxnIHRyYW5zZm9ybT0icm90YXRlKC04IDk0IDEzMykiIHN0cm9rZT0iI2I3OGM2MSIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01MyAxMjEgNjEgODIgMTIzIDgyIDEzMyAxMjFaIiBmaWxsPSIjZGZiYzhkIi8+PHBhdGggZD0iTTYyIDkxaDU4bDcgMjNINTdaIiBmaWxsPSIjZWRjZWEzIiBzdHJva2U9Im5vbmUiLz48cGF0aCBkPSJNNTIgMTI0IDExNiAxMTggMTM5IDEzNyA3MyAxNDZaIiBmaWxsPSIjZTdjNTk3Ii8+PHBhdGggZD0iTTUyIDEyNHYxNWwyMSAyMXYtMTRaIiBmaWxsPSIjYmE4YzVmIi8+PHBhdGggZD0iTTczIDE0NnYxNGw2Ni05di0xNFoiIGZpbGw9IiNkMmE3NzQiLz48cGF0aCBkPSJNNjEgMTA2cTctMTMgMTYtM3QxNS0zcTEyLTEwIDE4IDJ0LTEwIDExbC0yNyAxcS0xMyAwLTEyLThaIiBmaWxsPSIjYTg3NTNjIiBvcGFjaXR5PSIuNTUiIHN0cm9rZT0ibm9uZSIvPjxlbGxpcHNlIGN4PSIxMDIiIGN5PSIxMzIiIHJ4PSIxNSIgcnk9IjYiIGZpbGw9IiM5ZjcwM2IiIG9wYWNpdHk9Ii40MiIgc3Ryb2tlPSJub25lIi8+PHBhdGggZD0ibTc4IDEyNCA4IDQtNiA1WiIgZmlsbD0iI2E3NzQ0MiIgb3BhY2l0eT0iLjYiIHN0cm9rZT0ibm9uZSIvPjxjaXJjbGUgY3g9IjExNSIgY3k9IjEwNCIgcj0iMyIgZmlsbD0iIzllNmEzNiIgb3BhY2l0eT0iLjY1IiBzdHJva2U9Im5vbmUiLz48cGF0aCBkPSJtODEgMTUxIDM4LTUiIHN0cm9rZT0iI2E0NzU0NSIgb3BhY2l0eT0iLjU1Ii8+PC9nPjwvc3ZnPg==","recycle":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxODQgMjA4Ij48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9Ii44Ij48c3RvcCBzdG9wLWNvbG9yPSIjY2VkOWRmIi8+PHN0b3Agb2Zmc2V0PSIuNyIgc3RvcC1jb2xvcj0iIzg0OWJhNiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2NlZDlkZiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxlbGxpcHNlIGN4PSI5MyIgY3k9IjE5NiIgcng9IjY1IiByeT0iNyIgZmlsbD0iIzEwMmU0OCIgb3BhY2l0eT0iLjEzIi8+PHBhdGggZD0iTTgwIDQ5QzYyIDQ4IDQzIDU3IDMwIDgwQzE4IDEwMCAxNCAxMjEgMTkgMTQ1QzI0IDE2OSAzOSAxODcgNjMgMTkxQzgwIDE5NSAxMDUgMTk1IDEyMiAxOTFDMTQ3IDE4NSAxNjIgMTY1IDE2NiAxNDFDMTcwIDExOCAxNjEgOTEgMTQ3IDc0QzEzNCA1NyAxMTYgNDggMTAzIDQ5WiIgZmlsbD0idXJsKCNiYWcpIiBzdHJva2U9IiM0YjY5NzgiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTgwIDQ5UTY3IDI1IDYzIDE3UTgzIDE0IDkzIDM5UTEwOSAxNCAxMjIgMThRMTE4IDQwIDEwMyA0OSIgZmlsbD0idXJsKCNiYWcpIiBzdHJva2U9IiM0YjY5NzgiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTc2IDQ5UTkxIDU4IDEwNyA0OEwxMTEgNThROTMgNjYgNzYgNThaIiBmaWxsPSIjNGI2OTc4Ii8+PHBhdGggZD0iTTc1IDYyUTQ1IDc5IDM1IDEyNE0xMTAgNjVRMTM2IDgxIDE0NSAxMjFNMzcgMTU3UTQ5IDE3OCA2NiAxODJNMTI2IDE3N1ExNDMgMTY2IDE0OSAxNDQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzRiNjk3OCIgc3Ryb2tlLXdpZHRoPSIzIiBvcGFjaXR5PSIuNDIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik00OSA3N1EzMyA5NSAzMCAxMzIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI2IiBvcGFjaXR5PSIuMzgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDkzIDEzMCkiIGZpbGw9IiMyMTk0NDkiIHN0cm9rZT0iIzE2NmUzNSIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxnIGlkPSJhcnJvdyI+PHBhdGggZD0iTS0xOC00MFEtMTAtNTMtMS00NEwxNC0xOCAyMi0yMyAxNy0zLTUtNyAzLTEyLTExLTM2WiIvPjxwYXRoIGQ9Ik0tMTgtNDAtMjctMjQtMTAtMTQgMS0zNC03LTQ3US0xMi01Mi0xOC00MFoiLz48L2c+PHVzZSBocmVmPSIjYXJyb3ciIHRyYW5zZm9ybT0icm90YXRlKDEyMCkiLz48dXNlIGhyZWY9IiNhcnJvdyIgdHJhbnNmb3JtPSJyb3RhdGUoMjQwKSIvPjwvZz48L3N2Zz4=","glass":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxODQgMjA4Ij48ZWxsaXBzZSBjeD0iOTIiIGN5PSIxOTYiIHJ4PSI2NSIgcnk9IjciIGZpbGw9IiMxMDJlNDgiIG9wYWNpdHk9Ii4xMyIvPjxnIHN0cm9rZT0iIzM3Njk1ZiIgc3Ryb2tlLXdpZHRoPSIzLjUiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxnIHRyYW5zZm9ybT0icm90YXRlKC05IDUzIDkzKSI+PHBhdGggZD0iTTM5IDEyOFY3NUw0NyA2M1YyOUg2MVY2M0w3MCA3NVYxMzEiIGZpbGw9IiM4M2I3N2EiLz48cGF0aCBkPSJNNTAgMzZWNjBNNDcgNzlWMTA4IiBzdHJva2U9IiNkOGViY2UiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9nPjxwYXRoIGQ9Ik03NSAxMzdWNjJMODUgNDlWMTVIMTAyVjQ5TDExMiA2MlYxMzciIGZpbGw9IiNiZWNmOTYiLz48cGF0aCBkPSJNODkgMjRWNDZNODQgNzJWMTA1IiBzdHJva2U9IiNmNWY2ZGIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGcgdHJhbnNmb3JtPSJyb3RhdGUoOCAxMzcgOTgpIj48cGF0aCBkPSJNMTIwIDEzNFY4OEwxMjkgNzVWNDRIMTQ0Vjc1TDE1NCA4OFYxMzYiIGZpbGw9IiNhZmQwYmYiLz48cGF0aCBkPSJNMTMzIDUwVjcyTTEyOCA5NFYxMTQiIHN0cm9rZT0iI2VlZjllZSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L2c+PC9nPjxwYXRoIGQ9Ik0yMiAxMTFIMTY0TDE1MyAxNzFRMTQ5IDE5MCAxMzAgMTkwSDU1UTM1IDE5MCAzMSAxNzFaIiBmaWxsPSIjNzZiNWFhIiBzdHJva2U9IiMzMjZmNjgiIHN0cm9rZS13aWR0aD0iNC41Ii8+PHBhdGggZD0iTTIyIDExMlE5MyAxMDIgMTY0IDExMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYjVlMGNiIiBzdHJva2Utd2lkdGg9IjYiLz48cGF0aCBkPSJNNDMgMTI4SDE0M000NyAxNDNIMTQwIiBzdHJva2U9IiNjMGUyZDMiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTU3IDE1OFYxNzRNODAgMTU3VjE3Nk0xMDQgMTU3VjE3Nk0xMjcgMTU4VjE3NCIgc3Ryb2tlPSIjNGE4YTdjIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg=="};
  const detailed = new Map();
  function progressiveImage(type, alt) {
    const path = type === 'glass' ? 'icons/glass-real.webp' : `icons/bag-${type}-real.webp`;
    return `<img src="${previews[type]}" data-detail-src="${path}" decoding="async" alt="${alt}">`;
  }
  function upgradeImages(container) {
    for (const image of container.querySelectorAll('img[data-detail-src]')) {
      const path = image.dataset.detailSrc;
      delete image.dataset.detailSrc;
      if (!detailed.has(path)) detailed.set(path, new Promise(resolve => {
        const photo = new Image();
        photo.decoding = 'async'; photo.fetchPriority = 'high';
        photo.onload = async () => {
          try { if (photo.decode) await photo.decode(); resolve(photo.naturalWidth > 0); }
          catch (_) { resolve(false); }
        };
        photo.onerror = () => resolve(false);
        photo.src = path;
      }));
      detailed.get(path).then(ok => { if (ok && image.isConnected) image.src = path; });
    }
  }
  if (!splashEnabled) {
    let revealed = false;
    window.BAG_DAY_STARTUP = {
      ready: Promise.resolve(), assets: [], imageURL: path => path,
      progressiveImage, upgradeImages,
      reveal({ beforeReveal = () => {}, onComplete = () => {} } = {}) {
        if (revealed) return Promise.resolve();
        revealed = true;
        try { beforeReveal(); }
        finally {
          document.getElementById('splashScreen').hidden = true;
          document.body.classList.remove('app-loading');
          document.getElementById('appContent').inert = false;
          onComplete();
        }
        return Promise.resolve();
      }
    };
    return;
  }
  document.addEventListener('DOMContentLoaded', () => {
    for (const image of document.querySelectorAll('[data-splash-src]')) image.src = image.dataset.splashSrc;
  }, { once: true });
  const root = new URL('../', document.currentScript.src);
  const returnKey='bag-day-return-home-v1';let returning=false;try{const at=Number(sessionStorage.getItem(returnKey));sessionStorage.removeItem(returnKey);returning=at>0&&Date.now()>=at&&Date.now()-at<30000}catch{}
  returning=returning||performance.getEntriesByType?.('navigation')?.[0]?.type==='back_forward';
  window.addEventListener('pageshow',()=>{try{sessionStorage.removeItem(returnKey)}catch{}});
  const settingsEntry = new URLSearchParams(location.search).get('panel') === 'settings';
  document.documentElement.dataset.entryScreen = settingsEntry ? 'settings' : returning ? 'return' : 'home';
  const SPLASH_ART='icons/splash-features-v1.png';let splashArtworkReadyAt=0;
  const ASSETS = [SPLASH_ART,
    'icons/bag-organic-real.webp', 'icons/bag-mixed-real.webp',
    'icons/bag-recycle-real.webp', 'icons/glass-real.webp',
    'icons/card-botanical.svg', 'icons/card-recycling.svg',
    'icons/council-backdrop.svg', 'icons/bag-organic.svg',
    'icons/bag-mixed.svg', 'icons/bag-recycle.svg', 'icons/glass-carrier.svg', 'icons/reuse-free-stuff-v1.png', 'icons/community-notices.png', 'icons/bag-day-malta-brand.svg'
  ];
  const MIN_MS = 2000, MAX_MS = 10000, FADE_MS = 400;
  const started = performance.now(), loaded = new Set(), images = [];
  let settled = false, revealing = null;
  // Count the minimum from the completed document, not the early head request.
  const splashVisible = new Promise(resolve => {
    const mark = () => resolve(performance.now());
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark, {once:true});
    else mark();
  });
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  function within(promise, ms) {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), Math.max(0, ms));
      Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(false); });
    });
  }
  function decode(image) {
    try { return typeof image.decode === 'function' ? image.decode().catch(() => false) : Promise.resolve(); }
    catch (_) { return Promise.resolve(false); }
  }
  function preload(path, index) {
    return new Promise(resolve => {
      const image = new Image(), url = new URL(path, root).href;
      images.push(image);
      image.decoding = 'async'; image.fetchPriority = index < 4 ? 'high' : 'auto';
      image.onload = async () => {
        const decoded = await decode(image);
        if (decoded !== false && image.naturalWidth > 0){loaded.add(url);if(path===SPLASH_ART)splashArtworkReadyAt=performance.now();}
        resolve();
      };
      image.onerror = () => resolve();
      image.src = url;
    });
  }
  const ready = within(Promise.all(ASSETS.filter(path=>!(settingsEntry||returning)||path!==SPLASH_ART).map(preload)), MAX_MS).then(() => { settled = true; });
  function imageURL(path, fallback) {
    return settled && !loaded.has(new URL(path, root).href) ? fallback : path;
  }
  function visibleImages(content) {
    return Promise.all([...content.querySelectorAll('img')].filter(image => image.getClientRects().length > 0).map(image => {
      if (image.complete) return image.naturalWidth > 0 ? decode(image) : Promise.resolve();
      return new Promise(resolve => {
        const finish = () => {
          image.removeEventListener('load', finish); image.removeEventListener('error', finish);
          decode(image).then(resolve);
        };
        image.addEventListener('load', finish, { once: true }); image.addEventListener('error', finish, { once: true });
      });
    }));
  }
  function reveal({ beforeReveal = () => {}, onComplete = () => {} } = {}) {
    if (revealing) return revealing;
    revealing = (async () => {
      const splash = document.getElementById('splashScreen'), content = document.getElementById('appContent');
      try {
        if (settingsEntry || returning) {
          beforeReveal();
        } else {
          const visibleAt = await splashVisible;
          await ready;
          beforeReveal();
          await within(visibleImages(content), MAX_MS - (performance.now() - started));
          await delay(Math.max(0, MIN_MS - (performance.now() - Math.max(visibleAt,splashArtworkReadyAt))));
        }
      } finally {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        document.body.classList.remove('app-loading');
        if (!settingsEntry && !returning) splash.classList.add('splash-leaving');
        if (!settingsEntry && !returning && !reduced) await delay(FADE_MS);
        splash.hidden = true; content.inert = false;
        onComplete();
      }
    })();
    return revealing;
  }
  window.BAG_DAY_STARTUP = { ready, reveal, imageURL, assets: [...ASSETS], progressiveImage, upgradeImages };
})();
