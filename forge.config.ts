import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { MakerWix } from '@electron-forge/maker-wix';

const config: ForgeConfig = {
    packagerConfig: {
        name: 'Kalcon - Invoice Merger',
        executableName: 'kalcon_pdf-merger',
        asar: true,
        icon: './assets/icon',
        extraResource: ['./out'],
    },
    rebuildConfig: {},
    makers: [
        new MakerWix({
            language: 1033,
            manufacturer: 'XP3R Inc.',
            description: 'Merge client invoices with expense backup PDFs',
            shortcutFolderName: 'XP3R',
            programFilesFolderName: 'Kalcon - Invoice Merger',
            icon: './assets/icon.ico',
        }),
    ],
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: 'XP3R-Inc',
                    name: 'kalcon_pdf-merger',
                },
                draft: false,
                prerelease: false,
            },
        },
    ],
    plugins: [
        new VitePlugin({
            // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
            build: [
                {
                    entry: 'electron/main.ts',
                    config: 'vite.main.config.ts',
                },
                {
                    entry: 'electron/preload.ts',
                    config: 'vite.preload.config.ts',
                },
            ],
            // Renderer is built separately by Next.js, not by Vite
            renderer: [],
        }),
    ],
};

export default config;

