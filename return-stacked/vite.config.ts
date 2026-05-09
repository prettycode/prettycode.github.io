import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
    base: '/return-stacked/dist/',
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
    server: {
        port: 1984,
    },
    build: {
        rollupOptions: {
            input: path.resolve(__dirname, 'dev.html'),
        },
    },
});
