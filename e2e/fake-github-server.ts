import express from 'express';
import {users} from './fixtures/users';
import {fakeRepo, fakeContributors} from './fixtures/repos';
import {FAKE_GITHUB_PORT, FRONTEND_URL} from './ports';

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Track which user to "log in" next
let nextUserId = 'userA';

// Map from fake access tokens to user IDs
function getUserFromToken(token: string) {
  const match = token.match(/^fake-token-(.+)$/);
  if (!match) return undefined;
  return users[match[1]];
}

// Test helper: set which user logs in next
app.get('/set-next-user/:userId', (req, res) => {
  nextUserId = req.params.userId;
  res.json({ok: true, nextUserId});
});

// OAuth authorize page: renders auto-redirect HTML
// NOTE: This is an e2e test server only — no input sanitization needed.
app.get('/login/oauth/authorize', (req, res) => {
  const {state, redirect_uri} = req.query;
  const code = `fake-code-${nextUserId}`;

  // Redirect back to the app's OAuth callback
  const callbackURL = new URL('/oauth/callback', FRONTEND_URL);
  callbackURL.searchParams.set('code', code);
  if (state) callbackURL.searchParams.set('state', state as string);

  res.send(`
    <html>
      <body>
        <p>Redirecting...</p>
        <script>window.location.href = ${JSON.stringify(callbackURL.toString())};</script>
      </body>
    </html>
  `);
});

// OAuth token exchange
app.post('/login/oauth/access_token', (req, res) => {
  const {code} = req.body;
  const match = code?.match(/^fake-code-(.+)$/);
  const userId = match ? match[1] : 'userA';
  res.json({access_token: `fake-token-${userId}`});
});

// User profile
app.get('/user', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth?.replace('token ', '');
  const user = token ? getUserFromToken(token) : undefined;

  if (!user) {
    return res.status(401).json({message: 'Bad credentials'});
  }

  res.json(user);
});

// User emails
app.get('/user/emails', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth?.replace('token ', '');
  const user = token ? getUserFromToken(token) : undefined;

  if (!user) {
    return res.status(401).json({message: 'Bad credentials'});
  }

  res.json([
    {email: user.email, primary: true, verified: true, visibility: 'public'},
  ]);
});

// Repository info
app.get('/repos/:owner/:name', (req, res) => {
  res.json(fakeRepo);
});

// Repository contributors
app.get('/repos/:owner/:name/contributors', (req, res) => {
  res.json(fakeContributors);
});

let server: ReturnType<typeof app.listen> | undefined;

export function startFakeGitHubServer(): Promise<ReturnType<typeof app.listen>> {
  return new Promise((resolve) => {
    server = app.listen(FAKE_GITHUB_PORT, () => {
      console.log(`Fake GitHub server listening on port ${FAKE_GITHUB_PORT}`);
      resolve(server!);
    });
  });
}

export function stopFakeGitHubServer() {
  if (server) {
    server.close();
    server = undefined;
  }
}

// Allow running directly
if (process.argv[1]?.endsWith('fake-github-server.ts') || process.argv[1]?.endsWith('fake-github-server.js')) {
  startFakeGitHubServer();
}

export {app};
