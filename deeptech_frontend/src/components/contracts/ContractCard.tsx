import { Contract } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Clock, FileText, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ContractCardProps {
  contract: Contract;
  counterpartyName?: string;
  counterpartyRole?: string;
  projectTitle?: string;
  onAccept?: (contractId: string) => void;
  onDecline?: (contractId: string) => void;
}

export function ContractCard({ 
  contract, 
  counterpartyName, 
  counterpartyRole, 
  projectTitle, 
  onAccept, 
  onDecline 
}: ContractCardProps) {
  const { user } = useAuth();
  const isExpert = user?.role === 'expert';
  const isPending = contract.status === 'pending';

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    paused: 'bg-gray-100 text-gray-800 border-gray-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200',
    disputed: 'bg-red-100 text-red-800 border-red-200',
  };

  const engagementLabels = {
    advisory: 'Advisory',
    architecture_review: 'Architecture Review',
    hands_on_execution: 'Hands-on Execution',
  };

  const hour_cap = Number(contract?.weekly_hour_cap) || 40;
  const logged_hours = Number(contract?.total_hours_logged) || 0;
  const weekly_progress = hour_cap > 0 ? (logged_hours % hour_cap) / hour_cap * 100 : 0;

  const handleAction = (e: React.MouseEvent, action?: (id: string) => void) => {
    e.preventDefault();
    e.stopPropagation();
    if (action) action(contract.id);
  };

  return (
    <Link to={`/contracts/${contract.id}`}>
      <Card className="group hover:shadow-md transition-all border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                {projectTitle || 'Untitled Project'}
              </CardTitle>
              {counterpartyName && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 truncate">
                  <User className="h-3 w-3" />
                  <span>
                    {counterpartyRole ? `${counterpartyRole}: ` : ''} 
                    <span className="font-medium text-foreground/80">{counterpartyName}</span>
                  </span>
                </div>
              )}
            </div>
            <Badge variant="secondary" className={statusColors[contract.status as keyof typeof statusColors]}>
              {contract.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="font-normal">
              {engagementLabels[contract.engagement_type as keyof typeof engagementLabels] || 'General'}
            </Badge>
            <span className="font-bold text-primary">${contract.hourly_rate}/hr</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Weekly Cap Progress</span>
              <span className="font-medium text-muted-foreground">
                {logged_hours.toFixed(1)} / {hour_cap}h
              </span>
            </div>
            <Progress value={weekly_progress} className="h-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/40">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-muted/50"><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Logged</p>
                <p className="text-sm font-semibold">{contract.total_hours_logged}h</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-muted/50"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Earnings</p>
                <p className="text-sm font-semibold">${Number(contract.total_amount).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'Pending Start'}
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {contract.nda_signed ? 'NDA Signed' : 'NDA Required'}
            </div>
          </div>

          {isPending && isExpert && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 h-9"
                onClick={(e) => handleAction(e, onAccept)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9"
                onClick={(e) => handleAction(e, onDecline)}
              >
                Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}