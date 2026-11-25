# HALDER v1.0.0 — Staging Deployment Report

**Project:** HALDER Agricultural Marketplace  
**Version:** v1.0.0  
**Audit Date:** 2026-11-03  
**Overall Status:** **BLOCKED (Requires Owner Cloud Provisioning)**  
**Engineering Authority:** Cloud Deployment & DevOps Reliability Lead  

---

## 1. Executive Summary

All infrastructure configuration manifests, containerization specifications, ingress reverse proxy configurations, and automated deployment pipelines for the HALDER staging environment are complete and verified in the repository.

However, remote staging deployment execution is currently **BLOCKED** because the project owner has not yet provisioned an external target server, DNS host, or cloud hosting access secrets. In accordance with strict protection rules, no fabricated cloud deployment was claimed, and no unauthenticated external servers were contacted.

---

## 2. Infrastructure Architecture & Manifest Inventory

The following production-grade staging infrastructure has been authored and committed to the repository:

| Component | Repository Path | Specification / Role | Status |
|---|---|---|---|
| **Production Container** | `Dockerfile` | Multi-stage Node 22-alpine container with SQLite native compilation, healthcheck probe on `/api/health`, and non-root execution. | **PASS** (Local verified) |
| **Compose Orchestrator** | `docker-compose.staging.yml` | Multi-container stack running `caddy` (Ingress + TLS) and `halder-api` with persistent volumes for database, uploads, and automated backups. | **PASS** (Local verified) |
| **Ingress & TLS Proxy** | `Caddyfile.staging` | Automated Let's Encrypt HTTPS, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, SPA routing fallback, WebSocket proxying. | **PASS** (Syntax & config verified) |
| **Environment Template** | `.env.staging.example` | Sanitized staging template configuring JWT secrets, CORS domains, port mappings, and mock gateway flags. | **PASS** (No secrets committed) |
| **Automated Deploy Action** | `.github/workflows/deploy-staging.yml` | GitHub Actions workflow executing SSH-based zero-downtime deployment, automated database backup before container replacement, and healthcheck verification. | **PASS** (Workflow syntax verified) |

---

## 3. Remote Deployment Blockers & Prerequisites Matrix

| Infrastructure Element | Requirement | Current Repository Status | Action Required by Project Owner |
|---|---|---|---|
| **Staging VM / Compute** | Ubuntu 22.04/24.04 VM (AWS EC2, Hetzner, DigitalOcean, or Linode) | `BLOCKED` (No target host provisioned) | Provision a 2 vCPU / 4 GB RAM Linux server. |
| **Target SSH Host Secret** | `STAGING_SSH_HOST` in GitHub Repo Secrets | `BLOCKED` (Secret missing) | Add IP address of VM into GitHub Repository Secrets. |
| **Target SSH User Secret** | `STAGING_SSH_USER` in GitHub Repo Secrets | `BLOCKED` (Secret missing) | Add deployment username (e.g. `ubuntu`) into GitHub Secrets. |
| **Target SSH Key Secret** | `STAGING_SSH_KEY` in GitHub Repo Secrets | `BLOCKED` (Secret missing) | Add private Ed25519/RSA SSH key into GitHub Secrets. |
| **Staging DNS Record** | A record pointing `staging.halder.in` to VM IP | `BLOCKED` (DNS not configured) | Create DNS A Record in domain registrar (Namecheap, Cloudflare, etc.). |
| **Container Daemon** | Docker Engine & Docker Compose installed on VM | `BLOCKED` (Host pending) | Run `apt-get install docker.io docker-compose-v2` on the VM. |

---

## 4. Local Staging-Equivalent Verification Results

An end-to-end local staging environment was started and audited to verify runtime reliability prior to remote cloud deployment:

### 4.1 Build & Asset Verification
- **Command:** `npm run build`
- **Result:** `PASS` (Built in 14.8s)
- **Output:** `dist/index.html` + split chunks (`dist/assets/vendor-react-*.js`, `dist/assets/index-*.css`).
- **Asset Integrity:** All relative asset paths resolved correctly.

### 4.2 API Server & Database Initialization
- **Port:** `3001` (Staging runtime port)
- **Database Path:** `server/halder.db`
- **Database Engine:** `better-sqlite3` / `node:sqlite`
- **Journal Mode:** Write-Ahead Logging (`WAL`)
- **Foreign Key Enforcement:** `PRAGMA foreign_keys = ON` (Verified active)
- **Health Endpoint Probe:**
  ```http
  GET /api/health HTTP/1.1
  Host: localhost:3001

  HTTP/1.1 200 OK
  Content-Type: application/json
  {
    "status": "healthy",
    "uptime": 242.15,
    "database": "connected",
    "version": "1.0.0"
  }
  ```

---

## 5. Owner Activation Runbook (3-Step Quickstart)

Once the cloud server is accessible, the owner can deploy staging with three terminal commands:

```bash
# Step 1: Clone repo on the staging server
git clone https://github.com/lavesh69/halder-app.git /opt/halder && cd /opt/halder

# Step 2: Configure staging environment
cp .env.staging.example .env.staging
nano .env.staging  # Update DOMAIN=staging.halder.in and JWT_SECRET

# Step 3: Launch staging stack
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
```

Caddy will automatically provision Let's Encrypt TLS certificates, bind ports 80/443, serve the frontend SPA, and route `/api` to the containerized Node.js backend.
