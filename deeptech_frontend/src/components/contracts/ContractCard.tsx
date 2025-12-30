import { Contract, HourLog } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Clock, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ContractCardProps {
  contract: Contract;
  expertName?: string;
  projectTitle?: string;
  onAccept?: (contractId: string) => void;
  onDecline?: (contractId: string) => void;
}

export function ContractCard({ contract, expertName, projectTitle, onAccept, onDecline }: ContractCardProps) {
  const { user } = useAuth();
  const isExpert = user?.role === 'expert';
  const isPending = contract.status === 'pending';
  
  const statusColors = {
    pending: 'bg-warning text-warning-foreground',
    active: 'bg-success text-success-foreground',
    paused: 'bg-muted text-muted-foreground',
    completed: 'bg-info text-info-foreground',
    disputed: 'bg-destructive text-destructive-foreground',
  };

  const engagementLabels = {
    advisory: 'Advisory',
    architecture_review: 'Architecture Review',
    hands_on_execution: 'Hands-on Execution',
  };

  const weeklyProgress = (contract.total_hours_logged % contract.weekly_hour_cap) / contract.weekly_hour_cap * 100;

  const handleAccept = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAccept?.(contract.id);
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDecline?.(contract.id);
  };

  return (
    <Link to={`/contracts/${contract.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {projectTitle || 'Project'}
              </CardTitle>
              {expertName && (
                <p className="text-sm text-muted-foreground mt-1">with {expertName}</p>
              )}
            </div>
            <Badge className={statusColors[contract.status]}>
              {contract.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {engagementLabels[contract.engagement_type]}
            </Badge>
            <span className="font-semibold">${contract.hourly_rate}/hr</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Weekly Hours</span>
              <span className="font-medium">
                {contract.total_hours_logged % contract.weekly_hour_cap} / {contract.weekly_hour_cap}h
              </span>
            </div>
            <Progress value={weeklyProgress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="font-medium">{contract.total_hours_logged}h</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="font-medium">${contract.total_amount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Started {new Date(contract.start_date).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {contract.nda_signed ? 'NDA Signed' : 'NDA Pending'}
            </div>
          </div>

          {/* Accept/Decline buttons for pending contracts (expert view) */}
          {isPending && isExpert && onAccept && onDecline && (
            <div className="flex gap-2 pt-3 border-t">
              <Button 
                size="sm" 
                className="flex-1"
                onClick={handleAccept}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Contract
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleDecline}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
