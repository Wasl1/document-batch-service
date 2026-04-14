import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Document Batch Service API",
      version: "1.0.0",
      description:
        "API for asynchronous batch document generation with BullMQ, MongoDB, GridFS, and Prometheus metrics."
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Local development server"
      }
    ],
    tags: [
      { name: "Health", description: "Health check endpoints" },
      { name: "Metrics", description: "Prometheus metrics endpoints" },
      { name: "Documents", description: "Document batch endpoints" }
    ],
    components: {
      schemas: {
        CreateBatchRequest: {
          type: "object",
          required: ["userIds"],
          properties: {
            userIds: {
              type: "array",
              maxItems: 1000,
              items: {
                type: "string"
              },
              example: ["user-1", "user-2", "user-3"]
            }
          }
        },
        CreateBatchResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true
            },
            message: {
              type: "string",
              example: "Batch created successfully"
            },
            data: {
              type: "object",
              properties: {
                batchId: {
                  type: "string",
                  example: "69d8b1fda63d86e569c792c4"
                }
              }
            }
          }
        },
        BatchDocument: {
          type: "object",
          properties: {
            id: { type: "string", example: "69d8b1fda63d86e569c792c5" },
            batchId: { type: "string", example: "69d8b1fda63d86e569c792c4" },
            userId: { type: "string", example: "user-1" },
            status: {
              type: "string",
              enum: ["pending", "processing", "completed", "failed"],
              example: "completed"
            },
            retryCount: { type: "number", example: 0 },
            fileId: {
              type: "string",
              nullable: true,
              example: "69d8b1fd3214332fc208c408"
            },
            errorMessage: {
              type: "string",
              nullable: true,
              example: null
            },
            createdAt: {
              type: "string",
              format: "date-time"
            },
            updatedAt: {
              type: "string",
              format: "date-time"
            },
            startedAt: {
              type: "string",
              format: "date-time",
              nullable: true
            },
            completedAt: {
              type: "string",
              format: "date-time",
              nullable: true
            }
          }
        },
        BatchDetailsResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true
            },
            data: {
              type: "object",
              properties: {
                batch: {
                  type: "object",
                  properties: {
                    id: { type: "string", example: "69d8b1fda63d86e569c792c4" },
                    status: {
                      type: "string",
                      enum: ["pending", "processing", "completed", "failed"],
                      example: "completed"
                    },
                    userIds: {
                      type: "array",
                      items: { type: "string" },
                      example: ["user-1", "user-2"]
                    },
                    totalDocuments: { type: "number", example: 2 },
                    processedCount: { type: "number", example: 2 },
                    successCount: { type: "number", example: 2 },
                    failedCount: { type: "number", example: 0 },
                    createdAt: {
                      type: "string",
                      format: "date-time"
                    },
                    updatedAt: {
                      type: "string",
                      format: "date-time"
                    },
                    startedAt: {
                      type: "string",
                      format: "date-time",
                      nullable: true
                    },
                    completedAt: {
                      type: "string",
                      format: "date-time",
                      nullable: true
                    }
                  }
                },
                documents: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/BatchDocument"
                  }
                }
              }
            }
          }
        },
        HealthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "API is healthy" },
            services: {
              type: "object",
              properties: {
                mongodb: { type: "string", example: "up" },
                redis: { type: "string", example: "up" },
                queue: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "up" },
                    name: { type: "string", example: "document-generation" },
                    counts: {
                      type: "object",
                      properties: {
                        waiting: { type: "number", example: 0 },
                        active: { type: "number", example: 0 },
                        completed: { type: "number", example: 2 },
                        failed: { type: "number", example: 1 },
                        delayed: { type: "number", example: 0 },
                        paused: { type: "number", example: 0 }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Invalid batchId" }
          }
        }
      }
    }
  },
  apis: ["./src/routes/*.ts"]
});