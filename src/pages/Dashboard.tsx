import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Briefcase, LogOut, Loader2, Copy, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface InviteCodeInfo {
  code: string;
  usedCount: number;
  maxUses: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sites: 0, jobTitles: 0, users: 0 });
  const [userName, setUserName] = useState("");
  const [inviteCode, setInviteCode] = useState<InviteCodeInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check onboarding status and get org id
      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.organisation_id) {
        const { data: org } = await supabase
          .from("organisations")
          .select("onboarding_complete")
          .eq("id", profile.organisation_id)
          .maybeSingle();

        if (!org?.onboarding_complete) {
          navigate("/onboarding");
          return;
        }

        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const userIsAdmin = roleData?.role === "admin" || roleData?.role === "master";
        setIsAdmin(userIsAdmin);

        // Fetch invitation code for admins
        if (userIsAdmin) {
          const { data: codeData } = await supabase
            .from("invitation_codes")
            .select("code, used_count, max_uses")
            .eq("organisation_id", profile.organisation_id)
            .is("email", null)
            .eq("is_active", true)
            .maybeSingle();

          if (codeData) {
            setInviteCode({
              code: codeData.code,
              usedCount: codeData.used_count,
              maxUses: codeData.max_uses,
            });
          }
        }
      }

      setUserName(session.user.user_metadata?.first_name || "there");

      const [sitesRes, jobTitlesRes, usersRes] = await Promise.all([
        supabase.from("sites").select("id", { count: "exact" }),
        supabase.from("job_titles").select("id", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }),
      ]);

      setStats({
        sites: sitesRes.count || 0,
        jobTitles: jobTitlesRes.count || 0,
        users: usersRes.count || 0,
      });
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleCopy = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode.code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-subtle">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">GP</span>
            </div>
            <span className="font-semibold text-lg">Super GP</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container py-12">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Welcome, {userName}!</h1>
          <p className="text-muted-foreground">Here's an overview of your clinic setup.</p>
        </div>

        {/* Invitation Code Card for Admins */}
        {isAdmin && inviteCode && (
          <Card className="mb-6 animate-fade-in border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-medium">Team Invitation Code</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <code className="text-xl font-mono font-bold tracking-wider">{inviteCode.code}</code>
                <span className="text-sm text-muted-foreground">
                  {inviteCode.usedCount} / {inviteCode.maxUses} uses
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Share this code with team members so they can join your organisation.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3 animate-fade-in">
          <StatCard
            icon={Building2}
            title="Sites"
            value={stats.sites}
            description="Clinic locations"
          />
          <StatCard
            icon={Briefcase}
            title="Job Titles"
            value={stats.jobTitles}
            description="Defined roles"
          />
          <StatCard
            icon={Users}
            title="Team Members"
            value={stats.users}
            description="Staff profiles"
          />
        </div>

        <div className="mt-12 p-8 border border-dashed border-border rounded-xl text-center animate-fade-in">
          <p className="text-muted-foreground mb-4">
            More features coming soon: Rota management, SOP retrieval, and compliance tracking.
          </p>
          <Button variant="outline" disabled>
            Coming Soon
          </Button>
        </div>
      </main>
    </div>
  );
};

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: number;
  description: string;
}

const StatCard = ({ icon: Icon, title, value, description }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      <CardDescription>{description}</CardDescription>
    </CardContent>
  </Card>
);

export default Dashboard;
