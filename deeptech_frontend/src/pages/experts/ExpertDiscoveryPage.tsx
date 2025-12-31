import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ExpertCard } from '@/components/experts/ExpertCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { domainLabels } from '@/lib/constants';
import { useExperts, useSemanticExperts } from '@/hooks/useExperts';
import { Domain } from '@/types';
import { Search, SlidersHorizontal, X, Loader2, UserX, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ExpertDiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([]);
  const [rateRange, setRateRange] = useState([0, 1000]);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'rate' | 'hours'>('rating');
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);

  const { data: dbExperts, isLoading } = useExperts({
    domains: selectedDomains.length > 0 ? selectedDomains : undefined,
    onlyVerified,
  });

  // Semantic search
  const { data: semanticExperts, isLoading: isSemanticLoading } = useSemanticExperts(
    useSemanticSearch && searchQuery.trim() ? searchQuery : ''
  );

  const experts = useSemanticSearch ? semanticExperts : dbExperts;
  const isLoadingExperts = useSemanticSearch ? isSemanticLoading : isLoading;

  const filteredExperts = useMemo(() => {
    if (!experts) return [];

    if (useSemanticSearch) {
      // For semantic search, apply client-side filters to the results
      let filtered = [...experts];

      // Filter by domains
      if (selectedDomains.length > 0) {
        filtered = filtered.filter(e =>
          e.domains.some(d => selectedDomains.includes(d))
        );
      }

      // Filter by rate
      filtered = filtered.filter(
        e => (e.hourlyRates?.advisory || e.hourly_rate_advisory || 0) >= rateRange[0] &&
             (e.hourlyRates?.advisory || e.hourly_rate_advisory || 0) <= rateRange[1]
      );

      // Filter by verified status
      if (onlyVerified) {
        filtered = filtered.filter(e =>
          e.vettingLevel === 'deep_tech_verified' ||
          e.vetting_level === 'deep_tech_verified'
        );
      }

      // Sort
      switch (sortBy) {
        case 'rating':
          filtered.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
          break;
        case 'rate':
          filtered.sort((a, b) => {
            const rateA = a.hourlyRates?.advisory || a.hourly_rate_advisory || 0;
            const rateB = b.hourlyRates?.advisory || b.hourly_rate_advisory || 0;
            return rateA - rateB;
          });
          break;
        case 'hours':
          filtered.sort((a, b) =>
            (Number(b.totalHours || b.total_hours) || 0) - (Number(a.totalHours || a.total_hours) || 0)
          );
          break;
      }

      return filtered;
    }

    // Original filtering logic for non-semantic search
    let filtered = [...experts];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => {
        const name = e.name || `${e.first_name} ${e.last_name}`;
        const summary = e.experienceSummary || e.experience_summary || '';
        const bio = e.bio || '';

        return name.toLowerCase().includes(query) ||
               summary.toLowerCase().includes(query) ||
               bio.toLowerCase().includes(query);
      });
    }

    if (selectedDomains.length > 0) {
      filtered = filtered.filter(e => {
        const expertDomains = e.domains || [];
        return expertDomains.some((d: string) => selectedDomains.includes(d as Domain));
      });
    }

    // Filter by rate
    filtered = filtered.filter(e => {
      const rate = e.hourlyRates?.advisory || e.hourly_rate_advisory || 0;
      return rate >= rateRange[0] && rate <= rateRange[1];
    });

    // Filter by verified status
    if (onlyVerified) {
      filtered = filtered.filter(e =>
        e.vettingLevel === 'deep_tech_verified' ||
        e.vetting_level === 'deep_tech_verified'
      );
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
        break;
      case 'rate':
        filtered.sort((a, b) => {
          const rateA = a.hourlyRates?.advisory || a.hourly_rate_advisory || 0;
          const rateB = b.hourlyRates?.advisory || b.hourly_rate_advisory || 0;
          return rateA - rateB;
        });
        break;
      case 'hours':
        filtered.sort((a, b) =>
          (Number(b.totalHours || b.total_hours) || 0) - (Number(a.totalHours || a.total_hours) || 0)
        );
        break;
    }

    return filtered;
  }, [experts, searchQuery, selectedDomains, rateRange, onlyVerified, sortBy, useSemanticSearch]);

  const toggleDomain = (domain: Domain) => {
    setSelectedDomains(prev =>
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDomains([]);
    setRateRange([0, 1000]);
    setOnlyVerified(false);
  };

  const hasActiveFilters = selectedDomains.length > 0 || onlyVerified || rateRange[0] > 0 || rateRange[1] < 1000;

  const FilterContent = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Domains</Label>
        <div className="space-y-2">
          {Object.entries(domainLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={key}
                checked={selectedDomains.includes(key as Domain)}
                onCheckedChange={() => toggleDomain(key as Domain)}
              />
              <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Hourly Rate Range</Label>
        <Slider
          value={rateRange}
          onValueChange={setRateRange}
          min={0}
          max={1000}
          step={50}
          className="py-4"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>${rateRange[0]}</span>
          <span>${rateRange[1]}+</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="verified"
            checked={onlyVerified}
            onCheckedChange={(checked) => setOnlyVerified(!!checked)}
          />
          <Label htmlFor="verified" className="text-sm font-normal cursor-pointer">
            Only Deep-Tech Verified
          </Label>
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={clearFilters} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Find Experts</h1>
          <p className="mt-2 text-muted-foreground">
            Discover verified deep-tech experts for your project
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, expertise, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={useSemanticSearch ? "default" : "outline"}
              onClick={() => setUseSemanticSearch(!useSemanticSearch)}
              className="whitespace-nowrap"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {useSemanticSearch ? "AI Search" : "Regular Search"}
            </Button>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="rate">Lowest Rate</SelectItem>
                <SelectItem value="hours">Most Experience</SelectItem>
              </SelectContent>
            </Select>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4">Filters</h3>
              <FilterContent />
            </div>
          </aside>

          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  {filteredExperts.length} expert{filteredExperts.length !== 1 ? 's' : ''} found
                </div>

                {filteredExperts.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {filteredExperts.map(expert => (
                      <ExpertCard key={expert.id} expert={expert} />
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <UserX className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No experts found</h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                        {hasActiveFilters
                          ? 'No experts match your current filters.'
                          : 'No expert accounts have been registered yet.'}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" onClick={clearFilters}>
                          Clear all filters
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}