import { User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Profile = () => {
  return (
    <div className="container py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">View and edit your profile information.</p>
      </div>

      <Card className="max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Profile management features are currently in development. Check back soon to update your personal details, preferences, and settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Personalise your Super GP experience.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
