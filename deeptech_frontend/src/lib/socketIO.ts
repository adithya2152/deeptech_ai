import io, { Socket } from "socket.io-client";

let socket: Socket | null = null;

const API_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

/**
 * Initialize socket connection
 * @param {string} token - JWT token for authentication
 * @returns {Socket} Socket.io instance
 */
export const initializeSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(API_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  return socket;
};

/**
 * Get socket instance
 * @returns {Socket | null} Socket.io instance or null
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Join a chat room
 * @param {string} chatId - Chat ID
 */
export const joinChat = (chatId: string) => {
  if (socket?.connected) {
    socket.emit("join_chat", chatId);
  }
};

/**
 * Leave a chat room
 * @param {string} chatId - Chat ID
 */
export const leaveChat = (chatId: string) => {
  if (socket?.connected) {
    socket.emit("leave_chat", chatId);
  }
};

/**
 * Send message via socket
 * @param {string} chatId - Chat ID
 * @param {string} content - Message content
 * @param {string} messageId - Message ID
 */
export const sendMessageSocket = (
  chatId: string,
  content: string,
  messageId: string
) => {
  if (socket?.connected) {
    socket.emit("send_message", { chatId, content, messageId });
  }
};

/**
 * Start typing indicator
 * @param {string} chatId - Chat ID
 */
export const startTyping = (chatId: string) => {
  if (socket?.connected) {
    socket.emit("typing_start", chatId);
  }
};

/**
 * Stop typing indicator
 * @param {string} chatId - Chat ID
 */
export const stopTyping = (chatId: string) => {
  if (socket?.connected) {
    socket.emit("typing_stop", chatId);
  }
};

/**
 * Mark message as read
 * @param {string} chatId - Chat ID
 * @param {string} messageId - Message ID
 */
export const markMessageAsRead = (chatId: string, messageId: string) => {
  if (socket?.connected) {
    socket.emit("message_read", { chatId, messageId });
  }
};

/**
 * Notify attachment upload
 * @param {string} chatId - Chat ID
 * @param {string} messageId - Message ID
 * @param {string} fileName - File name
 * @param {number} fileSize - File size in bytes
 * @param {string} mimeType - MIME type
 */
export const notifyAttachmentUpload = (
  chatId: string,
  messageId: string,
  fileName: string,
  fileSize: number,
  mimeType: string
) => {
  if (socket?.connected) {
    socket.emit("attachment_uploaded", {
      chatId,
      messageId,
      fileName,
      fileSize,
      mimeType,
    });
  }
};

/**
 * Notify attachment deletion
 * @param {string} chatId - Chat ID
 * @param {string} attachmentId - Attachment ID
 */
export const notifyAttachmentDelete = (
  chatId: string,
  attachmentId: string
) => {
  if (socket?.connected) {
    socket.emit("attachment_deleted", { chatId, attachmentId });
  }
};

/**
 * Listen for new messages
 * @param {function} callback - Callback function
 */
export const onNewMessage = (callback: (message: any) => void) => {
  if (socket) {
    socket.on("new_message", callback);
  }
};

/**
 * Listen for user typing
 * @param {function} callback - Callback function
 */
export const onUserTyping = (callback: (data: any) => void) => {
  if (socket) {
    socket.on("user_typing", callback);
  }
};

/**
 * Listen for message status update
 * @param {function} callback - Callback function
 */
export const onMessageStatusUpdate = (callback: (data: any) => void) => {
  if (socket) {
    socket.on("message_status_update", callback);
  }
};

/**
 * Listen for new attachment
 * @param {function} callback - Callback function
 */
export const onNewAttachment = (callback: (data: any) => void) => {
  if (socket) {
    socket.on("new_attachment", callback);
  }
};

/**
 * Listen for attachment removed
 * @param {function} callback - Callback function
 */
export const onAttachmentRemoved = (callback: (data: any) => void) => {
  if (socket) {
    socket.on("attachment_removed", callback);
  }
};

/**
 * Listen for user joined
 * @param {function} callback - Callback function
 */
export const onUserJoined = (callback: (data: any) => void) => {
  if (socket) {
    socket.on("user_joined", callback);
  }
};

/**
 * Listen for user left
 * @param {function} callback - Callback function
 */
export const onUserLeft = (callback: (data: any) => void) => {
  if (socket) {
    socket.on("user_left", callback);
  }
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};
