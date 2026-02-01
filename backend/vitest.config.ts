
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/**/*.{test,spec}.ts', 'test/**/*test_*.ts'],
        globals: true,
        environment: 'node',
        testTimeout: 30000,
        globalSetup: './test/global_setup.ts',
    },
});
