# Document Batch Service

## Features

- API Express + TypeScript
- Création de batchs jusqu’à 1000 documents
- Traitement asynchrone avec BullMQ + Redis
- Worker séparé pour la génération PDF
- Stockage PDF dans MongoDB GridFS
- Statuts de batch et de document
- Healthcheck enrichi
- Logs structurés avec Pino
- Metrics Prometheus
- Swagger / OpenAPI
- Script de benchmark avec rapport JSON + Markdown

## Stack technique

- Node.js
- TypeScript
- Express
- MongoDB
- Redis
- BullMQ
- PDFKit
- GridFS
- Pino
- Prometheus (`prom-client`)
- Swagger (`swagger-jsdoc`, `swagger-ui-express`)

## Pourquoi ces choix

### BullMQ + Redis

BullMQ permet de gérer proprement les traitements asynchrones :
- retries
- backoff exponentiel
- concurrence
- séparation API / worker

Redis sert de support rapide pour la queue.

### MongoDB + GridFS

MongoDB stocke :
- les batches
- les documents
- les fichiers PDF via GridFS

GridFS est adapté au stockage des fichiers générés et correspond à la consigne du test.

### Worker séparé

Le worker consomme les jobs de génération PDF sans bloquer les requêtes HTTP.  
L’API reste donc rapide même pour les batchs volumineux.

## Architecture

```text
Client
  |
  v
Express API
  |
  |-- POST /api/documents/batch
  |      -> create batch in MongoDB
  |      -> create documents in MongoDB
  |      -> enqueue one BullMQ job per document
  |
  |-- GET /api/documents/batch/:batchId
  |      -> fetch batch + related documents
  |
  |-- GET /api/documents/:documentId
  |      -> stream PDF from GridFS
  |
  |-- GET /api/health
  |-- GET /api/metrics
  |-- GET /api-docs
  |
  v
MongoDB <--> GridFS
  ^
  |
Worker <--> BullMQ <--> Redis
  |
  -> generate PDF
  -> store file in GridFS
  -> update document status
  -> update batch progress
```

## Batch processing sequence

```text
1. Client sends POST /api/documents/batch with up to 1000 userIds
2. API creates one batch document
3. API creates one document entry per userId
4. API pushes one BullMQ job per document
5. API returns batchId immediately
6. Worker consumes jobs from Redis queue
7. Worker sets document status to processing
8. Worker generates PDF
9. Worker stores PDF into GridFS
10. Worker updates document to completed or failed
11. Worker recalculates batch progress
12. Client polls GET /api/documents/batch/:batchId
13. Client downloads PDF using GET /api/documents/:documentId
```

## Project structure

```text
document-batch-service/
├─ benchmark/
│  ├─ results/
│  └─ run-benchmark.ts
├─ src/
│  ├─ config/
│  ├─ controllers/
│  ├─ middlewares/
│  ├─ queues/
│  ├─ repositories/
│  ├─ routes/
│  ├─ services/
│  ├─ types/
│  ├─ utils/
│  ├─ workers/
│  ├─ app.ts
│  └─ server.ts
├─ docker-compose.yml
├─ package.json
├─ tsconfig.json
└─ README.md
```

## Installation & Run

### Prerequisites

- Node.js 22+
- npm
- Docker + Docker Compose

### Setup and launch

```bash
git clone https://github.com/Wasl1/document-batch-service.git
cd document-batch-service
npm install

cat > .env <<'EOF'
PORT=3001
NODE_ENV=development

MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=document_batch_service

REDIS_HOST=127.0.0.1
REDIS_PORT=6380
EOF

docker compose up -d
```

### Start the API

```bash
npm run dev
```

### Start the worker

Open another terminal at the project root and run:

```bash
npm run worker
```

### Optional: run the benchmark

Open another terminal at the project root and run:

```bash
npm run benchmark
```

## Available URLs

- API health: `http://localhost:3001/api/health`
- API metrics: `http://localhost:3001/api/metrics`
- Swagger UI: `http://localhost:3001/api-docs`
- Worker metrics: `http://localhost:3002/metrics`

## Benchmark

A benchmark script is available:

```bash
npm run benchmark
```

It:
- creates a batch of 1000 documents
- polls batch progress
- scrapes API and worker metrics
- writes JSON + Markdown reports in `benchmark/results/`


## Useful commands

```bash
docker compose up -d
npm run dev
npm run worker
npm run benchmark
```

## Test requirements covered

This project implements:
- async batch creation endpoint
- batch status endpoint
- generated PDF retrieval endpoint
- queue-based parallel processing
- retry with backoff
- MongoDB + GridFS storage
- Redis-backed queue
- health checks
- Prometheus metrics
- Swagger documentation
- benchmark script
- Docker Compose startup flow