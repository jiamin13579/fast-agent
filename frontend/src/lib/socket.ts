"use client";

import { io, Socket } from "socket.io-client";
import { getToken } from "./auth";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("/", {
      transports: ["websocket"],
      auth: { token: getToken() },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("SocketIO connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("SocketIO disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("SocketIO connection error:", error.message);
    });
  }
  return socket;
}

export function joinRoom(room: string) {
  getSocket().emit("join", room);
}

export function leaveRoom(room: string) {
  getSocket().emit("leave", room);
}

export function onEvent(event: string, handler: (...args: unknown[]) => void) {
  getSocket().on(event, handler);
}

export function offEvent(event: string, handler?: (...args: unknown[]) => void) {
  if (handler) {
    getSocket().off(event, handler);
  } else {
    getSocket().off(event);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}