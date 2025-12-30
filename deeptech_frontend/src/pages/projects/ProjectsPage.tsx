import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/contexts/AuthContext'
import { ProjectStatus } from '@/types'
import { Plus, Search, Loader2, FolderOpen } from 'lucide-react'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | ProjectStatus>('all')

  const isBuyer = user?.role === 'buyer'
  const isExpert = user?.role === 'expert'

  // Buyers: show their own projects with all statuses
  // Experts: show only active projects from all buyers (browse mode)
  const { data: allProjects, isLoading: loadingAll } = useProjects()
  const { data: draftProjects, isLoading: loadingDrafts } = useProjects('draft')
  const { data: activeProjects, isLoading: loadingActive } = useProjects('active')
  const { data: completedProjects, isLoading: loadingCompleted } = useProjects('completed')
  const { data: archivedProjects, isLoading: loadingArchived } = useProjects('archived')

  const isLoading = loadingAll || loadingDrafts || loadingActive || loadingCompleted || loadingArchived

  const getProjectsForTab = () => {
    switch (activeTab) {
      case 'draft':
        return draftProjects || []
      case 'active':
        return activeProjects || []
      case 'completed':
        return completedProjects || []
      case 'archived':
        return archivedProjects || []
      default:
        return allProjects || []
    }
  }

  const filteredProjects = getProjectsForTab().filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.domain.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const EmptyState = ({ status }: { status: string }) => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No {status} projects</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {isExpert
            ? `No ${status === 'all' ? '' : status} projects available at the moment. Check back soon for new opportunities.`
            : status === 'all' 
              ? 'Get started by creating your first project' 
              : `You don't have any ${status} projects yet`
          }
        </p>
        {status === 'all' && isBuyer && (
          <Button onClick={() => navigate('/projects/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        )}
      </CardContent>
    </Card>
  )

  // Experts only see active projects tab (no draft/completed/archived from other buyers)
  if (isExpert) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold">Browse Projects</h1>
              <p className="text-muted-foreground mt-1">
                Discover active projects matching your expertise
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects by title or domain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Expert View: Only Active Projects */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              Active Projects {activeProjects && `(${activeProjects.length})`}
            </h2>
            <p className="text-sm text-muted-foreground">
              Projects currently seeking expert collaboration
            </p>
          </div>

          {loadingActive ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (activeProjects || []).filter(project =>
              project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              project.domain.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 ? (
            searchQuery ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Search className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search query
                  </p>
                </CardContent>
              </Card>
            ) : (
              <EmptyState status="active" />
            )
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(activeProjects || [])
                .filter(project =>
                  project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  project.domain.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
            </div>
          )}
        </div>
      </Layout>
    )
  }

  // Buyer View: Full project management with all status tabs
  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">My Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all your deep-tech projects
            </p>
          </div>
          <Button onClick={() => navigate('/projects/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects by title or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              All {allProjects && `(${allProjects.length})`}
            </TabsTrigger>
            <TabsTrigger value="draft">
              Draft {draftProjects && `(${draftProjects.length})`}
            </TabsTrigger>
            <TabsTrigger value="active">
              Active {activeProjects && `(${activeProjects.length})`}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed {completedProjects && `(${completedProjects.length})`}
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived {archivedProjects && `(${archivedProjects.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProjects.length === 0 ? (
              searchQuery ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Search className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search query
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState status={activeTab === 'all' ? 'all' : activeTab} />
              )
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
