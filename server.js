// server.js
/**测试自动部署 */

// 导入所需的模块
require("dotenv").config(); // 加载环境变量
const express = require("express"); // 导入Express框架
const http = require("http"); // 导入HTTP模块
const { Server } = require("socket.io"); // 导入Socket.io服务器类
const cors = require("cors"); // 导入CORS中间件

// 创建Express应用
const app = express();

// 配置CORS，允许所有来源的请求
app.use(cors({ origin: "*" }));

// 创建HTTP服务器
const httpServer = http.createServer(app);

// 初始化Socket.io服务器
const io = new Server(httpServer, {
  cors: { origin: "*" }, // 允许所有来源的Socket.io连接
  transports: ["websocket", "polling"], // 支持WebSocket和轮询两种传输方式
});

// 监听客户端连接事件
io.on("connection", (socket) => {
  console.log(`客户端连接: ${socket.id}`);
  // 向客户端发送连接成功的问候
  socket.emit("hello", "来自服务器【本地socket-server】的问候");

  // 监听客户端加入房间事件
  socket.on("join", (roomId) => {
    socket.join(roomId);
    console.log(`客户端 ${socket.id} 加入房间 ${roomId}`);
  });

  // 监听客户端发送消息事件
  socket.on("chat", (payload) => {
    console.log(`收到客户端 ${socket.id} 的消息:`, payload);
    // 将消息广播到指定房间的所有客户端
    io.to(payload.roomId).emit("chat", payload);
  });

  // 监听客户端断开连接事件
  socket.on("disconnect", () => {
    console.log(`客户端断开连接: ${socket.id}`);
  });
});

// 设置服务器端口
const port = process.env.PORT || 8888;

// 启动服务器
httpServer.listen(port, () => {
  console.log(`Socket服务器已启动，端口号: ${port}`);
});
