import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testEmail = `test-${Date.now()}@vottsh.test`;
  const testPassword = 'Test@12345';
  const testName = 'E2E Test User';
  const testOrgName = 'E2E Test Organization';
  const testPropertyName = 'E2E Test Property';
  const testPropertyAddress = '123 E2E Street, Test City, TC 12345';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. Sign-up happy path', async ({ page }) => {
    await test.step('Navigate to signup page', async () => {
      const signupButton = page.getByRole('button', { name: 'Sign up' });
      await signupButton.click();
      await expect(page.getByText('Create your account')).toBeVisible();
    });

    await test.step('Fill signup form', async () => {
      await page.getByLabel('Full Name').fill(testName);
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByLabel('Organization Name').fill(testOrgName);
      await page.getByLabel('Property Name').fill(testPropertyName);
      await page.getByLabel('Address').fill(testPropertyAddress);
    });

    await test.step('Submit form and verify redirect to dashboard', async () => {
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

      await expect(page.getByText(testOrgName)).toBeVisible({ timeout: 10000 });

      const userInitials = testName.split(' ').map(n => n[0]).join('').toUpperCase();
      await expect(page.getByText(userInitials)).toBeVisible();
    });
  });

  test('2. Sign-out and sign-in', async ({ page }) => {
    await test.step('Sign in with test credentials', async () => {
      await page.getByLabel('Email').fill('Mikeoye28@gmail.com');
      await page.getByLabel('Password').fill('Test@12345');
      await page.getByRole('button', { name: 'Sign In' }).click();

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });

    await test.step('Sign out', async () => {
      const userMenu = page.locator('[aria-label="User menu"]').or(page.getByRole('button').filter({ hasText: /^[A-Z]{2}$/ }));
      await userMenu.click();

      const signOutButton = page.getByRole('button', { name: /sign out|log out/i });
      await signOutButton.click();

      await expect(page.getByText('Sign in to your account')).toBeVisible();
    });

    await test.step('Sign back in', async () => {
      await page.getByLabel('Email').fill('Mikeoye28@gmail.com');
      await page.getByLabel('Password').fill('Test@12345');
      await page.getByRole('button', { name: 'Sign In' }).click();

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });
  });

  test('3. Password reset flow', async ({ page }) => {
    await test.step('Click forgot password', async () => {
      await page.getByRole('button', { name: /forgot password/i }).click();
      await expect(page.getByText('Reset Password')).toBeVisible();
    });

    await test.step('Submit email for reset', async () => {
      await page.getByLabel('Email').fill('Mikeoye28@gmail.com');
      await page.getByRole('button', { name: /send reset link/i }).click();

      await expect(page.getByText(/password reset email sent/i)).toBeVisible();
    });

    await test.step('Navigate back to login', async () => {
      await page.getByRole('button', { name: /back to login/i }).click();
      await expect(page.getByText('Sign in to your account')).toBeVisible();
    });
  });

  test('4. Invalid login credentials', async ({ page }) => {
    await test.step('Try to login with wrong password', async () => {
      await page.getByLabel('Email').fill('Mikeoye28@gmail.com');
      await page.getByLabel('Password').fill('WrongPassword123!');
      await page.getByRole('button', { name: 'Sign In' }).click();

      await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    });
  });

  test('5. Form validation', async ({ page }) => {
    await test.step('Go to signup page', async () => {
      await page.getByRole('button', { name: 'Sign up' }).click();
    });

    await test.step('Try to submit empty form', async () => {
      await page.getByRole('button', { name: 'Create Account' }).click();

      const nameInput = page.getByLabel('Full Name');
      await expect(nameInput).toHaveAttribute('required', '');
    });

    await test.step('Test email validation', async () => {
      await page.getByLabel('Email').fill('invalid-email');
      await page.getByLabel('Full Name').click();

      const emailInput = page.getByLabel('Email');
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    await test.step('Test password minimum length', async () => {
      await page.getByLabel('Password').fill('123');
      await page.getByLabel('Full Name').click();

      const passwordInput = page.getByLabel('Password');
      const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });
  });

  test('6. Already registered email handling', async ({ page }) => {
    await test.step('Go to signup page', async () => {
      await page.getByRole('button', { name: 'Sign up' }).click();
    });

    await test.step('Try to register with existing email', async () => {
      await page.getByLabel('Full Name').fill('Test User');
      await page.getByLabel('Email').fill('Mikeoye28@gmail.com');
      await page.getByLabel('Password').fill('Test@12345');
      await page.getByLabel('Organization Name').fill('Test Org');
      await page.getByLabel('Property Name').fill('Test Property');
      await page.getByLabel('Address').fill('123 Test St');

      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page.getByText(/already registered|already exists/i)).toBeVisible();

      const loginLink = page.getByRole('button', { name: /click here to go to login/i });
      if (await loginLink.isVisible()) {
        await loginLink.click();
        await expect(page.getByText('Sign in to your account')).toBeVisible();
      }
    });
  });
});
