import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PolicyGPT = () => {
  return (
    <div className="container py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Policy GPT</h1>
        <p className="text-muted-foreground">AI-powered policy and procedure assistant.</p>
      </div>

      <Card className="max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Policy GPT is currently in development. Soon you'll be able to ask questions about your organisation's policies and get instant, accurate answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Your intelligent compliance companion is on the way.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PolicyGPT;
