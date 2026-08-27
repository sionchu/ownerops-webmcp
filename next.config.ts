import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Origin-Agent-Cluster", value: "?1" }],
      },
    ];
  },
};

export default nextConfig;
