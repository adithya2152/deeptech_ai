import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
// ✅ Import the new hook
import {
  useChats,
  useMessages,
  useSendMessage,
  useStartDirectChat,
  useDeleteChat,
  // Legacy aliases for backward compatibility
  useConversations,
  useDeleteConversation,
} from "@/hooks/useMessages";
import {
  useUploadAttachment,
  useDownloadAttachment,
  useDeleteAttachment,
} from "@/hooks/useAttachments";
import {
  initializeSocket,
  getSocket,
  joinChat,
  leaveChat,
  onNewMessage,
  onUserTyping,
  onMessageStatusUpdate,
  onNewAttachment,
  onAttachmentRemoved,
} from "@/lib/socketIO";
import {
  MessageSquare,
  Search,
  Send,
  MoreVertical,
  Loader2,
  Trash2,
  Paperclip,
  Download,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MessagesPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: conversations = [], isLoading: loadingConversations } =
    useChats();
  const { data: messages = [], isLoading: loadingMessages } =
    useMessages(selectedConversation);

  const sendMessage = useSendMessage();
  const deleteConversation = useDeleteChat();
  const uploadAttachment = useUploadAttachment();
  const downloadAttachment = useDownloadAttachment();
  const deleteAttachmentMutation = useDeleteAttachment();

  // Initialize socket connection
  useEffect(() => {
    if (token && user) {
      initializeSocket(token);
      return () => {
        // Cleanup if needed
      };
    }
  }, [token, user]);

  // Join/leave chat and setup socket listeners
  useEffect(() => {
    if (!selectedConversation) return;

    const socket = getSocket();
    if (!socket) return;

    // Join the chat room
    joinChat(selectedConversation);

    // Listen for new messages
    const unsubscribeNewMessage = onNewMessage((message) => {
      // Message will be handled by react-query refetch
      console.log("New message received:", message);
    });

    // Listen for typing indicators
    const unsubscribeTyping = onUserTyping((data) => {
      if (data.isTyping) {
        setTypingUsers((prev) => new Set(prev).add(data.userId));
      } else {
        setTypingUsers((prev) => {
          const updated = new Set(prev);
          updated.delete(data.userId);
          return updated;
        });
      }
    });

    // Listen for message read status
    const unsubscribeRead = onMessageStatusUpdate((data) => {
      console.log("Message read:", data);
    });

    // Listen for attachments
    const unsubscribeAttachment = onNewAttachment((data) => {
      console.log("New attachment:", data);
    });

    return () => {
      leaveChat(selectedConversation);
      unsubscribeNewMessage?.();
      unsubscribeTyping?.();
      unsubscribeRead?.();
      unsubscribeAttachment?.();
    };
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      const conversation = conversations.find(
        (c) => c.id === selectedConversation
      );
      if (conversation && conversation.unreadCount > 0) {
        markAsRead.mutate(selectedConversation);
      }
    }
  }, [selectedConversation, conversations]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages]);

  // Handle typing
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    // Emit typing start
    const socket = getSocket();
    if (socket && selectedConversation) {
      socket.emit("typing_start", selectedConversation);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Emit typing stop after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing_stop", selectedConversation);
      }, 2000);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    try {
      await uploadAttachment.mutateAsync({
        chatId: selectedConversation,
        file,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  // Handle file download
  const handleFileDownload = async (
    attachmentId: string,
    fileName: string,
    encryptedKey: string
  ) => {
    try {
      await downloadAttachment.mutateAsync({
        attachmentId,
        fileName,
        encryptedKey,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    try {
      await sendMessage.mutateAsync({
        chatId: selectedConversation,
        content: messageText.trim(),
      });
      setMessageText("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    }
  };

  // ✅ New Delete Handler
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteConversation.mutateAsync(deleteId);

      toast({ title: "Conversation deleted" });

      // If we deleted the active conversation, deselect it
      if (selectedConversation === deleteId) {
        setSelectedConversation(null);
      }
      setDeleteId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not delete conversation.",
        variant: "destructive",
      });
    }
  };

  const selectedConversationData = conversations.find(
    (c) => c.id === selectedConversation
  );

  const getInitials = (name: string) => {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";
  };

  const handleViewProfile = () => {
    if (!selectedConversationData?.otherUser) return;
    if (user?.role === "buyer") {
      navigate(`/experts/${selectedConversationData.otherUser.id}`);
    } else {
      toast({ description: "Buyer profiles are private." });
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center md:text-left">
          <h1 className="font-display text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Communicate with your project partners
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
          {/* Sidebar List */}
          <Card className="md:col-span-1 overflow-hidden flex flex-col h-full border-r-0 md:border-r">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/30"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loadingConversations ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredConversations.length > 0 ? (
                <div className="divide-y">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                        selectedConversation === conversation.id
                          ? "bg-primary/5 border-l-4 border-primary"
                          : "border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={conversation.otherUser?.avatar_url || ""}
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(conversation.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm truncate">
                              {conversation.displayName}
                            </p>
                            {conversation.lastMessageAt && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(
                                  new Date(conversation.lastMessageAt),
                                  { addSuffix: true }
                                )}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-sm truncate ${
                              conversation.unreadCount &&
                              conversation.unreadCount > 0
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {conversation.lastMessage || "No messages yet"}
                          </p>
                        </div>
                        {conversation.unreadCount &&
                          conversation.unreadCount > 0 && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <span className="text-[10px] text-primary-foreground font-bold">
                                {conversation.unreadCount}
                              </span>
                            </div>
                          )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No conversations found
                  </p>
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 overflow-hidden flex flex-col h-full shadow-md">
            {selectedConversation ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b flex items-center justify-between bg-card z-10 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage
                        src={
                          selectedConversationData?.otherUser?.avatar_url || ""
                        }
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {getInitials(
                          selectedConversationData?.displayName || ""
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">
                        {selectedConversationData?.displayName || "Chat"}
                      </p>
                      {selectedConversationData?.otherUser?.role && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {selectedConversationData.otherUser.role}
                        </p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleViewProfile}>
                        View Profile
                      </DropdownMenuItem>
                      {/* ✅ Trigger Delete Dialog */}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(selectedConversation)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <ScrollArea
                  ref={scrollAreaRef}
                  className="flex-1 p-4 bg-muted/5"
                >
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 opacity-50">
                      <MessageSquare className="h-12 w-12" />
                      <p>No messages yet. Say hello!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isMe = message.senderId === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              isMe ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-none"
                                  : "bg-white dark:bg-muted border border-border/50 rounded-bl-none"
                              }`}
                            >
                              <p className="leading-relaxed">
                                {message.content}
                              </p>
                              <p
                                className={`text-[10px] mt-1 text-right opacity-70`}
                              >
                                {message.createdAt
                                  ? new Date(
                                      message.createdAt
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Just now"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 bg-background border-t space-y-3">
                  {typingUsers.size > 0 && (
                    <div className="text-xs text-muted-foreground italic">
                      {Array.from(typingUsers).length === 1
                        ? "Someone is typing"
                        : "Multiple people are typing"}
                      ...
                    </div>
                  )}
                  <form
                    className="flex gap-2 items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                  >
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAttachment.isPending}
                    >
                      {uploadAttachment.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Paperclip className="h-5 w-5" />
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="*/*"
                    />
                    <Input
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={handleTyping}
                      className="flex-1 min-h-[44px]"
                      autoComplete="off"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      disabled={!messageText.trim() || sendMessage.isPending}
                    >
                      {sendMessage.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/5">
                <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold">Your Inbox</h3>
                <p className="text-muted-foreground max-w-xs mt-2 text-sm">
                  Select a conversation from the list to view your messages and
                  start chatting.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ✅ Confirmation Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the
              chat history for both you and the other participant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
