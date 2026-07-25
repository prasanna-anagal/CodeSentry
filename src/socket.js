import { Server } from "socket.io";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });
  return io;
};

export const getIo = () => {
  if (!io) throw new Error("Socket.io not initialized yet");
  return io;
};
