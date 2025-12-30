import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { ExpertCard } from '@/components/experts/ExpertCard'
import { useProject, useUpdateProjectStatus, useDeleteProject, useUpdateProject } from '@/hooks/useProjects'
import { useExperts, useSemanticExperts } from '@/hooks/useExperts'
import { domainLabels, trlDescriptions } from '@/lib/constants'
import {
  ArrowLeft,
  Edit,
  PlayCircle,
  CheckCircle,
  Archive,
  Trash2,
  Calendar,
  AlertTriangle,
  Loader2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { ContractCreationDialog } from '@/components/contracts/ContractCreationDialog'
import { Expert, ProjectStatus } from '@/types'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, profile } = useAuth()
  
  // Get role from user or profile with fallback
  const userRole = user?.role || profile?.role
  const isBuyer = userRole === 'buyer'
  const isExpert = userRole === 'expert'

  const { data: project, isLoading } = useProject(id!)
  
  console.log('👤 ProjectDetailPage - Role:', userRole, '| isBuyer:', isBuyer, '| user:', user, '| profile:', profile)
  console.log('🔍 Project Status:', project?.status, '| Type:', typeof project?.status)
  const updateStatus = useUpdateProjectStatus()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const [showActivateDialog, setShowActivateDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showUnarchiveDialog, setShowUnarchiveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAllRecommendations, setShowAllRecommendations] = useState(false)
  const [showContractDialog, setShowContractDialog] = useState(false)
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  
  // Status editing state
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [editedStatus, setEditedStatus] = useState<ProjectStatus | null>(null)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  
  // Project details editing state
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editedProject, setEditedProject] = useState({
    title: '',
    description: '',
    expected_outcome: '',
    trl_level: 1
  })
  const [isSavingDetails, setIsSavingDetails] = useState(false)

  const riskLabels = {
    technical: 'Technical',
    regulatory: 'Regulatory',
    scale: 'Scale',
    market: 'Market',
  }

  // Generate semantic search query from project details
  const generateProjectQuery = (project: any) => {
    const domainName = domainLabels[project.domain] || project.domain
    const trlDescription = trlDescriptions[project.trl_level] || `TRL ${project.trl_level}`
    const riskCategories = project.risk_categories?.join(', ') || 'none specified'

    const query = `${project.title}. ${project.description}. Expected outcome: ${project.expected_outcome}. Domain: ${domainName}. Technology readiness level: ${trlDescription}. Risk categories: ${riskCategories}. Looking for experts with relevant experience and expertise.`

    console.log('🔍 Generated semantic query for project recommendations:', query)
    return query
  }

  // Use semantic search for expert recommendations
  const projectQuery = project ? generateProjectQuery(project) : ''
  const { data: semanticExperts, isLoading: isLoadingSemantic } = useSemanticExperts(projectQuery)

  console.log('🤖 Project recommendations - Query:', projectQuery)
  console.log('🤖 Project recommendations - Results:', semanticExperts?.length || 0, 'experts')

  // Use semantic search results for recommendations (already sorted by similarity)
  const matchingExperts = semanticExperts || []
  const displayedExperts = showAllRecommendations ? matchingExperts : matchingExperts.slice(0, 5)

  const handleRequestService = (expert: Expert) => {
    setSelectedExpert(expert)
    setShowContractDialog(true)
  }

  const handleActivate = async () => {
    if (!isBuyer) {
      toast({ title: 'Access Denied', description: 'Only buyers can modify projects.', variant: 'destructive' })
      return
    }
    try {
      await updateStatus.mutateAsync({ id: id!, status: 'active' })
      toast({ title: 'Project Activated', description: 'Your project is now active and visible to experts.' })
      setShowActivateDialog(false)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to activate project', variant: 'destructive' })
    }
  }

  const handleComplete = async () => {
    if (!isBuyer) {
      toast({ title: 'Access Denied', description: 'Only buyers can modify projects.', variant: 'destructive' })
      return
    }
    try {
      await updateStatus.mutateAsync({ id: id!, status: 'completed' })
      toast({ title: 'Project Completed', description: 'Congratulations on completing your project!' })
      setShowCompleteDialog(false)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to complete project', variant: 'destructive' })
    }
  }

  const handleArchive = async () => {
    if (!isBuyer) {
      toast({ title: 'Access Denied', description: 'Only buyers can modify projects.', variant: 'destructive' })
      return
    }
    try {
      await updateStatus.mutateAsync({ id: id!, status: 'archived' })
      toast({ title: 'Project Archived', description: 'Project has been archived successfully.' })
      setShowArchiveDialog(false)
      navigate('/projects')
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to archive project', variant: 'destructive' })
    }
  }

  const handleUnarchive = async () => {
    if (!isBuyer) {
      toast({ title: 'Access Denied', description: 'Only buyers can modify projects.', variant: 'destructive' })
      return
    }
    try {
      await updateStatus.mutateAsync({ id: id!, status: 'draft' })
      toast({ title: 'Project Unarchived', description: 'Project has been restored to draft status.' })
      setShowUnarchiveDialog(false)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to unarchive project', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!isBuyer) {
      toast({ title: 'Access Denied', description: 'Only buyers can delete projects.', variant: 'destructive' })
      return
    }
    try {
      await deleteProject.mutateAsync(id!)
      toast({ title: 'Project Deleted', description: 'Project has been permanently deleted.' })
      setShowDeleteDialog(false)
      navigate('/projects')
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' })
    }
  }
  
  const handleEditDetails = () => {
    setEditedProject({
      title: project?.title || '',
      description: project?.description || '',
      expected_outcome: project?.expected_outcome || '',
      trl_level: project?.trl_level || 1
    })
    setIsEditingDetails(true)
  }
  
  const handleSaveDetails = async () => {
    if (!isBuyer) {
      toast({ title: 'Access Denied', description: 'Only buyers can modify projects.', variant: 'destructive' })
      return
    }
    
    setIsSavingDetails(true)
    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: editedProject
      })
      toast({
        title: 'Project Updated',
        description: 'Your project details have been saved successfully.',
      })
      setIsEditingDetails(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update project details.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingDetails(false)
    }
  }
  
  const handleCancelEdit = () => {
    setIsEditingDetails(false)
    setEditedProject({
      title: '',
      description: '',
      expected_outcome: '',
      trl_level: 1
    })
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h2 className="text-2xl font-bold">Project Not Found</h2>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-3xl font-bold">{project.title}</h1>
                <ProjectStatusBadge status={project.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created {new Date(project.created_at).toLocaleDateString()}
                </div>
                <Badge variant="outline">{domainLabels[project.domain]}</Badge>
              </div>
            </div>

            <div className="flex gap-2">
              {isBuyer ? (
                <>
                  {/* Status Editor - Toggle between view and edit mode */}
                  {isEditingStatus ? (
                    <div className="flex gap-2 items-center">
                      <Select
                        value={editedStatus || project.status}
                        onValueChange={(value) => setEditedStatus(value as ProjectStatus)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">📝 Draft</SelectItem>
                          <SelectItem value="active">▶️ Active</SelectItem>
                          <SelectItem value="completed">✅ Completed</SelectItem>
                          <SelectItem value="archived">🗄️ Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        onClick={async () => {
                          if (editedStatus && editedStatus !== project.status) {
                            setIsSavingStatus(true)
                            try {
                              await updateStatus.mutateAsync({ id: project.id, status: editedStatus })
                              toast({
                                title: 'Status Updated',
                                description: `Project status changed to ${editedStatus}.`,
                              })
                              setIsEditingStatus(false)
                              setEditedStatus(null)
                            } catch (error) {
                              toast({
                                title: 'Error',
                                description: 'Failed to update status.',
                                variant: 'destructive',
                              })
                            } finally {
                              setIsSavingStatus(false)
                            }
                          } else {
                            setIsEditingStatus(false)
                          }
                        }}
                        disabled={isSavingStatus}
                      >
                        {isSavingStatus ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingStatus(false)
                          setEditedStatus(null)
                        }}
                        disabled={isSavingStatus}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Quick Status Change Button */}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingStatus(true)
                          setEditedStatus(project.status as ProjectStatus)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Change Status
                      </Button>

                      {/* DRAFT - Edit & Activate */}
                      {project.status === 'draft' && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/projects/${id}/edit`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Project
                          </Button>
                          <Button onClick={() => setShowActivateDialog(true)}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Activate
                          </Button>
                        </>
                      )}

                      {/* ACTIVE - Mark Complete */}
                      {project.status === 'active' && (
                        <Button onClick={() => setShowCompleteDialog(true)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </Button>
                      )}

                      {/* COMPLETED - View Results */}
                      {project.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          onClick={() => toast({ 
                            title: 'Feature Coming Soon', 
                            description: 'View deliverables, leave review, and download contract summary.' 
                          })}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          View Results
                        </Button>
                      )}

                      {/* DELETE - Only for drafts */}
                      {project.status === 'draft' && (
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteDialog(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                </>
              ) : (
                // EXPERT VIEW - Express Interest
                <Button onClick={() => toast({ 
                  title: 'Express Interest', 
                  description: 'Interest functionality will notify the buyer. Feature coming soon!' 
                })}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Express Interest
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Edit Controls - Show at top when buyer is viewing */}
            {isBuyer && !isEditingDetails && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleEditDetails}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project Details
                </Button>
              </div>
            )}
            
            {/* Save/Cancel Controls - Show when editing */}
            {isEditingDetails && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSavingDetails}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                >
                  {isSavingDetails ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
            
            {/* Title - Editable */}
            {isEditingDetails ? (
              <Card>
                <CardHeader>
                  <CardTitle>Project Title</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={editedProject.title}
                    onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
                    placeholder="Enter project title"
                    className="text-lg"
                  />
                </CardContent>
              </Card>
            ) : null}
            
            <Card>
              <CardHeader>
                <CardTitle>Problem Description</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingDetails ? (
                  <Textarea
                    value={editedProject.description}
                    onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                    placeholder="Describe the problem or challenge"
                    className="min-h-[150px]"
                  />
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {project.description}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expected Outcome</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingDetails ? (
                  <Textarea
                    value={editedProject.expected_outcome}
                    onChange={(e) => setEditedProject({ ...editedProject, expected_outcome: e.target.value })}
                    placeholder="Describe the expected outcome"
                    className="min-h-[150px]"
                  />
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {project.expected_outcome}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Expert Recommendations - Only visible to buyers */}
            {isBuyer && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      <CardTitle>Recommended Experts</CardTitle>
                    </div>
                    {matchingExperts.length > 0 && (
                      <Badge variant="secondary">
                        {matchingExperts.length} {matchingExperts.length === 1 ? 'match' : 'matches'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSemantic ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : matchingExperts.length === 0 ? (
                    <div className="text-center py-8">
                      <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-2">
                        No experts found matching your project requirements.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Try refining your project description or browse all experts.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Based on your project's requirements, domain, and expected outcomes,
                        our AI recommends these experts:
                      </p>

                      <div className="space-y-3">
                        {displayedExperts.map((expert) => (
                          <div key={expert.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div
                                  className="font-medium hover:text-primary cursor-pointer"
                                  onClick={() => navigate(`/experts/${expert.id}`)}
                                >
                                  {expert.name}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {expert.experience_summary}
                                </p>
                                {(expert.domains ?? []).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {(expert.domains ?? []).slice(0, 3).map(domain => (
                                      <Badge key={domain} variant="secondary" className="text-xs">
                                        {domain.startsWith('custom:')
                                          ? domain.substring(7)
                                          : domainLabels[domain] || domain}
                                      </Badge>
                                    ))}
                                    {expert.domains.length > 3 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{expert.domains.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleRequestService(expert)}
                              >
                                Request Service
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {matchingExperts.length > 5 && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowAllRecommendations(!showAllRecommendations)}
                        >
                          {showAllRecommendations ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Show All {matchingExperts.length} Experts
                            </>
                          )}
                        </Button>
                      )}

                      <div className="pt-4 border-t">
                        <Button
                          variant="link"
                          className="w-full"
                          onClick={() => navigate('/experts')}
                        >
                          Browse All Experts →
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>TRL Level</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditingDetails ? (
                  <>
                    <Select
                      value={editedProject.trl_level.toString()}
                      onValueChange={(value) => setEditedProject({ ...editedProject, trl_level: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select TRL level" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                          <SelectItem key={level} value={level.toString()}>
                            TRL {level} - {Math.round((level / 9) * 100)}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all"
                        style={{ width: `${(editedProject.trl_level / 9) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {trlDescriptions[editedProject.trl_level]}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">TRL {project.trl_level}</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((project.trl_level / 9) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all"
                        style={{ width: `${(project.trl_level / 9) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {trlDescriptions[project.trl_level]}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {(project.risk_categories ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No risks identified</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(project.risk_categories ?? []).map(risk => (
                      <Badge key={risk} variant="secondary" className="justify-start gap-2">
                        <AlertTriangle className="h-3 w-3" />
                        {riskLabels[risk]}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Project</AlertDialogTitle>
            <AlertDialogDescription>
              Activating this project will make it visible to experts and allow them to express interest. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate}>
              Activate Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Project as Complete</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the project as completed. You can still view the project details but won't be able to make changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>
              Mark Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Project</AlertDialogTitle>
            <AlertDialogDescription>
              Archived projects are hidden from the main view but can still be accessed later. You can unarchive them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnarchiveDialog} onOpenChange={setShowUnarchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unarchive Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the project to draft status and make it visible in your active projects list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchive}>
              Unarchive Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contract Creation Dialog */}
      {selectedExpert && (
        <ContractCreationDialog
          open={showContractDialog}
          onOpenChange={setShowContractDialog}
          projectId={project.id}
          expert={selectedExpert}
          onSuccess={() => {
            toast({
              title: 'Success',
              description: 'Contract invitation sent successfully.',
            })
          }}
        />
      )}
    </Layout>
  )
}
