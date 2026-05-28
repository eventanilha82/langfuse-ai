// Prefix public assets with Vite's configured base path. In local dev this is
// "/", while packaged deployments can set `base` without breaking workers.
export const withBase = (path) => {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};
