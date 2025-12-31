import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { contractsApi, messagesApi } from '@/lib/api';
import { useContract, useContractHourLogs, useContractInvoices, useLogHours } from '@/hooks/useContracts';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Clock, DollarSign, Calendar, FileText, AlertCircle,
  CheckCircle, TrendingUp, Shield, Zap, Target, Loader2, MessageSquare, Plus
} from 'lucide-react';
import { ValueTag } from '@/types';
import { format, isSameWeek } from 'date-fns';

const valueTagIcons: Record<ValueTag, any> = {
  decision_made: Target,
  risk_avoided: Shield,
  path_clarified: TrendingUp,
  knowledge_transferred: Zap,
  problem_solved: CheckCircle,
};

const valueTagLabels: Record<ValueTag, string> = {
  decision_made: 'Decision Made',
  risk_avoided: 'Risk Avoided',
  path_clarified: 'Path Clarified',
  knowledge_transferred: 'Knowledge Transferred',
  problem_solved: 'Problem Solved',
};

const statusColors: any = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-200',
  active: 'bg-green-500/10 text-green-500 border-green-200',
  paused: 'bg-gray-500/10 text-gray-500 border-gray-200',
  completed: 'bg-blue-500/10 text-blue-500 border-blue-200',
  disputed: 'bg-red-500/10 text-red-500 border-red-200',
};

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showLogHoursDialog, setShowLogHoursDialog] = useState(false);
  const [logData, setLogData] = useState({
    hours: '',
    description: '',
    valueTags: [] as ValueTag[],
    decision: '',
  });

  const { data: contract, isLoading: loadingContract } = useContract(id!);
  const { data: hourLogs, isLoading: loadingLogs } = useContractHourLogs(id!);
  const { data: invoices, isLoading: loadingInvoices } = useContractInvoices(id!);

  const logHoursMutation = useLogHours();

  const approveHoursMutation = useMutation({
    mutationFn: ({ hourLogId }: { hourLogId: string }) =>
      contractsApi.approveHourLog(id!, hourLogId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hourLogs', id] });
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      toast({ title: 'Hours Approved', description: 'Payment processing initiated.' });
    },
  });

  const rejectHoursMutation = useMutation({
    mutationFn: ({ hourLogId, reason }: { hourLogId: string; reason: string }) =>
      contractsApi.rejectHourLog(id!, hourLogId, reason, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hourLogs', id] });
      toast({ title: 'Hours Rejected', description: 'Expert has been notified.' });
    },
  });

  const isBuyer = user?.role === 'buyer';
  const isExpert = user?.role === 'expert';

  const otherUserId = isBuyer ? contract?.expert_id : contract?.buyer_id;
  const otherUserName = isBuyer 
    ? `${contract?.expert?.first_name || 'Expert'}` 
    : `${contract?.buyer?.first_name || 'Buyer'}`;

  const startChatMutation = useMutation({
    mutationFn: () => messagesApi.startConversation(otherUserId, token!),
    onSuccess: (response) => {
      navigate(`/messages?id=${response.conversation.id}`);
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to open chat.', 
        variant: 'destructive' 
      });
    }
  });

  const currentWeekHours = useMemo(() => {
    if (!hourLogs) return 0;
    const now = new Date();
    return hourLogs
      .filter((log: any) => 
        isSameWeek(new Date(log.log_date), now, { weekStartsOn: 1 }) && 
        log.status !== 'rejected'
      )
      .reduce((sum: number, log: any) => sum + Number(log.hours_worked), 0);
  }, [hourLogs]);

  if (loadingContract || loadingLogs || loadingInvoices) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!contract) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto py-16 text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Contract Not Found</h2>
          <Button onClick={() => navigate('/contracts')}>Back to Contracts</Button>
        </div>
      </Layout>
    );
  }

  const project = contract.project;

  const handleLogHours = async () => {
    if (!logData.hours || !logData.description) return;

    const valueTags: Record<string, any> = {};
    logData.valueTags.forEach(tag => {
      valueTags[tag] = tag === 'decision_made' ? logData.decision : true;
    });

    logHoursMutation.mutate({
      contract_id: id!,
      data: {
        log_date: new Date().toISOString(),
        hours_worked: parseFloat(logData.hours),
        description: logData.description,
        value_tags: valueTags,
      },
    }, {
      onSuccess: () => {
        setShowLogHoursDialog(false);
        setLogData({ hours: '', description: '', valueTags: [], decision: '' });
        toast({ title: 'Success', description: 'Hours logged successfully.' });
      }
    });
  };

  const toggleValueTag = (tag: ValueTag) => {
    setLogData(prev => ({
      ...prev,
      valueTags: prev.valueTags.includes(tag)
        ? prev.valueTags.filter(t => t !== tag)
        : [...prev.valueTags, tag],
    }));
  };

  const hour_cap = Number(contract.weekly_hour_cap) || 0;
  const logged_hours_total = Number(contract.total_hours_logged) || 0;
  
  const weeklyProgress = hour_cap > 0
    ? (currentWeekHours / hour_cap) * 100
    : 0;

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/contracts')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">{project?.title || 'Contract Details'}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>ID: {contract.id.slice(0, 8)}</span>
                <span>•</span>
                <span>Started {format(new Date(contract.start_date), 'MMM d, yyyy')}</span>
              </div>
            </div>
            <Badge variant="outline" className={`${statusColors[contract.status]} capitalize px-3 py-1`}>
              {contract.status}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Total Hours</span>
                  </div>
                  <p className="text-2xl font-bold">{logged_hours_total.toFixed(1)}h</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Total Paid</span>
                  </div>
                  <p className="text-2xl font-bold">${Number(contract.total_amount || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Weekly Cap</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {hour_cap > 0 ? `${hour_cap}h` : 'None'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs">Invoices</span>
                  </div>
                  <p className="text-2xl font-bold">{invoices?.length || 0}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="hours" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="hours">Hour Logs</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="hours" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Work Progress</h3>
                  {isExpert && contract.status === 'active' && (
                    <Dialog open={showLogHoursDialog} onOpenChange={setShowLogHoursDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Log Hours
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Log Work Hours</DialogTitle>
                          <DialogDescription>Record your progress for this contract</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <Label htmlFor="hours">Hours Worked</Label>
                            <Input
                              id="hours"
                              type="number"
                              placeholder="e.g. 2.5"
                              value={logData.hours}
                              onChange={(e) => setLogData({ ...logData, hours: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Work Description</Label>
                            <Textarea
                              id="description"
                              placeholder="What did you accomplish?"
                              rows={3}
                              value={logData.description}
                              onChange={(e) => setLogData({ ...logData, description: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Value Tags</Label>
                            <div className="flex flex-wrap gap-2">
                              {(Object.entries(valueTagLabels) as [ValueTag, string][]).map(([tag, label]) => {
                                const Icon = valueTagIcons[tag];
                                const isSelected = logData.valueTags.includes(tag);
                                return (
                                  <Button
                                    key={tag}
                                    type="button"
                                    variant={isSelected ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-8"
                                    onClick={() => toggleValueTag(tag)}
                                  >
                                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                                    {label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>

                          {logData.valueTags.includes('decision_made') && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                              <Label htmlFor="decision" className="text-primary">Decision Details</Label>
                              <Input
                                id="decision"
                                placeholder="What key decision was reached?"
                                value={logData.decision}
                                onChange={(e) => setLogData({ ...logData, decision: e.target.value })}
                                className="border-primary/20 bg-primary/5"
                              />
                            </div>
                          )}

                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowLogHoursDialog(false)}>Cancel</Button>
                          <Button onClick={handleLogHours} disabled={!logData.hours || !logData.description || logHoursMutation.isPending}>
                            {logHoursMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Hours'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                <div className="grid gap-3">
                  {!hourLogs || hourLogs.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                      <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No hours logged for this contract yet.</p>
                    </div>
                  ) : (
                    hourLogs.map((log: any) => (
                      <Card key={log.id} className={log.status === 'submitted' && isBuyer ? 'border-primary/50 bg-primary/5' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg">{log.hours_worked}h</span>
                                <Badge variant={log.status === 'approved' ? 'secondary' : 'outline'} className="capitalize">
                                  {log.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {format(new Date(log.log_date || log.created_at), 'MMM d, h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed mb-3">{log.description}</p>
                              
                              {log.value_tags && Object.keys(log.value_tags).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {Object.keys(log.value_tags).map(tag => {
                                      const val = log.value_tags[tag];
                                      if (typeof val === 'string' && tag === 'decision_made') {
                                        return (
                                           <Badge key={tag} variant="secondary" className="text-[10px] gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100">
                                              <Target className="h-3 w-3" />
                                              Decision: {val}
                                           </Badge>
                                        )
                                      }
                                      return (
                                        <Badge key={tag} variant="outline" className="text-[10px] text-muted-foreground bg-muted/50">
                                          {valueTagLabels[tag as ValueTag]}
                                        </Badge>
                                      )
                                  })}
                                </div>
                              )}
                            </div>

                            {log.status === 'submitted' && isBuyer && (
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  className="h-8"
                                  onClick={() => approveHoursMutation.mutate({ hourLogId: log.id })}
                                  disabled={approveHoursMutation.isPending}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-destructive border-destructive/20 hover:bg-destructive/10"
                                  onClick={() => {
                                    const reason = prompt("Reason for rejection:");
                                    if (reason) rejectHoursMutation.mutate({ hourLogId: log.id, reason });
                                  }}
                                  disabled={rejectHoursMutation.isPending}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="invoices" className="pt-4">
                 <div className="grid gap-3">
                   {!invoices || invoices.length === 0 ? (
                     <p className="text-center py-10 text-muted-foreground text-sm">No invoices generated yet.</p>
                   ) : (
                     invoices.map((inv: any) => (
                       <Card key={inv.id}>
                         <CardContent className="p-4 flex justify-between items-center">
                           <div className="flex items-center gap-3">
                             <div className="bg-primary/10 p-2 rounded">
                               <FileText className="h-5 w-5 text-primary" />
                             </div>
                             <div>
                               <p className="font-medium">INV-{inv.id.slice(0, 6).toUpperCase()}</p>
                               <p className="text-xs text-muted-foreground">{format(new Date(inv.created_at), 'PPP')}</p>
                             </div>
                           </div>
                           <div className="text-right">
                             <p className="font-bold">${inv.total_amount || inv.amount}</p>
                             <Badge variant="outline" className="text-[10px] capitalize">{inv.status}</Badge>
                           </div>
                         </CardContent>
                       </Card>
                     ))
                   )}
                 </div>
              </TabsContent>

              <TabsContent value="details" className="pt-4">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">Financial Terms</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between border-b pb-2">
                            <span className="text-sm text-muted-foreground">Hourly Rate</span>
                            <span className="text-sm font-medium">${contract.hourly_rate}/hr</span>
                          </div>
                          <div className="flex justify-between border-b pb-2">
                            <span className="text-sm text-muted-foreground">Weekly Cap</span>
                            <span className="text-sm font-medium">{contract.weekly_hour_cap || 'None'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">Stakeholders</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between border-b pb-2">
                              <span className="text-sm text-muted-foreground">Expert</span>
                              <span className="text-sm font-medium">{contract.expert?.first_name} {contract.expert?.last_name}</span>
                            </div>
                          </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="bg-primary/[0.02] border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-tight text-muted-foreground">Weekly Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-2xl font-bold">{currentWeekHours.toFixed(1)}h</span>
                  <span className="text-xs text-muted-foreground">of {hour_cap}h limit</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${weeklyProgress > 90 ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${Math.min(weeklyProgress, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed italic">
                  Resets every Monday. Hours exceeding the cap require buyer authorization.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button 
                  className="w-full justify-start text-sm h-9"
                  onClick={() => startChatMutation.mutate()}
                  disabled={startChatMutation.isPending}
                >
                  {startChatMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Message {otherUserName}
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm h-9"
                  onClick={() => window.location.href = 'mailto:support@deeptech.com'}
                >
                  <AlertCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}