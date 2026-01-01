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
import { ArrowLeft, Loader2, Building2, AlertTriangle, Eye, EyeOff, Check } from "lucide-react";
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
  email: string;
  hasAuthAccount: boolean;
  csvProfile?: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    primarySiteId: string | null;
    primarySiteName: string | null;
    jobTitleId: string | null;
    jobTitleName: string | null;
  };
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneExt, setPhoneExt] = useState("");
  
  // Invitation and organisation state
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState("");
  const [existingOrgName, setExistingOrgName] = useState<string | null>(null);
  const [orgConfirmed, setOrgConfirmed] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(true);
  const [organisationIdFromCode, setOrganisationIdFromCode] = useState<string | null>(null);
  const [isCsvUser, setIsCsvUser] = useState(false);
  
  // Site and job title state for subsequent users
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [jobTitles, setJobTitles] = useState<{ id: string; name: string }[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedJobTitleId, setSelectedJobTitleId] = useState<string>("");
  const [selectedSiteName, setSelectedSiteName] = useState<string>("");
  const [selectedJobTitleName, setSelectedJobTitleName] = useState<string>("");

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
      console.log("Fetch options useEffect triggered:", { mode, isFirstUser, organisationIdFromCode });
      
      if (mode === "register" && !isFirstUser && organisationIdFromCode) {
        console.log("Calling get_organisation_options RPC with:", organisationIdFromCode);
        
        const { data, error } = await supabase.rpc('get_organisation_options', {
          p_organisation_id: organisationIdFromCode
        });
        
        console.log("RPC response:", { data, error });
        
        if (error) {
          console.error("Error fetching organisation options:", error);
          return;
        }
        
        if (data) {
          const options = data as { sites: { id: string; name: string }[]; job_titles: { id: string; name: string }[] };
          console.log("Parsed options:", options);
          setSites(options.sites || []);
          setJobTitles(options.job_titles || []);
        }
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

  // Password validation helper
  const validatePassword = (pwd: string) => {
    const hasNumber = /\d/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/.test(pwd);
    const hasMinLength = pwd.length >= 6;
    return { hasNumber, hasSpecialChar, hasMinLength, isValid: hasNumber && hasSpecialChar && hasMinLength };
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

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

    // Validate password requirements
    const pwdValidation = validatePassword(password);
    if (!pwdValidation.isValid) {
      toast.error("Password must have at least 6 characters, 1 number, and 1 special character");
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
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
    console.log("handleValidCode called with:", result);
    setInvitationCode(result.code);
    setEmail(result.email); // Inherit email from invitation step
    setOrganisationIdFromCode(result.organisationId);
    console.log("Set organisationIdFromCode to:", result.organisationId);
    
    // Check if this is a CSV-enrolled user (profile exists but no auth account)
    if (result.profileExists && !result.hasAuthAccount && result.csvProfile) {
      console.log("CSV-enrolled user detected - claim profile flow");
      setIsCsvUser(true);
      setIsFirstUser(false);
      setExistingOrgName(result.organisationName);
      // Pre-fill form with CSV data
      setFirstName(result.csvProfile.firstName || "");
      setLastName(result.csvProfile.lastName || "");
      setPhone(result.csvProfile.phone || "");
      setSelectedSiteId(result.csvProfile.primarySiteId || "");
      setSelectedSiteName(result.csvProfile.primarySiteName || "");
      setSelectedJobTitleId(result.csvProfile.jobTitleId || "");
      setSelectedJobTitleName(result.csvProfile.jobTitleName || "");
      setOrgConfirmed(true); // Auto-confirm org for CSV users
      toast.success("Welcome! We found your profile. Please set a password to activate your account.");
      setMode("register");
      return;
    }
    
    if (result.organisationId === null) {
      // First user - needs to create organisation
      console.log("First user flow - org-setup");
      setIsFirstUser(true);
      setIsCsvUser(false);
      setMode("org-setup");
    } else if (result.onboardingComplete) {
      // Subsequent user - org exists and onboarding complete
      console.log("Subsequent user flow - org-confirm, isFirstUser=false");
      setIsFirstUser(false);
      setIsCsvUser(false);
      setExistingOrgName(result.organisationName);
      // Check if they have an existing auth account
      if (result.profileExists && result.hasAuthAccount) {
        toast.info("Account found. Please sign in to continue.");
        setMode("login");
      } else {
        setMode("org-confirm");
      }
    } else if (result.isEmailLinked) {
      // Email-linked user - check if they already have a profile
      if (result.profileExists && result.hasAuthAccount) {
        // Returning user - direct to login, then they'll be redirected to onboarding
        toast.info("Account found. Please sign in to continue onboarding.");
        setMode("login");
      } else {
        // New user - proceed with account creation
        setIsFirstUser(true);
        setIsCsvUser(false);
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
    setIsCsvUser(false);
    setOrganisationIdFromCode(null);
    setSites([]);
    setJobTitles([]);
    setSelectedSiteId("");
    setSelectedJobTitleId("");
    setSelectedSiteName("");
    setSelectedJobTitleName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFirstName("");
    setLastName("");
    setPhone("");
    setPhoneExt("");
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
              <CardTitle>{isCsvUser ? "Activate your account" : "Create your account"}</CardTitle>
              <CardDescription>
                {isCsvUser ? (
                  <>Welcome to <strong>{existingOrgName}</strong>! Your profile has been set up. Just set a password to get started.</>
                ) : isFirstUser ? (
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
                      readOnly={isCsvUser && !!firstName}
                      className={isCsvUser && !!firstName ? "bg-muted" : ""}
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
                      readOnly={isCsvUser && !!lastName}
                      className={isCsvUser && !!lastName ? "bg-muted" : ""}
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
                    readOnly
                    className="bg-muted"
                    required
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="07700 900000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      readOnly={isCsvUser && !!phone}
                      className={isCsvUser && !!phone ? "bg-muted" : ""}
                    />
                  </div>
                  <div className="space-y-2 w-20">
                    <Label htmlFor="phoneExt">Ext.</Label>
                    <Input
                      id="phoneExt"
                      placeholder="123"
                      value={phoneExt}
                      onChange={(e) => setPhoneExt(e.target.value)}
                    />
                  </div>
                </div>
                {(!isFirstUser || isCsvUser) && (
                  <>
                    {/* Show read-only site name for CSV users with pre-filled data, otherwise show dropdown */}
                    {isCsvUser && selectedSiteId && selectedSiteName ? (
                      <div className="space-y-2">
                        <Label htmlFor="site">Primary Site</Label>
                        <Input
                          id="site"
                          value={selectedSiteName}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    ) : !isCsvUser && sites.length > 0 && (
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
                    )}
                    {/* Show read-only job title name for CSV users with pre-filled data, otherwise show dropdown */}
                    {isCsvUser && selectedJobTitleId && selectedJobTitleName ? (
                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">Job Title</Label>
                        <Input
                          id="jobTitle"
                          value={selectedJobTitleName}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    ) : !isCsvUser && jobTitles.length > 0 && (
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
                    )}
                  </>
                )}
                {/* Password field with visibility toggle */}
                <div className="space-y-2">
                  <Label htmlFor="regPassword">Password</Label>
                  <div className="relative">
                    <Input
                      id="regPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 chars, 1 number, 1 special char"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  {/* Password strength hints */}
                  {password && (
                    <div className="text-xs space-y-1">
                      <p className={validatePassword(password).hasMinLength ? "text-green-600" : "text-muted-foreground"}>
                        {validatePassword(password).hasMinLength ? "✓" : "○"} At least 6 characters
                      </p>
                      <p className={validatePassword(password).hasNumber ? "text-green-600" : "text-muted-foreground"}>
                        {validatePassword(password).hasNumber ? "✓" : "○"} At least 1 number
                      </p>
                      <p className={validatePassword(password).hasSpecialChar ? "text-green-600" : "text-muted-foreground"}>
                        {validatePassword(password).hasSpecialChar ? "✓" : "○"} At least 1 special character
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className={`pr-16 ${confirmPassword && passwordsMatch ? "border-green-500" : ""}`}
                    />
                    {/* Show tick when passwords match */}
                    {confirmPassword && passwordsMatch && (
                      <Check className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive">Passwords don't match</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCsvUser ? "Activate Account" : "Create Account"}
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
