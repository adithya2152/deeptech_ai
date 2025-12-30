import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateProject } from '@/hooks/useProjects';
import { domainLabels, trlDescriptions } from '@/lib/constants';
import { Domain, TRLLevel, RiskCategory } from '@/types';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const createProject = useCreateProject();
  const [step, setStep] = useState(1);

  // Only buyers can create projects
  useEffect(() => {
    if (user?.role === 'expert') {
      toast({
        title: 'Access Denied',
        description: 'Only buyers can create projects. Experts can browse and express interest in existing projects.',
        variant: 'destructive',
      });
      navigate('/projects');
    }
  }, [user, navigate, toast]);
  
  const [formData, setFormData] = useState({
    title: '',
    domain: '' as Domain | '',
    description: '',
    trl_level: 4 as TRLLevel,
    risk_categories: [] as RiskCategory[],
    expected_outcome: '',
  });

  const handleSubmit = async () => {
    try {
      // clientId is omitted - backend will set it from JWT token
      const project = await createProject.mutateAsync({
        title: formData.title,
        domain: formData.domain as Domain,
        description: formData.description,
        trl_level: formData.trl_level,
        risk_categories: formData.risk_categories,
        expected_outcome: formData.expected_outcome,
        status: 'draft',
      });
      
      toast({ 
        title: 'Project Created!', 
        description: 'Your project has been saved as a draft.' 
      });
      
      navigate(`/dashboard`);
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create project',
        variant: 'destructive' 
      });
    }
  };

  const toggleRisk = (risk: RiskCategory) => {
    setFormData(prev => ({
      ...prev,
      risk_categories: prev.risk_categories.includes(risk)
        ? prev.risk_categories.filter(r => r !== risk)
        : [...prev.risk_categories, risk],
    }));
  };

  return (
    <Layout showFooter={false}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'gradient-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Define Your Problem</CardTitle>
              <CardDescription>Help us understand what you're trying to solve</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Project Title</Label>
                <Input placeholder="e.g., AI-Powered Predictive Maintenance" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={formData.domain} onValueChange={v => setFormData(p => ({ ...p, domain: v as Domain }))}>
                  <SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(domainLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Problem Description</Label>
                <Textarea placeholder="Describe the technical challenge..." rows={5} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={() => setStep(2)} disabled={!formData.title || !formData.domain}>
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Technical Details</CardTitle>
              <CardDescription>Help experts understand your project's maturity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Technology Readiness Level (TRL)</Label>
                <Select value={String(formData.trl_level)} onValueChange={v => setFormData(p => ({ ...p, trl_level: Number(v) as TRLLevel }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9].map(l => <SelectItem key={l} value={String(l)}>TRL {l}: {trlDescriptions[l]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risk Categories</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['technical', 'regulatory', 'scale', 'market'] as RiskCategory[]).map(risk => (
                    <div key={risk} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted" onClick={() => toggleRisk(risk)}>
                      <Checkbox checked={formData.risk_categories.includes(risk)} />
                      <span className="capitalize">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Continue <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Expected Outcome</CardTitle>
              <CardDescription>What does success look like?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Expected Outcome</Label>
                <Textarea placeholder="Describe what you expect to achieve..." rows={5} value={formData.expected_outcome} onChange={e => setFormData(p => ({ ...p, expected_outcome: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button onClick={handleSubmit} className="flex-1" disabled={createProject.isPending}>
                  {createProject.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-2" /> Create Project</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
