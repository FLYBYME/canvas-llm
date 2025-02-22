import "./env.js";
import express from "express";
import http from "http";
import bodyParser from "body-parser";
import corsMiddleware from "./middleware/cors.js";
import loggerMiddleware from "./middleware/logger.js";
import workspacesRouter from "./routes/workspaces.js";

const app = express();
const server = http.createServer(app);

// Middleware
app.use(corsMiddleware);
app.use(loggerMiddleware);
app.use(bodyParser.json());

// Routes
app.use("/workspaces", workspacesRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

export default server;