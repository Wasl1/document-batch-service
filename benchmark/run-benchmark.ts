import fs from "node:fs/promises";
import path from "node:path";

type BatchStatus = "pending" | "processing" | "completed" | "failed";

interface BatchDocument {
  id: string;
  status: BatchStatus;
  userId: string;
  retryCount: number;
  fileId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface BatchResponse {
  success: boolean;
  data: {
    batch: {
      id: string;
      status: BatchStatus;
      userIds: string[];
      totalDocuments: number;
      processedCount: number;
      successCount: number;
      failedCount: number;
      createdAt: string;
      updatedAt: string;
      startedAt: string | null;
      completedAt: string | null;
    };
    documents: BatchDocument[];
  };
}

interface CreateBatchResponse {
  success: boolean;
  message: string;
  data: {
    batchId: string;
  };
}

interface MetricSnapshot {
  timestamp: string;
  api: ParsedMetrics;
  worker: ParsedMetrics;
}

interface ParsedMetrics {
  processCpuSecondsTotal?: number;
  processResidentMemoryBytes?: number;
  processHeapBytes?: number;
  documentsGeneratedTotal?: number;
  documentsFailedTotal?: number;
  queueSize?: number;
}

interface BenchmarkSummary {
  batchId: string;
  totalDocuments: number;
  batchStatus: BatchStatus;
  successCount: number;
  failedCount: number;
  totalDurationSeconds: number;
  documentsPerSecond: number;
  apiCpuDeltaSeconds: number | null;
  workerCpuDeltaSeconds: number | null;
  apiMemoryPeakBytes: number | null;
  workerMemoryPeakBytes: number | null;
  apiHeapPeakBytes: number | null;
  workerHeapPeakBytes: number | null;
  queuePeak: number | null;
  workerGeneratedDelta: number | null;
  workerFailedDelta: number | null;
  startedAt: string;
  finishedAt: string;
}

const API_BASE_URL = process.env.BENCHMARK_API_URL ?? "http://localhost:3001";
const API_METRICS_URL =
  process.env.BENCHMARK_API_METRICS_URL ?? `${API_BASE_URL}/api/metrics`;
const WORKER_METRICS_URL =
  process.env.BENCHMARK_WORKER_METRICS_URL ?? "http://localhost:3002/metrics";
const DOCUMENT_COUNT = Number(process.env.BENCHMARK_DOCUMENT_COUNT ?? "1000");
const POLL_INTERVAL_MS = Number(process.env.BENCHMARK_POLL_INTERVAL_MS ?? "1000");
const RESULTS_DIR = path.resolve("benchmark/results");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUserIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `benchmark-user-${index + 1}`);
}

async function createBatch(userIds: string[]): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/documents/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ userIds })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create batch: ${response.status} ${body}`);
  }

  const data = (await response.json()) as CreateBatchResponse;

  if (!data.success || !data.data?.batchId) {
    throw new Error("Batch creation response is invalid");
  }

  return data.data.batchId;
}

async function fetchBatch(batchId: string): Promise<BatchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/documents/batch/${batchId}`);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch batch: ${response.status} ${body}`);
  }

  return (await response.json()) as BatchResponse;
}

async function fetchMetrics(url: string): Promise<ParsedMetrics> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics from ${url}: ${response.status}`);
  }

  const text = await response.text();
  return parsePrometheusMetrics(text);
}

function parsePrometheusMetrics(text: string): ParsedMetrics {
  const lines = text.split("\n");
  const result: ParsedMetrics = {};

  for (const line of lines) {
    if (!line || line.startsWith("#")) {
      continue;
    }

    const [rawName, rawValue] = line.trim().split(/\s+/);

    if (!rawName || !rawValue) {
      continue;
    }

    const metricName = rawName.split("{")[0];
    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      continue;
    }

    switch (metricName) {
      case "process_cpu_seconds_total":
        result.processCpuSecondsTotal = value;
        break;
      case "process_resident_memory_bytes":
        result.processResidentMemoryBytes = value;
        break;
      case "process_heap_bytes":
        result.processHeapBytes = value;
        break;
      case "documents_generated_total":
        result.documentsGeneratedTotal = value;
        break;
      case "documents_failed_total":
        result.documentsFailedTotal = value;
        break;
      case "queue_size":
        result.queueSize = value;
        break;
      default:
        break;
    }
  }

  return result;
}

