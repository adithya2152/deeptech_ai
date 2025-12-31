import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { expertsApi } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { domainLabels } from '@/lib/constants'
import { Domain } from '@/types'
import { User, Mail, Briefcase, Calendar, Loader2, Edit, Save, Tag, Building } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, updateProfile, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Use profile data as the primary source for basic info (Name, Role, Date)
  const user_role = profile?.role || user?.role
  const is_buyer = user_role === 'buyer'
  const is_expert = user_role === 'expert'

  const [is_editing, set_is_editing] = useState(false)
  const [save_loading, set_save_loading] = useState(false)

  const { data: expert_data, isLoading: expert_loading } = useQuery({
    queryKey: ['expertProfile', user?.id],
    queryFn: async () => {
      const response = await expertsApi.getById(user!.id);
      return response.data;
    },
    enabled: !!user?.id && is_expert,
  })

  const [form_data, set_form_data] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    company: '',
    domains: [] as Domain[],
  })

  useEffect(() => {
    if (profile) {
      set_form_data(prev => ({
        ...prev,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        company: (profile as any).company || '',
      }));
    }

    if (is_expert && expert_data) {
      set_form_data(prev => ({
        ...prev,
        bio: expert_data.experience_summary || '',
        domains: expert_data.domains || [],
      }));
    }
  }, [profile, expert_data, is_expert]);

  const handle_save = async () => {
    set_save_loading(true)
    try {
      const payload: any = {
        first_name: form_data.first_name,
        last_name: form_data.last_name,
      }

      if (is_expert) {
        payload.experience_summary = form_data.bio
        payload.domains = form_data.domains
      } else if (is_buyer) {
        payload.company = form_data.company
      }

      await updateProfile(payload)

      if (is_expert) {
        queryClient.invalidateQueries({ queryKey: ['expertProfile', user?.id] })
      }

      toast({ title: 'Profile Updated', description: 'Your profile has been updated successfully.' })
      set_is_editing(false)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' })
    } finally {
      set_save_loading(false)
    }
  }

  if (authLoading || (is_expert && expert_loading)) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your professional information</p>
        </div>

        <div className="grid gap-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-4">
              <CardTitle className="text-lg">Account Information</CardTitle>
              {!is_editing && (
                <Button variant="outline" size="sm" onClick={() => set_is_editing(true)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Profile
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

              <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Account Type</p>
                    <p className="text-xs text-muted-foreground">
                      {is_buyer ? 'Hiring Deep Tech Experts' : 'Technical Subject Matter Expert'}
                    </p>
                  </div>
                </div>
                <Badge variant={is_buyer ? 'default' : 'secondary'} className="px-3 py-1 uppercase tracking-wider text-[10px]">
                  {is_buyer ? 'Buyer' : 'Expert'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={form_data.first_name}
                    onChange={(e) => set_form_data({ ...form_data, first_name: e.target.value })}
                    disabled={!is_editing}
                    placeholder="First Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={form_data.last_name}
                    onChange={(e) => set_form_data({ ...form_data, last_name: e.target.value })}
                    disabled={!is_editing}
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" value={profile?.email || user?.email || ''} disabled className="pl-10 bg-muted/40 cursor-not-allowed" />
                </div>
              </div>

              {is_buyer ? (
                <div className="space-y-2">
                  <Label htmlFor="company">Organization / Company Name</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      value={form_data.company}
                      onChange={(e) => set_form_data({ ...form_data, company: e.target.value })}
                      disabled={!is_editing}
                      placeholder="Organization Name"
                      className="pl-10"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Summary</Label>
                    <Textarea
                      id="bio"
                      value={form_data.bio}
                      onChange={(e) => set_form_data({ ...form_data, bio: e.target.value })}
                      disabled={!is_editing}
                      placeholder="Summarize your expertise..."
                      rows={5}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Tag className="h-4 w-4" /> Areas of Expertise
                    </div>
                    {is_editing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border p-4 rounded-xl bg-muted/10">
                        {Object.entries(domainLabels).map(([key, label]) => (
                          <div key={key} className="flex items-center space-x-3">
                            <Checkbox
                              id={key}
                              checked={form_data.domains.includes(key as Domain)}
                              onCheckedChange={(checked) => {
                                if (checked) set_form_data({ ...form_data, domains: [...form_data.domains, key as Domain] })
                                else set_form_data({ ...form_data, domains: form_data.domains.filter(d => d !== key) })
                              }}
                            />
                            <Label htmlFor={key} className="text-sm font-normal cursor-pointer">{label}</Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {form_data.domains.length > 0 ? (
                          form_data.domains.map((domain) => (
                            <Badge key={domain} variant="secondary" className="bg-muted text-muted-foreground border-none">
                              {domainLabels[domain] || domain}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No domains selected.</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {is_editing && (
                <div className="flex gap-3 pt-6 border-t">
                  <Button onClick={handle_save} disabled={save_loading} className="min-w-[140px]">
                    {save_loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                  <Button variant="ghost" onClick={() => set_is_editing(false)} disabled={save_loading}>
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2 bg-muted/20 border-b mb-4">
                <CardTitle className="text-sm font-medium">Security</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Account ID</p>
                    <p className="text-xs font-mono truncate">{profile?.id || user?.id || '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2 bg-muted/20 border-b mb-4">
                <CardTitle className="text-sm font-medium">Platform Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Member Since</p>
                    <p className="text-sm font-medium">
                      {(profile?.created_at || expert_data?.created_at)
                        ? new Date(profile?.created_at || expert_data?.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                        : 'Not available'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}