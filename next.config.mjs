/** @type {import('next').NextConfig} */
const assetPrefix = process.env.NEXT_ASSET_PREFIX ?? './';

const nextConfig = {
    output: 'export',
    distDir: 'out',
    images: {
        unoptimized: true,
    },
    // Disable server-side features for Electron static build
    trailingSlash: true,
    // Allow overriding via env for custom schemes like app://
    assetPrefix,
    // Ensure all assets use relative paths when defaulting
    basePath: '',
    experimental: {
        ppr: false,  // Disable Partial Prerendering
        typedRoutes: false,  // Disable typed routes
    },
    // Disable prefetching completely
    reactStrictMode: false,
};

export default nextConfig;

