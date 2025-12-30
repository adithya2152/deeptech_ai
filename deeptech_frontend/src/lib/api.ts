const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

interface ApiError {
  error: string
  message?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'Network error',
        message: response.statusText,
      }))
      console.error('❌ API Error:', error)
      throw new Error(error.message || error.error)
    }

    const data = await response.json()

    return data as T
  }

  async get<T>(endpoint: string, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })
    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: data ? JSON.stringify(data) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async patch<T>(endpoint: string, data: any, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, data: any, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    })
    return this.handleResponse<T>(response)
  }
}

export const api = new ApiClient(API_BASE_URL)

export const authApi = {
  // Updated to match your backend controller's "data" wrapper
  login: (email: string, password: string) =>
    api.post<{
      message?: string;
      success: boolean;
      data: {
        user: any;
        tokens: { accessToken: string; refreshToken: string }
      }
    }>(
      '/auth/login',
      { email, password }
    ),

  register: (data: {
    email: string
    password: string
    first_name: string
    last_name: string
    role: 'buyer' | 'expert'
    domains?: string[]
  }) => {
    const payload = {
      ...data
    }
    return api.post<{
      success: boolean;
      data: {
        user: any;
        tokens: { accessToken: string; refreshToken: string }
      }
    }>(
      '/auth/register',
      payload
    )
  },

  logout: (token: string) => api.post('/auth/logout', undefined, token),

  getProfile: (token: string) => api.get<{ success: boolean; data: any }>('/auth/me', token),

  updateProfile: (token: string, data: any) =>
  api.patch<{
    message?: string; success: boolean; data: any 
}>('/auth/profile', data, token),
}

export const projectsApi = {
  getAll: (token: string, status?: string) => {
    const query = status ? `?status=${status}` : ''
    return api.get<{ data: any[] }>(`/projects${query}`, token)
  },

  getById: (id: string, token: string) =>
    api.get<{ data: any }>(`/projects/${id}`, token),

  create: (data: any, token: string) =>
    api.post<{ message: string; data: any }>('/projects', data, token),

  update: (id: string, data: any, token: string) =>
    api.put<{ message: string; data: any }>(`/projects/${id}`, data, token),

  delete: (id: string, token: string) =>
    api.delete<{ message: string; data: any }>(`/projects/${id}`, token),
}

export const expertsApi = {
  getAll: (token?: string, filters?: {
    domains?: string[]
    rateMin?: number
    rateMax?: number
    onlyVerified?: boolean
    searchQuery?: string
  }) => {
    const params = new URLSearchParams()
    if (filters?.domains?.length) params.append('domain', filters.domains.join(','))
    if (filters?.rateMin) params.append('rateMin', filters.rateMin.toString())
    if (filters?.rateMax) params.append('rateMax', filters.rateMax.toString())
    if (filters?.onlyVerified) params.append('onlyVerified', 'true')
    if (filters?.searchQuery) params.append('query', filters.searchQuery)

    const query = params.toString() ? `?${params.toString()}` : ''
    return api.get<{ data: any[] }>(`/experts${query}`, token)
  },

  semanticSearch: (query: string, token?: string) =>
    api.post<{ results: any[], query: string, total: number }>('/experts/semantic-search', { query }, token),

  getById: (id: string, token?: string) =>
    api.get<{ data: any }>(`/experts/${id}`, token),
}

export const messagesApi = {
  getConversations: (token: string) =>
    api.get<{ conversations: any[] }>('/conversations', token),

  getMessages: (conversationId: string, token: string) =>
    api.get<{ messages: any[] }>(`/conversations/${conversationId}/messages`, token),

  sendMessage: (conversationId: string, content: string, token: string) =>
    api.post<{ message: any }>(
      `/conversations/${conversationId}/messages`,
      { content },
      token
    ),

  markAsRead: (conversationId: string, token: string) =>
    api.patch<{ message: string }>(`/conversations/${conversationId}/read`, {}, token),
}