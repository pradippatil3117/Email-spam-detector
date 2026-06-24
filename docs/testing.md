# Testing and Quality Assurance

This document details the testing methods, quality assurance parameters, and validation scripts used to audit the Aegis Console.

## Automated Audits

Aegis enforces complete type-safety and builds without warnings.

### 1. Static Type Audit
Run the linter script to check for typescript errors, unused imports, or incorrect code paths:
```bash
npm run lint
```
*Goal: Exit code `0` (Zero compiler warnings or errors).*

### 2. Compilation and Build Verification
Verify that both the React frontend and the Express bridge build successfully:
```bash
npm run build
```
*Goal: Static output generated in `dist/` and server compiled to `dist/server.cjs` without warnings.*

---

## Manual QA Verification Checklist

Use this protocol to verify the application functionality post-deployment:

### 1. Application Shell & Health Status
- Navigate to the frontend UI (`http://localhost:3000`).
- Verify the connection indicator in the sidebar footer reads **"Engine Online"** (with green indicator pulse).
- Shut down the FastAPI server and verify that:
  - The connection badge switches to **"Engine Offline"** (red indicator).
  - The **"Security Gateway Offline"** overlay renders.
  - Clicking **"Retry Connection"** after restarting the backend successfully reconnects and dismisses the overlay.

### 2. Email Scanner Page
- Go to `/scanner`.
- Leave fields blank and click **"Scan Email"**. Verify that client-side form validations block the submission and highlight invalid fields.
- Enter a valid safe email address (e.g., `partner@company.com`) and body payload. Click scan. Verify that:
  - The button is disabled during scanning.
  - The Framer Motion security scanning timeline cycles through validation phases.
  - The scan completes and displays the **SAFE** card with confidence percentage, processing latency, and keyword breakdowns.
- Enter a spam email (e.g., contains keywords like "winner", "urgent", "verify account details"). Verify that the model accurately flags the email as **SPAM** with a High/Medium risk level card.

### 3. Scan History & Audit Log
- Navigate to `/history`.
- Verify that previous email scans are saved in the local storage history.
- Test searching by typing "urgent" or "safe" into the search bar. Verify results filter instantly.
- Test sorting options: change dropdown sort orders and check if items re-order correctly.
- Test pagination: verify pagination controls appear if history contains more than 10 entries.
- Select checkboxes on row items and click **"Delete Selected"**. Verify items are deleted and layout updates.

### 4. Analytics Dashboard
- Navigate to `/analytics`.
- Verify the 5 top KPI cards accurately compute totals based on local storage history.
- Hover over the Recharts graphs (Pie chart, Bar chart, Line chart) and verify tooltips render correctly.
- Change the date filter (e.g. "Today", "7 Days", "Custom") and verify metrics recalculate instantly.
- Click **"Export CSV Report"** and verify that a file named `aegis_security_report_*.csv` is downloaded with correct data columns.

### 5. AI Model Information
- Navigate to `/model`.
- Verify model configurations match properties returned from `/api/model/config`.
- Inspect the vertical vertical workflow timeline detailing the preprocessing pipeline.
- Verify evaluation plots (Confusion Matrix, ROC Curve, Precision-Recall Curve) render correctly.
- Hover over a plot and click the **Fullscreen** (zoom) button. Verify the modal opens with a zoomed image and descriptive caption. Click **Download** and verify the image file downloads locally.
- Toggle **Developer Tools** and verify current API URL and gateway latency.

### 6. Settings Page
- Navigate to `/settings`.
- Toggle between **Light**, **Dark**, and **System** themes. Verify stylesheet classes update and theme preferences persist in local storage.
- Change the **Accent Color** (Blue, Emerald, Violet, Amber) and verify theme color updates globally.
- Toggle **Compact Mode** and **Reduced Motion** preferences. Verify spacing and animations adapt accordingly.
- Click **"Download Config Backup"** to export a `.json` backup file. Alter local settings, then import the saved configuration backup file. Verify settings restore successfully.
