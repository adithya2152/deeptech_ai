/**
 * Utility functions to transform backend Chat responses to UI-friendly format
 */

export interface ChatUIFormat {
  id: string;
  type: "direct" | "group";
  createdAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
  memberCount: number;
  members: Array<{
    id: string;
    name: string;
    role: string;
    avatar_url?: string;
  }>;
  otherUser?: {
    id: string;
    name: string;
    role: string;
    avatar_url?: string;
  };
  displayName: string;
  unreadCount?: number;
}

/**
 * Transform backend Chat response to UI format
 * Extracts otherUser from members array for direct chats
 */
export const transformChat = (
  chat: any,
  currentUserId: string
): ChatUIFormat => {
  // Fix null names in members
  const members = (chat.members || []).map((m: any) => ({
    id: m.id,
    name: m.name && m.name.trim() ? m.name : m.email || "Unknown",
    role: m.role || "user",
    avatar_url: m.avatar_url,
  }));

  // Extract other user for direct chats
  let otherUser;
  let displayName;

  if (chat.type === "direct" && members.length > 0) {
    otherUser = members.find((m: any) => m.id !== currentUserId);
    displayName = otherUser?.name || "Chat";
  } else {
    displayName = `Group (${members.length})`;
  }

  return {
    id: chat.id,
    type: chat.type,
    createdAt: chat.createdAt,
    lastMessage: chat.lastMessage || "No messages yet",
    lastMessageAt: chat.lastMessageAt,
    memberCount: chat.memberCount || members.length,
    members,
    otherUser,
    displayName,
    unreadCount: chat.unreadCount || 0,
  };
};

/**
 * Transform array of chats
 */
export const transformChats = (
  chats: any[],
  currentUserId: string
): ChatUIFormat[] => {
  return chats.map((chat) => transformChat(chat, currentUserId));
};
