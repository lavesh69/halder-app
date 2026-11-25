# HALDER — PRODUCTION INCIDENT & ROLLBACK GUIDE

**Document ID:** HLD-OPS-IRG-2026-11-03  
**Audience:** Site Reliability Engineers (SRE), DevOps Engineers, Backend Engineers, and On-Call Technical Leads  
**Application:** HALDER Agricultural Marketplace Ecosystem  
**Target Environment:** Staging & Production

---

## 1. INCIDENT SEVERITY & ESCALATION MATRIX

| Severity | Definition | Target Response (MTTD) | Target Resolution (MTTR) | Escalation Chain | Communication Channel |
|:---:|:---|:---:|:---:|:---|:---|
| **P0 (Critical)** | Core outage: Order placement down, database corrupted/locked, authentication failure affecting >10% users, or security breach. | < 5 minutes | < 30 minutes | On-Call Lead -> Engineering VP -> CTO | Emergency Slack `#ops-war-room` + PagerDuty Call |
| **P1 (Major)** | Major degradation: Real-time chat down, APMC Mandi sync delayed, payment webhook queue backlog > 100, or Android crash rate > 2%. | < 15 minutes | < 2 hours | Module Lead -> DevOps Lead | Slack `#ops-incidents` |
| **P2 (Medium)** | Minor feature degradation: Weather advisory using safe fallback, non-critical push notifications delayed, or slow dashboard queries (>2s). | < 1 hour | < 8 hours | Backend / Frontend Engineer | Slack `#dev-alerts` |
| **P3 (Minor)** | Low-impact bug: Visual glitch in drawer, localized string typo, or non-blocking export formatting bug. | Next business day | Next sprint | Development Team | GitHub Issues |

---

## 2. COMMON PRODUCTION INCIDENTS & IMMEDIATE DIAGNOSTICS

### Incident A: SQLite Database Lock Contention (`SQLITE_BUSY` or slow writes)
- **Symptoms:** API requests taking > 5,000ms, HTTP 500 errors containing `database is locked` or `busy timeout`.
- **Diagnostic Procedure:**
  1. Inspect running queries and locks:
     ```bash
     lsof server/halder.db
     ```
  2. Check if a backup script or long transaction is holding an exclusive lock:
     ```bash
     ps aux | grep tsx
     ```
  3. Query SQLite pragmas:
     ```sql
     PRAGMA journal_mode;       -- Must return 'wal'
     PRAGMA busy_timeout;       -- Must return 5000 (5 seconds)
     PRAGMA wal_checkpoint(PASSIVE);
     ```
- **Remediation:**
  1. If WAL is not enabled, enable immediately:
     ```sql
     PRAGMA journal_mode=WAL;
     ```
  2. Flush WAL checkpoint:
     ```bash
     npm run server:backup
     ```

---

### Incident B: Rapid Rate-Limit Exhaustion (Legitimate Users Receiving HTTP 429)
- **Symptoms:** High volume of user complaints regarding `Too many requests from this IP, please try again later.`
- **Diagnostic Procedure:**
  1. Check reverse proxy configuration (NGINX / Cloudflare / ALB):
     - Ensure the reverse proxy is sending the real client IP in `X-Forwarded-For`.
     - Check Express app configuration for `app.set('trust proxy', true)`.
  2. Inspect traffic logs to identify whether a single client IP or a subnet is generating excessive traffic:
     ```bash
     grep "HTTP 429" server/logs/app.log | awk '{print $NF}' | sort | uniq -c | sort -nr | head -20
     ```
- **Remediation:**
  - If a distributed scraping attack is occurring, block the offending ASN or user agent in Cloudflare / NGINX WAF.
  - If rate limit limits are too restrictive for peak harvest seasons, temporarily adjust `max` limit in `server/src/middleware/rateLimiter.ts` and deploy.

---

### Incident C: Real-Time WebSocket Disconnect Storm
- **Symptoms:** Farmers and customers see "Reconnecting to Live Market Chat...", high reconnect load on `/ws`.
- **Diagnostic Procedure:**
  1. Check WebSocket server process health:
     ```bash
     curl -I http://localhost:5000/health
     ```
  2. Verify active file descriptors and TCP socket count:
     ```bash
     netstat -an | grep 5000 | grep ESTABLISHED | wc -l
     ```
  3. Inspect server log for unhandled socket exceptions or heartbeat timeouts:
     ```bash
     grep "ChatSocket" server/logs/app.log
     ```
- **Remediation:**
  - Restart the backend worker with graceful socket draining:
     ```bash
     pm2 reload halder-backend
     ```

---

### Incident D: Weather or APMC Mandi External API Outage
- **Symptoms:** Weather forecast widget shows baseline alerts; Mandi price sync fails.
- **Diagnostic Procedure:**
  1. Run diagnostic query:
     ```bash
     curl -s "http://localhost:5000/api/v1/weather/forecast?lat=30.3165&lng=78.0322" | jq .
     ```
  2. Verify that the response includes:
     ```json
     {
       "source": "safe_fallback",
       "disclaimer": "Agricultural advisory baseline data provided by Krishi Vigyan Kendra (KVK)..."
     }
     ```
