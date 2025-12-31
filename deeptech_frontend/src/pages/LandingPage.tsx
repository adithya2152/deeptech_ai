import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  TrendingUp,
  BrainCircuit,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: experts, isLoading } = useExperts({ onlyVerified: true });

  const features = [
    {
      icon: Shield,
      title: 'Verified Deep-Tech Experts',
      description: 'Every expert is vetted for domain expertise, system-level experience, and a proven deep-tech track record.',
    },
    {
      icon: Clock,
      title: 'Transparent Hourly Billing',
      description: 'Track every hour with value tags. See decisions made, risks avoided, and knowledge transferred.',
    },
    {
      icon: FileCheck,
      title: 'Built-in IP Protection',
      description: 'Auto-generated NDAs, IP ownership declarations, and versioned agreement records protect your innovations.',
    },
    {
      icon: BrainCircuit,
      title: 'Problem-First Matching',
      description: 'Describe your challenge and get matched with experts who have solved similar frontier technology problems.',
    },
  ];

  const domains = Object.entries(domainLabels).slice(0, 6);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background pt-16 pb-24 lg:pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-in fade-in slide-in-from-top-4 duration-1000">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/20 bg-primary/5 text-primary rounded-full animate-pulse">
              <Zap className="h-3.5 w-3.5 mr-2 fill-current" />
              Trusted by 50+ Global Deep-Tech Ventures
            </Badge>
            
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
              Hire Deep-Tech Experts
              <span className="block text-primary mt-2">
                By The Hour
              </span>
            </h1>
            
            <p className="mt-8 text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Connect with verified specialists in AI, Robotics, Climate-Tech, and Quantum. 
              Eliminate hiring friction with built-in IP protection and outcome-based hour tracking.
            </p>
            
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20" onClick={() => navigate(isAuthenticated ? '/experts' : '/register')}>
                {isAuthenticated ? 'Find Experts' : 'Start Building Now'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => navigate('/how-it-works')}>
                How it Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Domains Section */}
      <section className="py-20 border-y bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Frontier Expertise</h2>
            <h3 className="font-display text-3xl font-bold">Specialized Domains</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {domains.map(([key, label]) => (
              <Card
                key={key} 
                className="group border-border/50 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer bg-background"
                onClick={() => navigate(`/experts?domain=${key}`)}
              >
                <CardContent className="flex flex-col items-center justify-center p-5 space-y-4">
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-display text-4xl font-bold mb-4">Built for Serious Engineering</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Generic platforms fail at deep-tech. We built a system specifically for R&D, 
              hardware-software co-design, and scientific commercialization.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 border border-primary/20">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Experts */}
      <section className="py-24 bg-muted/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div className="text-left">
              <Badge variant="secondary" className="mb-4">Available Now</Badge>
              <h2 className="font-display text-4xl font-bold">Featured Experts</h2>
              <p className="mt-2 text-muted-foreground text-lg">Top 1% vetted specialists ready for immediate engagement.</p>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate('/experts')}>
              Explore Global Network
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-64 rounded-xl bg-muted animate-pulse border" />
              ))
            ) : experts && experts.length > 0 ? (
              experts.slice(0, 3).map(expert => (
                <ExpertCard key={expert.id} expert={expert} />
              ))
            ) : (
              <div className="col-span-full text-center py-16 bg-background rounded-2xl border-2 border-dashed">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">Experts are currently being vetted. Check back shortly.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Value Props / Dashboard Demo Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
                  Every Hour <br />
                  <span className="text-primary">Delivers Value</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Deep-tech is expensive. We ensure every dollar is accounted for. 
                  Our Value-Log™ system forces experts to tag outcomes to their hours, 
                  creating a verifiable audit trail of your technical progress.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  { icon: TrendingUp, label: 'Decisions Made', desc: 'Capture key architectural and technical pivot points.', color: 'text-blue-500' },
                  { icon: Shield, label: 'Risks Avoided', desc: 'Identify system failures and bottlenecks early.', color: 'text-green-500' },
                  { icon: Lightbulb, label: 'Knowledge Transferred', desc: 'Upskill your internal engineering team via collaboration.', color: 'text-orange-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-5 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className={cn("h-12 w-12 rounded-lg bg-background border shadow-sm flex items-center justify-center shrink-0", item.color)}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{item.label}</h4>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-indigo-500/20 blur-3xl rounded-full opacity-50" />
              <Card className="relative shadow-2xl border-primary/10 overflow-hidden">
                <CardHeader className="bg-muted/50 border-b py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="h-3 w-3 rounded-full bg-red-500" />
                       <div className="h-3 w-3 rounded-full bg-yellow-500" />
                       <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">Timesheet-Log_v2.0</span>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3">
                      <Zap className="h-3 w-3 mr-2" />
                      Architecture Review
                    </Badge>
                    <span className="font-mono text-sm font-bold">04:00 HRS</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground/80">Task Summary</p>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Conducted initial system architecture audit. Analyzed existing ROS2 data pipelines 
                      and identified race conditions in the perception node.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Decision Made
                    </Badge>
                    <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">
                      <Shield className="h-3 w-3 mr-1" /> Risk Mitigated
                    </Badge>
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Key Outcome</p>
                    <p className="text-sm text-foreground italic leading-relaxed">
                      "Proposed switching to CycloneDDS for lower latency in high-bandwidth 
                      LiDAR point-cloud processing. Estimated performance gain: 22%."
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-slate-950 text-white overflow-hidden border-none shadow-2xl">
            <CardContent className="p-12 md:p-20 text-center relative">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-[100px]" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-[100px]" />
              </div>
              
              <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm mb-4 border border-white/20">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-display text-4xl sm:text-5xl font-bold">
                  Start Building with Confidence
                </h2>
                <p className="text-xl text-white/70 leading-relaxed">
                  Your intellectual property is protected from day one. Every project includes 
                  auto-generated NDAs, version-controlled IP assignments, and bank-grade data security.
                </p>
                <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="h-14 px-10 text-lg font-bold"
                    onClick={() => navigate(isAuthenticated ? '/projects/new' : '/register')}
                  >
                    Post a Project
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="h-14 px-10 text-lg border-white/20 hover:bg-white/10 text-black font-bold"
                    onClick={() => navigate('/register?role=expert')}
                  >
                    Apply as Expert
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