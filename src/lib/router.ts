/**
 * Custom router wrapper for Electron to bypass Next.js RSC fetching
 * Forces hard navigation instead of soft client-side navigation
 */

export function navigateToPage(path: string) {
    // Ensure trailing slash to land on index.html for static export
    const ensureTrailingSlash = (p: string) => (p.endsWith('/') ? p : `${p}/`);
    const normalizedInput = (path ?? '').trim();
    const stripped = normalizedInput.replace(/^\/+/, '').replace(/\/+$/, '');
    const finalPath = stripped ? ensureTrailingSlash(stripped) : '';

    const isAppProtocol = window.location.protocol === 'app:';
    const isFileProtocol = window.location.protocol === 'file:';

    if (isAppProtocol) {
        // app://-/<path>/index.html
        window.location.href = finalPath ? `app://-/${finalPath}` : 'app://-/index.html';
        return;
    }

    if (isFileProtocol) {
        // Compute relative navigation depth for file:// exports (fallback)
        const currentPath = window.location.pathname;
        const baseDepth = currentPath.split('/').filter(Boolean).length;
        if (baseDepth <= 1) {
            window.location.href = finalPath || './';
        } else {
            const upLevels = '../'.repeat(baseDepth - 1);
            window.location.href = upLevels + (finalPath || '');
        }
        return;
    }

    // Dev server (http/https)
    window.location.href = finalPath ? `/${finalPath}` : '/';
}

