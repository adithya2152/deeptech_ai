import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { messagesApi } from '@/lib/api'

export interface Conversation {
  id: string
  participantId: string
  participantName: string
  participantRole: 'buyer' | 'expert'
  lastMessage: string
  lastMessageAt: Date
  unreadCount: number
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  content: string
  createdAt: Date
}

export interface SendMessageData {
  conversationId: string
  content: string
}

// Get all conversations for current user
export function useConversations() {
  const { user, token } = useAuth()

  return useQuery<Conversation[]>({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!token) return []

      console.log('🔍 Fetching conversations via API')

      const response = await messagesApi.getConversations(token)

      console.log('✅ Conversations loaded from API:', response.conversations?.length || 0)

      return response.conversations as Conversation[]
    },
    enabled: !!user && !!token,
  })
}

// Get messages for a specific conversation
export function useMessages(conversationId: string | null) {
  const { user, token } = useAuth()

  return useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId || !token) return []

      console.log('🔍 Fetching messages via API for conversation:', conversationId)

      const response = await messagesApi.getMessages(conversationId, token)

      console.log('✅ Messages loaded from API:', response.messages?.length || 0)

      return response.messages as Message[]
    },
    enabled: !!user && !!conversationId && !!token,
  })
}

// Send a message in a conversation
export function useSendMessage() {
  const queryClient = useQueryClient()
  const { user, token } = useAuth()

  return useMutation({
    mutationFn: async (data: SendMessageData) => {
      if (!token) throw new Error('Not authenticated')

      console.log('🚀 Sending message via API:', data.conversationId)

      const response = await messagesApi.sendMessage(
        data.conversationId,
        data.content,
        token
      )

      console.log('✅ Message sent via API')

      return response.message as Message
    },
    onSuccess: (newMessage) => {
      // Update messages list
      queryClient.setQueryData<Message[]>(
        ['messages', newMessage.conversationId],
        (old) => [...(old || []), newMessage]
      )

      // Update conversation last message
      queryClient.setQueryData<Conversation[]>(
        ['conversations', user?.id],
        (old) =>
          old?.map((conv) =>
            conv.id === newMessage.conversationId
              ? {
                  ...conv,
                  lastMessage: newMessage.content,
                  lastMessageAt: newMessage.createdAt,
                }
              : conv
          )
      )
    },
  })
}

// Mark conversation as read
export function useMarkAsRead() {
  const queryClient = useQueryClient()
  const { user, token } = useAuth()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!token) throw new Error('Not authenticated')

      console.log('📖 Marking conversation as read via API:', conversationId)

      await messagesApi.markAsRead(conversationId, token)

      console.log('✅ Conversation marked as read via API')
    },
    onSuccess: (_, conversationId) => {
      // Update conversation unread count
      queryClient.setQueryData<Conversation[]>(
        ['conversations', user?.id],
        (old) =>
          old?.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          )
      )
    },
  })
}
