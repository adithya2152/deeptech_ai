import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { useNavigate } from 'react-router-dom';
import { useProjects, useMarketplaceProjects } from '@/hooks/useProjects';
import { useContracts } from '@/hooks/useContracts';
import {
  Plus,
  Briefcase,
  FileText,
  DollarSign,
  Loader2,
  Search,
  CheckCircle2,
  Star,
  Zap,
  Lock,
  ArrowRight,
  Clock,
  User,
  MessageSquare,
  Calendar
} from 'lucide-react';

export default function DashboardPage() {
  const { user, profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const user_role = profile?.role || user?.role;
  const is_buyer = user_role === 'buyer';
  
  const display_name = profile?.first_name || user?.first_name || 'User';

  const { data: draft_projects, isLoading: l1 } = useProjects('draft');
  const { data: active_projects, isLoading: l2 } = useProjects('active');
  const { data: completed_projects, isLoading: l3 } = useProjects('completed');
  const { data: marketplace_projects, isLoading: lMarket } = useMarketplaceProjects();
  const { data: contracts, isLoading: lContracts } = useContracts();

  const is_loading = is_buyer ? (l1 || l2 || l3 || lContracts) : (lMarket || lContracts);

  const my_projects = [...(draft_projects || []), ...(active_projects || []), ...(completed_projects || [])]
    .filter((p, i, self) => i === self.findIndex((o) => o.id === p.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const displayed_buyer_projects = my_projects.slice(0, 3);
  const displayed_expert_projects = marketplace_projects?.slice(0, 3) || [];

  const active_contracts_count = contracts?.filter((c: any) => c.status === 'active').length || 0;
  const total_earnings = contracts?.reduce((sum: number, c: any) => sum + (Number(c.total_amount) || 0), 0) || 0;

  const expert_rating = Number(profile?.rating) || 0;
  const vetting_status = (profile as any)?.vetting_level || 'pending';

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl mb-4">
              Unlock the Deep Tech Ecosystem
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join elite experts and visionary companies building the future.
              Sign in to access exclusive projects, manage contracts, and track your impact.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">For Experts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Access high-value deep tech projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Secure payments & automated contracts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Build your reputation in niche domains
                  </li>
                </ul>
                <div className="pt-4 flex flex-col gap-3">
                  <Button onClick={() => navigate('/login')} className="w-full">
                    Log In as Expert
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    New here? <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate('/register')}>Create an account</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:border-blue-500/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <Briefcase className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">For Buyers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    Hire vetted PhDs & subject matter experts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    Manage IP & NDAs seamlessly
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    Accelerate R&D with specialized talent
                  </li>
                </ul>
                <div className="pt-4 flex flex-col gap-3">
                  <Button onClick={() => navigate('/login')} variant="outline" className="w-full border-blue-200 hover:bg-blue-50 hover:text-blue-600">
                    Log In as Buyer
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Ready to innovate? <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => navigate('/register')}>Post a project</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            <div className="flex flex-col items-center">
              <div className="mb-2 rounded-full bg-muted p-2">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Secure Platform</h3>
              <p className="text-sm text-muted-foreground mt-1">Enterprise-grade security for your IP.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-2 rounded-full bg-muted p-2">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Vetted Talent</h3>
              <p className="text-sm text-muted-foreground mt-1">Experts verified for deep tech skills.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-2 rounded-full bg-muted p-2">
                <ArrowRight className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Fast Hiring</h3>
              <p className="text-sm text-muted-foreground mt-1">From post to contract in days, not months.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-3xl font-bold">
                Welcome, {display_name}
              </h1>
              <Badge variant={is_buyer ? 'default' : 'secondary'} className="text-xs px-2 py-0.5">
                {is_buyer ? 'Buyer Account' : 'Expert Account'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {is_buyer 
                ? "Manage your deep-tech projects and experts." 
                : "Find new challenges and manage your active contracts."}
            </p>
          </div>
          
          {is_buyer ? (
            <Button onClick={() => navigate('/projects/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          ) : (
            <Button onClick={() => navigate('/marketplace')} variant="default">
              <Search className="h-4 w-4 mr-2" />
              Browse Marketplace
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {is_buyer ? (draft_projects?.length || 0) : '0'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {is_buyer ? 'Draft Projects' : 'Proposals Sent'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {is_buyer ? (active_projects?.length || 0) : active_contracts_count}
                </p>
                <p className="text-sm text-muted-foreground">
                  {is_buyer ? 'Active Projects' : 'Active Contracts'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {is_buyer ? (completed_projects?.length || 0) : `$${(total_earnings / 1000).toFixed(1)}k`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {is_buyer ? 'Completed' : 'Total Earnings'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                {is_buyer ? <Clock className="h-5 w-5 text-warning" /> : <Star className="h-5 w-5 text-warning" />}
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {is_buyer ? '—' : expert_rating.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {is_buyer ? 'Pending Actions' : 'Client Rating'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">
                {is_buyer ? 'Your Projects' : 'Latest Marketplace Listings'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate(is_buyer ? '/projects' : '/marketplace')}>
                View All
              </Button>
            </div>

            {is_loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {is_buyer ? (
                   displayed_buyer_projects.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <p className="text-muted-foreground mb-4">No projects created yet.</p>
                        <Button onClick={() => navigate('/projects/new')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Project
                        </Button>
                      </CardContent>
                    </Card>
                   ) : (
                     displayed_buyer_projects.map(project => (
                        <ProjectCard key={project.id} project={project} compact={true} />
                      ))
                   )
                ) : (
                  displayed_expert_projects.length === 0 ? (
                    <Card className="border-dashed bg-muted/30">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="h-12 w-12 rounded-full bg-background border flex items-center justify-center mb-4">
                          <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">No open projects</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                          There are no open projects in the marketplace right now. Please check back later.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {displayed_expert_projects.map(project => (
                        <ProjectCard key={project.id} project={project} compact={true} />
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {!is_buyer && (
              <Card className={vetting_status === 'pending' ? 'border-warning/50 bg-warning/5' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Profile Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3 mb-4">
                    {vetting_status === 'verified' ? (
                      <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-warning mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-sm capitalize">
                        {vetting_status === 'verified' ? 'Verified Expert' : 'Verification Pending'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {vetting_status === 'verified' 
                          ? 'Your profile is visible to all buyers. You can apply to any project.' 
                          : 'Complete your profile to unlock full access to the marketplace.'}
                      </p>
                    </div>
                  </div>
                  {vetting_status !== 'verified' && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/profile')}>
                      Complete Profile
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {is_buyer ? 'Account Details' : 'Quick Tips'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {is_buyer ? (
                   <div className="space-y-4">
                     <div className="flex items-center gap-3">
                       <Calendar className="h-4 w-4 text-muted-foreground" />
                       <div>
                         <p className="text-[15px] text-muted-foreground uppercase font-bold tracking-wider">Member Since</p>
                         <p className="text-sm font-medium">
                           {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Loading...'}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <User className="h-4 w-4 text-muted-foreground" />
                       <div>
                         <p className="text-[15px] text-muted-foreground uppercase font-bold tracking-wider">Account ID</p>
                         <p className="text-[15px] font-mono truncate ">{user?.id}</p>
                       </div>
                     </div>
                   </div>
                ) : (
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Update your <strong>skills</strong> to match new project demands.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Check the <strong>Marketplace</strong> every Monday for new listings.</span>
                    </li>
                  </ul>
                )}
                
                <div className="pt-2 flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" />
                    Manage Profile
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/messages')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Messages
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}