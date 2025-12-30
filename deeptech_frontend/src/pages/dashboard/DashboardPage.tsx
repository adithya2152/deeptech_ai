import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { useExperts } from '@/hooks/useExperts';
import { Plus, Briefcase, FileText, Clock, DollarSign, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Get role from user or profile
  const userRole = user?.role || profile?.role;
  const isBuyer = userRole === 'buyer';
  const isExpert = userRole === 'expert';

  console.log('👤 User role:', userRole, '| isBuyer:', isBuyer, '| user:', user, '| profile:', profile);

  // Fetch projects by status for accurate counts and display
  const { data: draftProjects, isLoading: loadingDrafts } = useProjects('draft');
  const { data: activeProjects, isLoading: loadingActive } = useProjects('active');
  const { data: completedProjects, isLoading: loadingCompleted } = useProjects('completed');
  
  const projectsLoading = loadingDrafts || loadingActive || loadingCompleted;
  const recentProjects = [...(draftProjects || []), ...(activeProjects || [])].slice(0, 2);
  
  // Combine all projects and remove duplicates by ID
  const allProjectsArray = [...(draftProjects || []), ...(activeProjects || []), ...(completedProjects || [])];
  const allProjects = allProjectsArray.filter((project, index, self) =>
    index === self.findIndex((p) => p.id === project.id)
  );
  
  console.log('📊 Projects counts:', { 
    draft: draftProjects?.length, 
    active: activeProjects?.length, 
    completed: completedProjects?.length,  
    total: allProjects.length 
  });
  
  // TODO: Replace with actual contracts API when available
  const userContracts: any[] = []; 

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {/* REFACTOR: Changed from user.name to user.first_name */}
              <h1 className="font-display text-3xl font-bold">
                Welcome, {user?.first_name || profile?.first_name || 'User'}
              </h1>
              <Badge variant={isBuyer ? 'default' : 'secondary'} className="text-xs">
                {isBuyer ? '👔 Buyer Account' : '🎓 Expert Account'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your {isBuyer ? 'projects' : 'contracts'}
            </p>
          </div>
          {isBuyer && (
            <Button onClick={() => navigate('/projects/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isBuyer ? (draftProjects?.length || 0) : 0}</p>
                <p className="text-sm text-muted-foreground">{isBuyer ? 'Draft Projects' : 'Draft Contracts'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isBuyer ? (activeProjects?.length || 0) : 0}</p>
                <p className="text-sm text-muted-foreground">{isBuyer ? 'Active Projects' : 'Active Contracts'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isBuyer ? (completedProjects?.length || 0) : 0}</p>
                <p className="text-sm text-muted-foreground">{isBuyer ? 'Completed Projects' : 'Completed Contracts'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Projects/Contracts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">{isBuyer ? 'Your Projects' : 'Active Contracts'}</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate(isBuyer ? '/projects' : '/contracts')}>
                View All
              </Button>
            </div>
            <div className="space-y-4">
              {isBuyer ? (
                projectsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : recentProjects.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <p className="text-muted-foreground mb-4">No projects yet</p>
                      <Button onClick={() => navigate('/projects/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Project
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  recentProjects.map(project => <ProjectCard key={project.id} project={project} />)
                )
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">Contracts Coming Soon</p>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Contract management features will be available once the backend is ready.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">Recent Activity</h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                {projectsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : allProjects && allProjects.length > 0 ? (
                  allProjects.slice(0, 4).map((project) => {
                    // project.created_at matches snake_case Project interface
                    const timeAgo = new Date(project.created_at).toLocaleDateString();
                    // project.status matches ProjectStatus type
                    const statusText = project.status === 'draft' ? 'created' : 
                                       project.status === 'active' ? 'activated' : 
                                       project.status === 'completed' ? 'completed' : 'archived';
                    return (
                      <div key={project.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <p className="text-sm">Project "{project.title}" {statusText}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}