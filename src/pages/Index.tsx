import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectIfSignedIn = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.organisation_id) {
        navigate("/dashboard", { replace: true });
        return;
      }

      const { data: org } = await supabase
        .from("organisations")
        .select("onboarding_complete")
        .eq("id", profile.organisation_id)
        .maybeSingle();

      navigate(org?.onboarding_complete ? "/dashboard" : "/onboarding", { replace: true });
    };

    redirectIfSignedIn();
  }, [navigate]);

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">GP</span>
            </div>
            <span className="font-semibold text-lg">Super GP</span>
          </div>
          <Link to="/auth">
            <Button variant="ghost" className="font-medium">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="container pt-32 pb-20">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Built for UK GP Clinics
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Your clinic,{" "}
            <span className="text-primary">streamlined</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Super GP brings SOP management, rota planning, and compliance tracking
            into one elegant platform. Get started in minutes.
          </p>

          <Link to="/auth?mode=invite">
            <Button size="lg" className="h-12 px-8 text-base font-semibold gap-2 group">
              Enter Invitation Code
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>

          <p className="text-sm text-muted-foreground mt-4">
            Need an invitation? Contact your organisation administrator.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto">
          <FeatureCard
            icon={Building2}
            title="Multi-Site Ready"
            description="Manage multiple clinic locations from a single dashboard with ease."
          />
          <FeatureCard
            icon={Users}
            title="Team Management"
            description="Organize staff, roles, and permissions with intuitive controls."
          />
          <FeatureCard
            icon={Shield}
            title="Compliance First"
            description="Stay on top of regulatory requirements with automated reminders."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Super GP. Built for NHS GP practices.
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => (
  <div className="p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-fade-in">
    <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center mb-4">
      <Icon className="h-5 w-5 text-accent-foreground" />
    </div>
    <h3 className="font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Index;

