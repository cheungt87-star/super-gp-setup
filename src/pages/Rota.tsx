import { Calendar, Settings, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RulesConfigurationTab } from "@/components/rota/RulesConfigurationTab";

const Rota = () => {
  return (
    <div className="container py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Rota Manager</h1>
        <p className="text-muted-foreground">Manage staff schedules, shifts, and rota rules.</p>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="warnings" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Warnings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="animate-fade-in">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Rota Schedule</CardTitle>
              <CardDescription>
                The weekly rota scheduling interface is coming soon. You'll be able to drag and drop staff to create shifts.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Start by configuring your site rules in the "Rules" tab.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="animate-fade-in">
          <RulesConfigurationTab />
        </TabsContent>

        <TabsContent value="warnings" className="animate-fade-in">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Rule Warnings</CardTitle>
              <CardDescription>
                View and manage rule violations for your rotas. Warnings will appear here once you create a rota schedule.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                No warnings to display yet.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rota;
