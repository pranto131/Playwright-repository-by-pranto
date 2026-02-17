import { test } from '@playwright/test'
import { AuthActions } from '../../helpers/authActions'
import { Author, Module } from '../../fixtures/tags'
import { LOGIN_USER, LOGIN_PASSWORD } from '../../fixtures/testDatas'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5004/'

test.describe('Authenticate user Login Logout flow', () => {
let auth: AuthActions

test.beforeEach(async ({ page }) => {
    auth = new AuthActions(page)
})
test(
    'TC-01: Verify after successful login user is redirected to Dashboard',
    {
        tag: [
            Author.PRANTO,
            Module.AUTHENTICATION,
        ],
    },
    async ({ page }) => {

    await auth.login(LOGIN_USER, LOGIN_PASSWORD, BASE_URL)
    await auth.verifyDashboard()
}
)

test(
    'TC-02: Verify login fails with invalid credentials',
    {
        tag: [
            Author.PRANTO,
            Module.AUTHENTICATION,
        ],
    },
    async ({ page }) => {

    await auth.attemptLogin('invalidUser', 'wrongPassword', BASE_URL)
    await auth.verifyLoginFailed()
}
)

test(
    'TC-03: Verify sign out',
    {
        tag: [
            Author.PRANTO,
            Module.AUTHENTICATION,
        ],
    },
    async ({ page }) => {

    await auth.login(LOGIN_USER, LOGIN_PASSWORD, BASE_URL)

    await auth.signOut()
}
)
})
