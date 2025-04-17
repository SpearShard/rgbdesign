/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: "export",
    basePath: process.env.NODE_ENV == 'production' ? "": "",
    images: {
        unoptimized: false,
        domains: ['drive.google.com'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'drive.google.com',
                pathname: '/**',
            },
        ]
    }
}

module.exports = nextConfig
