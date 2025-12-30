import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';// TODO: Remove mock data imports once contract, hour logs, and invoice API endpoints are implementedimport { mockContracts, mockProjects, mockExperts, mockHourLogs, mockInvoices } from '@/data/mockData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hourLogService } from '@/services/contractService';
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
  CheckCircle, XCircle, Pause, Play, MessageSquare, Plus, TrendingUp,
  Shield, Zap, Target
} from 'lucide-react';
import { ValueTag } from '@/types';
import { format } from 'date-fns';

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

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [showLogHoursDialog, setShowLogHoursDialog] = useState(false);
  const [logData, setLogData] = useState({
    hours: '',
    description: '',
    valueTags: [] as ValueTag[],
    decision: '',
  });

  // TODO: Replace with useContract when backend is ready
  const contract = mockContracts.find(c => c.id === id);
  const project = contract ? mockProjects.find(p => p.id === contract.project_id) : null;
  const expert = contract ? mockExperts.find(e => e.id === contract.expert_id) : null;
  const hourLogs = contract ? mockHourLogs.filter(log => log.contract_id === contract.id) : [];
  const invoices = contract ? mockInvoices.filter(inv => inv.contract_id === contract.id) : [];

  if (!contract || !project) {
    return (
      <div className="container max-w-4xl mx-auto py-16 text-center">
        <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Contract Not Found</h2>
        <p className="text-muted-foreground mb-6">The contract you're looking for doesn't exist</p>
        <Button onClick={() => navigate('/contracts')}>Back to Contracts</Button>
      </div>
    );
  }

  const isBuyer = user?.role === 'buyer';
  const isExpert = user?.role === 'expert';

  const statusColors = {
    pending: 'bg-warning text-warning-foreground',
    active: 'bg-success text-success-foreground',
    paused: 'bg-muted text-muted-foreground',
    completed: 'bg-info text-info-foreground',
    disputed: 'bg-destructive text-destructive-foreground',
  };

  const engagementLabels = {
    advisory: 'Advisory',
    architecture_review: 'Architecture Review',
    hands_on_execution: 'Hands-on Execution',
  };

  const queryClient = useQueryClient();

  const logHoursMutation = useMutation({
    mutationFn: (data: { hours: number; description: string; valueTags: Record<string, string>; date: string }) =>
      hourLogService.logHours(id!, data, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hourLogs', id] });
      queryClient.invalidateQueries({ queryKey: ['contracts', id] });
      toast({
        title: 'Hours Logged',
        description: `${logData.hours} hours logged successfully. Awaiting buyer approval.`,
      });
      setShowLogHoursDialog(false);
      setLogData({ hours: '', description: '', valueTags: [], decision: '' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to log hours',
        variant: 'destructive',
      });
    },
  });

  const approveHoursMutation = useMutation({
    mutationFn: ({ hourLogId }: { hourLogId: string }) =>
      hourLogService.approveHourLog(id!, hourLogId, undefined, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hourLogs', id] });
      queryClient.invalidateQueries({ queryKey: ['contracts', id] });
      toast({
        title: 'Hours Approved',
        description: 'Hour log has been approved and payment processed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve hours',
        variant: 'destructive',
      });
    },
  });

  const rejectHoursMutation = useMutation({
    mutationFn: ({ hourLogId, reason }: { hourLogId: string; reason: string }) =>
      hourLogService.rejectHourLog(id!, hourLogId, reason, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hourLogs', id] });
      toast({
        title: 'Hours Rejected',
        description: 'Hour log has been rejected. Expert has been notified.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject hours',
        variant: 'destructive',
      });
    },
  });

  const handleLogHours = async () => {
    if (!logData.hours || !logData.description) {
      toast({
        title: 'Validation Error',
        description: 'Please enter hours and description',
        variant: 'destructive',
      });
      return;
    }

    // Build value tags object
    const valueTags: Record<string, string> = {};
    logData.valueTags.forEach(tag => {
      if (tag === 'decision_made' && logData.decision) {
        valueTags.decisionMade = logData.decision;
      } else {
        valueTags[tag.replace('_', '')] = 'true';
      }
    });

    logHoursMutation.mutate({
      hours: parseFloat(logData.hours),
      description: logData.description,
      valueTags,
      date: new Date().toISOString(),
    });
  };

  const handleApproveHours = (hourLogId: string) => {
    approveHoursMutation.mutate({ hourLogId });
  };

  const handleRejectHours = (hourLogId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      rejectHoursMutation.mutate({ hourLogId, reason });
    }
  };

  const toggleValueTag = (tag: ValueTag) => {
    setLogData(prev => ({
      ...prev,
      valueTags: prev.valueTags.includes(tag)
        ? prev.valueTags.filter(t => t !== tag)
        : [...prev.valueTags, tag],
    }));
  };

  const weeklyProgress = (contract.total_hours_logged % contract.weekly_hour_cap) / contract.weekly_hour_cap * 100;

  return (
    <div className="container max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/contracts')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contracts
        </Button>
        
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">{project.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Contract #{contract.id.slice(0, 8)}</span>
              <span>•</span>
              <span>Started {format(new Date(contract.start_date), 'MMM d, yyyy')}</span>
              {expert && (
                <>
                  <span>•</span>
                  <Link to={`/experts/${expert.id}`} className="hover:text-primary">
                    {isBuyer ? `with ${expert.name}` : `for ${project.title}`}
                  </Link>
                </>
              )}
            </div>
          </div>
          <Badge className={statusColors[contract.status]}>
            {contract.status}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Total Hours</span>
                </div>
                <p className="text-2xl font-bold">{contract.total_hours_logged}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Total Amount</span>
                </div>
                <p className="text-2xl font-bold">${(contract.total_amount / 1000).toFixed(1)}k</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">This Week</span>
                </div>
                <p className="text-2xl font-bold">
                  {contract.total_hours_logged % contract.weekly_hour_cap}/{contract.weekly_hour_cap}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">Invoices</span>
                </div>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="hours" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="hours">Hour Logs ({hourLogs.length})</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            {/* Hour Logs Tab */}
            <TabsContent value="hours" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Hour Logs</h3>
                {isExpert && contract.status === 'active' && (
                  <Dialog open={showLogHoursDialog} onOpenChange={setShowLogHoursDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Log Hours
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Log Hours</DialogTitle>
                        <DialogDescription>
                          Record the work you've completed and the value delivered
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="hours">Hours Worked</Label>
                          <Input
                            id="hours"
                            type="number"
                            step="0.5"
                            min="0"
                            max={contract.weekly_hour_cap}
                            placeholder="4.5"
                            value={logData.hours}
                            onChange={(e) => setLogData({ ...logData, hours: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Weekly cap: {contract.weekly_hour_cap} hours
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="description">Work Description</Label>
                          <Textarea
                            id="description"
                            placeholder="Describe what you accomplished during this session..."
                            rows={4}
                            value={logData.description}
                            onChange={(e) => setLogData({ ...logData, description: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Value Delivered (select all that apply)</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {(Object.entries(valueTagLabels) as [ValueTag, string][]).map(([tag, label]) => {
                              const Icon = valueTagIcons[tag];
                              const isSelected = logData.valueTags.includes(tag);
                              return (
                                <Button
                                  key={tag}
                                  type="button"
                                  variant={isSelected ? 'default' : 'outline'}
                                  className="justify-start h-auto py-3"
                                  onClick={() => toggleValueTag(tag)}
                                >
                                  <Icon className="h-4 w-4 mr-2" />
                                  {label}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                        {logData.valueTags.includes('decision_made') && (
                          <div>
                            <Label htmlFor="decision">Key Decision or Recommendation</Label>
                            <Textarea
                              id="decision"
                              placeholder="What key decision or recommendation did you make?"
                              rows={3}
                              value={logData.decision}
                              onChange={(e) => setLogData({ ...logData, decision: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLogHoursDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleLogHours}
                          disabled={!logData.hours || !logData.description || logData.valueTags.length === 0}
                        >
                          Submit for Approval
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="space-y-3">
                {hourLogs.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hours logged yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  hourLogs.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()).map((log) => (
                    <Card key={log.id} className={log.status !== 'approved' && isBuyer ? 'border-warning' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold">{log.hours_worked}h</div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(log.log_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.status === 'approved' ? (
                              <Badge variant="outline" className="bg-success/10">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-warning/10">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pending Approval
                              </Badge>
                            )}
                            {log.status !== 'approved' && isBuyer && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleApproveHours(log.id)}
                                  disabled={approveHoursMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleRejectHours(log.id)}
                                  disabled={rejectHoursMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm mb-3">{log.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(log.value_tags).map(([tag, value]) => {
                            if (!value || value === 'true') return null;
                            const Icon = valueTagIcons[tag as ValueTag];
                            return (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Icon className="h-3 w-3 mr-1" />
                                {valueTagLabels[tag as ValueTag]}
                              </Badge>
                            );
                          })}
                        </div>
                        {log.value_tags.decision_made && log.value_tags.decision_made !== 'true' && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Key Decision:</p>
                            <p className="text-sm text-muted-foreground">{log.value_tags.decision_made}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="space-y-4">
              {invoices.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No invoices yet</p>
                  </CardContent>
                </Card>
              ) : (
                invoices.map((invoice) => (
                  <Card key={invoice.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {format(invoice.week_start_date, 'MMM d')} - {format(invoice.week_end_date, 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.total_hours}h × ${contract.hourly_rate}/hr
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">${invoice.total_amount.toLocaleString()}</p>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contract Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                          <p className="text-sm text-muted-foreground">Engagement Type</p>
                      <p className="font-medium">{engagementLabels[contract.engagement_type]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Hourly Rate</p>
                      <p className="font-medium">${contract.hourly_rate}/hour</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Weekly Hour Cap</p>
                      <p className="font-medium">{contract.weekly_hour_cap} hours</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">IP Ownership</p>
                      <p className="font-medium capitalize">{contract.ip_ownership.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">NDA Status</p>
                      <p className="font-medium">{contract.nda_signed ? 'Signed' : 'Not Signed'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Escrow Balance</p>
                      <p className="font-medium">${contract.escrow_balance.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                          <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p>{project.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Expected Outcome</p>
                    <p>{project.expected_outcome}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>TRL {project.trl_level}</Badge>
                    <Badge variant="outline">{project.domain}</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Weekly Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Hours This Week</span>
                  <span className="font-semibold">
                    {contract.total_hours_logged % contract.weekly_hour_cap}/{contract.weekly_hour_cap}h
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(weeklyProgress, 100)}%` }}
                  />
                </div>
              </div>
              {weeklyProgress >= 90 && (
                <p className="text-xs text-warning flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  Approaching weekly hour cap
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              {isBuyer && contract.status === 'active' && (
                <Button variant="outline" className="w-full justify-start">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Contract
                </Button>
              )}
              {isExpert && contract.status === 'paused' && (
                <Button variant="outline" className="w-full justify-start">
                  <Play className="h-4 w-4 mr-2" />
                  Request Resume
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                Raise Dispute
              </Button>
            </CardContent>
          </Card>

          {/* Expert Info (for buyers) */}
          {isBuyer && expert && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expert</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to={`/experts/${expert.id}`} className="block hover:opacity-80 transition-opacity">
                  <p className="font-semibold mb-1">{expert.name}</p>
                  <p className="text-sm text-muted-foreground mb-2">{expert.bio}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span>⭐ {expert.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{expert.review_count} reviews</span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
