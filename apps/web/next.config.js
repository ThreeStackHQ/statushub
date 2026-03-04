/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@statushub/db', '@statushub/config'],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
