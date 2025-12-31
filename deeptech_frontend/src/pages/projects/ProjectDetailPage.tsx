import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { ProjectStatusControls } from '@/components/projects/ProjectStatusControls';
import { RecommendedExpertsList } from '@/components/projects/RecommendedExpertsList';
import { BidDialog } from '@/components/marketplace/BidDialog';
import { ProposalsList } from '@/components/projects/ProposalsList';
import { domainLabels } from '@/lib/constants';
import { 
  ArrowLeft, Calendar, Loader2, 
  Briefcase, Shield, Clock, Globe, Edit2, CheckCircle2, Save, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: projectRes, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!, localStorage.getItem('token')!)
  });

  const project = projectRes?.data;

  const isExpert = user?.role === 'expert';
  const isOwner = user?.id === project?.buyer_id;

  const updateProjectMutation = useMutation({
    mutationFn: (data: any) => projectsApi.update(id!, data, localStorage.getItem('token')!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast({ title: 'Success', description: 'Project details updated.' });
      setIsEditing(false);
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    expected_outcome: '',
    budget_min: 0,
    budget_max: 0
  });

  useEffect(() => {
    if (project) {
      setEditForm({
        title: project.title || '',
        description: project.description || '',
        expected_outcome: project.expected_outcome || '',
        budget_min: project.budget_min || 0,
        budget_max: project.budget_max || 0
      });
    }
  }, [project]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        </div>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout>
        <div className="container py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <Button variant="outline" onClick={() => navigate('/projects')}>Back to Projects</Button>
        </div>
      </Layout>
    );
  }

  const handleSave = () => {
    updateProjectMutation.mutate(editForm);
  };

  // ✅ Helper to check if bidding is allowed
  const isBiddingOpen = project.status === 'open' || project.status === 'active';

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6">
        
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-foreground pl-0" 
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="h-4 w-4 ml-2 mb-[0.1px]" />
            Back to Projects
          </Button>
          
          {isOwner && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateProjectMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" /> Save Changes
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" /> Edit Details
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <ProjectStatusBadge status={project.status} />
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> 
                    Posted {formatDistanceToNow(new Date(project.created_at))} ago
                  </span>
                </div>

                {isEditing ? (
                  <Input 
                    value={editForm.title} 
                    onChange={e => setEditForm({...editForm, title: e.target.value})} 
                    className="text-2xl font-bold h-12"
                  />
                ) : (
                  <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">
                    {project.title}
                  </h1>
                )}
              </div>
              
              {isOwner && !isEditing && (
                <div className="pt-2">
                  <ProjectStatusControls 
                    projectId={project.id} 
                    currentStatus={project.status} 
                    isOwner={isOwner} 
                  />
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-8">
              <section className="space-y-3">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" /> Overview
                </h3>
                {isEditing ? (
                  <Textarea 
                    value={editForm.description} 
                    onChange={e => setEditForm({...editForm, description: e.target.value})} 
                    rows={8}
                    className="resize-none"
                  />
                ) : (
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {project.description}
                  </div>
                )}
              </section>
              
              <section className="space-y-3">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" /> Expected Outcome
                </h3>
                {isEditing ? (
                  <Textarea 
                    value={editForm.expected_outcome} 
                    onChange={e => setEditForm({...editForm, expected_outcome: e.target.value})} 
                    rows={4}
                  />
                ) : (
                  <div className="bg-muted/30 p-5 rounded-xl border border-border/50 text-muted-foreground">
                    {project.expected_outcome || 'No specific outcome described.'}
                  </div>
                )}
              </section>

              {/* Proposals Section */}
              {isOwner && (
                <section className="pt-6">
                  <ProposalsList projectId={project.id} />
                </section>
              )}

              {isOwner && <RecommendedExpertsList project={project} isOwner={isOwner} />}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
            <Card className="border-2 border-primary/5 shadow-xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-primary via-blue-500 to-indigo-600 w-full" />
              <CardHeader className="bg-muted/10 pb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Estimated Budget</p>
                {isEditing ? (
                    <div className="grid grid-cols-2 gap-2 items-center">
                       <div className="space-y-1">
                         <span className="text-[10px] text-muted-foreground uppercase">Min</span>
                         <Input type="number" value={editForm.budget_min} onChange={e => setEditForm({...editForm, budget_min: Number(e.target.value)})} />
                       </div>
                       <div className="space-y-1">
                         <span className="text-[10px] text-muted-foreground uppercase">Max</span>
                         <Input type="number" value={editForm.budget_max} onChange={e => setEditForm({...editForm, budget_max: Number(e.target.value)})} />
                       </div>
                    </div>
                ) : (
                  <div className="text-3xl font-bold text-foreground">
                    {/* Display Negotiable if 0-0 */}
                    {project.budget_min && project.budget_max 
                      ? `$${project.budget_min.toLocaleString()} - $${project.budget_max.toLocaleString()}`
                      : 'Negotiable'}
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-1 border-b border-border/40 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Deadline</span>
                    <span className="font-medium">{project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Flexible'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Globe className="h-4 w-4" /> Domain</span>
                    <Badge variant="outline">{domainLabels[project.domain] || project.domain}</Badge>
                  </div>
                </div>

                {/* ✅ FIXED: Show button for both 'open' AND 'active' projects */}
                {isExpert && isBiddingOpen && (
                  <BidDialog project={project} />
                )}
                
                {/* ✅ FIXED: Show banner for both 'open' AND 'active' projects */}
                {isOwner && isBiddingOpen && (
                  <div className="p-3 rounded-lg text-xs text-center border bg-green-50 text-green-700 border-green-100 font-medium">
                    🟢 Project is live and receiving bids
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-destructive" /> Risk Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex flex-wrap gap-2">
                  {project.risk_categories?.length > 0 ? (
                    project.risk_categories.map((r: string) => (
                      <Badge key={r} variant="secondary" className="bg-orange-50 text-orange-700">
                        {r.replace('_', ' ')}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Standard risk profile</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}