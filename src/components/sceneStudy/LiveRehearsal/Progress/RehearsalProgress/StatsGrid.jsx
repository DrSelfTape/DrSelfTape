import React from 'react';

const StatsGrid = ({ stats }) => {
  return (
    <div className="grid gap-[10px] md:grid-cols-3">
      {stats.map(({ label, value, change }, i) => (
        <div key={i} className="flex flex-col gap-[10px]">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-sm text-primary">{change}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;
