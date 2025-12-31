import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Edit, MoreVertical, PlayCircle, 
  CheckCircle, Archive, Trash2, DollarSign, Clock, ArrowRight
} from 'lucide-react';
import { domainLabels } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProjectStatus, useDeleteProject } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
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
import { formatDistanceToNow } from 'date-fns';

// Helper to format budget numbers
const formatBudget = (amount: number) => {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return amount.toString();
};

// Helper for Status Badge Colors
const getStatusBadge = (status: string) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
    open: 'bg-green-100 text-green-700 border-green-200',
    active: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-purple-100 text-purple-700 border-purple-200',
    archived: 'bg-orange-100 text-orange-700 border-orange-200',
  };
  // @ts-ignore
  const className = styles[status] || 'bg-gray-100 text-gray-800';
  
  return (
    <Badge variant="outline" className={`${className} border uppercase text-[10px] font-bold tracking-wider`}>
      {status.replace('_', ' ')}
    </Badge>
  );
};

interface ProjectCardProps {
  project: Project;
  compact?: boolean;
}

export function ProjectCard({ project, compact = false }: ProjectCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isBuyer = user?.role === 'buyer';
  const isOwner = isBuyer && project.buyer_id === user?.id; 
  
  // Hooks
  const updateStatus = useUpdateProjectStatus();
  const deleteProject = useDeleteProject();
  
  // Dialog States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const handleStatusChange = async (newStatus: 'active' | 'completed' | 'archived') => {
    try {
      await updateStatus.mutateAsync({ id: project.id, status: newStatus });
      toast({ title: 'Success', description: `Project marked as ${newStatus}` });
      setShowActivateDialog(false);
      setShowCompleteDialog(false);
      setShowArchiveDialog(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(project.id);
      toast({ title: 'Deleted', description: 'Project removed successfully' });
      setShowDeleteDialog(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' });
    }
  };

  // ✅ UPDATED: Always navigate to Details Page, never directly to Edit Page
  const handleNavigation = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[role="menuitem"], button, [data-radix-dropdown-menu-trigger]')) return;
    handleNavigation();
  };

  if (compact) {
    return (
      <Card 
        className="group relative overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 border-l-primary/20 hover:border-l-primary cursor-pointer bg-card"
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight py-0 px-1.5 h-4 bg-muted/30">
                  {domainLabels[project.domain] || project.domain}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                </span>
              </div>
              <h4 className="font-semibold text-sm leading-tight text-foreground truncate group-hover:text-primary transition-colors">
                {project.title}
              </h4>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
               <div className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                  <DollarSign className="h-3 w-3 mr-0.5" />
                  {project.budget_min ? `${formatBudget(project.budget_min)}+` : 'Neg.'}
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 h-full flex flex-col cursor-pointer bg-card"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2 mb-2">
                 <Badge variant="secondary" className="uppercase text-[10px] font-bold tracking-wider">
                    {domainLabels[project.domain] || project.domain}
                 </Badge>
                 <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                 </span>
              </div>
              <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                {project.title}
              </CardTitle>
            </div>

            {isOwner && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                 {getStatusBadge(project.status)}
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
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowActivateDialog(true)}>
                          <PlayCircle className="h-4 w-4 mr-2" /> Activate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                    {project.status === 'active' && (
                      <>
                        <DropdownMenuItem onClick={() => setShowCompleteDialog(true)}>
                          <CheckCircle className="h-4 w-4 mr-2" /> Mark Complete
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
                          <Archive className="h-4 w-4 mr-2" /> Archive
                        </DropdownMenuItem>
                      </>
                    )}
                    {project.status === 'open' && (
                       <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/edit`)}>
                         <Edit className="h-4 w-4 mr-2" /> Edit Specs
                       </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-grow pb-4">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {project.description}
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center p-2 rounded-lg bg-muted/30">
              <DollarSign className="h-4 w-4 mr-2 text-green-600" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Budget</p>
                <p className="font-semibold text-foreground">
                  {project.budget_min 
                    ? `$${formatBudget(project.budget_min)} - $${formatBudget(project.budget_max || 0)}` 
                    : 'Negotiable'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center p-2 rounded-lg bg-muted/30">
              <Clock className="h-4 w-4 mr-2 text-orange-500" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Deadline</p>
                <p className="font-semibold text-foreground">
                  {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Flexible'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2 border-t mt-auto">
          <Button 
            variant="ghost" 
            className="w-full justify-between hover:bg-primary/5 hover:text-primary group-hover:translate-x-1 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigation();
            }}
          >
            {/* ✅ UPDATED: Always say "View Details" since we redirect to details page now */}
            View Details
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>

      {/* --- Action Dialogs --- */}
      
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Project?</AlertDialogTitle>
            <AlertDialogDescription>Experts will be able to view and bid on this project.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('active')}>Activate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Project?</AlertDialogTitle>
            <AlertDialogDescription>This will close the project to new bids.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('completed')}>Complete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Project?</AlertDialogTitle>
            <AlertDialogDescription>It will be moved to the archived tab.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('archived')}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}