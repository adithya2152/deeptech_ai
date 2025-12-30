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
import {
  Star,
  Clock,
  MapPin,
  Shield,
  CheckCircle,
  Calendar,
  FileText,
  Award,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';

export default function ExpertProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { data: expert, isLoading } = useExpert(id!);

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <p>Loading expert profile...</p>
        </div>
      </Layout>
    );
  }

  if (!expert) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Expert not found</h1>
          <Button onClick={() => navigate('/experts')} className="mt-4">
            Browse Experts
          </Button>
        </div>
      </Layout>
    );
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const getVettingBadge = () => {
    if (expert.vettingLevel === 'deep_tech_verified') {
      return (
        <Badge className="bg-primary text-primary-foreground gap-1">
          <Shield className="h-3 w-3" />
          Deep-Tech Verified
        </Badge>
      );
    }
    if (expert.vettingLevel === 'advanced') {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Advanced Verified
        </Badge>
      );
    }
    return <Badge variant="outline">Pending Verification</Badge>;
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <Avatar className="h-24 w-24 ring-4 ring-border">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {getInitials(expert.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h1 className="font-display text-2xl font-bold">{expert.name}</h1>
                      {getVettingBadge()}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4" />
                      {expert.location}
                    </div>
                    <p className="text-muted-foreground">{expert.bio}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {expert.domains.map(domain => (
                        <Badge key={domain} variant="outline">
                          {domain.startsWith('custom:') 
                            ? domain.substring(7) 
                            : domainLabels[domain] || domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="h-5 w-5 fill-warning text-warning" />
                      <span className="text-2xl font-bold">{expert.rating}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{expert.reviewCount} reviews</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{expert.totalHours}</div>
                    <p className="text-sm text-muted-foreground">Hours completed</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">${expert.hourlyRates?.advisory}</div>
                    <p className="text-sm text-muted-foreground">Starting rate/hr</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="about">
              <TabsList>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Experience Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{expert.experience_summary}</p>
                  </CardContent>
                </Card>

                {expert.patents && expert.patents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Patents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {expert.patents.map((patent, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            {patent}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {expert.papers && expert.papers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Publications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {expert.papers.map((paper, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            {paper}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="experience" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">
                      Detailed work history and project portfolio coming soon.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">
                      Client reviews and testimonials coming soon.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Rates Card */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Advisory</p>
                    <p className="text-sm text-muted-foreground">Strategic guidance</p>
                  </div>
                  <p className="text-xl font-bold">${expert.hourly_rate_advisory}/hr</p>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Architecture Review</p>
                    <p className="text-sm text-muted-foreground">Technical deep-dives</p>
                  </div>
                  <p className="text-xl font-bold">${expert.hourly_rate_architecture}/hr</p>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Hands-on Execution</p>
                    <p className="text-sm text-muted-foreground">Active development</p>
                  </div>
                  <p className="text-xl font-bold">${expert.hourly_rate_execution}/hr</p>
                </div>
              </CardContent>
            </Card>

            {/* Availability Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                    const slot = expert.availability.find(a => a.day_of_week === i);
                    return (
                      <div key={day} className="flex justify-between text-sm">
                        <span className={slot ? 'font-medium' : 'text-muted-foreground'}>{day}</span>
                        <span className={slot ? '' : 'text-muted-foreground'}>
                          {slot ? `${slot.start_time} - ${slot.end_time}` : 'Unavailable'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isAuthenticated && user?.role === 'buyer' ? (
                <>
                  <Button className="w-full" onClick={() => navigate(`/projects/new?expert=${expert.id}`)}>
                    Hire {expert.name.split(' ')[0]}
                  </Button>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </>
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
