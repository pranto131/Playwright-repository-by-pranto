/**
 * API Mock Helper for Playwright E2E Tests
 *
 * Intercepts frontend API calls (http://localhost:5001/api/*)
 * so tests can run without a live backend server.
 */
import { Page } from '@playwright/test'

const API_BASE = '**/api'

// ─── Mock Data ──────────────────────────────────────────

const VALID_USER = {
  username: process.env.LOGIN_USER || 'admin',
  password: process.env.LOGIN_PASSWORD || '0000',
}

const MOCK_TOKEN = 'mock-jwt-token-for-ci-testing'

// ─── Auth Mocks ─────────────────────────────────────────

/**
 * Mocks the POST /api/auth/login endpoint.
 * - Returns a JWT token for valid credentials.
 * - Returns 401 for invalid credentials.
 */
export async function mockAuthApi(page: Page) {
  await page.route(`${API_BASE}/auth/login`, async (route) => {
    const request = route.request()

    if (request.method() !== 'POST') {
      return route.fallback()
    }

    let body: { username?: string; password?: string } = {}
    try {
      body = request.postDataJSON()
    } catch {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid request body' }),
      })
    }

    if (
      body.username === VALID_USER.username &&
      body.password === VALID_USER.password
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: MOCK_TOKEN }),
      })
    }

    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Invalid username or password' }),
    })
  })
}

// ─── Dashboard / Settings Mocks ─────────────────────────

/**
 * Mocks common GET endpoints that the dashboard loads on init,
 * preventing network errors in tests that navigate past login.
 */
export async function mockDashboardApis(page: Page) {
  // Projects
  await page.route(`${API_BASE}/projects`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
    return route.fallback()
  })

  // Meetings
  await page.route(`${API_BASE}/meetings`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
    return route.fallback()
  })

  // Tasks
  await page.route(`${API_BASE}/tasks`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
    return route.fallback()
  })

  // Logs
  await page.route(`${API_BASE}/logs`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
    return route.fallback()
  })

  // History
  await page.route(`${API_BASE}/history`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
    return route.fallback()
  })

  // Settings - ClickUp config
  await page.route(`${API_BASE}/settings/clickup`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          api_token: '',
          workspace_id: '',
          list_id: '',
        }),
      })
    }
    return route.fallback()
  })

  // Settings - Projects
  await page.route(`${API_BASE}/settings/projects`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
    return route.fallback()
  })

  // Recordings
  await page.route(`${API_BASE}/recordings`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
    return route.fallback()
  })

  // Knowledge Base documents
  await page.route(`${API_BASE}/knowledge-base/documents`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
    return route.fallback()
  })
}

// ─── Convenience: mock everything ────────────────────────

/**
 * Sets up all API mocks needed for a full login → dashboard flow.
 * Call this in beforeEach before navigating.
 */
export async function mockAllApis(page: Page) {
  await mockAuthApi(page)
  await mockDashboardApis(page)
}
