import { spawn } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';

// ANSI colors for better logging
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
};

function log(service, message, color = colors.reset) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${colors.reset}[${timestamp}] ${color}[${service}]${colors.reset}`;
    console.log(`${prefix} ${message}`);
}

/**
 * Checks if a port is in use.
 */
function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true); // Port is in use
            } else {
                resolve(false); // Some other error, assume safely usable or let next fail
            }
        });

        server.once('listening', () => {
            server.close();
            resolve(false); // Port is free
        });

        server.listen(port); // Listen on all interfaces (IPv6/IPv4)
    });
}

/**
 * Finds the next available port starting from startPort.
 */
async function findAvailablePort(startPort) {
    let port = startPort;
    while (await isPortInUse(port)) {
        port++;
    }
    return port;
}

/**
 * Parsed .env.local file to find CONVEX_URL if needed
 */
function getConvexUrlFromEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/CONVEX_URL=(.+)/);
            if (match) return match[1].trim();
        }
    } catch (e) {
        // ignore
    }
    return null;
}

async function start() {
    log('System', 'Starting initialization...', colors.blue);

    // 1. Start Convex
    // We don't control the port Convex chooses easily via flags, but it usually defaults to 3210.
    // We will run it and let it update .env.local, or parse its output.
    log('System', 'Spawning Convex Dev...', colors.blue);
    const convexProcess = spawn('npx', ['convex', 'dev'], {
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, FORCE_COLOR: 'true' }, // Keep colors
    });

    let convexUrl = null;
    let nextStarted = false;

    convexProcess.stdout.on('data', (data) => {
        const str = data.toString();
        process.stdout.write(str); // Pipe to console

        // Try to detect URL from output if possible, though Convex output varies.
        // Usually "Convex functions running at ..."
    });

    convexProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    // Wait a bit for Convex to initialize and update .env.local
    // This is a simple heuristic. A better way would be to poll .env.local or the port.
    log('System', 'Waiting for Convex to initialize...', colors.yellow);

    // We'll give Convex 3 seconds to potentially start or update env config
    await new Promise(r => setTimeout(r, 3000));

    // Try to read the URL from .env.local
    convexUrl = getConvexUrlFromEnv();

    if (!convexUrl) {
        log('System', 'Could not detect CONVEX_URL from .env.local yet. Proceeding with defaults or previous values.', colors.yellow);
    } else {
        log('System', `Detected Convex URL: ${convexUrl}`, colors.green);
    }

    // 2. Find port for Next.js
    const nextPort = await findAvailablePort(3000);
    log('System', `Found available port for Next.js: ${nextPort}`, colors.green);

    // 3. Start Next.js
    log('System', 'Starting Next.js...', colors.blue);

    const envForNext = {
        ...process.env,
        PORT: nextPort.toString(),
        FORCE_COLOR: 'true'
    };

    // Ensure NEXT_PUBLIC_CONVEX_URL is set if we found it effectively. 
    // Note: Next.js reads .env.local automatically, so if Convex updated it, we might not need to force it.
    // But passing it explicitly is safer if we want to override.
    if (convexUrl) {
        envForNext.NEXT_PUBLIC_CONVEX_URL = convexUrl;
    }

    const nextProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true,
        env: envForNext,
    });

    nextProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    nextProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    // Handle child process exits
    const handleChildExit = (childName, code) => {
        if (code !== 0 && code !== null) {
            log('System', `${childName} exited with code ${code}. Shutting down...`, colors.red);
            cleanup();
        }
    };

    convexProcess.on('exit', (code) => handleChildExit('Convex', code));
    nextProcess.on('exit', (code) => handleChildExit('Next.js', code));

    // Handle cleanup
    const cleanup = () => {
        log('System', 'Shutting down processes...', colors.red);
        // Use tree-kill semantic if possible, but for now try generic kill.
        // Since we used shell:true, we might need to be more aggressive, but process.kill should work for simple SIGTERM prop.
        if (convexProcess.pid) try { process.kill(convexProcess.pid); } catch (e) { }
        if (nextProcess.pid) try { process.kill(nextProcess.pid); } catch (e) { }
        process.exit(1);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    // process.on('exit') is redundant if we call process.exit() in cleanup, and might cause loops if not careful. 
    // Better to just rely on the signals and explicit calls.
}

start();
