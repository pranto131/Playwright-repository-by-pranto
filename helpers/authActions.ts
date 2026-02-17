import { Page, expect } from '@playwright/test'
import { LandingPage } from '../pages/LandingPage'
import { DashboardPage } from '../pages/DashboardPage'

export class AuthActions {
  private page: Page
  private landingPage: LandingPage
  private dashboardPage: DashboardPage

  constructor(page: Page) {
    this.page = page
    this.landingPage = new LandingPage(page)
    this.dashboardPage = new DashboardPage(page)
  }

  /**
 * LOGIN ACTION (SPA + CI SAFE)
 */

  async login(username: string, password: string, baseUrl: string) {
    await this.landingPage.goto(baseUrl)
    await this.landingPage.clickSignIn()

    await this.page.getByLabel(/username/i).fill(username)
    await this.page.getByLabel(/password/i).fill(password)

    const signInBtn = this.page.getByRole('button', { name: /sign in/i })

    await Promise.all([
      signInBtn.click(),
      this.page.waitForLoadState('networkidle', { timeout: 30000 }),
    ])

    // SPA-safe: wait for dashboard element to confirm successful login
    const dashboardHeading = this.page.getByRole('heading', {
      name: /start processing your meeting transcripts now/i,
    })

    // Wait for dashboard to appear (successful login)
    await dashboardHeading.waitFor({ timeout: 60000 })

    // Optional: secondary URL check after SPA UI loaded
    await expect(this.page).toHaveURL(/dashboard/, { timeout: 10000 }).catch(() => {
      console.warn('SPA login: dashboard loaded, but URL did not change.')
    })
  }

  // ==============================
  // ATTEMPT LOGIN (for negative tests)
  // ==============================
  async attemptLogin(username: string, password: string, baseUrl: string) {
    await this.landingPage.goto(baseUrl)
    await this.landingPage.clickSignIn()

    await this.page.getByLabel(/username/i).fill(username)
    await this.page.getByLabel(/password/i).fill(password)

    const signInBtn = this.page.getByRole('button', { name: /sign in/i })

    // Just click and wait for network response, don't verify success/failure
    await Promise.all([
      signInBtn.click(),
      this.page.waitForLoadState('networkidle', { timeout: 30000 }),
    ])
  }

  // ==============================
  // TC-01 → Dashboard verification
  // ==============================
  async verifyDashboard() {
    await this.dashboardPage.verifyDashboardLoaded()
  }

  // ==============================
  // TC-02 → Invalid Login
  // ==============================
  async verifyLoginFailed() {
    await expect(
      this.page.getByRole('heading', { name: 'Sign In', exact: true })
    ).toBeVisible({ timeout: 30000 })

    await expect(
      this.page.getByRole('button', { name: 'Sign In', exact: true })
    ).toBeEnabled()
  }

  // ==============================
  // TC-03 → Sign Out
  // ==============================
  async signOut() {
    const signOutBtn = this.page.getByRole('button', { name: /sign out/i })
    await signOutBtn.click()

    const modal = this.page.getByRole('dialog')
    await expect(modal).toBeVisible()

    await modal.getByRole('button', { name: 'Sign Out', exact: true }).click()

    // SPA-safe: wait for login heading instead of URL
    await expect(
      this.page.getByRole('heading', { name: 'Sign In', exact: true })
    ).toBeVisible({ timeout: 30000 })
  }
}
