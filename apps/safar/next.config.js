/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['maps.googleapis.com', 'lh3.googleusercontent.com'],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
