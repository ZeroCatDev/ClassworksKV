/**
 * Socket.IO 管理与事件转发
 *
 * 功能：
 * - 初始化 Socket.IO 并与 HTTP Server 绑定
 * - 前端使用 KV token 加入设备频道（自动映射到对应设备 uuid 房间）
 * - 同一设备的不同 token 会被归入同一频道
 * - 维护在线设备列表
 * - 提供广播 KV 键变更的工具方法
 */

import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

// Socket.IO 单例实例
let io = null;

// 在线设备映射：uuid -> Set<socketId>
const onlineMap = new Map();
const prisma = new PrismaClient();

/**
 * 初始化 Socket.IO
 * @param {import('http').Server} server HTTP Server 实例
 */
export function initSocket(server) {
  if (io) return io;

  const allowOrigin = process.env.FRONTEND_URL || "*";

  io = new Server(server, {
    cors: {
      origin: allowOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // 初始化每个连接所加入的设备房间集合
    socket.data.deviceUuids = new Set();

    // 仅允许通过 query.token/apptoken 加入
    const qToken = socket.handshake?.query?.token || socket.handshake?.query?.apptoken;
    if (qToken && typeof qToken === "string") {
      joinByToken(socket, qToken).catch(() => {});
    }

    // 客户端使用 KV token 加入房间
    socket.on("join-token", (payload) => {
      const token = payload?.token || payload?.apptoken;
      if (typeof token === "string" && token.length > 0) {
        joinByToken(socket, token).catch(() => {});
      }
    });

    // 客户端使用 token 离开房间
    socket.on("leave-token", async (payload) => {
      try {
        const token = payload?.token || payload?.apptoken;
        if (typeof token !== "string" || token.length === 0) return;
        const appInstall = await prisma.appInstall.findUnique({
          where: { token },
          include: { device: { select: { uuid: true } } },
        });
        const uuid = appInstall?.device?.uuid;
        if (uuid) leaveDeviceRoom(socket, uuid);
      } catch {
        // ignore
      }
    });

    // 离开所有已加入的设备房间
    socket.on("leave-all", () => {
      const uuids = Array.from(socket.data.deviceUuids || []);
      uuids.forEach((u) => leaveDeviceRoom(socket, u));
    });

    // 聊天室：发送文本消息到加入的设备频道
    socket.on("chat:send", (data) => {
      try {
        const text = typeof data === "string" ? data : data?.text;
        if (typeof text !== "string") return;
        const trimmed = text.trim();
        if (!trimmed) return;

        // 限制消息最大长度，避免滥用
        const MAX_LEN = 2000;
        const safeText = trimmed.length > MAX_LEN ? trimmed.slice(0, MAX_LEN) : trimmed;

        const uuids = Array.from(socket.data.deviceUuids || []);
        if (uuids.length === 0) return;

        const at = new Date().toISOString();
        const payload = { text: safeText, at, senderId: socket.id };

        uuids.forEach((uuid) => {
          io.to(uuid).emit("chat:message", { uuid, ...payload });
        });
      } catch (err) {
        console.error("chat:send error:", err);
      }
    });

    socket.on("disconnect", () => {
      const uuids = Array.from(socket.data.deviceUuids || []);
      uuids.forEach((u) => removeOnline(u, socket.id));
    });
  });

  return io;
}

/** 返回 Socket.IO 实例 */
export function getIO() {
  return io;
}

/**
 * 让 socket 加入设备房间并记录在线
 * @param {import('socket.io').Socket} socket
 * @param {string} uuid
 */
function joinDeviceRoom(socket, uuid) {
  socket.join(uuid);
  if (!socket.data.deviceUuids) socket.data.deviceUuids = new Set();
  socket.data.deviceUuids.add(uuid);
  // 记录在线
  const set = onlineMap.get(uuid) || new Set();
  set.add(socket.id);
  onlineMap.set(uuid, set);
  // 可选：通知加入
  io.to(uuid).emit("device-joined", { uuid, connections: set.size });
}

/**
 * 让 socket 离开设备房间并更新在线表
 * @param {import('socket.io').Socket} socket
 * @param {string} uuid
 */
function leaveDeviceRoom(socket, uuid) {
  socket.leave(uuid);
  if (socket.data.deviceUuids) socket.data.deviceUuids.delete(uuid);
  removeOnline(uuid, socket.id);
}

function removeOnline(uuid, socketId) {
  const set = onlineMap.get(uuid);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    onlineMap.delete(uuid);
  } else {
    onlineMap.set(uuid, set);
  }
}

/**
 * 广播某设备下 KV 键已变更
 * @param {string} uuid 设备 uuid
 * @param {object} payload { key, action: 'upsert'|'delete'|'batch', updatedAt?, created? }
 */
export function broadcastKeyChanged(uuid, payload) {
  if (!io || !uuid) return;
  io.to(uuid).emit("kv-key-changed", { uuid, ...payload });
}

/**
 * 获取在线设备列表
 * @returns {Array<{uuid:string, connections:number}>}
 */
export function getOnlineDevices() {
  const list = [];
  for (const [uuid, set] of onlineMap.entries()) {
    list.push({ uuid, connections: set.size });
  }
  // 默认按连接数降序
  return list.sort((a, b) => b.connections - a.connections);
}

export default {
  initSocket,
  getIO,
  broadcastKeyChanged,
  getOnlineDevices,
};

/**
 * 通过 KV token 让 socket 加入对应设备的房间
 * @param {import('socket.io').Socket} socket
 * @param {string} token
 */
async function joinByToken(socket, token) {
  const appInstall = await prisma.appInstall.findUnique({
    where: { token },
    include: { device: { select: { uuid: true } } },
  });
  const uuid = appInstall?.device?.uuid;
  if (uuid) {
    joinDeviceRoom(socket, uuid);
    // 可选：回执
    socket.emit("joined", { by: "token", uuid });
  } else {
    socket.emit("join-error", { by: "token", reason: "invalid_token" });
  }
}
