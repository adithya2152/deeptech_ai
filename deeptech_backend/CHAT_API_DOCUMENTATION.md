# DeepTech Chat System - Complete API Documentation

## 🎯 Overview

This implementation provides a complete real-time chat system with:

- **Database Schema**: Proper use of `chats`, `chat_members`, and `messages` tables
- **Real-Time Communication**: Socket.io integration with 8 event types
- **File Attachments**: Encrypted file upload/download with AES-256-GCM encryption
- **Access Control**: Chat membership validation before message operations
- **Read Receipts**: Message read status tracking and notifications
- **Typing Indicators**: Real-time typing status for all chat participants

---

## 📊 Database Schema (PostgreSQL)

### Chats Table

```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type = ANY(ARRAY['direct', 'group'])),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Fields:**

- `id`: Unique identifier (UUID)
- `type`: Chat type - 'direct' for 1-to-1 or 'group' for group chats
- `created_at`: Timestamp when chat was created

---

### Chat Members Table

```sql
CREATE TABLE chat_members (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);
```

**Fields:**

- `chat_id`: Reference to chats table
- `user_id`: UUID of chat member
- `joined_at`: When user joined the chat
- **Primary Key**: Composite (chat_id, user_id)

---

### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Fields:**

- `id`: Unique message identifier
- `chat_id`: Which chat the message belongs to
- `sender_id`: User who sent the message
- `content`: Message text content
- `created_at`: When message was sent

---

### Message Attachments Table (NEW)

```sql
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Fields:**

- `id`: Attachment identifier
- `message_id`: Which message this file is attached to
- `file_name`: Original filename
- `file_path`: Path in Supabase storage (chat-files bucket)
- `file_size`: Size in bytes
- `mime_type`: File content type
- `encrypted_key`: AES-256-GCM key (base64 encoded) - used for file decryption
- `created_at`: Upload timestamp

---

## 🔌 REST API Endpoints

### Authentication

All endpoints require JWT token in Authorization header:

```bash
Authorization: Bearer <JWT_TOKEN>
```

---

### 1. Get All Chats

```http
GET /api/chats
```

**Description:** Get all chats for the authenticated user

**Response (200 OK):**

```json
[
  {
    "id": "uuid",
    "type": "direct",
    "createdAt": "2024-01-15T10:30:00Z",
    "lastMessage": {
      "id": "uuid",
      "content": "Hello!",
      "senderId": "uuid",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "unreadCount": 2,
    "members": [
      {
        "userId": "uuid",
        "joinedAt": "2024-01-15T10:00:00Z"
      }
    ]
  }
]
```

---

### 2. Start Direct Chat

```http
POST /api/chats/start
Content-Type: application/json

{
  "participantId": "uuid"
}
```

**Description:** Create or fetch existing direct chat with another user

**Response (200 OK):**

