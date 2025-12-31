import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useProject, useUpdateProject } from '@/hooks/useProjects'
import { Domain, TRLLevel, RiskCategory } from '@/types'
import { domainLabels, trlDescriptions } from '@/lib/constants'
import { ArrowLeft, Loader2, Save, X, Rocket, ShieldAlert, Target, Calendar, DollarSign } from 'lucide-react'

type FormData = {
  title: string
  domain: string
  description: string
  trl_level: number
  risk_categories: string[]
  expected_outcome: string
  budget_min: string
  budget_max: string
  deadline: string
}

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  
  const { data: project, isLoading: loadingProject } = useProject(id!)
  const updateProject = useUpdateProject()
  const dataLoaded = useRef(false)

  const [formData, setFormData] = useState<FormData>({
    title: '',
    domain: '',
    description: '',
    trl_level: 1,
    risk_categories: [],
    expected_outcome: '',
    budget_min: '',
    budget_max: '',
    deadline: '',
  })

  useEffect(() => {
    if (user?.role === 'expert') {
      toast({
        title: 'Access Denied',
        description: 'Only buyers can edit projects.',
        variant: 'destructive',
      })
      navigate('/projects')
    }
  }, [user, navigate, toast])

  useEffect(() => {
    if (project && !dataLoaded.current) {
      setFormData({
        title: project.title,
        domain: project.domain,
        description: project.description,
        budget_min: project.budget_min?.toString() || '',
        budget_max: project.budget_max?.toString() || '',
        deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '', 
        trl_level: project.trl_level || 1, 
        risk_categories: project.risk_categories || [],
        expected_outcome: project.expected_outcome || '',
      })
      dataLoaded.current = true;
    }
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const payload: any = {
        title: formData.title.trim(),
        domain: formData.domain as Domain,
        description: formData.description,
        trl_level: formData.trl_level as TRLLevel,
        risk_categories: formData.risk_categories as RiskCategory[],
        expected_outcome: formData.expected_outcome,
        status: project?.status || 'draft' 
      }

      if (formData.budget_min) payload.budget_min = parseInt(formData.budget_min)
      if (formData.budget_max) payload.budget_max = parseInt(formData.budget_max)
      if (formData.deadline) payload.deadline = formData.deadline

      await updateProject.mutateAsync({
        id: id!,
        data: payload,
      })

      toast({ title: 'Project Updated', description: 'Technical specifications saved successfully.' })
      navigate(`/projects/${id}`)
    } catch (error: any) {
      const isDuplicate = error.message?.includes('unique') || error.message?.includes('23505');
      
      toast({
        title: isDuplicate ? 'Duplicate Title' : 'Sync Error',
        description: isDuplicate 
          ? 'You already have a project with this title. Please choose a unique name.' 
          : (error.message || 'Failed to update project'),
        variant: 'destructive',
      })
    }
  }

  const toggleRisk = (risk: string) => {
    setFormData(prev => ({
      ...prev,
      risk_categories: prev.risk_categories.includes(risk)
        ? prev.risk_categories.filter(r => r !== risk)
        : [...prev.risk_categories, risk],
    }))
  }

  if (loadingProject) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading specifications...</p>
        </div>
      </Layout>
    )
  }

  if (project && project.buyer_id !== user?.id) {
    navigate(`/projects/${id}`)
    return null
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate(`/projects/${id}`)}
              className="mb-4 text-muted-foreground hover:text-foreground pl-0"
            >
              <ArrowLeft className="h-4 w-4 ml-2 mb-[0.1px]" />
              Back to Project Detail
            </Button>
            <h1 className="font-display text-4xl font-bold tracking-tight">Edit Specifications</h1>
            <p className="text-muted-foreground mt-2 text-lg">Update the technical parameters for your deep-tech initiative.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Mission Overview */}
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Mission Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs uppercase tracking-widest font-bold">Project Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="h-12 bg-background/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain" className="text-xs uppercase tracking-widest font-bold">Scientific Domain</Label>
                <Select
                  value={formData.domain}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, domain: value }))}
                  required
                >
                  <SelectTrigger className="h-12 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(domainLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="problem" className="text-xs uppercase tracking-widest font-bold">Technical Challenge</Label>
                <Textarea
                  id="problem"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-background/50 resize-none font-light leading-relaxed"
                  rows={8}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Maturity & Risks */}
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
              </div>
              <CardTitle>Technical Maturity & Risks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold">TRL Level</Label>
                <Select
                  value={formData.trl_level.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, trl_level: parseInt(value) }))}
                  required
                >
                  <SelectTrigger className="h-12 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(trlDescriptions).map(([level, description]) => (
                      <SelectItem key={level} value={level}>
                        TRL {level} - {description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-widest font-bold">Anticipated Risks</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['technical', 'regulatory', 'scale', 'market'].map((risk) => (
                    <div 
                      key={risk} 
                      className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                        formData.risk_categories.includes(risk) 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                          : 'border-border bg-background/50 hover:bg-muted'
                      }`}
                      onClick={() => toggleRisk(risk)}
                    >
                      <Checkbox
                        id={risk}
                        checked={formData.risk_categories.includes(risk)}
                        className="data-[state=checked]:bg-primary"
                      />
                      <Label htmlFor={risk} className="cursor-pointer capitalize font-semibold">{risk}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Outcome */}
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <CardTitle>Target Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="outcome" className="text-xs uppercase tracking-widest font-bold">Expected Deliverables</Label>
                <Textarea
                  id="outcome"
                  value={formData.expected_outcome}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_outcome: e.target.value }))}
                  className="bg-background/50 h-32 resize-none"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* ✅ FIXED: Budget & Timeline (Consistent Styling) */}
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle>Budget & Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="budget_min" className="text-xs uppercase tracking-widest font-bold">Min Budget ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="budget_min"
                      type="number"
                      placeholder="e.g. 10000"
                      value={formData.budget_min}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                      className="pl-9 h-12 bg-background/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_max" className="text-xs uppercase tracking-widest font-bold">Max Budget ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="budget_max"
                      type="number"
                      placeholder="e.g. 50000"
                      value={formData.budget_max}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                      className="pl-9 h-12 bg-background/50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline" className="text-xs uppercase tracking-widest font-bold">Target Deadline</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="pl-9 h-12 bg-background/50 block w-full text-left"
                    style={{ colorScheme: 'auto' }} // Resets native date picker colors
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end pt-6 sticky bottom-6 z-10">
            <div className="bg-background/80 backdrop-blur-md p-2 rounded-xl flex gap-4 shadow-xl border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(`/projects/${id}`)}
                disabled={updateProject.isPending}
                className="h-12 px-6 font-semibold"
              >
                <X className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <Button 
                type="submit" 
                disabled={updateProject.isPending}
                className="h-12 px-8 font-bold bg-primary shadow-lg shadow-primary/20"
              >
                {updateProject.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Update Specifications
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  )
}