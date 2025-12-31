import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lightbulb } from 'lucide-react';
import { ContractCreationDialog } from '@/components/contracts/ContractCreationDialog';
import { useExperts } from '@/hooks/useExperts';
import { domainLabels } from '@/data/mockData';
import { Expert } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function RecommendedExpertsList({ project, isOwner }: { project: any, isOwner: boolean }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: experts, isLoading } = useExperts();
  
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [showContractDialog, setShowContractDialog] = useState(false);

  if (!isOwner) return null; // Only buyers see this

  // Matching Logic
  const matchingExperts = (experts || [])
    .filter(e => e.domains?.includes(project.domain))
    .slice(0, 5);

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <CardTitle>Recommended Experts</CardTitle>
          <Badge variant="secondary">{matchingExperts.length} matches</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {matchingExperts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No experts found for {domainLabels[project.domain] || 'this domain'}.
          </p>
        ) : (
          <div className="space-y-4">
            {matchingExperts.map(expert => (
              <div key={expert.id} className="border rounded-lg p-3 flex justify-between items-start">
                <div>
                  <p className="font-medium cursor-pointer hover:underline" onClick={() => navigate(`/experts/${expert.id}`)}>
                    {expert.name}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{expert.experience_summary}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setSelectedExpert(expert); setShowContractDialog(true); }}>
                  Invite
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Invite Dialog */}
      {selectedExpert && (
        <ContractCreationDialog
          open={showContractDialog}
          onOpenChange={setShowContractDialog}
          project_id={project.id}
          expert={selectedExpert}
          onSuccess={() => toast({ title: 'Invitation Sent' })}
        />
      )}
    </Card>
  );
}