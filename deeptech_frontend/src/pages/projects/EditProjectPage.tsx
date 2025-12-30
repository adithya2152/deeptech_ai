import { useState, useEffect } from 'react'
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
import { ArrowLeft, Loader2 } from 'lucide-react'

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

  // Only buyers can edit projects
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
  
  const { data: project, isLoading: loadingProject } = useProject(id!)
  const updateProject = useUpdateProject()

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

  // Pre-fill form when project loads
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        domain: project.domain,
        description: project.description,
        budget_min: project.budget_min?.toString() || '',
        budget_max: project.budget_max?.toString() || '',
        deadline: project.deadline || '',
        trl_level: project.trl_level,
        risk_categories: project.risk_categories,
        expected_outcome: project.expected_outcome,
      })
    }
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Build payload - only include fields that have values
      const payload: any = {
        title: formData.title,
        domain: formData.domain as Domain,
        description: formData.description,
        trl_level: formData.trl_level as TRLLevel,
        risk_categories: formData.risk_categories as RiskCategory[],
        expected_outcome: formData.expected_outcome,
      }

      // Add optional fields if they have values
      if (formData.budget_min) {
        payload.budget_min = parseInt(formData.budget_min)
      }
      if (formData.budget_max) {
        payload.budget_max = parseInt(formData.budget_max)
      }
      if (formData.deadline) {
        payload.deadline = formData.deadline
      }

      await updateProject.mutateAsync({
        id: id!,
        data: payload,
      })

      toast({
        title: 'Project Updated!',
        description: 'Your changes have been saved.',
      })

      navigate(`/projects/${id}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update project',
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
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h2 className="text-2xl font-bold">Project Not Found</h2>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </Layout>
    )
  }

  if (project.status !== 'draft') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h2 className="text-2xl font-bold">Cannot Edit Project</h2>
          <p className="text-muted-foreground">Only draft projects can be edited.</p>
          <Button onClick={() => navigate(`/projects/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            View Project
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/projects/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Button>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Edit Project</h1>
          <p className="text-muted-foreground mt-1">Update your project details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter project title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Domain *</Label>
                <Select
                  value={formData.domain}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, domain: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(domainLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="problem">Problem Description *</Label>
                <Textarea
                  id="problem"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the technical challenge you're facing..."
                  rows={6}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle>Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trl">Technology Readiness Level (TRL) *</Label>
                <Select
                  value={formData.trl_level.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, trl_level: parseInt(value) }))}
                  required
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Risk Categories</Label>
                <div className="space-y-2">
                  {[
                    { value: 'technical', label: 'Technical Risk' },
                    { value: 'regulatory', label: 'Regulatory Risk' },
                    { value: 'scale', label: 'Scale Risk' },
                    { value: 'market', label: 'Market Risk' },
                  ].map((risk) => (
                    <div key={risk.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={risk.value}
                        checked={formData.risk_categories.includes(risk.value)}
                        onCheckedChange={() => toggleRisk(risk.value)}
                      />
                      <Label htmlFor={risk.value} className="cursor-pointer">
                        {risk.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expected Outcome */}
          <Card>
            <CardHeader>
              <CardTitle>Expected Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="outcome">Expected Outcome *</Label>
                <Textarea
                  id="outcome"
                  value={formData.expected_outcome}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_outcome: e.target.value }))}
                  placeholder="Describe what success looks like for this project..."
                  rows={4}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Budget & Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Budget & Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_min">Minimum Budget ($)</Label>
                  <Input
                    id="budget_min"
                    type="number"
                    min="0"
                    value={formData.budget_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                    placeholder="e.g., 10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_max">Maximum Budget ($)</Label>
                  <Input
                    id="budget_max"
                    type="number"
                    min="0"
                    value={formData.budget_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                    placeholder="e.g., 50000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Project Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/projects/${id}`)}
              disabled={updateProject.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
