# QA Automation Setup Guide for Nifty Meeting Analyzer

## Complete Guide for Frontend CI/CD with Playwright E2E Testing

This guide explains how **two separate GitHub repositories** work together to automatically build and test the frontend application whenever new code is pushed. If any test fails, the deployment is blocked, ensuring only tested code goes to production.

---

## Table of Contents

1. [Overview](#overview)
2. [How Both Repositories Work Together](#how-both-repositories-work-together)
3. [Repository Structure](#repository-structure)
4. [Prerequisites](#prerequisites)
5. [Local Setup — Frontend Project](#local-setup--frontend-project)
6. [Local Setup — Playwright Project](#local-setup--playwright-project)
7. [Running Tests Locally](#running-tests-locally)
8. [How the CI/CD Pipeline Works](#how-the-cicd-pipeline-works)
9. [How to Trigger the CI Pipeline](#how-to-trigger-the-ci-pipeline)
10. [GitHub Secrets Configuration](#github-secrets-configuration)
11. [Backend API Configuration](#backend-api-configuration)
12. [Adding New Tests](#adding-new-tests)
13. [Troubleshooting](#troubleshooting)

---

## Overview

### The Two Repositories

| Repository | Purpose | Branch | URL |
|---|---|---|---|
| `qa-test-nifty-it-solution` | Frontend app (React + Vite + TypeScript) | `master` | [View Repo](https://github.com/pranto131/qa-test-nifty-it-solution) |
| `Playwright-repository-by-pranto` | E2E test suite (Playwright + TypeScript) | `master` | [View Repo](https://github.com/pranto131/Playwright-repository-by-pranto) |

### What Happens When You Push Code

**Simple Version:** Push to frontend → Build → Test → ✅ or ❌

**Detailed Flow:**

```
Developer pushes code to frontend repo (master branch)
    │
    ▼
GitHub Actions automatically triggers
    │
    ▼
┌─────────────────────────────────────────┐
│  JOB 1: BUILD                          │
│  - Checkout frontend code              │
│  - Install dependencies (npm ci)       │
│  - Run TypeScript type checking        │
│  - Build production bundle (Vite)      │
└─────────────┬───────────────────────────┘
              │
              │ ✅ Build successful?
              ▼
┌─────────────────────────────────────────┐
│  JOB 2: END-TO-END TESTS               │
│  - Checkout Playwright test repo       │
│  - Checkout frontend repo into ./frontend folder
│  - Install dependencies for both      │
│  - Install Chromium browser            │
│  - Start frontend dev server (port 5004)
│  - Run all Playwright tests           │
│  - Frontend connects to PRODUCTION API │
│    (https://meet.hub.niftyai.net/api) │
└─────────────┬───────────────────────────┘
              │
              ▼
         ✅ All tests pass?
              │
              ├─ YES → Pipeline succeeds ✅
              │        Safe to deploy!
              │
              └─ NO  → Pipeline fails ❌
                       Deployment blocked
                       Developer gets notification
```

### Key Points for Beginners

1. **Two repos, one workflow**: Tests live separately from frontend code
2. **Automatic testing**: Push code → tests run automatically
3. **Real backend**: Tests use the actual production API (no mocks)
4. **Quality gate**: Failed tests = blocked deployment
5. **Cross-repo magic**: Frontend repo can access test repo using a secret token

---

## How Both Repositories Work Together

### The Architecture (Beginner-Friendly Explanation)

Think of it like this:

**Frontend Repo = The Product**
- Contains the actual React application code
- Users interact with this in their browser
- Deployed to production servers

**Playwright Repo = The Quality Inspector**
- Contains automated tests that check if the product works
- Lives separately so tests don't affect product code
- Gets "called in" by the frontend when testing is needed

### How They Communicate

When you push code to the **frontend repository**, it needs to run tests from the **Playwright repository**. But how does one GitHub repo access another? 

**Answer: GitHub Personal Access Token (PAT)**

```
┌──────────────────────────┐
│  Frontend Repo           │
│  (your code push here)   │
└────────────┬─────────────┘
             │
             │ GitHub Actions starts
             ▼
        Uses PAT secret
        (nifty_pranto_gaction)
             │
             ▼
┌────────────────────────────┐
│  "Hey Playwright Repo,     │
│   I need to borrow your    │
│   test code!"             │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  Playwright Repo           │
│  (gets checked out)        │
│  → Tests run               │
└────────────────────────────┘
```

This is called **cross-repository checkout** and is done using the `actions/checkout` GitHub Action with a personal access token.

### Directory Structure in CI

When the CI pipeline runs, here's how the folders are organized:

```
GitHub Runner (Ubuntu machine)
│
└── /home/runner/work/qa-test-nifty-it-solution/qa-test-nifty-it-solution/
    │
    ├── helpers/          ← Playwright test helpers (from test repo)
    ├── pages/            ← Playwright page objects (from test repo)
    ├── testCases/        ← Playwright test cases (from test repo)
    ├── playwright.config.ts  ← Test configuration
    ├── package.json      ← Test dependencies
    │
    └── frontend/         ← The actual frontend app (nested inside!)
        ├── src/
        ├── public/
        ├── package.json
        ├── vite.config.ts
        └── ...
```

**Why this structure?**

The `playwright.config.ts` has this setting:

```typescript
webServer: {
    command: 'npm run dev',
    cwd: './frontend',      // ← Looks for frontend in this folder!
    url: 'http://localhost:5004',
}
```

So Playwright automatically:
1. Navigates to `./frontend` folder
2. Runs `npm run dev` (starts Vite dev server)
3. Waits for `http://localhost:5004` to respond
4. Then runs all tests against it

---

## Repository Structure

### Frontend: `qa-test-nifty-it-solution`

```
qa-test-nifty-it-solution/
├── .github/
│   └── workflows/
│       └── frontend-ci.yml      ← CI/CD pipeline (build + test)
├── src/
│   ├── components/              ← React UI components
│   ├── pages/                   ← Page components (Dashboard, SignIn, etc.)
│   ├── services/
│   │   └── api.ts               ← API client (calls backend on port 5001)
│   ├── store/                   ← Redux store, API slices
│   └── main.tsx                 ← App entry point
├── package.json                 ← Dependencies & scripts
├── vite.config.ts               ← Vite dev server config (port 5004)
├── tsconfig.json                ← TypeScript config
└── tsconfig.app.json
```

### Playwright: `Playwright-repository-by-pranto`

```
Playwright-repository-by-pranto/
├── .github/
│   └── workflows/
│       └── playwright.yml       ← Standalone Playwright CI pipeline
├── fixtures/
│   ├── tags.ts                  ← Test categorization tags (@Author, @Module)
│   └── testDatas.ts             ← Test credentials (from env vars or defaults)
├── helpers/
│   ├── apiMocks.ts              ← API mock functions (intercepts backend calls)
│   ├── authActions.ts           ← Login/logout helper actions
│   └── analysisAction.ts        ← Analysis flow helper actions
├── pages/
│   ├── LandingPage.ts           ← Landing page object
│   └── DashboardPage.ts         ← Dashboard page object
├── testCases/
│   ├── auth/
│   │   └── login.spec.ts        ← Login/logout test cases
│   ├── analysis/
│   │   └── analysis.spec.ts     ← Analysis flow test cases
│   └── assets/
│       └── transcript-file.txt  ← Test data file
├── playwright.config.ts         ← Playwright configuration
├── tsconfig.json                ← TypeScript config
└── package.json                 ← Dependencies
```

---

## Prerequisites

Before you start, make sure you have these installed on your computer:

1. **Node.js** (version 20 or higher)
   - Download from: https://nodejs.org
   - Verify: `node --version` (should show v20.x.x or higher)

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Git**
   - Download from: https://git-scm.com
   - Verify: `git --version`

4. **A GitHub account** with access to both repositories

---

## Local Setup — Frontend Project

### Step 1: Clone the frontend repository

```bash
git clone https://github.com/pranto131/qa-test-nifty-it-solution.git
cd qa-test-nifty-it-solution
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Start the development server

```bash
npm run dev
```

The app will start at **http://localhost:5004**. Open this URL in your browser.

### Step 4: Build (to check for errors)

```bash
npm run build
```

This runs TypeScript type-checking first (`tsc -b`), then creates the production build with Vite. If there are any type errors, the build will fail — exactly what happens in CI.

---

## Local Setup — Playwright Project

### Step 1: Clone the Playwright repository

```bash
git clone https://github.com/pranto131/Playwright-repository-by-pranto.git
cd Playwright-repository-by-pranto
```

### Step 2: Clone the frontend inside it

The Playwright project expects the frontend to be in a folder called `frontend` inside the Playwright repo. This is because `playwright.config.ts` has:

```typescript
webServer: {
    command: 'npm run dev',
    cwd: './frontend',            // ← Looks for frontend here
    url: 'http://localhost:5004',
}
```

So clone the frontend into that folder:

```bash
git clone https://github.com/pranto131/qa-test-nifty-it-solution.git frontend
```

### Step 3: Install dependencies for both

```bash
# Install Playwright dependencies (in the root)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 4: Install Playwright browsers

```bash
npx playwright install --with-deps chromium
```

This downloads the Chromium browser that Playwright uses for testing. It may take a minute.

---

## Running Tests Locally

### Option A: Run all tests (Playwright auto-starts the frontend)

From the Playwright repo root:

```bash
npx playwright test
```

This will:
1. Automatically start the frontend dev server (`npm run dev` inside `./frontend`)
2. Wait for http://localhost:5004 to be ready
3. Run all tests
4. Shut down the server when done

### Option B: Run tests with the frontend already running

If you already have the frontend running in another terminal:

```bash
npx playwright test
```

Playwright will detect the server is already running and reuse it (thanks to `reuseExistingServer: !process.env.CI` in the config).

### Option C: Run a specific test file

```bash
npx playwright test testCases/auth/login.spec.ts
```

### Option D: Run tests in headed mode (see the browser)

```bash
npx playwright test --headed
```

### Option E: Run with Playwright UI mode (interactive)

```bash
npx playwright test --ui
```

### Viewing the Test Report

After tests finish, open the HTML report:

```bash
npx playwright show-report
```

---

## How the CI/CD Pipeline Works

### Pipeline Location

The main CI/CD pipeline is defined in the **frontend repository**:

**File:** `.github/workflows/frontend-ci.yml` (in `qa-test-nifty-it-solution` repo)

### Pipeline Trigger

**When does it run?**

```yaml
on:
  push:
    branches: [ master ]   # ← Runs on every push to master branch
```

So every time you:
- Make changes to frontend code
- Commit and push to the `master` branch

The pipeline **automatically** starts within seconds.

### The Two Jobs (Step-by-Step)

#### **Job 1: Build** ⚙️

**Purpose:** Check if the code compiles and builds correctly

**What it does:**

1. **Checkout code**
   ```bash
   # GitHub Actions downloads your frontend code
   git clone https://github.com/pranto131/qa-test-nifty-it-solution.git
   ```

2. **Setup Node.js**
   ```bash
   # Installs Node.js version 20
   ```

3. **Install dependencies**
   ```bash
   npm ci  # Clean install (faster than npm install in CI)
   ```

4. **Run TypeScript type checking + Build**
   ```bash
   npm run build
   # This runs: tsc -b && vite build
   # ↓
   # - tsc checks for TypeScript errors
   # - vite creates production build (in dist/ folder)
   ```

**If this fails:** Pipeline stops here. Tests won't run.

**Common failures:**
- TypeScript errors (missing types, type mismatches)
- Missing dependencies
- Build configuration errors

---

#### **Job 2: E2E Tests** 🧪

**Purpose:** Run automated tests to verify the app actually works

**When it runs:** Only if Job 1 (Build) succeeds

**What it does:**

1. **Checkout Playwright repository**
   ```yaml
   - uses: actions/checkout@v4
     with:
       repository: pranto131/Playwright-repository-by-pranto
       token: ${{ secrets.nifty_pranto_gaction }}  # ← Secret token!
   ```
   Downloads the test code from the separate Playwright repo.

2. **Checkout frontend into `./frontend` folder**
   ```yaml
   - uses: actions/checkout@v4
     with:
       path: frontend
       repository: pranto131/qa-test-nifty-it-solution
       token: ${{ secrets.nifty_pranto_gaction }}
   ```
   Downloads the frontend code again, places it in a nested `frontend/` folder.

3. **Setup Node.js**
   ```bash
   # Installs Node.js version 20
   ```

4. **Install Playwright dependencies**
   ```bash
   npm ci  # In the root (Playwright repo)
   ```

5. **Install frontend dependencies**
   ```bash
   cd frontend
   npm ci  # In the frontend folder
   cd ..
   ```

6. **Install Chromium browser**
   ```bash
   npx playwright install --with-deps chromium
   # Downloads Chromium + system dependencies (fonts, libraries, etc.)
   ```

7. **Run Playwright tests**
   ```bash
   npx playwright test --project=chromium
   ```
   
   **What happens during test execution:**
   
   - Playwright starts the frontend dev server automatically:
     ```bash
     cd frontend
     npm run dev  # Starts Vite on http://localhost:5004
     ```
   
   - Waits for server to be ready (max 300 seconds)
   
   - Opens Chromium browser (headless mode in CI)
   
   - Runs all 4 test cases:
     - ✅ TC-01: Successful login
     - ✅ TC-02: Failed login with invalid credentials
     - ✅ TC-03: Sign out
     - ✅ TC-04: Analysis workflow (upload → project → destination → analyze)
   
   - **Frontend connects to PRODUCTION backend API:**
     ```
     VITE_API_BASE_URL=https://meet.hub.niftyai.net/api
     ```
     (No mocking! Real API calls!)
   
   - Generates test report and artifacts

8. **Upload test artifacts** (if tests fail)
   ```yaml
   - uses: actions/upload-artifact@v4
     if: always()
     with:
       name: playwright-report
   ```
   Saves screenshots, videos, and HTML report for debugging.

---

### Environment Variables in CI

The pipeline sets these environment variables:

```yaml
env:
  BASE_URL: http://localhost:5004      # Frontend URL
  LOGIN_USER: admin                     # Test credentials
  LOGIN_PASSWORD: "0000"                # Test password
  CI: true                              # Tells Playwright it's running in CI
```

These are used in:
- `fixtures/testDatas.ts` (test credentials)
- `playwright.config.ts` (base URL, retries, workers)
- Test files (`process.env.BASE_URL`)

---

### How Frontend Connects to Backend

**In CI (and locally), the frontend uses a deployed production backend:**

**File:** `.env.production` and `.env.development` (in frontend repo)

```bash
VITE_API_BASE_URL=https://meet.hub.niftyai.net/api
```

**This means:**

1. No backend server needed in CI ✅
2. Tests make **real API calls** to production backend ✅
3. No Playwright mocking or interception ✅
4. Tests verify the actual user experience ✅

**API Endpoints Used:**

- `POST /api/auth/login` - User authentication
- `GET /api/projects` - Fetch projects list
- `GET /api/meetings` - Fetch meetings
- `GET /api/tasks` - Fetch tasks
- `POST /api/recordings/upload` - Upload transcript files
- `GET /api/settings/clickup` - ClickUp configuration
- `GET /api/knowledge-base/documents` - Knowledge base docs

**Test Credentials:**

- Username: `admin`
- Password: `0000`

These credentials are configured on the production backend and work for testing purposes.

---

### Pipeline Results

**✅ Success:**

```
✓ Job 1: Build (TypeScript + Vite) - 45s
✓ Job 2: E2E Tests (4 passed) - 2m 15s

Total: ~3 minutes
```

You'll see a **green checkmark** ✅ in GitHub next to your commit.

**❌ Failure:**

```
✓ Job 1: Build - 45s
✗ Job 2: E2E Tests (1 failed, 3 passed) - 2m 30s

Total: Failed after ~3 minutes
```

You'll see a **red X** ❌ in GitHub next to your commit.

**What happens when tests fail:**

1. GitHub sends you a notification email
2. The commit shows "failure" status
3. Deployment should be blocked (if configured)
4. You can download the test report artifact to see:
   - Screenshots of the failure
   - Video recording of what happened
   - Browser console logs
   - Network requests

---

## How to Trigger the CI Pipeline

### Method 1: Push Code Changes (Normal Way)

**Step-by-step:**

1. Make changes to frontend code locally
   ```bash
   cd qa-test-nifty-it-solution
   # Edit some files...
   ```

2. Commit your changes
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Push to master branch
   ```bash
   git push origin master
   ```

4. **CI automatically starts!** 🚀
   - Go to https://github.com/pranto131/qa-test-nifty-it-solution/actions
   - You'll see your workflow running
   - Click on it to watch live progress

**Expected time:** 3-4 minutes total

---

### Method 2: Empty Commit (Trigger Without Changes)

Sometimes you want to re-run CI without making code changes (e.g., after fixing tests in the Playwright repo).

```bash
cd qa-test-nifty-it-solution

# Create empty commit
git commit --allow-empty -m "ci: trigger pipeline"

# Push it
git push origin master
```

This pushes a commit with no changes, but GitHub Actions treats it as a real commit and runs the pipeline.

---

### Method 3: Push to Test Repo (Independent Testing)

The **Playwright repository** has its own CI pipeline:

**File:** `.github/workflows/playwright.yml` (in `Playwright-repository-by-pranto` repo)

**Trigger:**

```yaml
on:
  push:
    branches: [ master, main ]
```

**When to use:**

- You modified test code (helpers, page objects, test cases)
- You want to verify tests work independently
- You're developing new tests

**How to trigger:**

```bash
cd Playwright-repository-by-pranto

# Make test changes
git add .
git commit -m "test: update login tests"
git push origin master
```

**This pipeline:**
- Checks out Playwright repo (root)
- Checks out frontend into `./frontend`
- Runs all tests
- **Does NOT** run the frontend build job (only tests)

---

### Method 4: Manually Trigger (Advanced)

You can trigger workflows manually from GitHub UI:

1. Go to **Actions** tab in the repository
2. Select the workflow (`Frontend CI` or `Playwright Tests`)
3. Click **"Run workflow"** button
4. Select branch (usually `master`)
5. Click **"Run workflow"**

**Note:** This only works if the workflow has:
```yaml
on:
  workflow_dispatch:  # ← Enables manual trigger
```

(Currently not enabled in the config)

---

### Monitoring CI Runs

**Where to check:**

**Frontend repo:**
- https://github.com/pranto131/qa-test-nifty-it-solution/actions

**Playwright repo:**
- https://github.com/pranto131/Playwright-repository-by-pranto/actions

**What you'll see:**

```
Workflow runs
─────────────────────────────────────────────────
● ci: trigger pipeline with test fix
  ✓ Completed in 3m 12s
  master  #42  e573a55
  
● fix: use attemptLogin for negative test
  ✗ Failed in 3m 45s
  master  #41  af5b302
  
● test: increase timeouts for production backend
  ✓ Completed in 3m 8s
  master  #40  6d17da9
```

**Click on any run to see:**
- Jobs summary (build, e2e)
- Step-by-step logs
- Test results
- Artifacts (test reports, screenshots)

---

## GitHub Secrets Configuration

Both pipelines need a **GitHub Personal Access Token (PAT)** to check out the other repo. Here's how to set it up:

### Step 1: Create a Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Give it a name like `nifty-ci-token`
4. Select the **`repo`** scope (full control of private repositories)
5. Click **"Generate token"**
6. **Copy the token** (you won't see it again!)

### Step 2: Add the secret to BOTH repositories

**For the frontend repo (`qa-test-nifty-it-solution`):**

1. Go to https://github.com/pranto131/qa-test-nifty-it-solution/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `nifty_pranto_gaction`
4. Value: paste your token
5. Click **"Add secret"**

**For the Playwright repo (`Playwright-repository-by-pranto`):**

1. Go to https://github.com/pranto131/Playwright-repository-by-pranto/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `nifty_pranto_gaction`
4. Value: paste the same token
5. Click **"Add secret"**

> **Important:** The secret name must be exactly `nifty_pranto_gaction` in both repos. The workflows reference it as `${{ secrets.nifty_pranto_gaction }}`.

---

## Backend API Configuration

### Overview

The frontend application communicates with a **deployed production backend** at:

```
https://meet.hub.niftyai.net/api
```

**This backend is:**
- Already deployed and running 24/7
- Accessible from anywhere (local dev, CI, production)
- Configured with test credentials for QA purposes

### How It's Configured

**Frontend Environment Files:**

The frontend repository has three environment configuration files:

1. **`.env.example`** (Template - committed to Git)
   ```bash
   VITE_API_BASE_URL=https://meet.hub.niftyai.net/api
   ```
   Shows developers what variables are needed.

2. **`.env.production`** (Production Build - committed to Git)
   ```bash
   VITE_API_BASE_URL=https://meet.hub.niftyai.net/api
   ```
   Used when running `npm run build` or in production deployment.
   
3. **`.env.development`** (Development Mode - committed to Git)
   ```bash
   VITE_API_BASE_URL=https://meet.hub.niftyai.net/api
   ```
   Used when running `npm run dev` (local dev server and CI tests).

4. **`.env`** (Local Overrides - NOT committed)
   ```bash
   # Create this file if you need to override defaults
   VITE_API_BASE_URL=http://localhost:5001/api  # Use local backend
   ```
   This file is gitignored. Create it only if you're running a local backend.

**Why this approach?**

✅ **No backend needed for CI** - Tests run against production API  
✅ **No complex mocking** - Tests verify real API behavior  
✅ **Same environment everywhere** - Dev, CI, and production use same backend  
✅ **Faster test execution** - No mock setup overhead  
✅ **More realistic** - Tests catch real integration issues  

---

### API Endpoints Used in Tests

| Method | Endpoint | Purpose | Used In Tests |
|--------|----------|---------|---------------|
| POST | `/api/auth/login` | User authentication | All tests (in beforeEach) |
| GET | `/api/projects` | Fetch projects list | Analysis workflow |
| GET | `/api/meetings` | Fetch meetings | Dashboard verification |
| GET | `/api/tasks` | Fetch tasks | Dashboard |
| POST | `/api/recordings/upload` | Upload transcript file | Analysis workflow |
| POST | `/api/recordings/:id/analyze` | Trigger AI analysis | Analysis workflow |
| GET | `/api/logs` | Fetch activity logs | (Prepared for future tests) |
| GET | `/api/history` | Fetch history | (Prepared for future tests) |
| GET | `/api/settings/clickup` | ClickUp integration config | Analysis workflow |
| GET | `/api/settings/projects` | Project settings | (Prepared for future tests) |
| GET | `/api/knowledge-base/documents` | Knowledge base docs | (Prepared for future tests) |

---

### Test Credentials

**Username:** `admin`  
**Password:** `0000`

These credentials are configured on the production backend specifically for testing purposes.

**Where they're used:**

1. **Environment variables in CI:**
   ```yaml
   env:
     LOGIN_USER: admin
     LOGIN_PASSWORD: "0000"
   ```

2. **Test data fixtures:**
   ```typescript
   // fixtures/testDatas.ts
   export const LOGIN_USER = process.env.LOGIN_USER || 'admin'
   export const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '0000'
   ```

3. **Test cases:**
   ```typescript
   await auth.login(LOGIN_USER, LOGIN_PASSWORD, BASE_URL)
   ```

---

### Network Wait Strategy

Because we're making real API calls to a remote server, tests need to wait for network responses.

**Approach 1: Wait for network idle**

```typescript
// helpers/authActions.ts
await Promise.all([
    signInBtn.click(),
    this.page.waitForLoadState('networkidle', { timeout: 30000 })
])
```

This waits until no more than 2 network connections remain active for 500ms.

**Approach 2: Wait for specific elements**

```typescript
// Wait for dashboard heading to appear (confirms API responded)
await dashboardHeading.waitFor({ timeout: 60000 })
```

**Approach 3: Explicit timeouts for slow operations**

```typescript
// AI analysis might take longer
await analyzingBtn.toBeDisabled({ timeout: 15000 })
await result.toBeVisible({ timeout: 30000 })
```

---

### Timeouts Configuration

**In `playwright.config.ts`:**

```typescript
{
  timeout: 120000,        // 2 minutes per test (API-heavy tests)
  actionTimeout: 15000,   // 15 seconds per action (slower API responses)
  
  expect: {
    timeout: 10000        // 10 seconds for assertions
  }
}
```

These are **higher than usual** because:
- Real API calls take longer than mocked responses
- Network latency varies
- Backend processing time (especially AI analysis)

---

### Advantages of Using Real Backend

**For Development:**
- ✅ No need to maintain mock data
- ✅ Tests catch real API contract changes
- ✅ Backend errors caught immediately
- ✅ Integration issues found during development

**For CI:**
- ✅ No backend deployment needed
- ✅ Faster CI setup (no docker containers)
- ✅ More realistic test environment
- ✅ Same backend as production

**For Debugging:**
- ✅ Can check backend logs when tests fail
- ✅ Can verify data in database
- ✅ Can test with real data scenarios

---

### Disadvantages & Mitigations

**Disadvantage:** Tests depend on external service  
**Mitigation:** Backend has high uptime SLA + monitoring

**Disadvantage:** Network issues can cause flaky tests  
**Mitigation:** Increased timeouts + retry on failure (in CI)

**Disadvantage:** Test data pollution (creating real records)  
**Mitigation:** Use test credentials that get cleaned up periodically

**Disadvantage:** Slower than mocked tests  
**Mitigation:** Still fast enough (18-20 seconds total), acceptable for CI

---

## Adding New Tests
Test-case find under /qa-doc/testcases.md
### Step 1: Understand the Test Structure

**Test Organization:**

```
testCases/
├── auth/
│   └── login.spec.ts          # Login, logout, negative tests
├── analysis/
│   └── analysis.spec.ts       # Upload + analysis workflow
└── assets/
    └── transcript-file.txt    # Test file for uploads
```

Each test file follows the pattern:

```typescript
import { test, expect } from '@playwright/test'
import { AuthActions } from '../../helpers/authActions'
import { AnalysisAction } from '../../helpers/analysisAction'
import { LOGIN_USER, LOGIN_PASSWORD } from '../../fixtures/testDatas'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5004/'

test.describe('Feature Name', () => {
    let auth: AuthActions

    test.beforeEach(async ({ page }) => {
        // Setup runs before each test
        auth = new AuthActions(page)
        await auth.login(LOGIN_USER, LOGIN_PASSWORD, BASE_URL)
        await auth.verifyDashboard()
    })

    test('TC-01: Test case description', async ({ page }) => {
        // Test steps here
    })
})
```

---

### Step 2: Create a New Test File

**Example:** Create a settings page test

```bash
# In Playwright repo
mkdir -p testCases/settings
touch testCases/settings/settings.spec.ts
```

**File content:**

```typescript
import { test, expect } from '@playwright/test'
import { AuthActions } from '../../helpers/authActions'
import { LOGIN_USER, LOGIN_PASSWORD } from '../../fixtures/testDatas'
import { Module, Author } from '../../fixtures/tags'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5004/'

test.describe('Settings Page Tests', () => {
    let auth: AuthActions

    test.beforeEach(async ({ page }) => {
        auth = new AuthActions(page)
        await auth.login(LOGIN_USER, LOGIN_PASSWORD, BASE_URL)
        await auth.verifyDashboard()
    })

    test(
        'TC-01: Navigate to settings page',
        {
            tag: [Author.PRANTO, Module.SETTINGS],
        },
        async ({ page }) => {
            // Click settings link
            await page.getByRole('link', { name: /settings/i }).click()
            
            // Verify URL changed
            await expect(page).toHaveURL(/\/settings/)
            
            // Verify page heading
            const heading = page.getByRole('heading', { name: /settings/i })
            await expect(heading).toBeVisible()
        }
    )

    test(
        'TC-02: Update ClickUp configuration',
        {
            tag: [Author.PRANTO, Module.SETTINGS],
        },
        async ({ page }) => {
            // Navigate to settings
            await page.getByRole('link', { name: /settings/i }).click()
            
            // Fill API token
            await page.getByLabel(/api token/i).fill('pk_test_123456')
            
            // Select workspace
            await page.getByLabel(/workspace/i).selectOption('workspace-1')
            
            // Save configuration
            await page.getByRole('button', { name: /save/i }).click()
            
            // Verify success message
            const successMsg = page.getByText(/configuration saved/i)
            await expect(successMsg).toBeVisible({ timeout: 10000 })
        }
    )
})
```

---

### Step 3: Create Helper Methods (Optional)

If your tests have repeated actions, create a helper class in `helpers/`.

**Example:** `helpers/settingsActions.ts`

```typescript
import { Page, expect } from '@playwright/test'

export class SettingsActions {
    private page: Page

    constructor(page: Page) {
        this.page = page
    }

    async navigateToSettings() {
        await this.page.getByRole('link', { name: /settings/i }).click()
        await expect(this.page).toHaveURL(/\/settings/)
    }

    async updateClickUpToken(token: string) {
        await this.page.getByLabel(/api token/i).fill(token)
        await this.page.getByRole('button', { name: /save/i }).click()
        
        const successMsg = this.page.getByText(/saved/i)
        await expect(successMsg).toBeVisible({ timeout: 10000 })
    }
}
```

**Use it in tests:**

```typescript
import { SettingsActions } from '../../helpers/settingsActions'

test('TC-03: Update settings', async ({ page }) => {
    const settings = new SettingsActions(page)
    await settings.navigateToSettings()
    await settings.updateClickUpToken('pk_test_abcdef')
})
```

---

### Step 4: Add Page Objects (Optional)

For complex pages, create page object models in `pages/`.

**Example:** `pages/SettingsPage.ts`

```typescript
import { Page, Locator } from '@playwright/test'

export class SettingsPage {
    readonly page: Page
    readonly apiTokenInput: Locator
    readonly workspaceSelect: Locator
    readonly saveButton: Locator
    readonly successMessage: Locator

    constructor(page: Page) {
        this.page = page
        this.apiTokenInput = page.getByLabel(/api token/i)
        this.workspaceSelect = page.getByLabel(/workspace/i)
        this.saveButton = page.getByRole('button', { name: /save/i })
        this.successMessage = page.getByText(/configuration saved/i)
    }

    async goto() {
        await this.page.goto('/settings')
    }

    async updateSettings(token: string, workspace: string) {
        await this.apiTokenInput.fill(token)
        await this.workspaceSelect.selectOption(workspace)
        await this.saveButton.click()
    }
}
```

---

### Step 5: Add Test Tags

Tags help categorize and filter tests.

**Available tags:**

```typescript
// fixtures/tags.ts
export enum Module {
    AUTHENTICATION = '@Authentication',
    ANALYSIS = '@Analysis',
    SETTINGS = '@Settings',
    DASHBOARD = '@Dashboard',
}

export enum Author {
    PRANTO = '@Pranto',
}
```

**Add new tags if needed:**

```typescript
export enum Module {
    // ... existing tags
    KNOWLEDGE_BASE = '@KnowledgeBase',
    WEBHOOKS = '@Webhooks',
}
```

**Run tests by tag:**

```bash
# Run all authentication tests
npx playwright test --grep "@Authentication"

# Run all tests by a specific author
npx playwright test --grep "@Pranto"

# Run tests with multiple tags
npx playwright test --grep "@Authentication.*@Pranto"
```

---

### Step 6: Test Locally

**Before pushing to CI, always test locally:**

```bash
# Run only your new tests
npx playwright test testCases/settings/settings.spec.ts

# Run in headed mode (see browser)
npx playwright test testCases/settings/settings.spec.ts --headed

# Run with UI mode (interactive debugging)
npx playwright test testCases/settings/settings.spec.ts --ui

# Run in debug mode (step through with debugger)
npx playwright test testCases/settings/settings.spec.ts --debug
```

**Check for issues:**
- ❌ Timeouts (increase waits for slow actions)
- ❌ Flaky tests (add better waits, check for race conditions)
- ❌ Selectors not found (verify element exists, check spelling)

---

### Step 7: Commit and Push

**Commit to Playwright repo:**

```bash
cd Playwright-repository-by-pranto

git add testCases/settings/
git add helpers/settingsActions.ts  # if you created helpers
git commit -m "test: add settings page tests"
git push origin master
```

**This triggers:**
- Playwright repo's CI pipeline
- Tests run independently
- You can verify they pass

**Trigger frontend CI:**

```bash
cd qa-test-nifty-it-solution

# Empty commit to trigger CI with new tests
git commit --allow-empty -m "ci: test with new settings tests"
git push origin master
```

**This triggers:**
- Frontend repo's CI pipeline
- Includes your new tests
- Verifies everything works together

---

### Step 8: Review Test Report

If tests fail in CI:

1. Go to GitHub Actions workflow run
2. Scroll to bottom of e2e job
3. Download `playwright-report` artifact
4. Unzip and open `index.html`
5. See:
   - Screenshots of failure
   - Video recording
   - Console logs
   - Network requests

**Fix issues and repeat!**

---

### Best Practices for New Tests

✅ **Use semantic selectors**
```typescript
// Good - semantic role
await page.getByRole('button', { name: /submit/i })

// Good - label association
await page.getByLabel(/username/i)

// Avoid - brittle CSS selectors
await page.locator('.btn-primary-submit-form')
```

✅ **Add appropriate timeouts for backend calls**
```typescript
// API calls might be slow
await expect(result).toBeVisible({ timeout: 30000 })
```

✅ **Use Page Object pattern for complex pages**
```typescript
// Reusable, maintainable
const settings = new SettingsPage(page)
await settings.updateSettings('token', 'workspace')
```

✅ **Write descriptive test names**
```typescript
// Good
test('TC-01: User can update ClickUp API token in settings')

// Bad
test('test1')
```

✅ **Add assertions at key points**
```typescript
// Verify navigation happened
await expect(page).toHaveURL(/\/settings/)

// Verify element appeared
await expect(heading).toBeVisible()

// Verify API response
await expect(successMsg).toContainText(/saved successfully/)
```

✅ **Clean up test data (if applicable)**
```typescript
test.afterEach(async ({ page }) => {
    // Reset settings to default
    // Delete test records
    // etc.
})
```

❌ **Don't hardcode test data in tests**
```typescript
// Bad
await auth.login('admin', '0000', 'http://localhost:5004')

// Good - use variables
await auth.login(LOGIN_USER, LOGIN_PASSWORD, BASE_URL)
```

❌ **Don't use sleep() - use proper waits**
```typescript
// Bad
await page.waitForTimeout(5000)

// Good
await expect(element).toBeVisible()
await page.waitForLoadState('networkidle')
```

---

## Troubleshooting

### Issue 1: Tests Timeout Waiting for Login

**Symptoms:**
```
TimeoutError: locator.waitFor: Timeout 60000ms exceeded
waiting for getByRole('heading', { name: /start processing/i }) to be visible
```

**Possible Causes:**

1. **Backend API is down**
   - Check: https://meet.hub.niftyai.net/api/auth/login
   - Should return error (not 404)

2. **Wrong credentials**
   - Verify `LOGIN_USER=admin` and `LOGIN_PASSWORD=0000`
   - Check if credentials changed on backend

3. **Network issues**
   - Test locally first: `npx playwright test --headed`
   - Watch what happens in browser

**Fix:**

```bash
# Test API directly
curl -X POST https://meet.hub.niftyai.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"0000"}'

# Should return: {"token": "..."}
```

If API is down, contact backend team. If credentials changed, update in CI workflow env vars.

---

### Issue 2: "Cannot Find Module" Errors

**Symptoms:**
```
Error: Cannot find module '@playwright/test'
```

**Cause:** Dependencies not installed

**Fix:**

```bash
# In Playwright repo
cd Playwright-repository-by-pranto
npm install

# In frontend folder (if testing locally with webServer)
cd frontend
npm install
cd ..
```

---

### Issue 3: "Browser Not Found" Error

**Symptoms:**
```
Error: browserType.launch: Executable doesn't exist
```

**Cause:** Playwright browsers not installed

**Fix:**

```bash
# Install chromium only (faster)
npx playwright install --with-deps chromium

# Or install all browsers
npx playwright install --with-deps
```

**In CI:** This should happen automatically in the workflow. If it fails, check GitHub Actions logs.

---

### Issue 4: Port 5004 Already in Use

**Symptoms:**
```
Error: Port 5004 is already in use
EADDRINUSE: address already in use
```

**Cause:** Another process is using port 5004

**Fix (Windows):**

```powershell
# Find process using port 5004
netstat -ano | findstr :5004

# Kill process (replace <PID> with actual number)
taskkill /PID <PID> /F
```

**Fix (Mac/Linux):**

```bash
# Find process
lsof -i :5004

# Kill process (replace <PID> with actual number)
kill -9 <PID>
```

**Or let Playwright reuse it:**

In local development, `playwright.config.ts` has:
```typescript
reuseExistingServer: !process.env.CI
```

So if server is already running, Playwright will use it instead of starting a new one.

---

### Issue 5: CI Pipeline Fails at Checkout

**Symptoms:**
```
Error: Resource not accessible by personal access token
fatal: could not read Username for 'https://github.com'
```

**Cause:** GitHub secret `nifty_pranto_gaction` is missing, expired, or doesn't have `repo` scope

**Fix:**

1. **Create new Personal Access Token:**
   - Go to https://github.com/settings/tokens
   - Generate new token (classic)
   - Check **`repo`** scope (full control)
   - Copy token

2. **Update secret in BOTH repos:**
   
   **Frontend repo:**
   - https://github.com/pranto131/qa-test-nifty-it-solution/settings/secrets/actions
   - Update `nifty_pranto_gaction`
   
   **Playwright repo:**
   - https://github.com/pranto131/Playwright-repository-by-pranto/settings/secrets/actions
   - Update `nifty_pranto_gaction`

3. **Trigger CI again:**
   ```bash
   git commit --allow-empty -m "ci: retry with new token"
   git push
   ```

---

### Issue 6: Build Fails with TypeScript Errors

**Symptoms:**
```
src/components/Widget.tsx(45,12): error TS2339: Property 'xyz' does not exist
npm run build exited with code 2
```

**Cause:** TypeScript type errors in frontend code

**Fix:**

```bash
# Run build locally to see full errors
cd qa-test-nifty-it-solution
npm run build

# Fix TypeScript errors
# Then test again
npm run build

# Commit and push
git add .
git commit -m "fix: resolve TypeScript errors"
git push
```

**Common TypeScript issues:**

- Missing type definitions: `npm install --save-dev @types/package-name`
- Wrong property access: Check spelling, check API response shape
- Implicit any: Add explicit types to function parameters

---

### Issue 7: Tests Pass Locally But Fail in CI

**Possible Causes:**

1. **Different environment**
   - CI runs on Ubuntu, you're on Windows/Mac
   - Browser versions might differ

2. **Timing issues (race conditions)**
   - CI runners might be slower
   - Network latency differences

3. **Missing environment variables**
   - Check workflow `env` section has all needed vars

**Fix:**

```bash
# Run tests in CI mode locally
CI=true npx playwright test

# Run with single worker (like CI)
npx playwright test --workers=1

# Check specific test that fails
npx playwright test testCases/auth/login.spec.ts --repeat-each=5
```

**If still flaky, increase timeouts:**

```typescript
// In test file
test('TC-01: My test', async ({ page }) => {
    // Increase timeout for this specific assertion
    await expect(element).toBeVisible({ timeout: 30000 })
})
```

---

### Issue 8: "webServer Timeout" in CI

**Symptoms:**
```
Error: webServer did not start in 300000 ms
```

**Cause:** Frontend dev server didn't start in time (5 minutes)

**Possible reasons:**
1. `npm ci` failed in frontend folder
2. Vite port 5004 already taken
3. Frontend has errors that prevent server start

**Fix:**

Check CI logs for frontend startup:

```
> npm run dev
...
VITE v7.3.1 ready in 1128 ms
➜ Local: http://localhost:5004/
```

If you don't see this, frontend has an error. Check:
- `package.json` scripts
- `vite.config.ts`
- Frontend dependencies

---

### Issue 9: Tests Fail with "Element Not Found"

**Symptoms:**
```
Error: locator.click: Target closed
Selector: getByRole('button', { name: /submit/i })
```

**Cause:** Element selector is wrong or element disappeared

**Debug steps:**

1. **Run test in headed mode:**
   ```bash
   npx playwright test --headed --workers=1
   ```
   Watch what happens visually.

2. **Use Playwright Inspector:**
   ```bash
   npx playwright test --debug
   ```
   Step through test, inspect elements.

3. **Take screenshots at failure point:**
   ```typescript
   await page.screenshot({ path: 'debug.png', fullPage: true })
   console.log('Current URL:', page.url())
   console.log('Page title:', await page.title())
   ```

4. **Check if element is hidden/disabled:**
   ```typescript
   const button = page.getByRole('button', { name: /submit/i })
   console.log('Visible:', await button.isVisible())
   console.log('Enabled:', await button.isEnabled())
   ```

5. **Try alternative selectors:**
   ```typescript
   // Instead of role
   await page.locator('button:has-text("Submit")').click()
   
   // Instead of text
   await page.locator('[data-testid="submit-btn"]').click()
   ```

---

### Issue 10: Backend Returns 401 Unauthorized

**Symptoms:**
```
Test passes login but fails on next API call
Network tab shows 401 Unauthorized
```

**Cause:** JWT token not being stored or sent correctly

**Fix:**

Check Redux store auth slice:

```typescript
// src/store/slices/authSlice.ts
// Should store token after login

// Check if token is in Authorization header
// src/services/api.ts
headers: {
    Authorization: `Bearer ${token}`
}
```

**Debug in test:**

```typescript
// After login, check if token exists
const token = await page.evaluate(() => {
    return localStorage.getItem('token')
})
console.log('Stored token:', token)
```

---

### Issue 11: Playwright Report Not Generated

**Symptoms:**
- Tests finish but no HTML report
- `npx playwright show-report` shows nothing

**Cause:** Reporter not configured or report folder deleted

**Fix:**

Check `playwright.config.ts`:

```typescript
{
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list']
    ]
}
```

**Force regenerate:**

```bash
# Run tests again
npx playwright test

# Open report
npx playwright show-report

# Or open manually
# Windows
start playwright-report/index.html

# Mac
open playwright-report/index.html

# Linux
xdg-open playwright-report/index.html
```

---

### Issue 12: Git Push Triggers CI But Tests Don't Run

**Symptoms:**
- Push succeeds
- GitHub Actions shows workflow ran
- But "e2e" job is skipped

**Cause:** `build` job failed, so `e2e` job didn't run (it depends on build)

**Fix:**

1. Check "build" job logs in GitHub Actions
2. Look for errors (usually TypeScript)
3. Fix errors locally
4. Push again

**Workflow dependency:**

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps: [...]
  
  e2e:
    needs: build   # ← Won't run if build fails
    runs-on: ubuntu-latest
    steps: [...]
```

---

### Useful Debugging Commands

```bash
# List all tests
npx playwright test --list

# Run single test file
npx playwright test testCases/auth/login.spec.ts

# Run single test case
npx playwright test testCases/auth/login.spec.ts:29

# Run in UI mode (best for debugging)
npx playwright test --ui

# Run in debug mode (step through)
npx playwright test --debug

# Run in headed mode
npx playwright test --headed

# Run with specific browser
npx playwright test --project=chromium

# Run with retries (test stability)
npx playwright test --retries=3

# Run with specific timeout
npx playwright test --timeout=60000

# Generate trace for debugging
npx playwright test --trace=on

# Show trace
npx playwright show-trace trace.zip
```

---

### Getting Help

**Check these resources:**

1. **Playwright Documentation**
   - https://playwright.dev/docs/intro
   - Comprehensive guides and API reference

2. **GitHub Actions Logs**
   - https://github.com/pranto131/qa-test-nifty-it-solution/actions
   - Full CI execution logs

3. **Test Reports**
   - Download `playwright-report` artifact from failed CI runs
   - Contains screenshots, videos, traces

4. **Console Logs**
   - Add `console.log()` in tests for debugging
   - Shows in terminal and CI logs

5. **Browser DevTools**
   - Run `npx playwright test --headed`
   - Open DevTools (F12) to inspect network, console, elements

**Common debugging workflow:**

1. Test fails in CI
2. Download playwright-report artifact
3. Open trace viewer
4. See exactly what happened
5. Reproduce locally with `--headed` or `--debug`
6. Fix issue
7. Push and verify in CI

---

## Quick Reference

### Common Commands

| Task | Command | Directory |
|------|---------|-----------|
| **Frontend Development** |
| Start dev server | `npm run dev` | `qa-test-nifty-it-solution/` |
| Build frontend | `npm run build` | `qa-test-nifty-it-solution/` |
| Type check | `tsc -b` | `qa-test-nifty-it-solution/` |
| Install dependencies | `npm ci` | `qa-test-nifty-it-solution/` |
| **Playwright Testing** |
| Run all tests | `npx playwright test` | `Playwright-repository-by-pranto/` |
| Run specific test | `npx playwright test testCases/auth/login.spec.ts` | `Playwright-repository-by-pranto/` |
| Run in headed mode | `npx playwright test --headed` | `Playwright-repository-by-pranto/` |
| Run with UI mode | `npx playwright test --ui` | `Playwright-repository-by-pranto/` |
| Debug test | `npx playwright test --debug` | `Playwright-repository-by-pranto/` |
| Open test report | `npx playwright show-report` | `Playwright-repository-by-pranto/` |
| Install browsers | `npx playwright install --with-deps chromium` | `Playwright-repository-by-pranto/` |
| List all tests | `npx playwright test --list` | `Playwright-repository-by-pranto/` |
| Run by tag | `npx playwright test --grep "@Authentication"` | `Playwright-repository-by-pranto/` |
| Run with retries | `npx playwright test --retries=3` | `Playwright-repository-by-pranto/` |
| **CI/CD** |
| Trigger frontend CI | `git commit --allow-empty -m "ci: trigger" && git push` | `qa-test-nifty-it-solution/` |
| Trigger test CI | `git commit --allow-empty -m "ci: trigger" && git push` | `Playwright-repository-by-pranto/` |
| View CI runs | Visit GitHub → Actions tab | Browser |

---

### Environment Variables Reference

| Variable | Default | Used In | Purpose |
|----------|---------|---------|---------|
| `BASE_URL` | `http://localhost:5004` | Tests, CI | Frontend app URL |
| `LOGIN_USER` | `admin` | Tests, CI | Test username |
| `LOGIN_PASSWORD` | `0000` | Tests, CI | Test password |
| `CI` | `false` (local) / `true` (CI) | Playwright config | Enables CI mode (no server reuse, retries) |
| `VITE_API_BASE_URL` | `https://meet.hub.niftyai.net/api` | Frontend app | Backend API endpoint |

---

### File Locations

| What | Where |
|------|-------|
| Frontend CI workflow | `qa-test-nifty-it-solution/.github/workflows/frontend-ci.yml` |
| Playwright CI workflow | `Playwright-repository-by-pranto/.github/workflows/playwright.yml` |
| Playwright config | `Playwright-repository-by-pranto/playwright.config.ts` |
| Test cases | `Playwright-repository-by-pranto/testCases/` |
| Test helpers | `Playwright-repository-by-pranto/helpers/` |
| Page objects | `Playwright-repository-by-pranto/pages/` |
| Frontend API config | `qa-test-nifty-it-solution/.env.production` |
| Frontend dev config | `qa-test-nifty-it-solution/.env.development` |
| Vite config | `qa-test-nifty-it-solution/vite.config.ts` |

---

### GitHub Links

| Resource | URL |
|----------|-----|
| Frontend Repo | https://github.com/pranto131/qa-test-nifty-it-solution |
| Playwright Repo | https://github.com/pranto131/Playwright-repository-by-pranto |
| Frontend CI Runs | https://github.com/pranto131/qa-test-nifty-it-solution/actions |
| Playwright CI Runs | https://github.com/pranto131/Playwright-repository-by-pranto/actions |
| Create GitHub PAT | https://github.com/settings/tokens |

---

### Test Execution Matrix

| Mode | Command | Browser | Speed | When to Use |
|------|---------|---------|-------|-------------|
| Normal | `npx playwright test` | Headless | Fast | Local development check |
| Headed | `npx playwright test --headed` | Visible | Medium | Debug visually |
| Debug | `npx playwright test --debug` | Visible + Paused | Slow | Step through issues |
| UI | `npx playwright test --ui` | Visible + Interactive | Medium | Explore tests interactively |
| CI | (automatic) | Headless | Fast | Automated on push |

---

### Typical Workflow

**For Frontend Development:**

```bash
# 1. Clone and setup
git clone https://github.com/pranto131/qa-test-nifty-it-solution.git
cd qa-test-nifty-it-solution
npm install

# 2. Develop
npm run dev

# 3. Test build
npm run build

# 4. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin master

# 5. Watch CI run
# Visit: https://github.com/pranto131/qa-test-nifty-it-solution/actions
```

**For Test Development:**

```bash
# 1. Clone and setup
git clone https://github.com/pranto131/Playwright-repository-by-pranto.git
cd Playwright-repository-by-pranto
git clone https://github.com/pranto131/qa-test-nifty-it-solution.git frontend
npm install
cd frontend && npm install && cd ..
npx playwright install --with-deps chromium

# 2. Develop tests
# Create/edit files in testCases/

# 3. Test locally
npx playwright test --headed

# 4. Commit and push
git add .
git commit -m "test: add new test cases"
git push origin master

# 5. Trigger frontend CI with new tests
cd ../qa-test-nifty-it-solution
git commit --allow-empty -m "ci: test with new test cases"
git push origin master
```

---

### API Endpoints (Production Backend)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Login (returns JWT token) |
| GET | `/api/projects` | List projects |
| GET | `/api/meetings` | List meetings |
| GET | `/api/tasks` | List tasks |
| POST | `/api/recordings/upload` | Upload transcript file |
| POST | `/api/recordings/:id/analyze` | Trigger AI analysis |
| GET | `/api/logs` | Activity logs |
| GET | `/api/history` | History records |
| GET | `/api/settings/clickup` | ClickUp configuration |
| GET | `/api/knowledge-base/documents` | Knowledge base |

**Base URL:** `https://meet.hub.niftyai.net/api`

---

### Playwright Selectors Cheat Sheet

```typescript
// By role (preferred - semantic)
page.getByRole('button', { name: /submit/i })
page.getByRole('link', { name: /dashboard/i })
page.getByRole('heading', { name: /welcome/i })

// By label (forms)
page.getByLabel(/username/i)
page.getByLabel(/password/i)

// By placeholder
page.getByPlaceholder(/search.../i)

// By text
page.getByText(/error message/i)

// By test ID (most stable)
page.getByTestId('submit-button')

// CSS selectors (avoid if possible)
page.locator('.btn-primary')
page.locator('#submit-form')

// XPath (avoid if possible)
page.locator('//button[text()="Submit"]')
```

---

### Debugging Checklist

When a test fails:

- [ ] Run locally: `npx playwright test --headed`
- [ ] Check if backend is accessible: `curl https://meet.hub.niftyai.net/api`
- [ ] Verify credentials: `admin` / `0000`
- [ ] Check CI logs in GitHub Actions
- [ ] Download and view playwright-report artifact from CI
- [ ] Look at screenshots/videos in report
- [ ] Check browser console logs
- [ ] Verify network requests (API calls)
- [ ] Try with increased timeout
- [ ] Run in debug mode: `npx playwright test --debug`
- [ ] Check if element selector changed in frontend

---

### CI Pipeline Health Indicators

**✅ Healthy Pipeline:**
- Build job completes in < 1 minute
- E2E job completes in 2-3 minutes
- All 4 tests pass
- Total time: 3-4 minutes
- No flaky tests (retries)

**⚠️ Warning Signs:**
- Build taking > 2 minutes (dependency issues?)
- E2E taking > 5 minutes (slow network?)
- Tests passing after retries (flaky tests)
- Frequent 401 errors (auth issues)

**❌ Critical Issues:**
- Build fails with TypeScript errors → Fix code
- All tests timeout → Backend down
- Checkout fails → Token expired
- Browser install fails → CI runner issue

---

### Contact & Support

**For questions about:**

- **Frontend code:** Check `qa-test-nifty-it-solution` repo issues
- **Test code:** Check `Playwright-repository-by-pranto` repo issues
- **Backend API:** Contact backend team
- **CI/CD issues:** Check GitHub Actions status page
- **Playwright help:** https://playwright.dev/docs/intro

**Maintainers:**
- Frontend: `pranto131`
- Tests: `pranto131`

**Last Updated:** February 16, 2026
