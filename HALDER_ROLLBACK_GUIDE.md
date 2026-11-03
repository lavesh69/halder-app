# HALDER v1.0 — Rollback Guide & Incident Response Runbook

**Project:** HALDER Agricultural Marketplace  
**Release Version:** v1.0  
**Audit Date:** 2026-11-03  
**Status:** **OPERATIONAL**  
**Engineering Authority:** Production Operations & Incident Command  

---

## 1. Application Layer Rollback (Web & Backend API)

When a critical defect (crash loops, memory leaks, high latency > 2000ms, or severe API regressions) affects the HALDER web application or Express API server, follow this procedure:

### 1.1 Previous Stable Tag Identification
- **Target Stable Tag:** `v0.9.8-stable` / Commit `f27e8e8` (or the last known passing release tag)
- **Deployment Artifact:** `dist.tar.gz` and git commit snapshot

### 1.2 Step-by-Step Rollback Execution
1. **Drain and Pause Inbound Traffic:**
   If running behind Nginx / Cloudflare, switch to temporary maintenance mode page:
   ```bash
   # Switch Nginx upstream or enable maintenance page
   systemctl reload nginx
   ```
2. **Revert Application Codebase:**
   ```bash
   cd /var/www/halder-app
   git fetch origin
   git checkout tags/v0.9.8-stable
   npm ci --production
   npm run build
   ```
3. **Restart API Service:**
   ```bash
   # If running Systemd
   sudo systemctl restart halder-api
   
   # Or if running PM2
   pm2 restart halder-api
   ```
4. **Post-Rollback Health Verification:**
   ```bash
   curl -f http://localhost:5000/api/v1/health
   curl -f http://localhost:5000/api/v1/ready
   ```

---

## 2. Database Rollback Procedure (SQLite WAL)

If a migration failure, data corruption event, or schema incompatibility occurs, execute this restore drill:

### 2.1 Backup Identification & Selection
List available backups in descending chronological order:
```bash
ls -lt server/backups/halder_backup_*.db | head -n 5
```
Identify the latest clean snapshot taken before the incident (e.g., `server/backups/halder_backup_2026-11-03T07-18-40-170Z.db`).

### 2.2 Restoration Drill Steps
1. **Stop Backend Daemon:**
   Prevent concurrent writes while swapping database files:
   ```bash
   sudo systemctl stop halder-api
   ```
2. **Archive Corrupted Database State:**
   Never overwrite without preserving the incident state for forensics:
   ```bash
   mv data/halder.db data/halder_corrupt_$(date +%s).db
   rm -f data/halder.db-wal data/halder.db-shm
   ```
3. **Restore Snapshot:**
   ```bash
   cp server/backups/halder_backup_2026-11-03T07-18-40-170Z.db data/halder.db
   ```
4. **Verify Restored File Permissions & Integrity:**
   ```bash
   node --import tsx server/scripts/restore_drill.ts
   ```
5. **Start API Daemon:**
   ```bash
   sudo systemctl start halder-api
   ```
6. **Data Consistency Verification:**
   Inspect order status, user balances, and active escrows to identify any transactions that took place between snapshot time and incident time.

---

## 3. Android Mobile Application Rollback Strategy

Because installed native mobile binaries cannot be forcibly reverted on end-user devices, manage Android rollbacks through Play Console and backend API compatibility controls:

### 3.1 Play Console Release Management
1. **Halt Phased Rollout:**
   If releasing via Google Play Staged Rollout, immediately navigate to **Play Console > Production > Releases** and click **Halt Rollout**.
2. **Promote Previous Stable APK/AAB:**
   If a full release was published, prepare a hotfix build incrementing `versionCode`:
   - E.g., `versionCode 2` containing the reverted stable codebase `v0.9.8-stable`.
   - Google Play strictly rejects downgrading `versionCode`; a roll-forward build with the stable code is mandatory.
3. **Emergency In-App Update Flag:**
   The backend `/api/v1/app-version` configuration can emit `min_supported_version: "1.0.0"` or toggle an emergency update modal forcing users to update to the hotfix release.

### 3.2 API & Schema Backward Compatibility
- HALDER API maintains backward compatibility for at least 2 consecutive mobile release versions.
- Never deprecate an active mobile endpoint without a 60-day deprecation window.

---

## 4. Incident Response & Escalation Protocol

### 4.1 Severity Classification Matrix

| Severity | Definition | Examples | SLA to Acknowledge | SLA to Mitigate |
|---|---|---|---|---|
| **SEV-1 (Critical)** | Entire platform down or data loss risk. | API crash loops, database corrupt, auth blocked. | < 5 minutes | < 30 minutes |
| **SEV-2 (High)** | Core workflow impaired. | B2B orders failing, crop listings unviewable. | < 15 minutes | < 2 hours |
| **SEV-3 (Medium)** | Non-critical feature degradation. | Weather widget down, push notifications delayed. | < 1 hour | < 8 hours |
| **SEV-4 (Low)** | Minor UI or cosmetic defect. | Styling inconsistency, non-blocking typo. | < 24 hours | Next Sprint |

### 4.2 Incident Commander Workflow
1. **Triage:** Acknowledge incident in on-call channel, declare severity level.
2. **Contain:** Freeze all deployments and pull requests. Execute application or database rollback if root cause is identified.
3. **Communicate:** Post status updates to internal team and user status page every 15 minutes for SEV-1.
4. **Resolve:** Verify system health endpoints and end-to-end user login/order flows.
5. **Post-Incident Review (PIR):** Publish blameless post-mortem report within 48 hours documenting root cause, timeline, contributing factors, and permanent preventive actions.
