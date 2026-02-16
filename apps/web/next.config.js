/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@statushub/db', '@statushub/config'],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
