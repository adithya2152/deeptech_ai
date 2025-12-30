import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { UserRole, Domain } from '@/types';
import { domainLabels } from '@/lib/constants';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'buyer' | 'expert'>('buyer');
  const [agreed, setAgreed] = useState(false);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [otherDomain, setOtherDomain] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreed) {
      toast({
        title: 'Agreement required',
        description: 'Please agree to the terms of service to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (role === 'expert' && domains.length === 0 && !otherDomain.trim()) {
      toast({
        title: 'Expertise required',
        description: 'Please select at least one area of expertise.',
        variant: 'destructive',
      });
      return;
    }

    if (showOtherInput && otherDomain.trim() && otherDomain.trim().length < 3) {
      toast({
        title: 'Invalid custom domain',
        description: 'Custom domain must be at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      // Combine predefined domains with custom domain
      const allDomains = role === 'expert' 
        ? [...domains, ...(otherDomain.trim() ? [`custom:${otherDomain.trim()}`] : [])]
        : undefined;
      
      await signUp(email, password, name, role, allDomains);
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not create account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strength = passwordStrength();
  const strengthColors = ['bg-destructive', 'bg-warning', 'bg-warning', 'bg-success'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
              <span className="text-xl font-bold text-primary-foreground">D</span>
            </div>
            <span className="font-display text-2xl font-bold">DeepTech</span>
          </Link>
        </div>

        <Card className="animate-scale-in">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Create your account</CardTitle>
            <CardDescription>Join the deep-tech marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={role} onValueChange={(v) => setRole(v as 'buyer' | 'expert')} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buyer">I'm Hiring</TabsTrigger>
                <TabsTrigger value="expert">I'm an Expert</TabsTrigger>
              </TabsList>
              <TabsContent value="buyer" className="mt-4">
                <p className="text-sm text-muted-foreground text-center">
                  Find and hire deep-tech experts for your projects
                </p>
              </TabsContent>
              <TabsContent value="expert" className="mt-4">
                <p className="text-sm text-muted-foreground text-center">
                  Showcase your expertise and work with innovative companies
                </p>
              </TabsContent>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < strength ? strengthColors[strength - 1] : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password strength: {strength > 0 ? strengthLabels[strength - 1] : 'Too weak'}
                    </p>
                  </div>
                )}
              </div>

              {/* Domains - Expert Only */}
              {role === 'expert' && (
                <div className="space-y-2">
                  <Label>Areas of Expertise *</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                    {Object.entries(domainLabels).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`domain-${key}`}
                          checked={domains.includes(key as Domain)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setDomains([...domains, key as Domain])
                            } else {
                              setDomains(domains.filter(d => d !== key))
                            }
                          }}
                        />
                        <label
                          htmlFor={`domain-${key}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {label}
                        </label>
                      </div>
                    ))}
                    
                    <div className="col-span-2 flex items-center space-x-2">
                      <Checkbox
                        id="domain-other"
                        checked={showOtherInput}
                        onCheckedChange={(checked) => {
                          setShowOtherInput(!!checked)
                          if (!checked) setOtherDomain('')
                        }}
                      />
                      <label
                        htmlFor="domain-other"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Other (specify)
                      </label>
                    </div>
                  </div>
                  {showOtherInput && (
                    <Input
                      placeholder="Enter your custom domain (e.g., Nuclear Physics, Marine Biology)"
                      value={otherDomain}
                      onChange={(e) => setOtherDomain(e.target.value)}
                      maxLength={50}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select all domains where you have expertise
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setAgreed(!agreed)}
                  className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                    agreed ? 'bg-primary border-primary' : 'border-input'
                  }`}
                >
                  {agreed && <Check className="h-3 w-3 text-primary-foreground" />}
                </button>
                <p className="text-sm text-muted-foreground">
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
