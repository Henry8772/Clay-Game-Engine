
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['backend/test/**/*.{test,spec}.ts', 'backend/test/**/*test_*.ts'],
        exclude: ['test/mock/**', '**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**'],
        globals: true,
        environment: 'node',
        testTimeout: 30000,
        globalSetup: './backend/test/global_setup.ts',
    },
});
