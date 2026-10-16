import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: [
    '192.168.0.194',
    '192.168.0.194:3002',
    '192.168.1.8',
    '192.168.1.8:3002',
    'localhost:3002',
    'localhost',
  ],
};

export default nextConfig;
