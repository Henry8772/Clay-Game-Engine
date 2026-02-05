
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/**/*.{test,spec}.ts', 'test/**/*test_*.ts'],
        exclude: ['test/mock/**', '**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**'],
        globals: true,
        environment: 'node',
        testTimeout: 30000,
        globalSetup: './test/global_setup.ts',
    },
});
