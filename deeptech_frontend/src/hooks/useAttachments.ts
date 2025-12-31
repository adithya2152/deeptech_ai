import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { messagesApi } from "@/lib/api";
import {
  generateEncryptionKey,
  encryptFile,
  decryptFile,
} from "@/lib/encryption";

export interface Attachment {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  encryptedKey: string;
  createdAt: string;
}

/**
 * Hook to upload file attachment
 */
export function useUploadAttachment() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      chatId: string;
      file: File;
      encryptionKey?: string;
    }) => {
      if (!token) throw new Error("Not authenticated");

      // Generate encryption key if not provided
      const encryptionKey = data.encryptionKey || generateEncryptionKey();

      // Encrypt file on client side
      const fileBuffer = await data.file.arrayBuffer();
      const encryptedBlob = await encryptFile(fileBuffer, encryptionKey);

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append(
        "file",
        new File([encryptedBlob], data.file.name, {
          type: "application/octet-stream",
        })
      );
      formData.append("encryptionKey", encryptionKey);

      // Upload to backend
      const response = await messagesApi.uploadAttachment(
        data.chatId,
        formData,
        token
      );
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate messages query to refresh attachments
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.chatId],
      });
    },
  });
}

/**
 * Hook to download attachment
 */
export function useDownloadAttachment() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      attachmentId: string;
      fileName: string;
      encryptedKey: string;
    }) => {
      if (!token) throw new Error("Not authenticated");

      // Download encrypted file
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000/api"
        }/attachments/${data.attachmentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download attachment");
      }

      const encryptedBlob = await response.blob();

      // Decrypt file on client side
      const decryptedBuffer = await decryptFile(
        encryptedBlob,
        data.encryptedKey
      );

      // Create download link
      const url = URL.createObjectURL(new Blob([decryptedBuffer]));
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    },
  });
}

/**
 * Hook to delete attachment
 */
export function useDeleteAttachment() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { attachmentId: string; chatId: string }) => {
      if (!token) throw new Error("Not authenticated");

      const response = await messagesApi.deleteAttachment(
        data.attachmentId,
        token
      );
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate messages query
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.chatId],
      });
    },
  });
}

/**
 * Generate a shareable encryption key for file
 * @returns {string} Base64 encoded key
 */
export function useGenerateFileKey() {
  return {
    generateKey: generateEncryptionKey,
  };
}
