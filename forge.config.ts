import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';

const config: ForgeConfig = {
    packagerConfig: {
        name: 'InvoiceMerger',
        executableName: 'invoice-merger',
        asar: true,
        icon: './assets/icon',
        extraResource: ['./out'],
    },
    rebuildConfig: {},
    makers: [
        new MakerSquirrel({
            name: 'InvoiceMerger',
            setupExe: 'InvoiceMergerSetup.exe',
            setupIcon: './assets/icon.ico',
            authors: 'XP3R Inc.',
            description: 'Merge client invoices with expense backup PDFs',
        }),
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

