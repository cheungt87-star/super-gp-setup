import { useState } from "react";
import { Building2, Clock, Loader2, Mail, MapPin, Pencil, Phone, Save, Trash2, User, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FacilityList } from "./FacilityList";
import { Facility } from "./FacilityForm";
import { OpeningHoursDisplay } from "./OpeningHoursDisplay";

interface OpeningHour {
  day_of_week: number;
  am_open_time: string | null;
  am_close_time: string | null;
  pm_open_time: string | null;
  pm_close_time: string | null;
  is_closed: boolean | null;
}

interface Site {
  id: string;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  email: string | null;
  phone: string | null;
  site_manager_id: string | null;
  is_active: boolean;
  am_capacity_per_room: number;
  pm_capacity_per_room: number;
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
  onSaveCapacity: (siteId: string, amCapacity: number, pmCapacity: number) => Promise<void>;
}

export const SiteCard = ({
  site,
  facilities,
  openingHours,
  onEditSite,
  onDeleteSite,
  onSaveFacility,
  onDeleteFacility,
  onSaveCapacity,
}: SiteCardProps) => {
  const [isAddingFacility, setIsAddingFacility] = useState(false);
  const [amCap, setAmCap] = useState(site.am_capacity_per_room);
  const [pmCap, setPmCap] = useState(site.pm_capacity_per_room);
  const [savingCapacity, setSavingCapacity] = useState(false);
  const capacityChanged = amCap !== site.am_capacity_per_room || pmCap !== site.pm_capacity_per_room;

  const handleSaveCapacity = async () => {
    setSavingCapacity(true);
    try {
      await onSaveCapacity(site.id, amCap, pmCap);
    } finally {
      setSavingCapacity(false);
    }
  };

  const getManagerName = () => {
    if (!site.manager) return null;
    const { first_name, last_name } = site.manager;
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim();
    }
    return null;
  };

  const formatAddress = () => {
    const parts: string[] = [];
    if (site.address_line_1) parts.push(site.address_line_1);
    if (site.address_line_2) parts.push(site.address_line_2);
    
    const cityCounty: string[] = [];
    if (site.city) cityCounty.push(site.city);
    if (site.county) cityCounty.push(site.county);
    if (cityCounty.length > 0) parts.push(cityCounty.join(", "));
    
    if (site.postcode) parts.push(site.postcode);
    
    return parts;
  };

  const handleSaveFacility = async (name: string, capacity: number, facilityType: "clinic_room" | "general_facility", facilityId?: string) => {
    await onSaveFacility(site.id, name, capacity, facilityType, facilityId);
  };

  const managerName = getManagerName();
  const addressLines = formatAddress();
  const hasContactInfo = addressLines.length > 0 || site.phone || site.email || managerName;

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
                {addressLines.length > 0 && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      {addressLines.map((line, idx) => (
                        <span key={idx}>{line}</span>
                      ))}
                    </div>
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

        {/* Capacity Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Capacity Settings</h4>
          </div>
          <div className="flex items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">AM Patients per Room</Label>
              <Input
                type="number"
                min={0}
                className="w-28"
                value={amCap}
                onChange={(e) => setAmCap(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">PM Patients per Room</Label>
              <Input
                type="number"
                min={0}
                className="w-28"
                value={pmCap}
                onChange={(e) => setPmCap(parseInt(e.target.value) || 0)}
              />
            </div>
            {capacityChanged && (
              <Button size="sm" onClick={handleSaveCapacity} disabled={savingCapacity}>
                {savingCapacity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
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
