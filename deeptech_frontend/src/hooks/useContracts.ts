import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { contractsApi } from '@/lib/api';

export function useContracts(status?: string) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['contracts', status],
    queryFn: async () => {
      if (!token) return [];
      const response = await contractsApi.getAll(token, status); //
      return response.data;
    },
    enabled: !!token,
  });
}

export function useContract(id: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      if (!token) throw new Error('No token');
      const response = await contractsApi.getById(id, token); //
      return response.data;
    },
    enabled: !!token && !!id,
  });
}

// ✅ NEW: Mutation to Hire an Expert (Accept Proposal)
export function useAcceptContract() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractId: string) => {
      if (!token) throw new Error('Not authenticated');
      return await contractsApi.accept(contractId, token); //
    },
    onSuccess: (_, contractId) => {
      // Refresh contracts and the specific project associated with it
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useContractHourLogs(contract_id: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['hourLogs', contract_id],
    queryFn: async () => {
      if (!token) return [];
      const response = await contractsApi.getHourLogs(contract_id, token); //
      return response.data;
    },
    enabled: !!token && !!contract_id,
  });
}

export function useContractInvoices(contract_id: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['invoices', contract_id],
    queryFn: async () => {
      if (!token) return [];
      const response = await contractsApi.getInvoices(contract_id, token); //
      return response.data;
    },
    enabled: !!token && !!contract_id,
  });
}

export function useLogHours() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contract_id, data }: { contract_id: string; data: any }) => {
      if (!token) throw new Error('No token');
      
      if (!contract_id || contract_id === 'undefined') {
        throw new Error('Contract ID is required to log hours');
      }
      
      return await contractsApi.logHours(contract_id, data, token); //
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hourLogs', variables.contract_id] });
      queryClient.invalidateQueries({ queryKey: ['contract', variables.contract_id] });
    },
  });
}