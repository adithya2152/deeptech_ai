import { useQuery } from '@tanstack/react-query'
import { expertsApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Domain, Expert } from '@/types'

interface ExpertFilters {
  domains?: Domain[]
  rateMin?: number
  rateMax?: number
  onlyVerified?: boolean
  searchQuery?: string
}

// Get filtered experts
export function useExperts(filters: ExpertFilters = {}) {
  const { token } = useAuth()

  console.log('🔍 useExperts called with filters:', filters, 'token:', !!token)

  return useQuery({
    queryKey: ['experts', filters],
    queryFn: async () => {
      console.log('🔍 Fetching experts via API with filters:', filters)

      const response = await expertsApi.getAll(token, filters)

      console.log('✅ Experts loaded from API:', response.data?.length || 0, 'response:', response)
      
      // Transform regular search results to match Expert interface (camelCase)
      const transformedResults = (response.data || []).map((result: any) => ({
        ...result,
        experienceSummary: result.experience_summary || result.bio,
        hourlyRates: result.hourly_rates,
        vettingStatus: result.vetting_status,
        vettingLevel: result.vetting_level,
        reviewCount: result.review_count,
        totalHours: result.total_hours,
        rating: typeof result.rating === 'string' ? parseFloat(result.rating) : result.rating,
      }))
      
      return transformedResults as Expert[]
    },
    initialData: [],
  })
}

// Semantic search for experts
export function useSemanticExperts(query: string) {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['experts', 'semantic', query],
    queryFn: async () => {
      console.log('🔍 Performing semantic search for experts:', query)
      console.log('🔍 Query enabled:', !!query.trim())
      console.log('🔍 Token present:', !!token)

      try {
        const response = await expertsApi.semanticSearch(query, token)
        console.log('✅ Semantic search response:', response)
        console.log('✅ Semantic search results:', response.results?.length || 0)
        
        // Transform semantic search results to match Expert interface
        const transformedResults = (response.results || []).map((result: any) => {
          console.log('🔄 Transforming result:', result)
          const transformed = {
            ...result,
            experienceSummary: result.experience_summary || result.bio,
            hourlyRates: result.hourly_rates,
            vettingStatus: result.vetting_status,
            vettingLevel: result.vetting_level,
            reviewCount: result.review_count,
            totalHours: result.total_hours,
            rating: typeof result.rating === 'string' ? parseFloat(result.rating) : result.rating,
          }
          console.log('✅ Transformed result:', transformed)
          return transformed
        })
        
        console.log('✅ Final transformed results:', transformedResults)
        return transformedResults as Expert[]
      } catch (error) {
        console.error('❌ Semantic search error:', error)
        throw error
      }
    },
    enabled: !!query.trim(),
  })
}

// Get single expert by ID
export function useExpert(id: string) {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['expert', id],
    queryFn: async () => {
      console.log('🔍 Fetching expert via API:', id)

      const response = await expertsApi.getById(id, token)

      console.log('✅ Expert loaded from API:', response.data)
      return response.data as Expert
    },
    enabled: !!id,
  })
}
