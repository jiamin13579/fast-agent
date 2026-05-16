const proxyTargetRaw = process.env.API_PROXY_TARGET;
const proxyTarget = proxyTargetRaw ? proxyTargetRaw.replace(/\/+$/, "") : "";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!proxyTarget) return [];

    const destination = proxyTarget.endsWith("/api")
      ? `${proxyTarget}/:path*`
      : `${proxyTarget}/api/:path*`;

    return [
      {
        source: "/api/:path*",
        destination,
      },
    ];
  },
};

export default nextConfig;
