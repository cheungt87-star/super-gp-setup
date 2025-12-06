import { useState } from "react";
import { Building2, Clock, Mail, MapPin, Pencil, Phone, Trash2, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FacilityList } from "./FacilityList";
import { Facility } from "./FacilityForm";
import { OpeningHoursDisplay } from "./OpeningHoursDisplay";

interface OpeningHour {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
}

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
  openingHours: OpeningHour[];
  onEditSite: (site: Site) => void;
  onDeleteSite: (site: Site) => void;
  onSaveFacility: (siteId: string, name: string, capacity: number, facilityType: "clinic_room" | "general_facility", facilityId?: string) => Promise<void>;
  onDeleteFacility: (facility: Facility) => void;
}

export const SiteCard = ({
  site,
  facilities,
  openingHours,
  onEditSite,
  onDeleteSite,
  onSaveFacility,
  onDeleteFacility,
}: SiteCardProps) => {
  const [isAddingFacility, setIsAddingFacility] = useState(false);

  const getManagerName = () => {
    if (!site.manager) return null;
    const { first_name, last_name } = site.manager;
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim();
    }
    return null;
  };

  const handleSaveFacility = async (name: string, capacity: number, facilityType: "clinic_room" | "general_facility", facilityId?: string) => {
    await onSaveFacility(site.id, name, capacity, facilityType, facilityId);
  };

  const managerName = getManagerName();
  const hasContactInfo = site.address || site.phone || site.email || managerName;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-4">
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
      
      <CardContent className="space-y-6">
        {/* Details and Opening Hours - Side by Side */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Details</h4>
            {hasContactInfo ? (
              <div className="space-y-2 text-sm">
                {site.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{site.address}</span>
                  </div>
                )}
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
                {managerName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    <span>Manager: {managerName}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No contact details added</p>
            )}
          </div>

          {/* Opening Hours */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Opening Hours</h4>
            </div>
            {openingHours.length > 0 ? (
              <OpeningHoursDisplay hours={openingHours} />
            ) : (
              <p className="text-sm text-muted-foreground italic">No opening hours set</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Facilities Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Facilities ({facilities.length})
          </h4>
          
          <FacilityList
            facilities={facilities}
            onEdit={() => {}}
            onDelete={onDeleteFacility}
            onSave={handleSaveFacility}
            isAdding={isAddingFacility}
            onStartAdd={() => setIsAddingFacility(true)}
            onCancelAdd={() => setIsAddingFacility(false)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
