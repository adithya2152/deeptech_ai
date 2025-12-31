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
import { ArrowLeft, ArrowRight, Check, Loader2, Rocket, ShieldAlert, Target } from 'lucide-react';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const createProject = useCreateProject();
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (user && user.role === 'expert') {
      toast({
        title: 'Access Restricted',
        description: 'Only Buyers can initiate new projects.',
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
    budget_min: '',
    budget_max: '',
  });

  const handleSubmit = async () => {
    try {
      await createProject.mutateAsync({
        title: formData.title.trim(),
        domain: formData.domain as Domain,
        description: formData.description,
        trl_level: formData.trl_level,
        risk_categories: formData.risk_categories,
        expected_outcome: formData.expected_outcome,
        budget_min: Number(formData.budget_min),
        budget_max: Number(formData.budget_max),
        status: 'draft', 
      });
      
      toast({ 
        title: 'Draft Saved', 
        description: 'Your project specifications have been stored as a draft.' 
      });
      
      navigate(`/projects`);
    } catch (error: any) {
      const isDuplicate = error.message?.includes('unique') || error.message?.includes('already exists');
      
      toast({ 
        title: isDuplicate ? 'Project Title Exists' : 'Submission Failed', 
        description: isDuplicate 
          ? 'You already have a project with this title. Please use a unique identifier.'
          : (error.message || 'Check your connection and try again.'),
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
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="flex items-center gap-3 mb-10">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 space-y-2">
              <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`text-[10px] uppercase font-bold tracking-wider ${s === step ? 'text-primary' : 'text-muted-foreground'}`}>
                Step 0{s}
              </p>
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card className="border-none shadow-2xl bg-card/50 backdrop-blur">
            <CardHeader className="space-y-1">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display">Define the Mission</CardTitle>
              <CardDescription>Establish the core objectives and technical domain</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold">Project Title</Label>
                <Input 
                  placeholder="e.g., Quantum-Safe Encryption" 
                  value={formData.title} 
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} 
                  className="h-12 bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold">Scientific Domain</Label>
                <Select value={formData.domain} onValueChange={v => setFormData(p => ({ ...p, domain: v as Domain }))}>
                  <SelectTrigger className="h-12 bg-background/50">
                    <SelectValue placeholder="Identify relevant domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(domainLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold">Technical Challenge</Label>
                <Textarea 
                  placeholder="Describe the problem..." 
                  rows={6} 
                  value={formData.description} 
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} 
                  className="bg-background/50 resize-none"
                />
              </div>
              <Button 
                className="w-full h-12 text-md font-bold" 
                onClick={() => setStep(2)} 
                disabled={!formData.title || !formData.domain || !formData.description}
              >
                Next Configuration <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-none shadow-2xl bg-card/50 backdrop-blur">
            <CardHeader className="space-y-1">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2">
                <ShieldAlert className="h-6 w-6 text-orange-500" />
              </div>
              <CardTitle className="text-2xl font-display">Technical Maturity & Risks</CardTitle>
              <CardDescription>Quantify the current stage and potential bottlenecks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold">Current TRL Level</Label>
                <Select 
                  value={String(formData.trl_level)} 
                  onValueChange={v => setFormData(p => ({ ...p, trl_level: Number(v) as TRLLevel }))}
                >
                  <SelectTrigger className="h-12 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9].map(l => (
                      <SelectItem key={l} value={String(l)}>
                        TRL {l}: {trlDescriptions[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <Label className="text-xs uppercase tracking-widest font-bold">Anticipated Risk Profiles</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(['technical', 'regulatory', 'scale', 'market'] as RiskCategory[]).map(risk => (
                    <div 
                      key={risk} 
                      className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.risk_categories.includes(risk) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-transparent bg-muted/50 hover:bg-muted'
                      }`}
                      onClick={() => toggleRisk(risk)}
                    >
                      <Checkbox checked={formData.risk_categories.includes(risk)} />
                      <span className="text-sm font-semibold capitalize">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 font-bold">Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1 h-12 font-bold">Finalize <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-none shadow-2xl bg-card/50 backdrop-blur">
            <CardHeader className="space-y-1">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-2">
                <Target className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-display">Target & Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold">Expected Outcome</Label>
                <Textarea 
                  placeholder="Define success..." 
                  rows={4} 
                  value={formData.expected_outcome} 
                  onChange={e => setFormData(p => ({ ...p, expected_outcome: e.target.value }))} 
                  className="bg-background/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Min Budget ($)</Label>
                  <Input type="number" value={formData.budget_min} onChange={e => setFormData(p => ({ ...p, budget_min: e.target.value }))} className="h-12 bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Max Budget ($)</Label>
                  <Input type="number" value={formData.budget_max} onChange={e => setFormData(p => ({ ...p, budget_max: e.target.value }))} className="h-12 bg-background/50" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 font-bold">Back</Button>
                <Button onClick={handleSubmit} className="flex-1 h-12 font-bold bg-zinc-900 text-white" disabled={createProject.isPending}>
                  {createProject.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Draft'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}