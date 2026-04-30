import {spawn, ChildProcess, execSync} from 'child_process';
import {startMongo, seedDatabase, startHelperServer} from './test-helpers';
import {startFakeGitHubServer} from './fake-github-server';
import {FRONTEND_PORT, BACKEND_PORT, FAKE_GITHUB_PORT, HELPER_PORT, FAKE_GITHUB_URL} from './ports';
import http from 'http';
import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(__dirname, '.e2e-state.json');

let boostrProcess: ChildProcess | undefined;

function waitForPort(port: number, host = '127.0.0.1', timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Timeout waiting for ${host}:${port}`));
      }

      const req = http.get(`http://${host}:${port}/`, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        setTimeout(tryConnect, 500);
      });

      req.setTimeout(1000, () => {
        req.destroy();
        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });
}

const EXPECTED_PROCESS_PATTERNS = [/node/i, /boostr/i, /express/i, /npx/i, /tsx/i];

function isExpectedProcess(pid: string): boolean {
  try {
    const cmdline = execSync(`ps -p ${pid} -o args=`, {encoding: 'utf-8'}).trim();
    return EXPECTED_PROCESS_PATTERNS.some((p) => p.test(cmdline));
  } catch {
    return false;
  }
}

async function killPortProcesses(ports: number[]) {
  const isLinux = process.platform === 'linux';
  for (const port of ports) {
    try {
      let pid: string;
      if (isLinux) {
        pid = execSync(`fuser ${port}/tcp 2>/dev/null`, {encoding: 'utf-8'}).trim();
      } else {
        pid = execSync(`lsof -ti tcp:${port} 2>/dev/null`, {encoding: 'utf-8'}).trim();
      }

      if (!pid) continue;

      // Kill each PID only if it looks like a known e2e process
      for (const p of pid.split(/\s+/)) {
        if (isExpectedProcess(p)) {
          execSync(`kill -9 ${p} 2>/dev/null`);
          console.log(`Killed stale process ${p} on port ${port}`);
        } else {
          console.warn(`Skipping unknown process ${p} on port ${port} — not an e2e process`);
        }
      }
    } catch {
      // No process found on this port — that's fine
    }
  }
  // Give OS a moment to release the ports
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

async function globalSetup() {
  console.log('\n--- Global Setup ---\n');

  // 0. Kill any stale processes on our ports
  await killPortProcesses([FRONTEND_PORT, BACKEND_PORT, FAKE_GITHUB_PORT, HELPER_PORT]);

  // 1. Start MongoDB Memory Server
  const {uri: mongoUri} = await startMongo();

  // 2. Seed database
  await seedDatabase();

  // 3. Start fake GitHub server
  await startFakeGitHubServer();

  // 4. Start test helper server
  await startHelperServer();

  // 5. Start boostr (backend + frontend)
  const fakeGitHubBase = `${FAKE_GITHUB_URL}/`;

  // Generate a JWT secret for testing
  const jwtSecret = '0'.repeat(128); // 64 bytes in hex

  const env = {
    ...process.env,
    DATABASE_URL: mongoUri,
    GITHUB_API_BASE_URL: fakeGitHubBase,
    GITHUB_LOGIN_URL: `${fakeGitHubBase}login/oauth/access_token`,
    GITHUB_CLIENT_ID: 'fake-client-id',
    GITHUB_CLIENT_SECRET: 'fake-client-secret',
    GITHUB_PERSONAL_ACCESS_TOKEN: 'fake-personal-token',
    JWT_SECRET: jwtSecret,
  };

  boostrProcess = spawn('npx', ['boostr', 'start'], {
    cwd: `${process.cwd()}/../website`,
    env,
    stdio: 'pipe',
    detached: true,
  });

  // Suppress known noise (AWS SDK deprecation, SES errors, url.parse warnings)
  const suppressPatterns = [
    /aws.sdk/i,
    /aws sdk/i,
    /ExpiredToken/,
    /InvalidClientTokenId/,
    /TimeoutNegativeWarning/,
    /DEP0169/,
    /trace-warnings/,
    /a\.co\//,
  ];

  const shouldSuppress = (line: string) =>
    suppressPatterns.some((p) => p.test(line));

  boostrProcess.stdout?.on('data', (data: Buffer) => {
    const line = data.toString();
    if (!shouldSuppress(line)) process.stdout.write(`[boostr] ${line}`);
  });

  boostrProcess.stderr?.on('data', (data: Buffer) => {
    const line = data.toString();
    if (!shouldSuppress(line)) process.stderr.write(`[boostr:err] ${line}`);
  });

  boostrProcess.on('exit', (code) => {
    if (code !== null && code !== 0 && code !== 143 /* SIGTERM */) {
      console.error(`Boostr exited with code ${code}`);
    }
  });

  // 6. Wait for frontend and backend to be ready
  console.log(`Waiting for frontend (${FRONTEND_PORT}) and backend (${BACKEND_PORT})...`);
  await Promise.all([
    waitForPort(FRONTEND_PORT),
    waitForPort(BACKEND_PORT),
  ]);

  console.log('All services ready!\n');

  // Persist state for teardown (runs in a separate worker)
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    boostrPid: boostrProcess?.pid,
  }));
}

export default globalSetup;