- **Remediation:**
  - HALDER includes built-in graceful degradation. If external APIs fail, the app automatically switches to verified regional baseline agro-data. No manual code change is required.

---

## 3. ROLLBACK PROCEDURES

### 3.1 Backend Rollback Procedure (Node.js / Express)

When a new backend deployment introduces critical regressions:

1. **Notify Incident Channel:** Post to `#ops-war-room`: `[INCIDENT] Initiating backend rollback from v1.0.1 to v1.0.0.`
2. **Revert Git Release Tag:**
   ```bash
   cd /var/www/halder-app
   git fetch --tags origin
   git checkout tags/v1.0.0
   ```
3. **Rebuild Native Dependencies (if changed):**
   ```bash
   npm ci --production
   ```
4. **Reload Process Manager Gracefully:**
   ```bash
   pm2 restart halder-backend --update-env
   ```
5. **Verify Health & APIs:**
   ```bash
   curl -f http://localhost:5000/api/v1/health || exit 1
   npm run server:gates
   ```
6. **Confirm Traffic Restoration:** Monitor error rates for 15 minutes before closing the incident.

---

### 3.2 Frontend Rollback Procedure (Vercel / Cloudflare Pages / Static NGINX)

If using static hosting (e.g., NGINX / Cloudflare):
1. **Re-point to previous dist symlink or backup:**
   ```bash
   cd /var/www/halder-app
   rm -f current-dist
   ln -s dist_v1.0.0 current-dist
   sudo systemctl reload nginx
   ```
2. **Purge Edge CDN Cache:**
   ```bash
   # Cloudflare CLI or API:
   curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
     -H "Authorization: Bearer ${CF_TOKEN}" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":true}'
   ```
3. **Verify in Clean Browser Session:** Verify that new clients receive the previous bundle version without cache poisoning.

---

### 3.3 Android Release Rollback Procedure (Google Play & Sideload)

Google Play Store does not permit downgrading version codes directly. Follow this standard Google Play rollback workflow:

1. **Halt Staged Rollout Immediately:**
   - Navigate to Google Play Console -> **Release Overview** -> **Production Track**.
   - Click **Halt Rollout** to prevent remaining users from updating to the problematic build.
2. **Build Rollback Binary with Incremented Version Code:**
   - If version code 10 had regressions, check out previous known-good tag `v1.0.0`.
   - Bump version code to `11` in `android/app/build.gradle`:
     ```groovy
     defaultConfig {
         versionCode 11
         versionName "1.0.0-hotfix"
     }
     ```
3. **Rebuild Signed AAB:**
   ```bash
   npm run build
   npx cap sync android
   cd android
   ./gradlew bundleRelease
   ```
4. **Deploy Hotfix AAB to Play Console:** Upload `app-release.aab` with release notes explaining the emergency stability update and request accelerated review.

---

## 4. DATABASE RESTORE & DISASTER RECOVERY PROCEDURE

HALDER uses high-performance SQLite in WAL mode with automated snapshots. To restore from a verified snapshot:

### Step 1: Quarantine the Current Database
```bash
cd "C:\Users\lavesh dobriyal\.gemini\antigravity\scratch\halder-app"
# Stop backend to prevent concurrent writes
pm2 stop halder-backend

# Archive current DB state for forensic analysis
timestamp=$(date +%Y%m%d_%H%M%S)
mv server/halder.db server/backups/halder_quarantine_${timestamp}.db
mv server/halder.db-wal server/backups/halder_quarantine_${timestamp}.db-wal 2>/dev/null || true
mv server/halder.db-shm server/backups/halder_quarantine_${timestamp}.db-shm 2>/dev/null || true
```

### Step 2: Select and Restore the Latest Verified Snapshot
```bash
# Locate latest valid backup snapshot in server/backups/
latest_backup=$(ls -t server/backups/halder_backup_*.db | head -1)
echo "Restoring from snapshot: $latest_backup"

# Copy snapshot to primary database path
cp "$latest_backup" server/halder.db
```

### Step 3: Verify Integrity of Restored Database
Run the automated verification script:
```bash
npx tsx -e "
import { Database } from './server/src/db/database';
const integrity = Database.get('PRAGMA integrity_check');
console.log('Integrity Result:', integrity);
const users = Database.get('SELECT COUNT(*) as c FROM users');
const orders = Database.get('SELECT COUNT(*) as c FROM orders');
console.log('Record Counts -> Users:', users.c, '| Orders:', orders.c);
if (integrity.integrity_check !== 'ok') {
  console.error('Database corruption detected!');
  process.exit(1);
}
"
```

### Step 4: Resume Backend Services & Verify Endpoints
```bash
# Restart backend
pm2 start halder-backend

# Execute automated launch gate validation
npm run server:gates
```

---

## 5. POST-INCIDENT REVIEW (PIR) REQUIREMENT

Within 24 hours of resolving any P0 or P1 incident, the on-call engineer must author a Post-Incident Review document covering:
1. Root cause analysis using the "5 Whys" methodology.
2. Timeline of events (detection time, triage time, mitigation time).
3. Impact assessment (number of users affected, transactions impacted).
4. Permanent preventative actions (PRs to be merged, monitoring alerts to be added).

*Approved by HALDER Technical Operations on November 3, 2026.*
