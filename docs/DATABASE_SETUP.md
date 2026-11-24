# Cartiva Mini — MongoDB Configuration & Setup Guide

**Document Version:** 1.0.0  
**Phase:** Phase 4: MongoDB Database Architecture & Data Management  
**Date:** November 2026  
**Status:** Approved & Implemented  
**Classification:** Database Architecture Deliverable

---

## 1. Overview

Cartiva Mini connects to MongoDB using Mongoose 8.x. The platform is designed to run seamlessly across:

- **Local Development:** Standalone or local Replica Set MongoDB 6.0+ instance.
- **Continuous Integration / Testing:** Automated test databases with dynamic connection isolation.
- **Production / Staging:** MongoDB Atlas multi-node replica set cluster.

All database connection parameters are fully decoupled from application code and managed through validated environment variables.

---

## 2. Environment Variables Configuration

In `.env` (or environment configuration vault), configure the following variables:

```bash
# ==============================================================================
# DATABASE CONFIGURATION (MONGODB)
# ==============================================================================
# Connection URI (Local or Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/cartiva-mini

# Database Name (Optional if defined in URI)
MONGODB_DB_NAME=cartiva-mini

# Connection Pooling Configuration
MONGODB_MIN_POOL_SIZE=5
MONGODB_MAX_POOL_SIZE=50

# Connection Timeout (Milliseconds)
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
```

> **Security Rule:** Never commit real database credentials or production connection strings to Git. The `.env` file is excluded via `.gitignore`.

---

## 3. Local MongoDB Setup

### Option A: Local MongoDB Community Edition (Windows / macOS / Linux)

1. Download and install **MongoDB Community Server** (v6.0 or v7.0) from the official MongoDB Download Center.
2. Ensure the MongoDB service is running:
   - **Windows:** Check Services (`services.msc`) for `MongoDB Server (MongoDB)`.
   - **macOS (Homebrew):** `brew services start mongodb/brew/mongodb-community`
   - **Linux (systemd):** `sudo systemctl start mongod`
3. Verify connection locally using `mongosh`:
   ```bash
   mongosh "mongodb://127.0.0.1:27017"
   ```
4. Set `MONGODB_URI=mongodb://127.0.0.1:27017/cartiva-mini` in your `.env` file.

### Option B: Local MongoDB with Replica Set (Enables Multi-Document ACID Transactions)

Multi-document transactions require a replica set even in local development:

```bash
# 1. Start mongod with a replica set name
mongod --dbpath C:\data\db --replSet rs0 --port 27017

# 2. In another terminal, initialize the replica set via mongosh
mongosh --port 27017 --eval "rs.initiate()"

# 3. Use replica set connection string
MONGODB_URI=mongodb://127.0.0.1:27017/cartiva-mini?replicaSet=rs0
```

### Option C: Docker Container

```bash
docker run -d \
  --name cartiva-mongo \
  -p 27017:27017 \
  -v cartiva_mongo_data:/data/db \
  mongo:7.0
```

---

## 4. MongoDB Atlas Cloud Setup (Production & Staging)

For cloud production environments, use **MongoDB Atlas**:

### Step 1: Create a Cluster

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create a new project named `Cartiva-Mini`.
3. Deploy a database cluster (e.g., M10+ for production, M0 Free Tier for staging). Select an AWS, Google Cloud, or Azure region closest to your primary user base (e.g., `eu-west-1` or `af-south-1`).

### Step 2: Configure Database User Access

1. Navigate to **Security** &rarr; **Database Access**.
2. Click **Add New Database User**.
3. Authentication Method: **Password**.
4. Set a strong password (minimum 24 characters).
5. Database User Privileges: Select **Read and write to any database** (or assign custom role for `cartiva-mini` database).

### Step 3: Configure Network Access

1. Navigate to **Security** &rarr; **Network Access**.
2. Click **Add IP Address**.
3. For development/testing: Add your current IP address.
4. For production: Add your production application server IPs or configure VPC Peering / AWS PrivateLink.

### Step 4: Obtain Connection String

1. Under **Database Deployments**, click **Connect**.
2. Select **Drivers** &rarr; Driver: **Node.js** &rarr; Version: **6.7 or later**.
3. Copy the SRV connection URI:
   ```
   mongodb+srv://cartiva_admin:<password>@cluster0.abcde.mongodb.net/cartiva-mini?retryWrites=true&w=majority&appName=CartivaMini
   ```
4. Replace `<password>` with your database user password and set this value as `MONGODB_URI` in your production deployment environment.

---

## 5. Connection Architecture & Resilience

The connection module in `backend/src/config/database.ts` provides enterprise-grade resilience:

- **Connection Pooling:** Maintains 5 warm connections (`minPoolSize: 5`) and scales up to 50 concurrent connections (`maxPoolSize: 50`) under load.
- **Fail-Fast Server Selection:** `serverSelectionTimeoutMS: 5000` prevents HTTP threads from hanging indefinitely when MongoDB is unreachable.
- **Credential Masking in Logs:** The internal logger automatically parses URIs and masks authentication credentials (`mongodb://****:****@...`) before emitting logs to stdout.
- **Connection Event Monitoring:** Tracks `connected`, `error`, `disconnected`, and `reconnected` events globally.
- **Graceful Shutdown:** Intercepts `SIGINT` and `SIGTERM` signals in `server.ts` to cleanly close open Mongoose pool connections before terminating the Node.js process.

---

## 6. Verification and Health Probing

Cartiva Mini provides real-time database readiness probes via HTTP:

- **Liveness Probe (`GET /health/live`):** Verifies the Node.js process is active and responsive.
- **Readiness Probe (`GET /health/ready`):** Directly queries `getDatabaseStatus()`. Returns:
  - `HTTP 200 OK` when `status: 'connected'` and `ready: true`.
  - `HTTP 503 Service Unavailable` when MongoDB is disconnected or connecting.
