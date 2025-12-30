import { Contract } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export interface CreateContractInput {
  projectId: string
  expertId: string
  engagementType: 'hourly' | 'fixed'
  hourlyRate: number
  weeklyHourCap: number
  startDate: string
  endDate?: string
  ipOwnership: 'client' | 'shared' | 'expert'
  ndaSigned: boolean
  escrowAmount?: number
}

export interface LogHoursInput {
  date: string
  hours: number
  description: string
  valueTags: {
    decisionMade?: string
    riskAvoided?: string
    pathClarified?: string
    knowledgeTransferred?: string
    problemSolved?: string
  }
}

export interface HourLog {
  id: string
  contractId: string
  expertId: string
  date: Date
  hours: number
  description: string
  valueTags: {
    decisionMade?: string
    riskAvoided?: string
    pathClarified?: string
    knowledgeTransferred?: string
    problemSolved?: string
  }
  status: 'submitted' | 'approved' | 'rejected'
  buyerComment?: string
  createdAt: Date
}

// Helper function to get headers with auth token
const getHeaders = (token?: string, includeBody: boolean = false): HeadersInit => {
  const headers: HeadersInit = {}
  if (includeBody) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// Contract Management
export const contractService = {
  // Create a new contract (buyer invites expert)
  async createContract(input: CreateContractInput, token?: string): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to create contract')
    }

    const result = await response.json()
    return result.data || result
  },

  // Get all contracts (filtered by user role)
  async getContracts(token?: string): Promise<Contract[]> {
    const response = await fetch(`${API_BASE_URL}/contracts`, {
      headers: getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to fetch contracts')
    }

    const result = await response.json()
    return result.data || result
  },

  // Get a single contract by ID
  async getContract(contractId: string, token?: string): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}`, {
      headers: getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to fetch contract')
    }

    const result = await response.json()
    return result.data || result
  },

  // Expert accepts contract invitation
  async acceptContract(contractId: string, token?: string): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/accept`, {
      method: 'PATCH',
      headers: getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to accept contract')
    }

    const result = await response.json()
    return result.data || result
  },

  // Expert declines contract invitation
  async declineContract(contractId: string, reason?: string, token?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/decline`, {
      method: 'PATCH',
      headers: getHeaders(token, true),
      body: JSON.stringify({ reason }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to decline contract')
    }
  },

  // Pause contract (buyer or expert)
  async pauseContract(contractId: string, reason: string, token?: string): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/pause`, {
      method: 'PATCH',
      headers: getHeaders(token, true),
      body: JSON.stringify({ reason }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to pause contract')
    }

    const result = await response.json()
    return result.data || result
  },

  // Resume paused contract
  async resumeContract(contractId: string, token?: string): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/resume`, {
      method: 'PATCH',
      headers: getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to resume contract')
    }

    const result = await response.json()
    return result.data || result
  },
}

// Hour Logging
export const hourLogService = {
  // Expert logs hours
  async logHours(contractId: string, input: LogHoursInput, token?: string): Promise<HourLog> {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/hours`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to log hours')
    }

    const result = await response.json()
    const log = result.data || result
    
    // Convert date strings to Date objects
    return {
      ...log,
      date: new Date(log.date),
      createdAt: new Date(log.createdAt),
    }
  },

  // Get all hour logs for a contract
  async getHourLogs(contractId: string, token?: string): Promise<HourLog[]> {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/hours`, {
      headers: getHeaders(token),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to fetch hour logs')
    }

    const result = await response.json()
    const logs = result.data || result
    
    // Convert date strings to Date objects
    return logs.map((log: any) => ({
      ...log,
      date: new Date(log.date),
      createdAt: new Date(log.createdAt),
    }))
  },

  // Buyer approves hour log
  async approveHourLog(
    contractId: string,
    hourLogId: string,
    comment?: string,
    token?: string
  ): Promise<HourLog> {
    const response = await fetch(
      `${API_BASE_URL}/contracts/${contractId}/hours/${hourLogId}/approve`,
      {
        method: 'PATCH',
        headers: getHeaders(token, true),
        body: JSON.stringify({ comment }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to approve hour log')
    }

    const result = await response.json()
    const log = result.data || result
    
    return {
      ...log,
      date: new Date(log.date),
      createdAt: new Date(log.createdAt),
    }
  },

  // Buyer rejects hour log
  async rejectHourLog(
    contractId: string,
    hourLogId: string,
    reason: string,
    token?: string
  ): Promise<HourLog> {
    const response = await fetch(
      `${API_BASE_URL}/contracts/${contractId}/hours/${hourLogId}/reject`,
      {
        method: 'PATCH',
        headers: getHeaders(token, true),
        body: JSON.stringify({ reason }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to reject hour log')
    }

    const result = await response.json()
    const log = result.data || result
    
    return {
      ...log,
      date: new Date(log.date),
      createdAt: new Date(log.createdAt),
    }
  },

  // Get weekly hour summary
  async getWeeklySummary(contractId: string, weekStart: string, token?: string): Promise<{
    totalHours: number
    approvedHours: number
    pendingHours: number
    rejectedHours: number
    weeklyLimit: number
    remainingHours: number
  }> {
    const response = await fetch(
      `${API_BASE_URL}/contracts/${contractId}/hours/weekly?week=${weekStart}`,
      { headers: getHeaders(token) }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || error.error || 'Failed to fetch weekly summary')
    }

    const result = await response.json()
    return result.data || result
  },
}
