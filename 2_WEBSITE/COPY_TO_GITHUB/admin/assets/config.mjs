// Public settings only. Never put passwords, API tokens or Cloudflare secrets here.
export const CONFIG={apiBase:'https://api.bagdaymalta.eu',googleClientId:'',exporterBase:'https://bagday-sponsor-export.davvel.workers.dev',get version(){return globalThis.BAG_DAY_CONFIG?.version||'unknown'}};
