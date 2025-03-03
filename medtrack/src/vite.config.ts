import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    root: './',
    publicDir: 'public',
    base: './',
    build: {
        // Clean the out dir before building
        emptyOutDir: true
    },
    server: {
        port: 9000,
        open: true
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    }
});
