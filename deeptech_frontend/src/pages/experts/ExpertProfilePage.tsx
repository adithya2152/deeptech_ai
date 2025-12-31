import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { domainLabels } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useExpert } from '@/hooks/useExperts';
import { useMutation } from '@tanstack/react-query';
import { messagesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Star,
  MapPin,
  Shield,
  Calendar,
  FileText,
  Award,
  MessageSquare,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Briefcase,
  Search
} from 'lucide-react';

export default function ExpertProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user, token } = useAuth();
  
  const { data: expert, isLoading } = useExpert(id!);

  const startConversationMutation = useMutation({
    mutationFn: (participant_id: string) => 
      messagesApi.startConversation(participant_id, token!),
    onSuccess: (response) => {
      const conversation_id = response.data.conversation.id;
      navigate(`/messages?id=${conversation_id}`);
      toast({ title: 'Success', description: 'Conversation started.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to start chat.', variant: 'destructive' });
    }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!expert) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Expert Profile Not Found</h1>
          <Button onClick={() => navigate('/experts')} className="mt-6">
            Back to Discovery
          </Button>
        </div>
      </Layout>
    );
  }

  const getInitials = (first_name: string, last_name: string) => {
    return `${first_name?.[0] || ''}${last_name?.[0] || ''}`.toUpperCase();
  };

  const isOwnProfile = user?.id === expert.id;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Main Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <Avatar className="h-24 w-24 ring-2 ring-border">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {getInitials(expert.first_name, expert.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h1 className="font-display text-2xl font-bold">
                        {expert.first_name} {expert.last_name}
                      </h1>
                      {expert.vetting_level === 'deep_tech_verified' && (
                        <Badge className="bg-primary text-primary-foreground gap-1">
                          <Shield className="h-3 w-3" />
                          Deep-Tech Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-3 text-sm">
                      <MapPin className="h-4 w-4" />
                      {expert.location || 'Remote'}
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {expert.bio || 'No bio provided.'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {expert.domains?.map((domain: string) => (
                        <Badge key={domain} variant="outline">
                          {domain.startsWith('custom:') ? domain.substring(7) : domainLabels[domain] || domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="font-bold text-lg">{expert.rating || '0.0'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{expert.review_count || 0} reviews</p>
                  </div>
                  <div className="text-center border-x">
                    <p className="font-bold text-lg">{expert.total_hours || 0}</p>
                    <p className="text-xs text-muted-foreground">Hours Logged</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">${expert.hourly_rate_advisory || 0}</p>
                    <p className="text-xs text-muted-foreground">Advisory Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Information Tabs */}
            <Tabs defaultValue="about">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="publications">Publications</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-6 space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Experience Summary</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {expert.experience_summary || 'No detailed summary provided.'}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="publications" className="mt-6 space-y-4">
                {expert.patents?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Patents</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {expert.patents.map((patent: string, i: number) => (
                        <div key={i} className="text-sm p-2 border rounded flex justify-between">
                          <span>{patent}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {expert.papers?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Research Papers</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {expert.papers.map((paper: string, i: number) => (
                        <div key={i} className="text-sm p-2 border rounded flex justify-between">
                          <span>{paper}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {!expert.patents?.length && !expert.papers?.length && (
                  <div className="p-8 text-center text-muted-foreground italic border rounded-lg">
                    No publications listed.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            {/* Rates Sidebar */}
            <Card>
              <CardHeader><CardTitle>Service Rates</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Advisory</span>
                  <span className="font-bold">${expert.hourly_rate_advisory}/hr</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Architecture</span>
                  <span className="font-bold">${expert.hourly_rate_architecture}/hr</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Execution</span>
                  <span className="font-bold">${expert.hourly_rate_execution}/hr</span>
                </div>
              </CardContent>
            </Card>

            {/* Availability Sidebar */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Weekly Availability</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {expert.availability?.length > 0 ? (
                  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                    const slot = expert.availability.find((a: any) => a.day_of_week === i);
                    return (
                      <div key={day} className="flex justify-between text-xs">
                        <span className={slot ? 'font-medium' : 'text-muted-foreground'}>{day}</span>
                        <span>{slot ? `${slot.start_time} - ${slot.end_time}` : 'Unavailable'}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground italic">No availability set.</p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              {isAuthenticated ? (
                isOwnProfile ? (
                  <Button variant="outline" className="w-full" onClick={() => navigate('/profile')}>
                    Edit My Profile
                  </Button>
                ) : user?.role === 'buyer' ? (
                  <>
                    <Button className="w-full" onClick={() => navigate(`/projects/new?expert=${expert.id}`)}>
                      Hire {expert.first_name}
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="w-full"
                      disabled={startConversationMutation.isPending}
                      onClick={() => startConversationMutation.mutate(expert.id)}
                    >
                      {startConversationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                      Message
                    </Button>
                  </>
                ) : null
              ) : (
                <Button className="w-full" onClick={() => navigate('/login')}>
                  Log in to Hire
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}