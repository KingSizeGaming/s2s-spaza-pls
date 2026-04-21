import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: { PORT: process.env.PORT ?? '8080' },
};

export default nextConfig;