function getDelta(start?: number, end?: number): number | null {
  if (start === undefined || end === undefined) {
    return null;
  }
  return end - start;
}

function getPeak(values: Array<number | undefined>): number | null {
  const filtered = values.filter((value): value is number => value !== undefined);
  if (filtered.length === 0) {
    return null;
  }
  return Math.max(...filtered);
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) {
    return "n/a";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) {
    return "n/a";
  }
  return `${seconds.toFixed(3)} s`;
}

function formatRate(rate: number): string {
  return `${rate.toFixed(2)} docs/s`;
}

async function ensureResultsDir(): Promise<void> {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
}

function buildMarkdownReport(
  summary: BenchmarkSummary,
  samples: MetricSnapshot[]
): string {
  const queueSeries = samples
    .map((sample) => sample.api.queueSize ?? 0)
    .join(", ");

  const workerGeneratedSeries = samples
    .map((sample) => sample.worker.documentsGeneratedTotal ?? 0)
    .join(", ");

  return `# Benchmark Report

## Overview

- Batch ID: \`${summary.batchId}\`
- Total documents: ${summary.totalDocuments}
- Final batch status: ${summary.batchStatus}
- Success count: ${summary.successCount}
- Failed count: ${summary.failedCount}
- Started at: ${summary.startedAt}
- Finished at: ${summary.finishedAt}

## Performance Summary

- Total duration: ${formatSeconds(summary.totalDurationSeconds)}
- Throughput: ${formatRate(summary.documentsPerSecond)}
- API CPU delta: ${formatSeconds(summary.apiCpuDeltaSeconds)}
- Worker CPU delta: ${formatSeconds(summary.workerCpuDeltaSeconds)}
- API resident memory peak: ${formatBytes(summary.apiMemoryPeakBytes)}
- Worker resident memory peak: ${formatBytes(summary.workerMemoryPeakBytes)}
- API heap peak: ${formatBytes(summary.apiHeapPeakBytes)}
- Worker heap peak: ${formatBytes(summary.workerHeapPeakBytes)}
- Queue peak: ${summary.queuePeak ?? "n/a"}
- Worker generated delta: ${summary.workerGeneratedDelta ?? "n/a"}
- Worker failed delta: ${summary.workerFailedDelta ?? "n/a"}

## Time Series

### Queue size samples
${queueSeries}

### Worker generated counter samples
${workerGeneratedSeries}

## Notes

- API metrics are scraped from \`${API_METRICS_URL}\`.
- Worker metrics are scraped from \`${WORKER_METRICS_URL}\`.
- This report is generated from periodic polling and Prometheus metric snapshots.
`;
}

