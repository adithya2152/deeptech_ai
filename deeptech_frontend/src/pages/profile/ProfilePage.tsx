import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
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
  // 1. Destructure isLoading from useAuth
  const { user, profile, updateProfile, isLoading } = useAuth()
  const { toast } = useToast()
  
  // Get role from user or profile
  const userRole = user?.role || profile?.role
  const isBuyer = userRole === 'buyer'
  const isExpert = userRole === 'expert'
  
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customDomain, setCustomDomain] = useState('')
  const [showOtherInput, setShowOtherInput] = useState(false)

  console.log('👤 ProfilePage - User role:', userRole, '| isBuyer:', isBuyer, '| isExpert:', isExpert, '| user:', user, '| profile:', profile)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    company: '',
    domains: [] as Domain[],
  })

  // 2. Update form data ONLY when profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        bio: (profile as any).bio || '',
        company: (profile as any).company || '',
        domains: (profile as any).domains || [],
      })
    }
  }, [profile])

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
      }

      if (isExpert) {
        const domainsToSave = [
          ...formData.domains,
          ...(showOtherInput && customDomain.trim() ? [`custom:${customDomain.trim()}`] : [])
        ]
        payload.bio = formData.bio
        payload.domains = domainsToSave
      } else if (isBuyer) {
        payload.company = formData.company
      }
      
      await updateProfile(payload)
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      })
      setIsEditing(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = () => {
    return (
      <Badge variant={isBuyer ? 'default' : 'secondary'} className="text-xs">
        {isBuyer ? '👔 Buyer' : '🎓 Expert'}
      </Badge>
    )
  }

  const isProfileComplete = () => {
    if (!profile?.first_name || !profile?.last_name) return false
    if (isExpert && (!(profile as any).bio || (profile as any).domains?.length === 0)) return false
    if (isBuyer && !(profile as any).company) return false
    return true
  }

  // 3. Show Loading Spinner while fetching user data
  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  // 4. Safety check: If not loading but no user, redirect or show message
  // (Optional: usually handled by ProtectedRoute wrapper)
  if (!user) {
    return (
        <Layout>
            <div className="flex h-[80vh] items-center justify-center">
                <p>Please log in to view your profile.</p>
            </div>
        </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account information</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Account Information</CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Type */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Account Type</p>
                    <p className="text-xs text-muted-foreground">
                      {isBuyer ? 'Hiring experts for projects' : 'Providing expert services'}
                    </p>
                  </div>
                </div>
                {getRoleBadge()}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    // Use optional chaining carefully
                    value={user?.email || ''}
                    disabled
                    className="bg-muted/50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if you need to update it.
                </p>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Role Specific Fields */}
              {isBuyer ? (
                 <div className="space-y-2">
                   <Label htmlFor="company">Company Name</Label>
                   <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Your Company Ltd."
                    />
                   </div>
                 </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Share your expertise..."
                    rows={4}
                  />
                </div>
              )}

              {/* Domains Section for Experts */}
              {isExpert && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Label>Areas of Expertise</Label>
                  </div>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(domainLabels).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={formData.domains.includes(key as Domain)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({ ...formData, domains: [...formData.domains, key as Domain] })
                              } else {
                                setFormData({ ...formData, domains: formData.domains.filter(d => d !== key) })
                              }
                            }}
                          />
                          <label htmlFor={key} className="text-sm font-medium cursor-pointer">{label}</label>
                        </div>
                      ))}
                      {/* ... Other/Custom Domain Logic ... */}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {formData.domains.length > 0 ? (
                        formData.domains.map((domain) => (
                          <Badge key={domain} variant="secondary">
                            {domain.startsWith('custom:') ? domain.substring(7) : domainLabels[domain] || domain}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No domains selected</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      // Reset form to current profile values
                      setFormData({
                        first_name: profile?.first_name || '',
                        last_name: profile?.last_name || '',
                        bio: (profile as any)?.bio || '',
                        company: (profile as any)?.company || '',
                        domains: (profile as any)?.domains || [],
                      })
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <Card>
            <CardHeader><CardTitle>Account Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Member Since</p>
                  </div>
                  <p className="text-lg font-semibold">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                      : 'Recently'}
                  </p>
                </div>
                 {/* ... Other stats ... */}
                 <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Account ID</p>
                  </div>
                  <p className="text-xs font-mono truncate">
                    {user?.id ? `${user.id.split('-')[0]}...` : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}