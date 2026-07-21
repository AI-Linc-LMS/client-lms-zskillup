import type { NextConfig } from 'next';

/**
 * Production API proxy (Netlify). The site is served over HTTPS but the backend
 * ALB is plain HTTP, so the browser cannot call it directly (mixed content).
 * Instead the browser calls the API SAME-ORIGIN (`/api/v1/*` on the Netlify
 * domain) and this rewrite proxies those requests server-side to the backend.
 *
 * Why same-origin matters: the refresh token is an HttpOnly cookie. Proxying
 * keeps it a first-party cookie on the Netlify domain, so it is stored and sent
 * automatically — no cross-site / third-party-cookie fragility.
 *
 * Set `BACKEND_ORIGIN` in the Netlify env (e.g. http://<alb-dns>) to enable the
 * proxy. When unset (local dev) no rewrite is added and the client talks to the
 * backend directly via NEXT_PUBLIC_API_URL (http://localhost:3001).
 *
 * Note: the Next route handlers at /api/auth/* are intentionally NOT proxied —
 * only /api/v1/* (the Nest API) is.
 */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Required for Amplify Hosting SSR (compute) deployments
  output: 'standalone',
  turbopack: {
    resolveAlias: {
      // face-landmarks-detection statically imports @mediapipe/face_mesh (a UMD
      // module with no ESM exports) for its WASM runtime; we only use the tfjs
      // runtime, so alias it to a stub to keep the bundle building.
      '@mediapipe/face_mesh': './src/lib/proctoring/mediapipe-face-mesh-stub.ts',
    },
  },
  // Legacy test-surface routes fold into the 4 consolidated modes. Permanent so
  // old bookmarks/deep-links (and any stale in-app links) land on the new home.
  async redirects() {
    return [
      { source: '/topic-mastery', destination: '/practice', permanent: true },
      { source: '/mock-tests', destination: '/mock-assessment', permanent: true },
      { source: '/calendar', destination: '/assessments', permanent: true },
    ];
  },
  async rewrites() {
    if (!BACKEND_ORIGIN) return [];
    return {
      beforeFiles: [
        {
          source: '/api/v1/:path*',
          destination: `${BACKEND_ORIGIN}/api/v1/:path*`,
        },
        // Health probes live at the API root (NOT under /api/v1) — proxy them too
        // so the dashboard's Platform Health widget can reach GET /ready & /health.
        { source: '/ready', destination: `${BACKEND_ORIGIN}/ready` },
        { source: '/health', destination: `${BACKEND_ORIGIN}/health` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
