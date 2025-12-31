import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplaceProjects } from '@/hooks/useProjects';
import { Layout } from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/projects/ProjectCard'; 
import { Loader2, Search, Briefcase, FilterX, RefreshCcw } from 'lucide-react';

const DOMAIN_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Domains' },
  { value: 'ai_ml', label: 'AI & Machine Learning' },
  { value: 'robotics', label: 'Robotics & Automation' },
  { value: 'climate_tech', label: 'Climate Tech' },
  { value: 'biotech', label: 'Biotech & Life Sciences' },
  { value: 'quantum', label: 'Quantum Computing' },
  { value: 'space_tech', label: 'Space Technology' },
  { value: 'advanced_materials', label: 'Advanced Materials' },
  { value: 'energy', label: 'Sustainable Energy' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

export default function MarketplacePage() {
  const { user } = useAuth();
  
  // ✅ Destructure refetch to allow manual refreshing
  const { data: projects = [], isLoading, refetch, isRefetching } = useMarketplaceProjects();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');

  // Filter Logic
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDomain = domainFilter === 'all' || project.domain === domainFilter;
    
    // ✅ FIX: Allow both 'open' (Published) AND 'active' (Activated) statuses
    const isVisible = project.status === 'open' || project.status === 'active';

    return matchesSearch && matchesDomain && isVisible;
  });

  const isExpert = user?.role === 'expert';
  const hasActiveFilters = searchTerm !== '' || domainFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setDomainFilter('all');
  };

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto py-8 px-4">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Project Marketplace</h1>
            <p className="text-muted-foreground mt-1">
              Find deep tech challenges and propose your solutions.
            </p>
          </div>
          <div className="flex items-center gap-3">
             {/* ✅ Refresh Button */}
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => refetch()} 
               disabled={isLoading || isRefetching}
             >
               <RefreshCcw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
               Refresh
             </Button>

            {isExpert && (
              <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium border border-primary/20">
                🎯 You are viewing as an Expert
              </div>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects by title, keyword, or technology..." 
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64 flex-shrink-0">
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Domain" />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="px-3" title="Clear Filters">
              <FilterX className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading marketplace...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}

            {filteredProjects.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg bg-muted/5">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <Briefcase className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No projects found</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  We couldn't find any projects matching your criteria.
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}