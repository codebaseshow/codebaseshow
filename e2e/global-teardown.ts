import {execSync} from 'child_process';
import {stopMongo, stopHelperServer} from './test-helpers';
import {stopFakeGitHubServer} from './fake-github-server';
import {FRONTEND_PORT, BACKEND_PORT} from './ports';
import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(__dirname, '.e2e-state.json');

async function globalTeardown() {
  console.log('\n--- Global Teardown ---\n');

  // Read state written by global-setup
  let boostrPid: number | undefined;
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    boostrPid = state.boostrPid;
  } catch {
    console.warn('Could not read e2e state file — skipping boostr cleanup');
  } finally {
    try { fs.unlinkSync(STATE_FILE); } catch {}
  }

  // Stop in-process servers
  stopFakeGitHubServer();
  stopHelperServer();

  // Kill boostr process tree — SIGTERM first, SIGKILL only if still alive
  if (boostrPid) {
    try {
      process.kill(-boostrPid, 'SIGTERM');
    } catch {}

    // Poll until the process is gone, fall back to SIGKILL after 5s
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try {
        process.kill(boostrPid, 0); // throws if process is gone
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        break; // process exited
      }
    }

    // If still alive, force-kill
    try {
      process.kill(-boostrPid, 0);
      process.kill(-boostrPid, 'SIGKILL');
    } catch {}
  }

  // Force-kill anything still on boostr ports (frontend + backend only;
  // 15550 and 15553 are in-process servers closed above)
  for (const port of [FRONTEND_PORT, BACKEND_PORT]) {
    try {
      if (process.platform === 'linux') {
        execSync(`fuser -k ${port}/tcp 2>/dev/null`);
      } else {
        const pid = execSync(`lsof -ti tcp:${port} 2>/dev/null`, {encoding: 'utf-8'}).trim();
        if (pid) execSync(`kill -9 ${pid} 2>/dev/null`);
      }
    } catch {}
  }

  // Stop MongoDB
  await stopMongo();

  console.log('All services stopped.\n');
}

export default globalTeardown;
