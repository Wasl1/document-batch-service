import express, { Express, RequestHandler } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import routes from "./routes/index.js";
import { swaggerSpec } from "./config/swagger.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { httpLogger } from "./middlewares/logger.middleware.js";

const app: Express = express();

app.use(httpLogger as RequestHandler);
app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;