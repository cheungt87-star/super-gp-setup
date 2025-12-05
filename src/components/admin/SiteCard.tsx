import { useState } from "react";
import { Building2, ChevronDown, Mail, MapPin, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { FacilityList } from "./FacilityList";
import { Facility } from "./FacilityForm";

interface Site {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  site_manager_id: string | null;
  is_active: boolean;
  manager?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface SiteCardProps {
  site: Site;
  facilities: Facility[];
  onEditSite: (site: Site) => void;
  onDeleteSite: (site: Site) => void;
  onAddFacility: (siteId: string) => void;
  onEditFacility: (facility: Facility) => void;
  onDeleteFacility: (facility: Facility) => void;
}

export const SiteCard = ({
  site,
  facilities,
  onEditSite,
  onDeleteSite,
  onAddFacility,
  onEditFacility,
  onDeleteFacility,
}: SiteCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getManagerName = () => {
    if (!site.manager) return null;
    const { first_name, last_name } = site.manager;
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim();
    }
    return null;
  };

  const managerName = getManagerName();

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">{site.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEditSite(site)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDeleteSite(site)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          {site.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{site.address}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {site.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{site.phone}</span>
              </div>
            )}
            {site.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span>{site.email}</span>
              </div>
            )}
          </div>
          {managerName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 shrink-0" />
              <span>Manager: {managerName}</span>
            </div>
          )}
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
              <span className="font-medium text-sm">
                Facilities ({facilities.length})
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <FacilityList
              facilities={facilities}
              onEdit={onEditFacility}
              onDelete={onDeleteFacility}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onAddFacility(site.id)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Facility
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
