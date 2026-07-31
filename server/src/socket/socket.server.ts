import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { TokenUtils, TokenPayload } from '../utils/token.utils.js';
import { logger } from '../utils/logger.js';

let io: SocketServer | null = null;

export const initSocketServer = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket Authentication Middleware
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization
          ? socket.handshake.headers.authorization.split(' ')[1]
          : null) ||
        (socket.handshake.query?.token as string);

      if (!token) {
        logger.warn(`🔌 [Socket.IO] Connection rejected: No authentication token provided (${socket.id})`);
        return next(new Error('Authentication token required'));
      }

      const payload: TokenPayload = TokenUtils.verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch (err: any) {
      logger.warn(`🔌 [Socket.IO] Authentication failed: ${err.message}`);
      next(new Error('Invalid or expired socket authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user: TokenPayload = (socket as any).user;
    const roomName = `user_${user.userId}`;

    socket.join(roomName);
    logger.info(`⚡ [Socket.IO] Client connected: ${socket.id} (User: ${user.email}, Joined Room: ${roomName})`);

    if (user.role === 'ADMIN') {
      socket.join('admin_room');
    }

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 [Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

export const getSocketServer = (): SocketServer | null => {
  return io;
};

export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
    if (event.startsWith('task:')) {
      io.to('admin_room').emit(event, { ...data, isAdminBroadcast: true });
    }
  }
};

export const emitTaskStatusChanged = (
  userId: string,
  taskId: string,
  status: string,
  progress: number,
  result?: any,
  error?: string
) => {
  emitToUser(userId, 'task:status_changed', {
    taskId,
    status,
    progress,
    result,
    error,
    timestamp: new Date().toISOString(),
  });
};
