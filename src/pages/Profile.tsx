import { useEffect, useState } from "react";
import { User, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import ProfileForm, { ProfileFormValues } from "@/components/profile/ProfileForm";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_ext: string | null;
  job_title_id: string | null;
  primary_site_id: string | null;
}

interface Option {
  id: string;
  name: string;
}

const Profile = () => {
  const { toast } = useToast();
  const { organisationId, organisationName } = useOrganisation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobTitles, setJobTitles] = useState<Option[]>([]);
  const [sites, setSites] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, phone, phone_ext, job_title_id, primary_site_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        toast({
          title: "Error loading profile",
          description: profileError.message,
          variant: "destructive",
        });
      } else {
        setProfile(profileData);
      }

      // Fetch job titles and sites if we have an organisation
      if (organisationId) {
        const [jobTitlesRes, sitesRes] = await Promise.all([
          supabase
            .from("job_titles")
            .select("id, name")
            .eq("organisation_id", organisationId)
            .order("name"),
          supabase
            .from("sites")
            .select("id, name")
            .eq("organisation_id", organisationId)
            .eq("is_active", true)
            .order("name"),
        ]);

        if (jobTitlesRes.data) setJobTitles(jobTitlesRes.data);
        if (sitesRes.data) setSites(sitesRes.data);
      }

      setLoading(false);
    };

    fetchData();
  }, [organisationId, toast]);

  const handleSubmit = async (values: ProfileFormValues) => {
    if (!profile) return;

    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || null,
        phone_ext: values.phone_ext || null,
        job_title_id: values.job_title_id || null,
        primary_site_id: values.primary_site_id || null,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
      });
      // Update local state
      setProfile({
        ...profile,
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || null,
        phone_ext: values.phone_ext || null,
        job_title_id: values.job_title_id || null,
        primary_site_id: values.primary_site_id || null,
      });
    }
  };

  if (loading) {
    return (
      <div className="container py-12">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card className="max-w-2xl">
          <CardHeader>
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-40 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Profile not found</CardTitle>
            <CardDescription>
              Unable to load your profile. Please try again later.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">View and edit your profile information.</p>
      </div>

      <Card className="max-w-2xl animate-fade-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal details below
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ProfileForm
            defaultValues={{
              first_name: profile.first_name || "",
              last_name: profile.last_name || "",
              phone: profile.phone || "",
              phone_ext: profile.phone_ext || "",
              job_title_id: profile.job_title_id,
              primary_site_id: profile.primary_site_id,
            }}
            email={profile.email}
            organisationName={organisationName}
            jobTitles={jobTitles}
            sites={sites}
            onSubmit={handleSubmit}
            saving={saving}
          />
        </CardContent>
      </Card>

      <Card className="max-w-2xl animate-fade-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
