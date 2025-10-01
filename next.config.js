/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NODE_ENV === 'production' ? "" : "",
  images: {
    unoptimized: false,
    domains: [
      'drive.google.com',
      'res.cloudinary.com', // 👈 add here for backwards-compat
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // 👈 add Cloudinary here too
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
