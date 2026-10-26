// Public configuration only. Prepare_REUSE.ps1 updates this hostname.
export const REUSE_CONFIG={apiBase:'https://api.bagdaymalta.eu',get version(){return globalThis.BAG_DAY_CONFIG?.version||'unknown'}};
