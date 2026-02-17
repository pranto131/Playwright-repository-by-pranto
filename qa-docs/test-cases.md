📄 Test Cases — Nifty AI Frontend
Module: Authentication
TC-01

Title: Verify user is redirected to Dashboard after successful login

Objective:
Ensure that a valid user can log in successfully and is redirected to the dashboard page.

Preconditions:

Application is running

Valid user credentials exist

Test Steps:

Navigate to application login page.

Enter valid username.

Enter valid password.

Click Sign In button.

Expected Result:

User login succeeds.

User is redirected to Dashboard page.

Dashboard heading is visible.

URL contains /dashboard.

TC-02

Title: Verify login fails with invalid credentials

Objective:
Ensure the system prevents login when invalid credentials are provided.

Preconditions:

Application login page is accessible.

Test Steps:

Navigate to login page.

Enter invalid username and/or password.

Click Sign In.

Expected Result:

Login is not successful.

User remains on login page.

Error message is displayed.

Dashboard is not accessible.

TC-03

Title: Verify user can sign out successfully

Objective:
Ensure authenticated users can log out from the application.

Preconditions:

User is logged in.

Test Steps:

Click Sign Out button from navigation.

Observe system behavior.

Expected Result:

User session is terminated.

User is redirected to login page.

Protected pages are no longer accessible.

Module: Analysis Flow
TC-01

Title: Verify "Analyze Now" button functioning properly

Objective:
Ensure a user can upload a transcript file and successfully start analysis.

Preconditions:

User is logged in.

Dashboard page is loaded.

Test Steps:

Click Upload Transcript File.

Upload a valid transcript file.

Choose Project.

Choose Destination.

Click Analyze Now button.

Expected Result:

File uploads successfully.

Analyze button becomes enabled.

Analysis starts.

File appears under Uploaded Files section.

TC-02

Title: Verify "Analyze Now" button is disabled when no file is uploaded

Objective:
Ensure analysis cannot start unless required steps are completed.

Preconditions:

User is logged in.

Dashboard page is loaded.

Test Steps:

Navigate to Analysis dashboard.

Do not upload any file.

Observe Analyze Now button state.

Expected Result:

Analyze Now button remains disabled.

Helper text "Complete all steps above" is visible.

User cannot initiate analysis.

| Test Case ID | Automated | Automation Location         |
| ------------ | --------- | --------------------------- |
| TC-01   | ✅ Yes     | `auth/login.spec.ts`        |
| TC-02   | ✅ Yes     | `auth/login.spec.ts`        |
| TC-03   | ✅ Yes     | `auth/login.spec.ts`        |
| TC-01    | ✅ Yes     | `analysis/analysis.spec.ts` |
| TC-02    | ✅ Yes     | `analysis/analysis.spec.ts` |
