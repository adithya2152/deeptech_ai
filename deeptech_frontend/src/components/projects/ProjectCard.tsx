import { Project } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, AlertTriangle, Edit, Eye, MoreVertical, PlayCircle, CheckCircle, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { domainLabels, trlDescriptions } from '@/lib/constants';
import { Link, useNavigate } from 'react-router-dom';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProjectStatus, useDeleteProject } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isBuyer = user?.role === 'buyer';
  
  const updateStatus = useUpdateProjectStatus();
  const deleteProject = useDeleteProject();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const handleStatusChange = async (newStatus: 'active' | 'completed' | 'archived') => {
    try {
      await updateStatus.mutateAsync({ id: project.id, status: newStatus });
      const statusMessages = {
        active: 'Project activated successfully',
        completed: 'Project marked as completed',
        archived: 'Project archived successfully'
      };
      toast({ title: 'Success', description: statusMessages[newStatus] });
      // Close all dialogs
      setShowActivateDialog(false);
      setShowCompleteDialog(false);
      setShowArchiveDialog(false);
    } catch (error) {
      toast({ title: 'Error', description: `Failed to update project status`, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(project.id);
      toast({ title: 'Success', description: 'Project deleted successfully' });
      setShowDeleteDialog(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' });
    }
  };

  const riskLabels = {
    technical: 'Technical',
    regulatory: 'Regulatory',
    scale: 'Scale',
    market: 'Market',
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Only buyers can edit, everyone can view
    if (project.status === 'draft' && isBuyer) {
      navigate(`/projects/${project.id}/edit`);
    } else {
      navigate(`/projects/${project.id}`);
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {project.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ProjectStatusBadge status={project.status} />
            {isBuyer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {project.status === 'draft' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/edit`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowActivateDialog(true)}>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Activate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  {project.status === 'active' && (
                    <>
                      <DropdownMenuItem onClick={() => setShowCompleteDialog(true)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </>
                  )}
                  {project.status === 'completed' && (
                    <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  {project.status === 'archived' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      Restore to Active
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <Badge variant="outline" className="w-fit">
          {domainLabels[project.domain]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description}
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">TRL Level</span>
            <span className="font-medium">TRL {project.trl_level}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary rounded-full transition-all"
              style={{ width: `${(project.trl_level / 9) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{trlDescriptions[project.trl_level]}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(project.risk_categories ?? []).map(risk => (
            <Badge key={risk} variant="secondary" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              {riskLabels[risk]}
            </Badge>
          ))}
        </div>


        <div className="pt-3 border-t border-border flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Created {new Date(project.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
      <div className="p-4 pt-0 mt-auto">
        <Button
          onClick={handleActionClick}
          className="w-full"
          variant={project.status === 'draft' && isBuyer ? 'default' : 'outline'}
        >
          {project.status === 'draft' && isBuyer ? (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Edit Draft
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              {isBuyer ? 'View Details' : 'View & Express Interest'}
            </>
          )}
        </Button>
      </div>
      {/* Confirmation Dialogs */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your project visible to experts. Are you ready to activate it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('active')}>
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Complete</AlertDialogTitle>
            <AlertDialogDescription>
              Mark this project as completed? This indicates successful project completion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('completed')}>
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
              Archive this project? You can restore it later from the archived projects tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('archived')}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>    </Card>
  );
}
