import express, { Express } from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { httpLogger } from "./middlewares/logger.middleware.js";

const app: Express = express();

app.use(httpLogger);
app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;