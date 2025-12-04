import { Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Rota = () => {
  return (
    <div className="container py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Rota</h1>
        <p className="text-muted-foreground">Manage staff schedules and shifts.</p>
      </div>

      <Card className="max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Rota management features are currently in development. Check back soon for shift scheduling, availability tracking, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            We're working hard to bring you powerful scheduling tools.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Rota;
