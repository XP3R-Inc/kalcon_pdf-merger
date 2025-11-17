import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                format: 'cjs', // Use CommonJS for Electron main process
            },
        },
    },
    resolve: {
        conditions: ['node'],
        mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
});