async function main(): Promise<void> {
  await ensureResultsDir();

  const userIds = buildUserIds(DOCUMENT_COUNT);
  const benchmarkStartedAt = new Date();
  const metricsSamples: MetricSnapshot[] = [];

  console.log(`Creating batch with ${DOCUMENT_COUNT} documents...`);
  const batchId = await createBatch(userIds);
  console.log(`Batch created: ${batchId}`);

  const startApiMetrics = await fetchMetrics(API_METRICS_URL);
  const startWorkerMetrics = await fetchMetrics(WORKER_METRICS_URL);

  let finalBatch: BatchResponse | null = null;

  while (true) {
    const [batch, apiMetrics, workerMetrics] = await Promise.all([
      fetchBatch(batchId),
      fetchMetrics(API_METRICS_URL),
      fetchMetrics(WORKER_METRICS_URL)
    ]);

    metricsSamples.push({
      timestamp: new Date().toISOString(),
      api: apiMetrics,
      worker: workerMetrics
    });

    const batchState = batch.data.batch;
    console.log(
      `status=${batchState.status} processed=${batchState.processedCount}/${batchState.totalDocuments} success=${batchState.successCount} failed=${batchState.failedCount}`
    );

    if (batchState.status === "completed" || batchState.status === "failed") {
      finalBatch = batch;
      break;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  const benchmarkFinishedAt = new Date();
  const endApiMetrics = await fetchMetrics(API_METRICS_URL);
  const endWorkerMetrics = await fetchMetrics(WORKER_METRICS_URL);

  if (!finalBatch) {
    throw new Error("Benchmark ended without final batch state");
  }

  const totalDurationSeconds =
    (benchmarkFinishedAt.getTime() - benchmarkStartedAt.getTime()) / 1000;

  const summary: BenchmarkSummary = {
    batchId,
    totalDocuments: finalBatch.data.batch.totalDocuments,
    batchStatus: finalBatch.data.batch.status,
    successCount: finalBatch.data.batch.successCount,
    failedCount: finalBatch.data.batch.failedCount,
    totalDurationSeconds,
    documentsPerSecond:
      totalDurationSeconds > 0
        ? finalBatch.data.batch.successCount / totalDurationSeconds
        : 0,
    apiCpuDeltaSeconds: getDelta(
      startApiMetrics.processCpuSecondsTotal,
      endApiMetrics.processCpuSecondsTotal
    ),
    workerCpuDeltaSeconds: getDelta(
      startWorkerMetrics.processCpuSecondsTotal,
      endWorkerMetrics.processCpuSecondsTotal
    ),
    apiMemoryPeakBytes: getPeak([
      startApiMetrics.processResidentMemoryBytes,
      ...metricsSamples.map((sample) => sample.api.processResidentMemoryBytes),
      endApiMetrics.processResidentMemoryBytes
    ]),
    workerMemoryPeakBytes: getPeak([
      startWorkerMetrics.processResidentMemoryBytes,
      ...metricsSamples.map((sample) => sample.worker.processResidentMemoryBytes),
      endWorkerMetrics.processResidentMemoryBytes
    ]),
    apiHeapPeakBytes: getPeak([
      startApiMetrics.processHeapBytes,
      ...metricsSamples.map((sample) => sample.api.processHeapBytes),
      endApiMetrics.processHeapBytes
    ]),
    workerHeapPeakBytes: getPeak([
      startWorkerMetrics.processHeapBytes,
      ...metricsSamples.map((sample) => sample.worker.processHeapBytes),
      endWorkerMetrics.processHeapBytes
    ]),
    queuePeak: getPeak([
      startApiMetrics.queueSize,
      ...metricsSamples.map((sample) => sample.api.queueSize),
      endApiMetrics.queueSize
    ]),
    workerGeneratedDelta: getDelta(
      startWorkerMetrics.documentsGeneratedTotal,
      endWorkerMetrics.documentsGeneratedTotal
    ),
    workerFailedDelta: getDelta(
      startWorkerMetrics.documentsFailedTotal,
      endWorkerMetrics.documentsFailedTotal
    ),
    startedAt: benchmarkStartedAt.toISOString(),
    finishedAt: benchmarkFinishedAt.toISOString()
  };

  const timestamp = benchmarkStartedAt.toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(RESULTS_DIR, `benchmark-${timestamp}.json`);
  const mdPath = path.join(RESULTS_DIR, `benchmark-${timestamp}.md`);

  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        summary,
        finalBatch,
        metricsSamples
      },
      null,
      2
    ),
    "utf-8"
  );

  await fs.writeFile(mdPath, buildMarkdownReport(summary, metricsSamples), "utf-8");

  console.log("\nBenchmark completed.");
  console.log(`JSON report: ${jsonPath}`);
  console.log(`Markdown report: ${mdPath}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});