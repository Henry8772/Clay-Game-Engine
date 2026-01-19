
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/**/*.{test,spec}.ts', 'test/**/test_*.ts'],
        globals: true,
        environment: 'node',
        testTimeout: 30000, // Increase timeout for real API calls if needed
    },
});
