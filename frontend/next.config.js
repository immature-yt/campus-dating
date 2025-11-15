/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Enable static export for Capacitor
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudinary.com' }
    ]
  },
  // PWA support
};

module.exports = nextConfig;


