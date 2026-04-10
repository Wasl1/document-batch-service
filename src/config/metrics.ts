import client from "prom-client";

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({
  register: metricsRegistry
});

export const documentsGeneratedTotal = new client.Counter({
  name: "documents_generated_total",
  help: "Total number of successfully generated documents",
  registers: [metricsRegistry]
});

export const documentsFailedTotal = new client.Counter({
  name: "documents_failed_total",
  help: "Total number of failed document generations",
  registers: [metricsRegistry]
});

export const batchProcessingDurationSeconds = new client.Histogram({
  name: "batch_processing_duration_seconds",
  help: "Batch processing duration in seconds",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
  registers: [metricsRegistry]
});

export const documentProcessingDurationSeconds = new client.Histogram({
  name: "document_processing_duration_seconds",
  help: "Document processing duration in seconds",
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry]
});

export const queueSizeGauge = new client.Gauge({
  name: "queue_size",
  help: "Current number of jobs waiting or delayed in the queue",
  registers: [metricsRegistry]
});