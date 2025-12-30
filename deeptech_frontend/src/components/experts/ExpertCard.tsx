import { Link } from 'react-router-dom';
import { Expert } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Clock, MapPin, Shield, CheckCircle } from 'lucide-react';
import { domainLabels } from '@/lib/constants';

interface ExpertCardProps {
  expert: Expert;
}

export function ExpertCard({ expert }: ExpertCardProps) {
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
          Advanced
        </Badge>
      );
    }
    return null;
  };

  return (
    <Link to={`/experts/${expert.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-border group-hover:ring-primary/50 transition-all">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {getInitials(expert.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">{expert.name}</h3>
                {getVettingBadge()}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {expert.location || 'Remote'}
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground line-clamp-2">{expert.bio}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {expert.domains.slice(0, 3).map(domain => (
              <Badge key={domain} variant="outline" className="text-xs">
                {domain.startsWith('custom:') 
                  ? domain.substring(7) 
                  : domainLabels[domain] || domain}
              </Badge>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-medium">{expert.rating}</span>
              <span className="text-sm text-muted-foreground">({expert.reviewCount})</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {expert.totalHours}h
              </div>
              <div className="font-semibold text-foreground">
                ${expert.hourlyRates?.advisory || 0}/hr
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
