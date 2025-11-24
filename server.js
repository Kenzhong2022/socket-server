// server.js
import getNeon from "./neon.js";
const mysql = getNeon();
// 导入所需的模块
import "dotenv/config"; // 相当于 require('dotenv').config()
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

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
io.on("connection", async (socket) => {
  console.log(`客户端连接: ${socket.id}`);
  // 向客户端发送连接成功的问候
  socket.emit("hello", "来自服务器【本地socket-server】的问候");
  // 监听客户端加入房间事件
  socket.on("join", (roomId) => {
    socket.join(roomId);
    console.log(`客户端 ${socket.id} 加入房间 ${roomId}`);
  });

  // 监听客户端发送消息事件
  socket.on("chat", async (payload) => {
    const { body, sender_id, roomId, last_read_seq } = payload;
    console.log(`收到客户端 ${socket.id} 的消息:`, payload);
    try {
      /**
       * Neon（Postgres）不允许在 聚合函数（MAX()）上直接加 FOR UPDATE；FOR UPDATE 只能锁具体行或间隙，而 MAX() 返回的是聚合结果，不是物理行。
       */
      /* 1. 锁最新一行拿 seq */
      const [lastRow] = await mysql`
        SELECT seq
        FROM   message
        WHERE  room_id = ${roomId}
        ORDER  BY seq DESC
        LIMIT  1
        FOR UPDATE
      `;
      const nextSeq = (lastRow?.seq ?? 0) * 1 + 1;

      /* 2. 插入并拿回完整数据 */
      const [insertRes] = await mysql`
        INSERT INTO message (room_id, seq, sender_id, body)
        VALUES (${roomId}, ${nextSeq}, ${sender_id}, ${body})
        RETURNING id, created_at
      `;

      /* 3. 组装 & 广播 */
      const newMsg = {
        id: insertRes.id,
        room_id: roomId,
        seq: nextSeq,
        sender_id,
        body,
        created_at: insertRes.created_at,
      };
      io.to(roomId).emit("chat", newMsg);
    } catch (e) {
      await mysql`ROLLBACK`; // 回滚事务
      console.error("[ws] chat 事务失败:", e);
      socket.emit("error", { msg: "发送失败" });
    }
  });

  // 监听客户端断开连接事件
  socket.on("disconnect", () => {
    //告诉前端，我断开了连接
    socket.emit("disconnect", "客户端断开连接");
    console.log(`客户端断开连接: ${socket.id}`);
  });
});

// 设置服务器端口
const port = process.env.PORT || 8888;
// 启动服务器
httpServer.listen(port, () => {
  console.log(`Socket服务器已启动，端口号: ${port}`);
});
