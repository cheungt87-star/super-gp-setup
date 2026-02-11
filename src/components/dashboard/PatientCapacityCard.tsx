interface PatientCapacityCardProps {
  totalCapacity: number;
  amCapacity: number;
  pmCapacity: number;
  loading: boolean;
}

export function PatientCapacityCard({ totalCapacity, amCapacity, pmCapacity, loading }: PatientCapacityCardProps) {
  if (loading) return null;

  const hasCapacity = totalCapacity > 0;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)] flex flex-col">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
        Estimated Patient Capacity
      </p>
      {hasCapacity ? (
        <div>
          <p className="text-3xl font-bold text-[#1E293B]">{totalCapacity}</p>
          <p className="text-sm text-[#64748B] mt-1">
            AM: {amCapacity} &nbsp;|&nbsp; PM: {pmCapacity}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-3xl font-bold text-[#1E293B]">0</p>
          <p className="text-sm italic text-slate-400 mt-1">(No rooms staffed)</p>
        </div>
      )}
    </div>
  );
}
