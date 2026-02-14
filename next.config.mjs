/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/waffle',
  assetPrefix: '/waffle/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
