import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
    base: '/return-stacked/',
    plugins: [react()],
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
});
