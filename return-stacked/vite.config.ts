import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig(({ command }) => ({
    base: command === 'build' ? '/return-stacked/dist/' : '/',
    plugins: [
        react(),
        {
            name: 'serve-dev-html-at-root',
            configureServer(server) {
                server.middlewares.use((req, _res, next) => {
                    if (req.url === '/' || req.url === '/index.html') {
                        req.url = '/dev.html';
                    }
                    next();
                });
            },
        },
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    css: {
        postcss: {
            plugins: [tailwindcss()],
        },
    },
    build: {
        rollupOptions: {
            input: path.resolve(__dirname, 'dev.html'),
        },
    },
}));
