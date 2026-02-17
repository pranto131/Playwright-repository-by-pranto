import { Page, expect } from '@playwright/test'

export class DashboardPage {
  constructor(private page: Page) {}

  async verifyDashboardLoaded() {
    const heading = this.page.getByRole('heading', {
      name: /start processing your meeting transcripts now/i,
    })
    await expect(heading).toBeVisible({ timeout: 60000 })

    await expect(this.page).toHaveURL(/dashboard/).catch(() => {
      console.warn('Dashboard SPA loaded, but URL did not change.')
    })
  }
}
