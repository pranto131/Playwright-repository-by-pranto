import { Page } from '@playwright/test'

export class LandingPage {
  constructor(private page: Page) {}

  async goto(baseUrl: string) {
    await this.page.goto(baseUrl)
  }

  async clickSignIn() {
  await this.page.getByRole('link', { name: 'Sign In', exact: true }).click()
}
}
