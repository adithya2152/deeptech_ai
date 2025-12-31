const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface ApiError {
  error: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: "Network error",
        message: response.statusText,
      }));
      console.error("❌ API Error:", error);
      throw new Error(error.message || error.error);
    }
    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(token),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data: any, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PATCH",
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    return this.handleResponse<T>(response);
  }
}

export const api = new ApiClient(API_BASE_URL);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{
      success: boolean;
      data: {
        user: any;
        tokens: { accessToken: string; refreshToken: string };
      };
    }>("/auth/login", { email, password }),

  register: (data: any) =>
    api.post<{
      success: boolean;
      data: {
        user: any;
        tokens: { accessToken: string; refreshToken: string };
      };
    }>("/auth/register", data),

  logout: (token: string) => api.post("/auth/logout", undefined, token),
  getProfile: (token: string) =>
    api.get<{ success: boolean; data: any }>("/auth/me", token),
};

export const expertsApi = {
  getAll: (
    token?: string,
    filters?: {
      domains?: string[];
      rateMin?: number;
      rateMax?: number;
      onlyVerified?: boolean;
      searchQuery?: string;
    }
  ) => {
    const params = new URLSearchParams();
    if (filters?.domains?.length)
      params.append("domain", filters.domains.join(","));
    if (filters?.rateMin) params.append("rateMin", filters.rateMin.toString());
    if (filters?.rateMax) params.append("rateMax", filters.rateMax.toString());
    if (filters?.onlyVerified) params.append("onlyVerified", "true");
    if (filters?.searchQuery) params.append("query", filters.searchQuery);

    const query = params.toString() ? `?${params.toString()}` : "";
    return api.get<{ data: any[] }>(`/experts${query}`, token);
  },

  getById: (id: string, token?: string) =>
    api.get<{ data: any }>(`/experts/${id}`, token),
};

export const projectsApi = {
  getAll: (token: string, status?: string) => {
    const query = status ? `?status=${status}` : "";
    return api.get<{ data: any[] }>(`/projects${query}`, token);
  },

  getMarketplace: (token: string) =>
    api.get<{ data: any[] }>("/projects/marketplace", token),

  getById: (id: string, token: string) =>
    api.get<{ data: any }>(`/projects/${id}`, token),

  create: (data: any, token: string) =>
    api.post<{ message: string; data: any }>("/projects", data, token),

  update: (id: string, data: any, token: string) =>
    api.patch<{ message: string; data: any }>(`/projects/${id}`, data, token),

  delete: (id: string, token: string) =>
    api.delete<{ message: string; data: any }>(`/projects/${id}`, token),

  getProposals: (projectId: string, token: string) =>
    api.get<{ data: any[] }>(`/projects/${projectId}/proposals`, token),

  submitProposal: (
    projectId: string,
    data: { amount: number; duration: number; cover_letter: string },
    token: string
  ) =>
    api.post<{ message: string; data: any }>(
      `/projects/${projectId}/proposals`,
      data,
      token
    ),
};

export const contractsApi = {
  getAll: (token: string, status?: string) => {
    const query = status && status !== "all" ? `?status=${status}` : "";
    return api.get<{ data: any[] }>(`/contracts${query}`, token);
  },

  getById: (id: string, token: string) =>
    api.get<{ data: any }>(`/contracts/${id}`, token),

  semanticSearch: (query: string, token?: string) =>
    api.post<{ results: any[], query: string, total: number }>('/experts/semantic-search', { query }, token),

  createContract: (data: any, token: string) =>
    api.post<{ message: string; data: any }>("/contracts", data, token),

  getHourLogs: (id: string, token: string) =>
    api.get<{ data: any[] }>(`/contracts/${id}/hour-logs`, token),

  getInvoices: (id: string, token: string) =>
    api.get<{ data: any[] }>(`/contracts/${id}/invoices`, token),

  accept: (id: string, token: string) =>
    api.patch<{ message: string; data: any }>(
      `/contracts/${id}/accept`,
      {},
      token
    ),

  decline: (id: string, reason: string | undefined, token: string) =>
    api.patch<{ message: string; data: any }>(
      `/contracts/${id}/decline`,
      { reason },
      token
    ),

  logHours: (contractId: string, data: any, token: string) =>
    api.post<{ message: string; data: any }>(
      `/contracts/${contractId}/hours`,
      data,
      token
    ),

  approveHourLog: (contractId: string, logId: string, token: string) =>
    api.patch<{ message: string; data: any }>(
      `/contracts/${contractId}/hours/${logId}/approve`,
      {},
      token
    ),

  rejectHourLog: (
    contractId: string,
    logId: string,
    reason: string,
    token: string
  ) =>
    api.patch<{ message: string; data: any }>(
      `/contracts/${contractId}/hours/${logId}/reject`,
      { reason },
      token
    ),
};

export const messagesApi = {
  // Get all chats for current user
  getChats: (token: string) => api.get<any[]>("/chats", token),

  // Start or fetch direct chat with a user
  startDirectChat: (participantId: string, token: string) =>
    api.post<{ id: string; type: string; createdAt: string; members: any[] }>(
      "/chats/start",
      { participantId },
      token
    ),

  // Get chat details with all members
  getChatDetails: (chatId: string, token: string) =>
    api.get<{ id: string; type: string; members: any[] }>(
      `/chats/${chatId}`,
      token
    ),

  // Get all messages in a chat
  getMessages: (chatId: string, token: string) =>
    api.get<any[]>(`/chats/${chatId}/messages`, token),

  // Send message to chat
  sendMessage: (chatId: string, content: string, token: string) =>
    api.post<{
      id: string;
      chatId: string;
      senderId: string;
      content: string;
      createdAt: string;
    }>(`/chats/${chatId}/messages`, { content }, token),

  // Add user to chat
  addChatMember: (chatId: string, userId: string, token: string) =>
    api.post<{ message: string; userId: string; chatId: string }>(
      `/chats/${chatId}/members`,
      { userId },
      token
    ),

  // Remove user from chat
  removeChatMember: (chatId: string, userId: string, token: string) =>
    api.delete<{ message: string; userId: string; chatId: string }>(
      `/chats/${chatId}/members`,
      token
    ),

  // Delete chat
  deleteChat: (chatId: string, token: string) =>
    api.delete<{ message: string; chatId: string }>(`/chats/${chatId}`, token),

  // Upload file attachment
  uploadAttachment: async (
    chatId: string,
    formData: FormData,
    token: string
  ) => {
    const response = await fetch(
      `${
        import.meta.env.VITE_API_URL || "http://localhost:5000/api"
      }/chats/${chatId}/attachments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to upload attachment");
    }
    return response.json();
  },

  // Download attachment
  downloadAttachment: (attachmentId: string, token: string) =>
    api.get<Blob>(`/attachments/${attachmentId}`, token),

  // Delete attachment
  deleteAttachment: (attachmentId: string, token: string) =>
    api.delete<{ message: string; attachmentId: string }>(
      `/attachments/${attachmentId}`,
      token
    ),
};
