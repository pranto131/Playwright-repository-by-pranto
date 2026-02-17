import { Page, expect } from '@playwright/test'
import path from 'path'

export class AnalysisAction {
    constructor(private page: Page) { }


    /**
     * upload transcript file.
     */
    async uploadTranscript(fileName: string) {
        const filePath = path.resolve(
            __dirname,
            `../testCases/assets/${fileName}`
        )

        await this.page
            .getByText('Upload Transcript File', { exact: true })
            .click()

        const modal = this.page.getByRole('dialog', {
            name: /upload transcript file/i
        })

        await expect(modal).toBeVisible()

        const fileInput = modal.locator('input[type="file"]')
        await fileInput.setInputFiles(filePath)

        // ✅ strict-mode safe assertion
        await expect(
            this.page.getByText(fileName).first()
        ).toBeVisible()
    }



    /**
     * choose project.
     */

    async chooseProject() {
        await this.page.getByText('Choose Project', { exact: true }).click()

        // Modal confirm button
        const confirmBtn = this.page.getByRole('button', {
            name: /confirm selection/i
        })

        await expect(confirmBtn).toBeVisible()
        await confirmBtn.click()
    }

    /**
     * choose destination.
     */

    async chooseDestination() {
        await this.page.getByText('Choose Destination', { exact: true }).click()

        // Select Space dropdown
        await this.page.getByLabel(/space/i).click()

        // Select first available option
        await this.page.locator('[role="option"]').first().click()

        // Select Folder (Optional)
        const folderDropdown = this.page.getByRole('combobox', {
            name: /folder \(optional\)/i
        })

        await folderDropdown.click()

        // select 2nd option
        await this.page.getByRole('option').nth(1).click()


        // Select List dropdown
        await this.page.getByLabel(/list/i).click()
        await this.page.locator('[role="option"]').first().click()

        // Confirm selection
        await this.page
            .getByRole('button', { name: /confirm selection/i })
            .click()
    }

    /**
     * Click "Analyze Now" button.
     */
    async clickAnalyzeNow() {
        const analyzeBtn = this.page.getByRole('button', {
            name: /analyze now/i
        })

        await expect(analyzeBtn).toBeEnabled()
        await analyzeBtn.click()

        await expect(
            this.page.getByRole('button', { name: /analyzing/i })
        ).toBeDisabled({ timeout: 15000 })
    }

    async verifyFileUnderUploadedFiles(fileName: string) {

        const uploadedFilesSection = this.page
            .getByRole('heading', { name: /uploaded files/i })
            .locator('xpath=ancestor::div[contains(@class,"shadow-sm")]')

        await expect(uploadedFilesSection).toBeVisible()

        await expect(
            uploadedFilesSection.getByText(fileName, { exact: false }).first()
        ).toBeVisible({ timeout: 30000 })
    }
}
