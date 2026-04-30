import {test, expect, Page} from '@playwright/test';
import {FAKE_GITHUB_URL, HELPER_URL} from '../ports';

async function setNextUser(userId: string) {
  const res = await fetch(`${FAKE_GITHUB_URL}/set-next-user/${userId}`);
  if (!res.ok) throw new Error(`Failed to set next user: ${res.status}`);
}

async function setAdmin(githubId: number) {
  const res = await fetch(`${HELPER_URL}/set-admin`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({githubId}),
  });
  if (!res.ok) throw new Error(`Failed to set admin: ${res.status} ${await res.text()}`);
}

async function setupOAuthIntercept(page: Page) {
  await page.route('https://github.com/login/oauth/authorize**', async (route) => {
    const url = new URL(route.request().url());
    const fakeUrl = new URL('/login/oauth/authorize', FAKE_GITHUB_URL);
    url.searchParams.forEach((value, key) => fakeUrl.searchParams.set(key, value));
    await route.fulfill({
      status: 302,
      headers: {Location: fakeUrl.toString()},
    });
  });
}

async function oauthSignIn(page: Page) {
  await setupOAuthIntercept(page);
  await page.getByRole('link', {name: 'Sign in'}).click();
  // Wait for the OAuth round-trip: /sign-in → github (intercepted) → fake server → /oauth/callback → redirect
  await page.waitForURL(
    (url) => !url.pathname.includes('/oauth/callback') && !url.pathname.includes('/sign-in'),
  );
  // Wait for all pending network requests to finish (sign-in API call)
  await page.waitForLoadState('networkidle').catch(() => {
    console.warn('networkidle timed out after sign-in — continuing');
  });
  // Wait for signed-in UI to appear (avatar replaces "Sign in" link)
  await expect(page.getByRole('img', {name: 'User menu'})).toBeVisible();
}

/**
 * Fill a ComboBox (from @emotion-kit/react).
 * The ComboBox renders as: combobox > textbox + listbox.
 * We type into the textbox, wait for the listbox option, and click it.
 */
async function fillComboBox(page: Page, placeholder: string, value: string) {
  const input = page.getByRole('textbox', {name: placeholder}).or(
    page.locator(`input[placeholder="${placeholder}"]`)
  );
  await input.click();
  await input.fill(value);

  // Try to click the matching option in the dropdown listbox
  const option = page.getByRole('option', {name: value, exact: true});
  if (await option.isVisible({timeout: 2000}).catch(() => false)) {
    await option.click();
  } else {
    // Fallback: press Enter or Tab to accept the typed value
    await input.press('Enter');
  }
}

test.describe('Submit and Review Flow', () => {
  test('User A submits an implementation, User B (admin) approves it', async ({page}) => {
    // --- Step 1: Sign in as User A ---
    await setNextUser('userA');

    await page.goto('/projects/realworld');
    await expect(page.getByRole('link', {name: 'Sign in'})).toBeVisible();

    // Click "Submit" in the header — triggers sign-in redirect since not authenticated
    await setupOAuthIntercept(page);
    await page.getByRole('link', {name: 'Submit', exact: true}).first().click();

    // Wait for OAuth round-trip to complete
    await page.waitForURL(
      (url) => !url.pathname.includes('/oauth/callback') && !url.pathname.includes('/sign-in'),
    );
    await page.waitForLoadState('domcontentloaded');

    // Navigate to submission page (now signed in)
    await page.goto('/projects/realworld/implementations/submit');
    await expect(page.getByRole('heading', {name: 'Submit an Implementation'})).toBeVisible();

    // --- Step 2: Fill the submission form ---

    // Repository URL
    await page.fill('#repositoryURL', 'https://github.com/testowner/testrepo');

    // Category: frontend (native <select>)
    await page.selectOption('#category', 'frontend');

    // Environment: web (native <select>, appears when category is frontend/fullstack)
    await expect(page.locator('#frontendEnvironment')).toBeVisible();
    await page.selectOption('#frontendEnvironment', 'web');

    // Language (ComboBox — placeholder is "JavaScript")
    await fillComboBox(page, 'JavaScript', 'JavaScript');

    // Library (ComboBox — placeholder is "React" when category is frontend)
    await fillComboBox(page, 'React', 'React');

    // Check all 5 requirement checkboxes
    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    // --- Step 3: Submit ---
    await page.getByRole('button', {name: 'Submit'}).click();

    // Wait for "Thank You" confirmation
    await expect(page.getByRole('heading', {name: 'Thank You!'})).toBeVisible();
    await expect(page.getByText('Your submission has been recorded')).toBeVisible();

    // --- Step 4: Sign out User A ---
    // Clear token from localStorage and do a full page reload
    await page.evaluate(() => window.localStorage.removeItem('token'));
    await page.goto('/projects/realworld', {waitUntil: 'load'});

    // --- Step 5: Sign in as User B ---
    await setNextUser('userB');

    await page.goto('/projects/realworld');
    await expect(page.getByRole('link', {name: 'Sign in'})).toBeVisible();

    await oauthSignIn(page);

    // Verify User B is signed in (avatar/menu visible instead of "Sign in" link)
    await expect(page.getByRole('img', {name: 'User menu'})).toBeVisible();

    // --- Step 6: Make User B an admin ---
    await setAdmin(1002);

    // Reload to pick up admin status
    await page.goto('/projects/realworld');
    await expect(page.getByText('Administration')).toBeVisible();

    // --- Step 7: Navigate to review page ---
    await page.getByText('Administration').click();
    await page.getByText('Review submissions').click();

    await expect(page.getByRole('heading', {name: 'Review Submissions'})).toBeVisible();

    // --- Step 8: The submission should be in the review list ---
    await expect(page.getByText('testowner/testrepo')).toBeVisible();

    // Click on the submission row
    await page.getByText('testowner/testrepo').click();

    // Should show review form
    await expect(page.getByRole('heading', {name: 'Review a Submission'})).toBeVisible();

    // --- Step 9: Approve ---
    await page.getByRole('button', {name: 'Approve'}).click();

    // Should return to review list
    await expect(page.getByRole('heading', {name: 'Review Submissions'})).toBeVisible();

    // Submission should be gone
    await expect(page.getByText('testowner/testrepo')).not.toBeVisible();
    await expect(page.getByText('There are no submissions to review')).toBeVisible();
  });
});
