import { RotaScheduleTab } from "@/components/rota/RotaScheduleTab";

const Rota = () => {
  return (
    <div className="container py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Rota Manager</h1>
        <p className="text-muted-foreground">Manage staff schedules and shifts.</p>
      </div>

      <RotaScheduleTab />
    </div>
  );
};

export default Rota;
