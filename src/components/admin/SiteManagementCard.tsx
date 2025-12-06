import { useState, useEffect } from "react";
import { Building2, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { SiteForm } from "./SiteForm";
import { SiteCard } from "./SiteCard";
import { Facility } from "./FacilityForm";
import { OpeningHour } from "./OpeningHoursForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface UserOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export const SiteManagementCard = () => {
  const { toast } = useToast();
  const { organisationId } = useOrganisation();
  
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [facilities, setFacilities] = useState<Record<string, Facility[]>>({});
  const [openingHours, setOpeningHours] = useState<Record<string, OpeningHour[]>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Site form state
  const [siteFormOpen, setSiteFormOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedSiteHours, setSelectedSiteHours] = useState<OpeningHour[]>([]);
  
  // Site delete state
  const [siteDeleteOpen, setSiteDeleteOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [deletingSite, setDeletingSite] = useState(false);
  
  
  // Facility delete state
  const [facilityDeleteOpen, setFacilityDeleteOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<Facility | null>(null);
  const [deletingFacility, setDeletingFacility] = useState(false);

  const fetchData = async (isRefetch = false) => {
    if (!organisationId) return;
    
    if (!isRefetch) setInitialLoading(true);
    
    const [sitesResult, usersResult, facilitiesResult, hoursResult] = await Promise.all([
      supabase
        .from('sites')
        .select(`
          id, name, address, email, phone, site_manager_id, is_active,
          manager:profiles!site_manager_id(id, first_name, last_name)
        `)
        .eq('organisation_id', organisationId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('organisation_id', organisationId)
        .eq('is_active', true),
      supabase
        .from('facilities')
        .select('id, site_id, name, capacity, is_active')
        .eq('organisation_id', organisationId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('site_opening_hours')
        .select('site_id, day_of_week, open_time, close_time, is_closed')
        .eq('organisation_id', organisationId),
    ]);
    
    if (sitesResult.data) {
      setSites(sitesResult.data as unknown as Site[]);
    }
    if (usersResult.data) {
      setUsers(usersResult.data);
    }
    if (facilitiesResult.data) {
      const grouped: Record<string, Facility[]> = {};
      facilitiesResult.data.forEach((f) => {
        if (!grouped[f.site_id]) grouped[f.site_id] = [];
        grouped[f.site_id].push(f as Facility);
      });
      setFacilities(grouped);
    }
    if (hoursResult.data) {
      const grouped: Record<string, OpeningHour[]> = {};
      hoursResult.data.forEach((h) => {
        if (!grouped[h.site_id]) grouped[h.site_id] = [];
        grouped[h.site_id].push({
          day_of_week: h.day_of_week,
          open_time: h.open_time?.slice(0, 5) || null,
          close_time: h.close_time?.slice(0, 5) || null,
          is_closed: h.is_closed,
        });
      });
      setOpeningHours(grouped);
    }
    
    setInitialLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [organisationId]);

  // Site handlers
  const handleEditSite = async (site: Site) => {
    const { data: hoursData } = await supabase
      .from('site_opening_hours')
      .select('day_of_week, open_time, close_time, is_closed')
      .eq('site_id', site.id);
    
    setSelectedSite(site);
    setSelectedSiteHours(
      (hoursData || []).map(h => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time?.slice(0, 5) || "09:00",
        close_time: h.close_time?.slice(0, 5) || "17:00",
        is_closed: h.is_closed || false,
      }))
    );
    setSiteFormOpen(true);
  };

  const handleAddSite = () => {
    setSelectedSite(null);
    setSelectedSiteHours([]);
    setSiteFormOpen(true);
  };

  const handleSaveSite = async (data: any, hours: OpeningHour[]) => {
    if (!organisationId) return;

    try {
      let siteId: string;

      if (selectedSite) {
        const { error } = await supabase
          .from('sites')
          .update({
            name: data.name,
            address: data.address || null,
            email: data.email || null,
            phone: data.phone || null,
            site_manager_id: data.site_manager_id || null,
          })
          .eq('id', selectedSite.id);

        if (error) throw error;
        siteId = selectedSite.id;
      } else {
        const { data: newSite, error } = await supabase
          .from('sites')
          .insert({
            name: data.name,
            address: data.address || null,
            email: data.email || null,
            phone: data.phone || null,
            site_manager_id: data.site_manager_id || null,
            organisation_id: organisationId,
          })
          .select()
          .single();

        if (error) throw error;
        siteId = newSite.id;
      }

      await supabase
        .from('site_opening_hours')
        .delete()
        .eq('site_id', siteId);

      const hoursToInsert = hours.map(h => ({
        site_id: siteId,
        organisation_id: organisationId,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed,
      }));

      if (hoursToInsert.length > 0) {
        const { error: hoursError } = await supabase
          .from('site_opening_hours')
          .insert(hoursToInsert);

        if (hoursError) throw hoursError;
      }

      toast({
        title: selectedSite ? "Site updated" : "Site created",
        description: `${data.name} has been ${selectedSite ? "updated" : "created"} successfully.`,
      });

      fetchData(true);
    } catch (error: any) {
      toast({
        title: "Error saving site",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSiteClick = (site: Site) => {
    setSiteToDelete(site);
    setSiteDeleteOpen(true);
  };

  const handleDeleteSite = async () => {
    if (!siteToDelete) return;
    
    setDeletingSite(true);
    
    const { error } = await supabase
      .from('sites')
      .update({ is_active: false })
      .eq('id', siteToDelete.id);

    if (error) {
      toast({
        title: "Error deleting site",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Site deleted",
        description: `${siteToDelete.name} has been removed.`,
      });
      fetchData(true);
    }
    
    setDeletingSite(false);
    setSiteDeleteOpen(false);
    setSiteToDelete(null);
  };

  // Facility handlers - inline save
  const handleSaveFacility = async (siteId: string, name: string, capacity: number, facilityType: "clinic_room" | "general_facility", facilityId?: string) => {
    if (!organisationId) return;

    try {
      if (facilityId) {
        const { error } = await supabase
          .from('facilities')
          .update({ name, capacity, facility_type: facilityType })
          .eq('id', facilityId);

        if (error) throw error;
        
        toast({
          title: "Facility updated",
          description: `${name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase
          .from('facilities')
          .insert({
            name,
            capacity,
            facility_type: facilityType,
            site_id: siteId,
            organisation_id: organisationId,
          });

        if (error) throw error;
        
        toast({
          title: "Facility added",
          description: `${name} has been added successfully.`,
        });
      }

      fetchData(true);
    } catch (error: any) {
      toast({
        title: "Error saving facility",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteFacilityClick = (facility: Facility) => {
    setFacilityToDelete(facility);
    setFacilityDeleteOpen(true);
  };

  const handleDeleteFacility = async () => {
    if (!facilityToDelete) return;
    
    setDeletingFacility(true);
    
    const { error } = await supabase
      .from('facilities')
      .update({ is_active: false })
      .eq('id', facilityToDelete.id);

    if (error) {
      toast({
        title: "Error deleting facility",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Facility deleted",
        description: `${facilityToDelete.name} has been removed.`,
      });
      fetchData(true);
    }
    
    setDeletingFacility(false);
    setFacilityDeleteOpen(false);
    setFacilityToDelete(null);
  };


  if (initialLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Site Management</CardTitle>
              <CardDescription>Loading sites...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Site Management</h2>
              <p className="text-sm text-muted-foreground">{sites.length} sites in your organisation</p>
            </div>
          </div>
          <Button onClick={handleAddSite}>
            <Plus className="h-4 w-4 mr-2" />
            Add Site
          </Button>
        </div>

        {sites.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                No sites found. Add your first site to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                facilities={facilities[site.id] || []}
                openingHours={openingHours[site.id] || []}
                onEditSite={handleEditSite}
                onDeleteSite={handleDeleteSiteClick}
                onSaveFacility={handleSaveFacility}
                onDeleteFacility={handleDeleteFacilityClick}
              />
            ))}
          </div>
        )}
      </div>

      <SiteForm
        open={siteFormOpen}
        onOpenChange={setSiteFormOpen}
        site={selectedSite}
        users={users}
        openingHours={selectedSiteHours}
        onSave={handleSaveSite}
      />

      {/* Site Delete Dialog */}
      <AlertDialog open={siteDeleteOpen} onOpenChange={setSiteDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{siteToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSite} disabled={deletingSite}>
              {deletingSite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Facility Delete Dialog */}
      <AlertDialog open={facilityDeleteOpen} onOpenChange={setFacilityDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Facility</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{facilityToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFacility} disabled={deletingFacility}>
              {deletingFacility && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
