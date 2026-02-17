import { test } from '@playwright/test'
import { AuthActions } from '../../helpers/authActions'
import { AnalysisAction } from '../../helpers/analysisAction'
import { Author, Module } from '../../fixtures/tags'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5004/'

test.describe('Analysis Flow', () => {
    let auth: AuthActions
    let analysis: AnalysisAction

    test.beforeEach(async ({ page }) => {
        auth = new AuthActions(page)
        analysis = new AnalysisAction(page)

        // login before analysis
        await auth.login('admin', '0000', BASE_URL)
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

})
