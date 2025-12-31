import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, DollarSign, Calendar } from 'lucide-react';

interface BidDialogProps {
  project: Project;
}

export function BidDialog({ project }: BidDialogProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    duration: '',
    cover_letter: '',
  });

  const submitMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      projectsApi.submitProposal(
        project.id,
        {
          amount: Number(data.amount),
          duration: Number(data.duration),
          cover_letter: data.cover_letter,
        },
        token!
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-projects'] });
      toast({
        title: 'Proposal Submitted',
        description: 'The buyer has been notified of your interest.',
      });
      setOpen(false);
      setFormData({ amount: '', duration: '', cover_letter: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Could not submit proposal.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full h-12 text-lg font-bold rounded-xl shadow-lg shadow-primary/20">
          Submit Proposal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Submit Technical Proposal</DialogTitle>
            <DialogDescription>
              Provide your estimated quote and timeline for: <br />
              <span className="font-semibold text-foreground">{project.title}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs uppercase tracking-widest font-bold">
                  Quote Amount ($)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder="5000"
                    className="pl-9 h-11 bg-muted/30"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-xs uppercase tracking-widest font-bold">
                  Duration (Days)
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    className="pl-9 h-11 bg-muted/30"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-xs uppercase tracking-widest font-bold">
                Technical Pitch / Cover Letter
              </Label>
              <Textarea
                id="message"
                placeholder="Outline your approach and relevant expertise..."
                className="min-h-[150px] bg-muted/30 resize-none"
                value={formData.cover_letter}
                onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="w-full h-12 font-bold text-md"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Proposal
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}