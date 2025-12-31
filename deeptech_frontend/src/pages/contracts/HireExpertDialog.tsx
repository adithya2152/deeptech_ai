import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { contractsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects'; 
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Clock, Briefcase } from 'lucide-react';

interface HireExpertDialogProps {
  expert: {
    id: string;
    name: string;
    hourly_rate_advisory: number;
  };
  trigger?: React.ReactNode; 
}

export function HireExpertDialog({ expert, trigger }: HireExpertDialogProps) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const { data: projects } = useProjects('active'); 

  const [projectId, setProjectId] = useState<string>('');
  const [rate, setRate] = useState(expert.hourly_rate_advisory || 150);
  const [cap, setCap] = useState(40);
  const [duration, setDuration] = useState('3');

  const createContractMutation = useMutation({
  mutationFn: (data: any) => contractsApi.createContract(data, token!),
  onSuccess: (response) => {
    setOpen(false);
    toast({ 
      title: 'Contract Created', 
      description: `You have successfully hired ${expert.name}.` 
    });
    
    navigate(`/contracts/${response.data.id}`); 
  },
  onError: (err) => {
    console.error(err);
    toast({ title: 'Error', description: 'Failed to create contract', variant: 'destructive' });
  }
});

  const handleHire = () => {
    if (!user || !projectId) {
      toast({ title: 'Project Required', description: 'Please select a project to link this contract to.', variant: 'destructive' });
      return;
    }

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(duration));

    const contractData = {
      expert_id: expert.id,
      buyer_id: user.id,
      project_id: projectId,
      hourly_rate: rate,
      weekly_hour_cap: cap,
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
      engagement_type: 'hourly',
      status: 'active', 
      ip_ownership: 'buyer_owns',
    };

    createContractMutation.mutate(contractData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Hire Now</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Hire {expert.name}</DialogTitle>
          <DialogDescription>
            Set the terms for this engagement.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project" className="text-right">Project</Label>
            <div className="col-span-3">
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                  {(!projects || projects.length === 0) && (
                    <SelectItem value="none" disabled>No active projects found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rate" className="text-right">Rate / Hr</Label>
            <div className="col-span-3 relative">
              <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="rate" 
                type="number" 
                className="pl-9" 
                value={rate} 
                onChange={(e) => setRate(Number(e.target.value))} 
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cap" className="text-right">Weekly Cap</Label>
            <div className="col-span-3 relative">
              <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="cap" 
                type="number" 
                className="pl-9" 
                value={cap} 
                onChange={(e) => setCap(Number(e.target.value))} 
              />
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">hrs</span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground mt-2">
            <p className="flex justify-between">
              <span>Hourly Rate:</span> 
              <span className="font-semibold text-foreground">${rate}/hr</span>
            </p>
            <p className="flex justify-between mt-1">
              <span>Weekly Max:</span> 
              <span className="font-semibold text-foreground">${rate * cap}</span>
            </p>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleHire} disabled={createContractMutation.isPending || !projectId}>
            {createContractMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}