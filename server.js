// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" }));
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});

io.on("connection", (s) => {
  console.log("client ->", s.id);
  s.emit("hello", "from-railway");
});

const port = process.env.PORT || 3001;
httpServer.listen(port, () => console.log(`Socket ready on ${port}`));
