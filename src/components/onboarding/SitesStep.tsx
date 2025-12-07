import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Building2 } from "lucide-react";

interface Site {
  name: string;
  address: string;
  email: string;
  phone: string;
  phone_ext: string;
}

interface SitesStepProps {
  onNext: () => void;
  userId: string | null;
  organisationId: string | null;
}

export const SitesStep = ({ onNext, userId, organisationId }: SitesStepProps) => {
  const [sites, setSites] = useState<Site[]>([
    { name: "", address: "", email: "", phone: "", phone_ext: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const addSite = () => {
    setSites([...sites, { name: "", address: "", email: "", phone: "", phone_ext: "" }]);
  };

  const removeSite = (index: number) => {
    if (sites.length > 1) {
      setSites(sites.filter((_, i) => i !== index));
    }
  };

  const updateSite = (index: number, field: keyof Site, value: string) => {
    const updated = [...sites];
    updated[index][field] = value;
    setSites(updated);
  };

  const handleSave = async () => {
    const validSites = sites.filter((site) => site.name.trim());
    
    if (validSites.length === 0) {
      toast.error("Please add at least one site");
      return;
    }

    if (!organisationId) {
      toast.error("Organisation not found. Please try logging in again.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("sites").insert(
      validSites.map((site) => ({
        name: site.name,
        address: site.address || null,
        email: site.email || null,
        phone: site.phone || null,
        phone_ext: site.phone_ext || null,
        organisation_id: organisationId,
      }))
    );

    if (error) {
      toast.error("Failed to save sites: " + error.message);
    } else {
      toast.success(`${validSites.length} site(s) added successfully`);
      onNext();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
            <Building2 className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle>Add your clinic sites</CardTitle>
            <CardDescription>Enter the locations you manage</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {sites.map((site, index) => (
          <div key={index} className="p-4 border border-border rounded-lg space-y-4 relative">
            {sites.length > 1 && (
              <button
                type="button"
                onClick={() => removeSite(index)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`site-name-${index}`}>Site Name *</Label>
                <Input
                  id={`site-name-${index}`}
                  placeholder="Main Street Surgery"
                  value={site.name}
                  onChange={(e) => updateSite(index, "name", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`site-address-${index}`}>Address</Label>
                <Input
                  id={`site-address-${index}`}
                  placeholder="123 Main Street, London, SW1A 1AA"
                  value={site.address}
                  onChange={(e) => updateSite(index, "address", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`site-email-${index}`}>Contact Email</Label>
                <Input
                  id={`site-email-${index}`}
                  type="email"
                  placeholder="contact@surgery.nhs.uk"
                  value={site.email}
                  onChange={(e) => updateSite(index, "email", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="space-y-2">
                  <Label htmlFor={`site-phone-${index}`}>Phone</Label>
                  <Input
                    id={`site-phone-${index}`}
                    placeholder="020 1234 5678"
                    value={site.phone}
                    onChange={(e) => updateSite(index, "phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2 w-20">
                  <Label htmlFor={`site-ext-${index}`}>Ext.</Label>
                  <Input
                    id={`site-ext-${index}`}
                    placeholder="123"
                    value={site.phone_ext}
                    onChange={(e) => updateSite(index, "phone_ext", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addSite} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add Another Site
        </Button>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
