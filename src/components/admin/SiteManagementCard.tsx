import { useState, useEffect } from "react";
import { Building2, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { SiteForm } from "./SiteForm";
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
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedSiteHours, setSelectedSiteHours] = useState<OpeningHour[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    if (!organisationId) return;
    
    setLoading(true);
    
    const [sitesResult, usersResult] = await Promise.all([
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
    ]);
    
    if (sitesResult.data) {
      setSites(sitesResult.data as unknown as Site[]);
    }
    if (usersResult.data) {
      setUsers(usersResult.data);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [organisationId]);

  const handleEdit = async (site: Site) => {
    // Fetch opening hours for this site
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
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedSite(null);
    setSelectedSiteHours([]);
    setFormOpen(true);
  };

  const handleSave = async (data: any, hours: OpeningHour[]) => {
    if (!organisationId) return;

    try {
      let siteId: string;

      if (selectedSite) {
        // Update existing site
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
        // Create new site
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

      // Delete existing opening hours and insert new ones
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

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error saving site",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (site: Site) => {
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!siteToDelete) return;
    
    setDeleting(true);
    
    // Soft delete by setting is_active to false
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
      fetchData();
    }
    
    setDeleting(false);
    setDeleteDialogOpen(false);
    setSiteToDelete(null);
  };

  const getManagerName = (site: Site) => {
    if (!site.manager) return "—";
    const { first_name, last_name } = site.manager;
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim();
    }
    return "—";
  };

  if (loading) {
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
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Site Management</CardTitle>
                <CardDescription>{sites.length} sites in your organisation</CardDescription>
              </div>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Site
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Site Manager</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No sites found. Add your first site to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.address || "—"}</TableCell>
                      <TableCell>{site.email || "—"}</TableCell>
                      <TableCell>{site.phone || "—"}</TableCell>
                      <TableCell>{getManagerName(site)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(site)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(site)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SiteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        site={selectedSite}
        users={users}
        openingHours={selectedSiteHours}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{siteToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
