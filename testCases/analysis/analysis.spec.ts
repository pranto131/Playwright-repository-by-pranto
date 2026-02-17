import { expect, test } from '@playwright/test'
import { AuthActions } from '../../helpers/authActions'
import { AnalysisAction } from '../../helpers/analysisAction'
import { Author, Module } from '../../fixtures/tags'
import { LOGIN_PASSWORD, LOGIN_USER } from '../../fixtures/testDatas'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5004/'

test.describe('Analysis Flow', () => {
    let auth: AuthActions
    let analysis: AnalysisAction

    test.beforeEach(async ({ page }) => {
        auth = new AuthActions(page)
        analysis = new AnalysisAction(page)

        // login before analysis
        await auth.login(LOGIN_USER, LOGIN_PASSWORD, BASE_URL)
        await auth.verifyDashboard()
    })

    test(
        'TC-01 Verify "Analyze now" button functioning properly',
        {
            tag: [
                Author.PRANTO,
                Module.ANALYSIS_FLOW,
            ],
        },
        async ({ page }) => {

            const analysis = new AnalysisAction(page)

            await test.step('Uploads transcript file and analyzes file successfully and got stored under "Uploaded Files" section.', async () => {

                await analysis.uploadTranscript('transcript-file.txt')

                await analysis.chooseProject()

                await analysis.chooseDestination()

                await analysis.clickAnalyzeNow()

                await analysis.verifyFileUnderUploadedFiles('transcript-file.txt')

            })

        })

    test(
        'TC-02 Verify "Analyze now" button is disabled when no file is uploaded',
        {
            tag: [
                Author.PRANTO,
                Module.ANALYSIS_FLOW,
            ],
        },
        async ({ page }) => {

            await test.step(
                'Verify Analyze Now button remains disabled before uploading file',
                async () => {

                    const analyzeBtn = page.getByRole('button', {
                        name: /analyze now/i
                    })

                    await expect(analyzeBtn).toBeDisabled()

                    await expect(
                        page.getByText(/complete all steps above/i)
                    ).toBeVisible()
                }
            )
        }
    )
})
