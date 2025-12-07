import { useState, useEffect, useMemo, useCallback } from "react";
import { Users, ArrowUpDown, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { UserFilters } from "@/components/admin/UserFilters";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { InlineEditCell } from "@/components/admin/InlineEditCell";
import { InlineSelectCell } from "@/components/admin/InlineSelectCell";
import { InlineWorkingDaysCell, WorkingDays } from "@/components/admin/InlineWorkingDaysCell";
import { BulkEditBar } from "@/components/admin/BulkEditBar";
import { AddUserDialog } from "@/components/admin/AddUserDialog";

interface OrgUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  job_title_id: string | null;
  job_title_name: string | null;
  primary_site_id: string | null;
  site_name: string | null;
  role: string | null;
  is_active: boolean;
  registration_completed: boolean;
  contracted_hours: number | null;
  working_days: WorkingDays | null;
}

interface FilterOption {
  id: string;
  name: string;
}

type SortField = 'name' | 'job_title' | 'site' | 'role' | 'registered' | 'hours';
type SortDirection = 'asc' | 'desc';

const UserManagement = () => {
  const { toast } = useToast();
  const { organisationId } = useOrganisation();
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [jobTitles, setJobTitles] = useState<FilterOption[]>([]);
  const [sites, setSites] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  
  // Filters
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Bulk selection
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setCurrentUserRole(roleData?.role || null);
    
    if (!organisationId) {
      setLoading(false);
      return;
    }
    
    const [usersResult, jobTitlesResult, sitesResult] = await Promise.all([
      supabase.rpc('get_organisation_users', { p_organisation_id: organisationId }),
      supabase.from('job_titles').select('id, name').eq('organisation_id', organisationId),
      supabase.from('sites').select('id, name').eq('organisation_id', organisationId).eq('is_active', true),
    ]);
    
    if (usersResult.data) {
      const mappedUsers: OrgUser[] = usersResult.data.map((u: any) => ({
        ...u,
        working_days: u.working_days as WorkingDays | null,
      }));
      setUsers(mappedUsers);
    }
    if (jobTitlesResult.data) setJobTitles(jobTitlesResult.data);
    if (sitesResult.data) setSites(sitesResult.data);
    
    setLoading(false);
  }, [organisationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateUserField = async (userId: string, field: string, value: any) => {
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }

    toast({ title: "Updated", description: "User updated successfully." });
    
    setUsers(users.map(u => {
      if (u.id !== userId) return u;
      const updated = { ...u, [field]: value };
      if (field === "job_title_id") {
        updated.job_title_name = jobTitles.find(j => j.id === value)?.name || null;
      }
      if (field === "primary_site_id") {
        updated.site_name = sites.find(s => s.id === value)?.name || null;
      }
      return updated;
    }));
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as 'master' | 'admin' | 'manager' | 'staff' })
      .eq('user_id', userId);
    
    if (error) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
    
    setUpdatingRole(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setJobTitleFilter("");
    setSiteFilter("");
    setSearchQuery("");
  };

  // Bulk selection handlers
  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredAndSortedUsers.map((u) => u.id);
      setSelectedUserIds(new Set(allIds));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleBulkUpdate = async (field: string, value: any) => {
    const selectedIds = Array.from(selectedUserIds);
    
    if (field === "role") {
      // Update roles in user_roles table
      const promises = selectedIds.map((userId) =>
        supabase
          .from("user_roles")
          .update({ role: value as 'admin' | 'manager' | 'staff' })
          .eq("user_id", userId)
      );
      await Promise.all(promises);
      setUsers((prev) =>
        prev.map((u) =>
          selectedUserIds.has(u.id) ? { ...u, role: value } : u
        )
      );
    } else {
      // Update profiles table
      const promises = selectedIds.map((userId) =>
        supabase.from("profiles").update({ [field]: value }).eq("id", userId)
      );
      await Promise.all(promises);
      setUsers((prev) =>
        prev.map((u) => {
          if (!selectedUserIds.has(u.id)) return u;
          const updated = { ...u, [field]: value };
          if (field === "job_title_id") {
            updated.job_title_name = jobTitles.find((j) => j.id === value)?.name || null;
          }
          if (field === "primary_site_id") {
            updated.site_name = sites.find((s) => s.id === value)?.name || null;
          }
          return updated;
        })
      );
    }

    toast({
      title: "Bulk update complete",
      description: `Updated ${selectedIds.length} users.`,
    });
    setSelectedUserIds(new Set());
  };

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedUserIds);
    
    // Safety: filter out current user (can't delete yourself) and master users
    const idsToDelete = selectedIds.filter(id => {
      if (id === currentUserId) return false;
      const user = users.find(u => u.id === id);
      if (user?.role === 'master') return false;
      return true;
    });

    if (idsToDelete.length === 0) {
      toast({
        title: "Cannot delete",
        description: "You cannot delete yourself or the master user.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .in("id", idsToDelete);

    if (error) {
      toast({
        title: "Error deleting users",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Users deleted",
      description: `Deleted ${idsToDelete.length} user${idsToDelete.length !== 1 ? 's' : ''}.`,
    });

    setUsers(prev => prev.filter(u => !idsToDelete.includes(u.id)));
    setSelectedUserIds(new Set());
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];
    
    if (jobTitleFilter && jobTitleFilter !== "all") {
      result = result.filter(u => u.job_title_id === jobTitleFilter);
    }
    if (siteFilter && siteFilter !== "all") {
      result = result.filter(u => u.primary_site_id === siteFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.email.toLowerCase().includes(query) ||
        (u.first_name?.toLowerCase() || '').includes(query) ||
        (u.last_name?.toLowerCase() || '').includes(query)
      );
    }
    
    result.sort((a, b) => {
      if (sortField === 'registered') {
        const aVal = a.registration_completed;
        const bVal = b.registration_completed;
        return sortDirection === 'asc' 
          ? (aVal === bVal ? 0 : aVal ? -1 : 1)
          : (aVal === bVal ? 0 : aVal ? 1 : -1);
      }
      
      let aVal = '';
      let bVal = '';
      
      switch (sortField) {
        case 'name':
          aVal = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
          bVal = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
          break;
        case 'job_title':
          aVal = (a.job_title_name || '').toLowerCase();
          bVal = (b.job_title_name || '').toLowerCase();
          break;
        case 'site':
          aVal = (a.site_name || '').toLowerCase();
          bVal = (b.site_name || '').toLowerCase();
          break;
        case 'role':
          aVal = a.role || 'zzz';
          bVal = b.role || 'zzz';
          break;
        case 'hours':
          return sortDirection === 'asc'
            ? (a.contracted_hours || 0) - (b.contracted_hours || 0)
            : (b.contracted_hours || 0) - (a.contracted_hours || 0);
      }
      
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
    
    return result;
  }, [users, jobTitleFilter, siteFilter, searchQuery, sortField, sortDirection]);

  const allVisibleSelected =
    filteredAndSortedUsers.length > 0 &&
    filteredAndSortedUsers.every((u) => selectedUserIds.has(u.id));

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>{users.length} users in your organisation</CardDescription>
            </div>
          </div>
          {organisationId && (
            <AddUserDialog
              organisationId={organisationId}
              sites={sites}
              jobTitles={jobTitles}
              onSuccess={fetchData}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <UserFilters
          jobTitles={jobTitles}
          sites={sites}
          jobTitleFilter={jobTitleFilter}
          siteFilter={siteFilter}
          searchQuery={searchQuery}
          onJobTitleChange={setJobTitleFilter}
          onSiteChange={setSiteFilter}
          onSearchChange={setSearchQuery}
          onClearFilters={clearFilters}
        />

        {selectedUserIds.size > 0 && (
          <BulkEditBar
            selectedCount={selectedUserIds.size}
            sites={sites}
            jobTitles={jobTitles}
            onApply={handleBulkUpdate}
            onDelete={handleBulkDelete}
            onClearSelection={() => setSelectedUserIds(new Set())}
          />
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead><SortableHeader field="name">Contact</SortableHeader></TableHead>
                <TableHead><SortableHeader field="job_title">Job Title</SortableHeader></TableHead>
                <TableHead><SortableHeader field="site">Site</SortableHeader></TableHead>
                <TableHead><SortableHeader field="hours">Hours</SortableHeader></TableHead>
                <TableHead>Working Days</TableHead>
                <TableHead><SortableHeader field="role">Role</SortableHeader></TableHead>
                <TableHead className="text-center"><SortableHeader field="registered">Registered</SortableHeader></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedUsers.map((user) => (
                  <TableRow key={user.id} data-state={selectedUserIds.has(user.id) ? "selected" : undefined}>
                    <TableCell className="w-10">
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <InlineEditCell
                          value={user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : null}
                          onSave={async (val) => {
                            const parts = val.trim().split(/\s+/);
                            const firstName = parts[0] || "";
                            const lastName = parts.slice(1).join(" ") || "";
                            await updateUserField(user.id, "first_name", firstName || null);
                            await updateUserField(user.id, "last_name", lastName || null);
                          }}
                          placeholder="Add name"
                        />
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <InlineEditCell
                          value={user.phone}
                          onSave={async (val) => updateUserField(user.id, "phone", val || null)}
                          placeholder="Add phone"
                          className="text-sm text-muted-foreground"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <InlineSelectCell
                        value={user.job_title_id}
                        displayValue={user.job_title_name}
                        options={jobTitles}
                        onSave={async (val) => updateUserField(user.id, "job_title_id", val)}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineSelectCell
                        value={user.primary_site_id}
                        displayValue={user.site_name}
                        options={sites}
                        onSave={async (val) => updateUserField(user.id, "primary_site_id", val)}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditCell
                        value={user.contracted_hours}
                        type="number"
                        onSave={async (val) => updateUserField(user.id, "contracted_hours", val ? parseFloat(val) : null)}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineWorkingDaysCell
                        value={user.working_days}
                        onSave={async (val) => updateUserField(user.id, "working_days", val)}
                      />
                    </TableCell>
                    <TableCell>
                      {updatingRole === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RoleSelect
                          currentRole={user.role}
                          currentUserRole={currentUserRole || ''}
                          targetUserId={user.id}
                          currentUserId={currentUserId || ''}
                          onRoleChange={handleRoleChange}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.registration_completed ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <Check className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                          <X className="h-3 w-3 mr-1" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
