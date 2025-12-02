import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OrganisationContextType {
  organisationId: string | null;
  organisationName: string | null;
  loading: boolean;
  refreshOrganisation: () => Promise<void>;
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export const OrganisationProvider = ({ children }: { children: ReactNode }) => {
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganisation = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      setOrganisationId(null);
      setOrganisationName(null);
      setLoading(false);
      return;
    }

    // Get user's profile to find their organisation
    const { data: profile } = await supabase
      .from("profiles")
      .select("organisation_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profile?.organisation_id) {
      setOrganisationId(profile.organisation_id);
      
      // Get organisation name
      const { data: org } = await supabase
        .from("organisations")
        .select("name")
        .eq("id", profile.organisation_id)
        .maybeSingle();
      
      setOrganisationName(org?.name || null);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchOrganisation();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchOrganisation();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <OrganisationContext.Provider 
      value={{ 
        organisationId, 
        organisationName, 
        loading,
        refreshOrganisation: fetchOrganisation 
      }}
    >
      {children}
    </OrganisationContext.Provider>
  );
};

export const useOrganisation = () => {
  const context = useContext(OrganisationContext);
  if (context === undefined) {
    throw new Error("useOrganisation must be used within an OrganisationProvider");
  }
  return context;
};
