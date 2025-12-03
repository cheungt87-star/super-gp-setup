import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Building2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { InvitationCodeForm } from "@/components/auth/InvitationCodeForm";

type AuthMode = "login" | "invite" | "org-setup" | "org-confirm" | "register" | "verify" | "error";

interface InvitationValidationResult {
  code: string;
  organisationId: string | null;
  organisationName: string | null;
  onboardingComplete: boolean;
  isEmailLinked: boolean;
  profileExists: boolean;
}

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
  const [phone, setPhone] = useState("");
  
  // Invitation and organisation state
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState("");
  const [existingOrgName, setExistingOrgName] = useState<string | null>(null);
  const [orgConfirmed, setOrgConfirmed] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(true);
  const [organisationIdFromCode, setOrganisationIdFromCode] = useState<string | null>(null);
  
  // Site and job title state for subsequent users
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [jobTitles, setJobTitles] = useState<{ id: string; name: string }[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedJobTitleId, setSelectedJobTitleId] = useState<string>("");

  useEffect(() => {
    // Check if user is already logged in and redirect appropriately
    const checkSessionAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check onboarding status
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

          if (org?.onboarding_complete) {
            navigate("/dashboard");
          } else {
            navigate("/onboarding");
          }
        } else {
          navigate("/dashboard");
        }
      }
    };
    checkSessionAndRedirect();
  }, [navigate]);

  // Fetch sites and job titles when transitioning to register mode for non-first users
  useEffect(() => {
    const fetchOptions = async () => {
      if (mode === "register" && !isFirstUser && organisationIdFromCode) {
        const [sitesRes, jobTitlesRes] = await Promise.all([
          supabase.from("sites").select("id, name").eq("organisation_id", organisationIdFromCode).eq("is_active", true),
          supabase.from("job_titles").select("id, name").eq("organisation_id", organisationIdFromCode)
        ]);
        if (sitesRes.data) setSites(sitesRes.data);
        if (jobTitlesRes.data) setJobTitles(jobTitlesRes.data);
      }
    };
    fetchOptions();
  }, [mode, isFirstUser, organisationIdFromCode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");

    // Check onboarding status and redirect appropriately
    const { data: profile } = await supabase
      .from("profiles")
      .select("organisation_id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.organisation_id) {
      const { data: org } = await supabase
        .from("organisations")
        .select("onboarding_complete")
        .eq("id", profile.organisation_id)
        .maybeSingle();

      if (org?.onboarding_complete) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    } else {
      navigate("/dashboard");
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

  const handleOrgConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgConfirmed) {
      toast.error("Please confirm you are joining the correct organisation");
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

    // For first user, require org name
    if (isFirstUser && !organisationName.trim()) {
      toast.error("Please enter your organisation name");
      setMode("org-setup");
      return;
    }

    // For subsequent users, require confirmation
    if (!isFirstUser && !orgConfirmed) {
      toast.error("Please confirm your organisation");
      setMode("org-confirm");
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
          phone: phone || null,
          organisation_name: isFirstUser ? organisationName.trim() : null,
          invitation_code: invitationCode,
          primary_site_id: !isFirstUser && selectedSiteId ? selectedSiteId : null,
          job_title_id: !isFirstUser && selectedJobTitleId ? selectedJobTitleId : null,
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

  const handleValidCode = (result: InvitationValidationResult) => {
    setInvitationCode(result.code);
    setEmail(""); // Reset email so user enters it again in registration
    setOrganisationIdFromCode(result.organisationId);
    
    if (result.organisationId === null) {
      // First user - needs to create organisation
      setIsFirstUser(true);
      setMode("org-setup");
    } else if (result.onboardingComplete) {
      // Subsequent user - org exists and onboarding complete
      setIsFirstUser(false);
      setExistingOrgName(result.organisationName);
      setMode("org-confirm");
    } else if (result.isEmailLinked) {
      // Email-linked user - check if they already have a profile
      if (result.profileExists) {
        // Returning user - direct to login, then they'll be redirected to onboarding
        toast.info("Account found. Please sign in to continue onboarding.");
        setMode("login");
      } else {
        // New user - proceed with account creation
        setIsFirstUser(true);
        setExistingOrgName(result.organisationName);
        setOrganisationName(result.organisationName || "");
        setMode("register");
      }
    } else {
      // Org exists but onboarding not complete and user is not the designated admin
      setMode("error");
    }
  };

  const resetFlow = () => {
    setInvitationCode(null);
    setOrganisationName("");
    setExistingOrgName(null);
    setOrgConfirmed(false);
    setIsFirstUser(true);
    setOrganisationIdFromCode(null);
    setSites([]);
    setJobTitles([]);
    setSelectedSiteId("");
    setSelectedJobTitleId("");
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setMode("invite");
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

        {mode === "error" ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              </div>
              <CardTitle>Organisation not ready</CardTitle>
              <CardDescription>
                It looks like your organisation is not set up yet. Speak to your manager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={resetFlow}
              >
                Try a different code
              </Button>
            </CardContent>
          </Card>
        ) : mode === "verify" ? (
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
                  onClick={resetFlow}
                >
                  ← Use a different code
                </button>
              </div>
            </CardContent>
          </Card>
        ) : mode === "org-confirm" ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <CardTitle>Confirm your organisation</CardTitle>
              <CardDescription>
                Please confirm you are joining the correct organisation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrgConfirm} className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-lg font-medium">{existingOrgName}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="confirmOrg" 
                    checked={orgConfirmed}
                    onCheckedChange={(checked) => setOrgConfirmed(checked === true)}
                  />
                  <Label htmlFor="confirmOrg" className="text-sm">
                    I confirm this is my organisation
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={!orgConfirmed}>
                  Continue
                </Button>
              </form>
              <div className="mt-6 text-center text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={resetFlow}
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
                {isFirstUser ? (
                  <>Setting up <strong>{organisationName}</strong></>
                ) : (
                  <>Joining <strong>{existingOrgName}</strong></>
                )}
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
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="07700 900000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                {!isFirstUser && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="site">Primary Site</Label>
                      <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your site" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Select value={selectedJobTitleId} onValueChange={setSelectedJobTitleId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your job title" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobTitles.map((jt) => (
                            <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
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
