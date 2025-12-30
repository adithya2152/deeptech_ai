import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// TODO: Remove mock data imports once contract API endpoints are implemented
import { mockContracts, mockProjects, mockExperts } from '@/data/mockData';
import { ContractCard } from '@/components/contracts/ContractCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText } from 'lucide-react';
import { ContractStatus } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/services/contractService';
import { useToast } from '@/hooks/use-toast';

export default function ContractsListPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');

  // TODO: Replace with useContracts when backend is ready
  const allContracts = mockContracts;

  const acceptContractMutation = useMutation({
    mutationFn: (contractId: string) => contractService.acceptContract(contractId, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Contract Accepted',
        description: 'You have accepted the contract. You can now start logging hours.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept contract',
        variant: 'destructive',
      });
    },
  });

  const declineContractMutation = useMutation({
    mutationFn: ({ contractId, reason }: { contractId: string; reason?: string }) =>
      contractService.declineContract(contractId, reason, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Contract Declined',
        description: 'You have declined the contract. The client has been notified.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline contract',
        variant: 'destructive',
      });
    },
  });

  const handleAcceptContract = (contractId: string) => {
    acceptContractMutation.mutate(contractId);
  };

  const handleDeclineContract = (contractId: string) => {
    const reason = prompt('Please provide a reason for declining (optional):');
    declineContractMutation.mutate({ contractId, reason: reason || undefined });
  };

  const filteredContracts = allContracts.filter(contract => {
    const project = mockProjects.find(p => p.id === contract.project_id);
    const expert = mockExperts.find(e => e.id === contract.expert_id);
    
    const matchesSearch = !searchQuery || 
      project?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expert?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const contractsByStatus = {
    active: filteredContracts.filter(c => c.status === 'active'),
    pending: filteredContracts.filter(c => c.status === 'pending'),
    completed: filteredContracts.filter(c => c.status === 'completed'),
    paused: filteredContracts.filter(c => c.status === 'paused'),
    disputed: filteredContracts.filter(c => c.status === 'disputed'),
  };

  return (
    <div className="container max-w-7xl mx-auto py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Contracts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your ongoing engagements and track hours
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ContractStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              All ({filteredContracts.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({contractsByStatus.active.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({contractsByStatus.pending.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({contractsByStatus.completed.length})
            </TabsTrigger>
            <TabsTrigger value="other">
              Other ({contractsByStatus.paused.length + contractsByStatus.disputed.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {filteredContracts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No contracts found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search' : 'Your contracts will appear here'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredContracts.map((contract) => {
                  const project = mockProjects.find(p => p.id === contract.projectId);
                  const expert = user?.role === 'buyer' 
                    ? mockExperts.find(e => e.id === contract.expertId)
                    : undefined;
                  
                  return (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      expertName={expert?.name}
                      projectTitle={project?.title}
                      onAccept={handleAcceptContract}
                      onDecline={handleDeclineContract}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {(['active', 'pending', 'completed'] as const).map((status) => (
            <TabsContent key={status} value={status} className="space-y-4 mt-6">
              {contractsByStatus[status].length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No {status} contracts</h3>
                  <p className="text-muted-foreground">
                    Contracts with {status} status will appear here
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {contractsByStatus[status].map((contract) => {
                    const project = mockProjects.find(p => p.id === contract.projectId);
                    const expert = user?.role === 'buyer'
                      ? mockExperts.find(e => e.id === contract.expertId)
                      : undefined;
                    
                    return (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        expertName={expert?.name}
                        projectTitle={project?.title}
                        onAccept={handleAcceptContract}
                        onDecline={handleDeclineContract}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}

          <TabsContent value="other" className="space-y-4 mt-6">
            {[...contractsByStatus.paused, ...contractsByStatus.disputed].length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No paused or disputed contracts</h3>
                <p className="text-muted-foreground">
                  Contracts with paused or disputed status will appear here
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {[...contractsByStatus.paused, ...contractsByStatus.disputed].map((contract) => {
                  const project = mockProjects.find(p => p.id === contract.projectId);
                  const expert = user?.role === 'buyer'
                    ? mockExperts.find(e => e.id === contract.expertId)
                    : undefined;
                  
                  return (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      expertName={expert?.name}
                      projectTitle={project?.title}
                      onAccept={handleAcceptContract}
                      onDecline={handleDeclineContract}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