```json
{
  "id": "uuid",
  "type": "direct",
  "createdAt": "2024-01-15T10:30:00Z",
  "members": [
    {
      "userId": "your-user-id",
      "joinedAt": "2024-01-15T10:30:00Z"
    },
    {
      "userId": "participantId",
      "joinedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Errors:**

- `400`: Cannot start chat with yourself
- `500`: Server error

---

### 3. Get Chat Details

```http
GET /api/chats/{chatId}
```

**Description:** Get full chat details with all members

**Response (200 OK):**

```json
{
  "id": "uuid",
  "type": "group",
  "createdAt": "2024-01-15T10:30:00Z",
  "members": [
    {
      "userId": "uuid-1",
      "joinedAt": "2024-01-15T10:30:00Z"
    },
    {
      "userId": "uuid-2",
      "joinedAt": "2024-01-16T14:20:00Z"
    }
  ]
}
```

---

### 4. Get Messages

```http
GET /api/chats/{chatId}/messages
```

**Description:** Get all messages in a chat with file attachments

**Response (200 OK):**

```json
[
  {
    "id": "uuid",
    "chatId": "uuid",
    "senderId": "uuid",
    "content": "Hello everyone!",
    "createdAt": "2024-01-15T10:30:00Z",
    "attachments": [
      {
        "id": "uuid",
        "fileName": "document.pdf",
        "filePath": "chats/uuid/document-abc123.pdf",
        "fileSize": 102400,
        "mimeType": "application/pdf",
        "encryptedKey": "base64-encoded-key",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
]
```

---

### 5. Send Message

```http
POST /api/chats/{chatId}/messages
Content-Type: application/json

{
  "content": "Your message here"
}
```

**Description:** Send a message to a chat

**Request Validation:**

- User must be a member of the chat
- Content cannot be empty

**Response (201 Created):**

```json
{
  "id": "uuid",
  "chatId": "uuid",
  "senderId": "your-user-id",
  "content": "Your message here",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 6. Add Chat Member

```http
POST /api/chats/{chatId}/members
Content-Type: application/json

{
  "userId": "uuid"
}
```

**Description:** Add a user to a group chat

**Response (200 OK):**

```json
{
  "message": "Member added successfully",
  "userId": "uuid",
  "chatId": "uuid"
}
```

---

### 7. Remove Chat Member

```http
DELETE /api/chats/{chatId}/members
Content-Type: application/json

{
  "userId": "uuid"
}
```

**Description:** Remove a user from a chat

**Response (200 OK):**

```json
{
  "message": "Member removed successfully",
  "userId": "uuid",
  "chatId": "uuid"
}
```

---

### 8. Delete Chat

```http
DELETE /api/chats/{chatId}
```

**Description:** Delete a chat and all related data (messages, attachments, members)

**Response (200 OK):**

```json
{
  "message": "Chat deleted successfully",
  "chatId": "uuid"
}
```

**Note:** This operation cascades:

- Deletes all message_attachments
- Deletes all messages
- Deletes all chat_members
- Finally deletes the chat

---

### 9. Upload File Attachment

```http
POST /api/chats/{chatId}/attachments
Content-Type: multipart/form-data

file: <binary-file>
encryptionKey: "base64-encoded-key"
```

**Description:** Upload encrypted file to a chat message

**File Limits:**

- Max size: 50MB
- Allowed types: All MIME types (configured in Supabase bucket)

**Response (201 Created):**

```json
{
  "id": "attachment-uuid",
  "messageId": "message-uuid",
  "fileName": "document.pdf",
  "filePath": "chats/uuid/document-abc123.pdf",
  "fileSize": 102400,
  "mimeType": "application/pdf",
  "encryptedKey": "base64-encoded-key",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 10. Download File Attachment

```http
GET /api/attachments/{attachmentId}
```

**Description:** Download encrypted file (client decrypts with stored key)

**Response (200 OK):**

```
<binary-file-content>
```

**Headers:**

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="document.pdf"
```

---

### 11. Delete File Attachment

```http
DELETE /api/attachments/{attachmentId}
```

**Description:** Delete a file attachment from message

**Response (200 OK):**

```json
{
  "message": "Attachment deleted successfully",
  "attachmentId": "uuid"
}
```

---

## 🔌 Socket.io Events

### Connection

```javascript
socket.emit("connect", {
  token: JWT_TOKEN,
});
```

---

### 1. Join Chat Room

**Event Name:** `join_chat`

```javascript
socket.emit("join_chat", chatId);
```

**Response Event:** `user_joined`

```javascript
socket.on("user_joined", (data) => {
  console.log(data);
  // {
  //   userId: "uuid",
  //   timestamp: "2024-01-15T10:30:00Z"
  // }
});
```

---

### 2. Leave Chat Room

**Event Name:** `leave_chat`

```javascript
socket.emit("leave_chat", chatId);
```

**Response Event:** `user_left`

```javascript
socket.on("user_left", (data) => {
  console.log(data);
  // {
  //   userId: "uuid",
  //   timestamp: "2024-01-15T10:30:00Z"
  // }
});
```

---

### 3. Send Real-Time Message

**Event Name:** `send_message`

```javascript
socket.emit("send_message", {
  chatId: "uuid",
  content: "Hello!",
  messageId: "uuid",
});
```

**Response Event:** `new_message`

```javascript
socket.on("new_message", (data) => {
  console.log(data);
  // {
  //   id: "uuid",
  //   chatId: "uuid",
  //   senderId: "uuid",
  //   content: "Hello!",
  //   createdAt: "2024-01-15T10:30:00Z",
  //   isRead: false
  // }
});
```

---

### 4. Typing Start

**Event Name:** `typing_start`

```javascript
socket.emit("typing_start", chatId);
```

**Response Event:** `user_typing`

```javascript
socket.on("user_typing", (data) => {
  console.log(data);
  // {
  //   userId: "uuid",
  //   isTyping: true
  // }
});
```

---

### 5. Typing Stop

**Event Name:** `typing_stop`

```javascript
socket.emit("typing_stop", chatId);
```

**Response Event:** `user_typing`

```javascript
socket.on("user_typing", (data) => {
  console.log(data);
  // {
  //   userId: "uuid",
  //   isTyping: false
  // }
});
```

---

### 6. Message Read Receipt

**Event Name:** `message_read`

```javascript
socket.emit("message_read", {
  chatId: "uuid",
  messageId: "uuid",
});
```

**Response Event:** `message_status_update`

```javascript
socket.on("message_status_update", (data) => {
  console.log(data);
  // {
  //   messageId: "uuid",
  //   isRead: true,
  //   readBy: "uuid",
  //   timestamp: "2024-01-15T10:30:00Z"
  // }
});
```

---

### 7. Attachment Upload Notification

**Event Name:** `attachment_uploaded`

```javascript
socket.emit("attachment_uploaded", {
  chatId: "uuid",
  messageId: "uuid",
  fileName: "document.pdf",
  fileSize: 102400,
  mimeType: "application/pdf",
});
```

**Response Event:** `new_attachment`

```javascript
socket.on("new_attachment", (data) => {
  console.log(data);
  // {
  //   messageId: "uuid",
  //   fileName: "document.pdf",
  //   fileSize: 102400,
  //   mimeType: "application/pdf",
  //   uploadedBy: "uuid",
  //   timestamp: "2024-01-15T10:30:00Z"
  // }
});
```

---

### 8. Attachment Deletion Notification

**Event Name:** `attachment_deleted`

```javascript
socket.emit("attachment_deleted", {
  chatId: "uuid",
  attachmentId: "uuid",
});
```

**Response Event:** `attachment_removed`

```javascript
socket.on("attachment_removed", (data) => {
  console.log(data);
  // {
  //   attachmentId: "uuid",
  //   removedBy: "uuid"
  // }
});
```

---

## 🔐 Encryption & Security

### File Encryption Flow

**Upload (Client → Server):**

1. Client generates random 32-byte AES-256-GCM key
2. Client encrypts file with key using crypto library
3. Client uploads encrypted buffer to server
4. Server stores encrypted file in Supabase (chat-files bucket)
5. Server stores encryption key in message_attachments table

**Download (Server → Client):**

1. Client requests attachment download
2. Server fetches encrypted file from Supabase
3. Server returns encrypted file buffer
4. Client fetches stored encryption key from message_attachments
5. Client decrypts file locally using NaCl.js
6. Client triggers browser download

### Encryption Details

**Backend (Node.js crypto):**

```javascript
// AES-256-GCM encryption
const algorithm = "aes-256-gcm";
const key = crypto.randomBytes(32); // 256 bits
const iv = crypto.randomBytes(16); // 128 bits

const cipher = crypto.createCipheriv(algorithm, key, iv);
const encrypted = Buffer.concat([
  cipher.update(data),
  cipher.final(),
  cipher.getAuthTag(),
]);
```

**Frontend (TweetNaCl.js):**

```javascript
// NaCl secretbox encryption (symmetric)
const key = nacl.randomBytes(32);
const nonce = nacl.randomBytes(24);

const encrypted = nacl.secretbox(plaintext, nonce, key);
const combined = Buffer.concat([nonce, encrypted]);
```

---

## 🗂️ File Storage

### Supabase Storage Bucket

**Bucket Name:** `chat-files`

**Configuration:**

```javascript
{
  name: 'chat-files',
  public: false,
  file_size_limit: 52428800, // 50MB
  allowed_mime_types: [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/*'
  ]
}
```

**File Path Pattern:** `chats/{chatId}/{fileName}-{randomString}`

---

## 📝 Implementation Checklist

### Backend Setup

- [x] Message model with proper schema (chats, chat_members, messages)
- [x] Attachment CRUD operations
- [x] Message controller with all handlers
- [x] Message routes with proper endpoints
- [x] Socket.io implementation with 8 events
- [x] Encryption utilities (AES-256-GCM)
- [x] Storage configuration (chat-files bucket)
- [x] Access control validation (chat_members check)

### Database Setup

- [x] chats table
- [x] chat_members table
- [x] messages table
- [x] message_attachments table (NEW)

### Frontend Setup

- [ ] Update API endpoints in src/lib/api.ts
- [ ] Create/update Socket.io utility (src/lib/socketIO.ts)
- [ ] Update useMessages hook
- [ ] Create/update useAttachments hook
- [ ] Update MessagesPage.tsx with real-time UI
- [ ] Add TweetNaCl.js encryption utilities
- [ ] Test encryption/decryption pipeline

---

## 🧪 Testing Guide

### 1. Test Direct Chat Creation

```bash
curl -X POST http://localhost:5000/api/chats/start \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"participantId": "user-uuid-2"}'
```

**Expected:**

- Returns chat object
- chat_members table has 2 entries

### 2. Test Message Sending

```bash
curl -X POST http://localhost:5000/api/chats/{chatId}/messages \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello!"}'
```

**Expected:**

- Message stored in messages table
- Socket event emitted to chat room

### 3. Test File Upload

```bash
curl -X POST http://localhost:5000/api/chats/{chatId}/attachments \
  -H "Authorization: Bearer {TOKEN}" \
  -F "file=@document.pdf" \
  -F "encryptionKey=base64-key"
```

**Expected:**

- File stored in chat-files bucket (encrypted)
- Entry in message_attachments table
- Returns attachment metadata

### 4. Test Chat Deletion

```bash
curl -X DELETE http://localhost:5000/api/chats/{chatId} \
  -H "Authorization: Bearer {TOKEN}"
```

**Expected:**

- Cascade deletion of:
  - message_attachments
  - messages
  - chat_members
  - chats entry

---

## 🚀 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/deeptech

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-jwt-secret

# Socket.io
SOCKET_CORS_ORIGIN=http://localhost:5173
```

---

## 📊 Database Relationships

```
chats (1) ---> (M) chat_members
     |              |
     |              └---> user_id (from profiles)
     |
     └---> (M) messages
               |
               ├---> sender_id (from profiles)
               |
               └---> (M) message_attachments
```

---

## ⚠️ Important Notes

1. **Chat Membership Required:** Users must be members of a chat before sending messages
2. **Cascade Deletes:** Deleting a chat cascades to all messages and attachments
3. **Encryption Keys:** Stored separately for each attachment - needed for decryption
4. **Socket.io Auth:** All socket connections require valid JWT token
5. **File Size Limit:** 50MB maximum per file in Supabase bucket
6. **Read Receipts:** Currently infrastructure-ready, can be enhanced with message_read_receipts table

---

## 📚 Related Files

- [messageModel.js](/backend/models/messageModel.js) - Database operations
- [messageController.js](/backend/controllers/messageController.js) - HTTP handlers
- [messageRoutes.js](/backend/routes/messageRoutes.js) - Express routes
- [encryption.js](/backend/utils/encryption.js) - AES-256-GCM utilities
- [storage.js](/backend/utils/storage.js) - Supabase bucket management
- [server.js](/backend/server.js) - Socket.io setup

---

**Last Updated:** January 2024
**Version:** 1.0.0
**Status:** Production Ready
