import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { projectsApi, contractsApi, messagesApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Calendar, DollarSign, Clock, UserCheck, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { Proposal } from '@/types'

interface ProposalsListProps {
  projectId: string
}

export function ProposalsList({ projectId }: ProposalsListProps) {
  const { token } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals', projectId],
    queryFn: async () => {
      const response = await projectsApi.getProposals(projectId, token!)
      return response.data as Proposal[]
    },
    enabled: !!token && !!projectId,
  })

  const acceptProposalMutation = useMutation({
    mutationFn: (proposal: Proposal) => 
      contractsApi.createContract({
        project_id: projectId,
        expert_id: proposal.expert_id,
        hourly_rate: proposal.quote_amount, 
        engagement_type: 'fixed',
        weekly_hour_cap: 0,
        start_date: new Date().toISOString(),
        ip_ownership: 'buyer', 
      }, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast({ title: 'Success', description: 'Proposal accepted and contract created.' })
      navigate('/contracts')
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to accept proposal.', variant: 'destructive' })
    }
  })

  const startConversationMutation = useMutation({
    mutationFn: (expertId: string) => 
      messagesApi.startConversation(expertId, token!),
    onSuccess: (response) => {
      const conversationId = response.conversation.id; 
      
      navigate(`/messages?id=${conversationId}`);
      
      toast({ 
        title: 'Chat Initiated', 
        description: 'Opening your conversation with the expert.' 
      });
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to start chat. Please check if the backend route is registered.', 
        variant: 'destructive' 
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="text-center p-12 border-2 border-dashed rounded-xl bg-muted/20">
        <p className="text-muted-foreground">No proposals received yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        Proposals <Badge variant="secondary">{proposals.length}</Badge>
      </h2>

      <div className="grid gap-4">
        {proposals.map((proposal) => (
          <Card key={proposal.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex gap-4">
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={proposal.expert_avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {proposal.expert_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{proposal.expert_name}</h3>
                      <UserCheck className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Bid: <span className="font-semibold text-foreground">${Number(proposal.quote_amount).toLocaleString()}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Timeline: <span className="font-semibold text-foreground">{proposal.duration_days} days</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(proposal.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => acceptProposalMutation.mutate(proposal)}
                    disabled={acceptProposalMutation.isPending}
                  >
                    {acceptProposalMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Accept'}
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => startConversationMutation.mutate(proposal.expert_id)}
                    disabled={startConversationMutation.isPending}
                  >
                    {startConversationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    Message
                  </Button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-1">Expert's Message:</p>
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  "{proposal.message}"
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}