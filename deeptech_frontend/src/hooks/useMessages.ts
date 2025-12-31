import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { messagesApi } from "@/lib/api";
import { transformChats, type ChatUIFormat } from "@/lib/chatTransform";

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  attachments?: Array<{
    id: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    encryptedKey: string;
    createdAt: string;
  }>;
}

export interface SendMessageData {
  chatId: string;
  content: string;
}

// Get all chats for current user with transformed UI format
export function useChats() {
  const { user, token } = useAuth();

  return useQuery<ChatUIFormat[]>({
    queryKey: ["chats", user?.id],
    queryFn: async () => {
      if (!token || !user?.id) return [];
      const response = await messagesApi.getChats(token);
      const chats = (response || []) as any[];
      return transformChats(chats, user.id);
    },
    enabled: !!user && !!token,
    refetchInterval: 5000,
  });
}

// Legacy alias for backward compatibility
export function useConversations() {
  return useChats();
}

// Get messages for a specific chat
export function useMessages(chatId: string | null) {
  const { user, token } = useAuth();

  return useQuery<Message[]>({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      if (!chatId || !token) return [];
      const response = await messagesApi.getMessages(chatId, token);
      return (response || []) as Message[];
    },
    enabled: !!user && !!chatId && !!token,
    refetchInterval: 3000,
  });
}

// Get chat details
export function useChatDetails(chatId: string | null) {
  const { token } = useAuth();

  return useQuery<Chat>({
    queryKey: ["chatDetails", chatId],
    queryFn: async () => {
      if (!chatId || !token) throw new Error("Chat ID and token required");
      const response = await messagesApi.getChatDetails(chatId, token);
      return response as Chat;
    },
    enabled: !!chatId && !!token,
  });
}

// Send message mutation
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user, token } = useAuth();

  return useMutation({
    mutationFn: async (data: SendMessageData) => {
      if (!token) throw new Error("Not authenticated");
      const response = await messagesApi.sendMessage(
        data.chatId,
        data.content,
        token
      );
      return response as Message;
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData<Message[]>(
        ["messages", newMessage.chatId],
        (old) => [...(old || []), newMessage]
      );
      queryClient.invalidateQueries({ queryKey: ["chats", user?.id] });
    },
  });
}

// Start/fetch direct chat
export function useStartDirectChat() {
  const queryClient = useQueryClient();
  const { user, token } = useAuth();

  return useMutation({
    mutationFn: async (participantId: string) => {
      if (!token) throw new Error("Not authenticated");
      const response = await messagesApi.startDirectChat(participantId, token);
      return response as Chat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", user?.id] });
    },
  });
}

// Add chat member
export function useAddChatMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      chatId: string;
      userId: string;
      token: string;
    }) => {
      const response = await messagesApi.addChatMember(
        data.chatId,
        data.userId,
        data.token
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chatDetails", variables.chatId],
      });
    },
  });
}

// Remove chat member
export function useRemoveChatMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      chatId: string;
      userId: string;
      token: string;
    }) => {
      const response = await messagesApi.removeChatMember(
        data.chatId,
        data.userId,
        data.token
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chatDetails", variables.chatId],
      });
    },
  });
}

// Delete chat
export function useDeleteChat() {
  const queryClient = useQueryClient();
  const { user, token } = useAuth();

  return useMutation({
    mutationFn: async (chatId: string) => {
      if (!token) throw new Error("Not authenticated");
      const response = await messagesApi.deleteChat(chatId, token);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", user?.id] });
    },
  });
}

// Legacy alias for backward compatibility
export function useDeleteConversation() {
  return useDeleteChat();
}
