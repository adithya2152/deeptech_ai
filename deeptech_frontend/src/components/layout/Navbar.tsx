import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  Briefcase, 
  Search,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Globe 
} from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getInitials = (first_name: string | null, last_name: string | null) => {
    const f = first_name ? first_name[0] : '';
    const l = last_name ? last_name[0] : '';
    return (f + l).toUpperCase() || 'U';
  };

  // Use user auth data
  const current_user = user;
  const first_name = current_user?.first_name || '';
  const last_name = current_user?.last_name || '';
  const user_role = current_user?.role;

  const isBuyer = user_role === 'buyer';
  const isExpert = user_role === 'expert';
  const isAdmin = user_role === 'admin';

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <span className="text-lg font-bold text-primary-foreground">D</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">DeepTech</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-6">
            {isAuthenticated ? (
              <>
                {/* --- BUYER LINKS --- */}
                {isBuyer && (
                  <>
                    <Link to="/experts" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Find Experts
                    </Link>
                    <Link to="/projects" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      My Projects
                    </Link>
                    {/* ✅ Added Contracts Link for Buyer */}
                    <Link to="/contracts" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      My Contracts
                    </Link>
                  </>
                )}

                {/* --- EXPERT LINKS --- */}
                {isExpert && (
                  <>
                    <Link to="/marketplace" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Find Work
                    </Link>
                    <Link to="/contracts" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Active Contracts
                    </Link>
                  </>
                )}

                {/* --- ADMIN LINKS --- */}
                {isAdmin && (
                  <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Admin Panel
                  </Link>
                )}
              </>
            ) : (
              /* Public Links (Not Logged In) */
              <>
                <Link to="/experts" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Browse Experts
                </Link>
                <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </>
            )}
          </div>

          {/* Desktop Auth & Profile Menu */}
          <div className="hidden md:flex md:items-center md:gap-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.first_name || user?.last_name ? getInitials(user?.first_name ?? '', user?.last_name ?? '') : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user?.first_name || user?.last_name ? getInitials(user?.first_name ?? '', user?.last_name ?? '') : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-bold">{user?.first_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  
                  {isBuyer && (
                    <DropdownMenuItem onClick={() => navigate('/projects/new')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Create Project
                    </DropdownMenuItem>
                  )}

                  {isExpert && (
                    <DropdownMenuItem onClick={() => navigate('/marketplace')}>
                      <Search className="mr-2 h-4 w-4" />
                      Find Work
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem onClick={() => navigate('/messages')}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Messages
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Log In
                </Button>
                <Button onClick={() => navigate('/register')}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <div className="px-4 py-4 space-y-3">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>

                {/* BUYER Mobile Links */}
                {isBuyer && (
                  <>
                    <Link 
                      to="/experts" 
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Search className="h-5 w-5" />
                      Find Experts
                    </Link>
                    <Link 
                      to="/projects" 
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Briefcase className="h-5 w-5" />
                      My Projects
                    </Link>
                    {/* ✅ Added Contracts Link for Buyer Mobile */}
                    <Link 
                      to="/contracts" 
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FileText className="h-5 w-5" />
                      My Contracts
                    </Link>
                  </>
                )}

                {/* EXPERT Mobile Links */}
                {isExpert && (
                  <>
                    <Link 
                      to="/marketplace" 
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Globe className="h-5 w-5" />
                      Find Work
                    </Link>
                    <Link 
                      to="/contracts" 
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FileText className="h-5 w-5" />
                      Active Contracts
                    </Link>
                  </>
                )}

                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  Profile
                </Link>
                <button 
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted w-full text-destructive"
                >
                  <LogOut className="h-5 w-5" />
                  Log Out
                </button>
              </>
            ) : (
              /* Public Mobile Links */
              <>
                <Link 
                  to="/experts" 
                  className="block p-2 rounded-lg hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Browse Experts
                </Link>
                <Link 
                  to="/how-it-works" 
                  className="block p-2 rounded-lg hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </Link>
                <div className="pt-3 space-y-2">
                  <Button variant="outline" className="w-full" onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>
                    Log In
                  </Button>
                  <Button className="w-full" onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}>
                    Get Started
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}