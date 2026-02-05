
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['backend/test/**/*.{test,spec}.ts', 'backend/test/**/*test_*.ts'],
        globals: true,
        environment: 'node',
        testTimeout: 30000,
        globalSetup: './backend/test/global_setup.ts',
    },
});
