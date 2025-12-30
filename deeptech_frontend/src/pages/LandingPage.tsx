import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ExpertCard } from '@/components/experts/ExpertCard';
import { domainLabels } from '@/lib/constants';
import { useExperts } from '@/hooks/useExperts';
import { 
  ArrowRight, 
  Shield, 
  Clock, 
  FileCheck, 
  Users,
  Zap,
  Lock,
  TrendingUp
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: experts } = useExperts({ onlyVerified: true });

  const features = [
    {
      icon: Shield,
      title: 'Verified Deep-Tech Experts',
      description: 'Every expert is vetted for domain expertise, system-level experience, and track record.',
    },
    {
      icon: Clock,
      title: 'Transparent Hourly Billing',
      description: 'Track every hour with value tags. See decisions made, risks avoided, and knowledge transferred.',
    },
    {
      icon: FileCheck,
      title: 'Built-in IP Protection',
      description: 'Auto-generated NDAs, IP ownership declarations, and versioned agreement records.',
    },
    {
      icon: Users,
      title: 'Problem-First Matching',
      description: 'Describe your challenge, get matched with experts who have solved similar problems.',
    },
  ];

  const domains = Object.entries(domainLabels).slice(0, 6);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark opacity-[0.02]" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <Badge variant="secondary" className="mb-4">
              <Zap className="h-3 w-3 mr-1" />
              Trusted by 50+ Deep-Tech Companies
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Hire Deep-Tech Experts
              <span className="block gradient-primary bg-clip-text text-transparent">
                By The Hour
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with verified AI, robotics, climate, and quantum experts. 
              Pay only for the hours that matter, with built-in IP protection and value tracking.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate(isAuthenticated ? '/experts' : '/register')}>
                {isAuthenticated ? 'Find Experts' : 'Get Started Free'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/how-it-works')}>
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Domains Section */}
      <section className="py-16 bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold">Deep-Tech Domains</h2>
            <p className="mt-2 text-muted-foreground">Find expertise across frontier technology sectors</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {domains.map(([key, label]) => (
              <Card 
                key={key} 
                className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/experts?domain=${key}`)}
              >
                <CardContent className="p-4 text-center">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">Built for Deep-Tech</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlike generic freelance platforms, we understand the unique needs of frontier technology projects.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-none shadow-none bg-transparent">
                <CardContent className="p-0 space-y-4">
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Experts */}
      <section className="py-20 bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-display text-3xl font-bold">Featured Experts</h2>
              <p className="mt-2 text-muted-foreground">Hand-picked specialists ready to help</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/experts')}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experts && experts.length > 0 ? (
              experts.slice(0, 3).map(expert => (
                <ExpertCard key={expert.id} expert={expert} />
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                <p>Expert profiles will appear here once they register</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">
                Every Hour Delivers Value
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our unique value logging system ensures transparency and accountability. 
                Every hour logged includes what was accomplished and why it matters.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: TrendingUp, label: 'Decisions Made', desc: 'Key choices that shape project direction' },
                  { icon: Shield, label: 'Risks Avoided', desc: 'Problems identified before they become costly' },
                  { icon: Zap, label: 'Knowledge Transferred', desc: 'Expertise your team gains to move forward' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{item.label}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="secondary">Architecture Review</Badge>
                    <span className="text-sm text-muted-foreground">4 hours</span>
                  </div>
                  <p className="text-sm">
                    Initial system architecture review. Analyzed existing data pipelines and identified key bottlenecks.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">Decision Made</Badge>
                    <Badge variant="outline" className="text-xs">Path Clarified</Badge>
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Key Decision</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recommended switching from batch to streaming data processing for real-time predictions.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full gradient-accent opacity-20 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="gradient-dark text-primary-foreground overflow-hidden">
            <CardContent className="p-12 text-center relative">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white blur-3xl" />
                <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white blur-3xl" />
              </div>
              <div className="relative z-10">
                <Lock className="h-12 w-12 mx-auto mb-6 opacity-80" />
                <h2 className="font-display text-3xl sm:text-4xl font-bold">
                  Start Building with Confidence
                </h2>
                <p className="mt-4 text-lg opacity-80 max-w-2xl mx-auto">
                  Your IP is protected from day one. Every project includes auto-generated NDAs 
                  and clear ownership agreements.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    variant="secondary"
                    onClick={() => navigate(isAuthenticated ? '/projects/new' : '/register')}
                  >
                    Create Your First Project
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
