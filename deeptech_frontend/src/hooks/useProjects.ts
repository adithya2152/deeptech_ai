import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { projectsApi } from '@/lib/api'
import { Project, ProjectStatus } from '@/types'

// 1. BUYER: Get my own projects (filtered by status optionally)
export function useProjects(status?: ProjectStatus) {
  const { user, token } = useAuth()

  return useQuery({
    queryKey: ['projects', user?.id, status],
    queryFn: async () => {
      if (!user || !token) return []

      const response = await projectsApi.getAll(token, status)
      
      return (response.data || []) as Project[]
    },
    enabled: !!user && !!token,
    initialData: [],
  })
}

// 2. EXPERT: Get all active marketplace projects
export function useMarketplaceProjects() {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['marketplace-projects'],
    queryFn: async () => {
      if (!token) return []

      const response = await projectsApi.getMarketplace(token)
      
      return (response.data || []) as Project[]
    },
    enabled: !!token,
    initialData: [],
  })
}

// 3. COMMON: Get single project by ID
export function useProject(id: string) {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!token) throw new Error('Not authenticated')

      const response = await projectsApi.getById(id, token)
      
      return response.data as Project
    },
    enabled: !!id && !!token,
  })
}

// 4. BUYER: Create new project
export function useCreateProject() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    // ✅ FIX: Removed 'status' from Omit so you can explicitly pass status: 'draft'
    mutationFn: async (projectData: Omit<Project, 'id' | 'buyer_id' | 'created_at' | 'updated_at'>) => {
      if (!token) throw new Error('Not authenticated')

      const response = await projectsApi.create(projectData, token)
      
      return response.data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// 5. BUYER: Update project details
export function useUpdateProject() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      if (!token) throw new Error('Not authenticated')

      const response = await projectsApi.update(id, data, token)
      
      return response.data as Project
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] })
    },
  })
}

// 6. BUYER: Delete project
export function useDeleteProject() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!token) throw new Error('Not authenticated')

      await projectsApi.delete(id, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// 7. BUYER: Update project status (Draft -> Active -> Completed)
export function useUpdateProjectStatus() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      if (!token) throw new Error('Not authenticated')

      const response = await projectsApi.update(id, { status }, token)
      
      return response.data as Project
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-projects'] })
    },
  })
}