import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { InvitationCodeForm } from "@/components/auth/InvitationCodeForm";

type AuthMode = "login" | "invite" | "org-setup" | "register" | "verify";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Determine initial mode
  const getInitialMode = (): AuthMode => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "register" || modeParam === "invite") return "invite";
    return "login";
  };

  const [mode, setMode] = useState<AuthMode>(getInitialMode);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Invitation and organisation state
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/onboarding");
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      navigate("/onboarding");
    }
    setLoading(false);
  };

  const handleOrgSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organisationName.trim()) {
      toast.error("Please enter your organisation name");
      return;
    }

    // Move to registration step
    setMode("register");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationCode) {
      toast.error("Please enter a valid invitation code first");
      setMode("invite");
      return;
    }

    if (!organisationName.trim()) {
      toast.error("Please enter your organisation name");
      setMode("org-setup");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: {
          first_name: firstName,
          last_name: lastName,
          organisation_name: organisationName.trim(),
          invitation_code: invitationCode,
        },
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setMode("verify");
      toast.success("Check your email for the verification link!");
    }
    setLoading(false);
  };

  const handleValidCode = (code: string) => {
    setInvitationCode(code);
    setMode("org-setup");
  };

  return (
    <div className="min-h-screen gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">GP</span>
          </div>
          <span className="font-semibold text-xl">Super GP</span>
        </div>

        {mode === "verify" ? (
          <Card>
            <CardHeader>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We've sent a verification link to <strong>{email}</strong>. 
                Click the link to verify your account and continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setMode("login")}
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        ) : mode === "invite" ? (
          <InvitationCodeForm 
            onValidCode={handleValidCode}
            onBackToLogin={() => setMode("login")}
          />
        ) : mode === "org-setup" ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <CardTitle>Name your organisation</CardTitle>
              <CardDescription>
                This will be the name of your practice or clinic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrgSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organisation Name</Label>
                  <Input
                    id="orgName"
                    placeholder="e.g. Riverside Medical Centre"
                    value={organisationName}
                    onChange={(e) => setOrganisationName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </form>
              <div className="mt-6 text-center text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setInvitationCode(null);
                    setMode("invite");
                  }}
                >
                  ← Use a different code
                </button>
              </div>
            </CardContent>
          </Card>
        ) : mode === "login" ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@clinic.nhs.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Have an invitation code? </span>
                <button
                  type="button"
                  className="text-primary font-medium hover:underline"
                  onClick={() => setMode("invite")}
                >
                  Get started
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                Setting up <strong>{organisationName}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regEmail">Email</Label>
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="you@clinic.nhs.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regPassword">Password</Label>
                  <Input
                    id="regPassword"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <button
                  type="button"
                  className="text-primary font-medium hover:underline"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;