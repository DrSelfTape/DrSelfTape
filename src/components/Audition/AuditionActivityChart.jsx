import { CalendarIcon, StarIcon, TargetIcon } from "../../assets/icons";

const AuditionActivityChart = ({ total = 50, completed = 35 }) => {
  // Handle case where total is 0 to avoid division by zero
  const percentage = total === 0 ? 0 : Math.min((completed / total) * 100, 100);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = total === 0 ? circumference : circumference - (percentage / 100) * circumference;

  // If total is 0, render a fallback UI
  if (total === 0) {
    return (
      <div className="py-4 flex flex-col items-center justify-center">
        <div className="relative h-48 w-48">
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="10"
            />
          </svg>
        </div>
        <div className="mt-4 text-center">
          <div className="text-2xl font-medium text-muted-foreground">No Goal Set</div>
          <div className="text-sm text-muted-foreground">Please set a goal to track progress</div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 flex flex-col items-center justify-center">
      <div className="relative h-48 w-48">
        <svg className="h-full w-full" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e80" />
              <stop offset="100%" stopColor="#2F80ED80" />
            </linearGradient>
          </defs>

          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="10"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold">{completed}</div>
          <div className="text-sm text-muted-foreground">of {total} goal</div>
        </div>
      </div>

      <div className="mt-4 text-center w-full max-w-xs">
        <div className="text-sm font-medium">
          {completed >= total ? "Goal achieved!" : `${total - completed} more auditions to reach your goal`}
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-primary/80 to-success/80"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-6 mt-8">
        <div className="min-w-[8rem] max-w-[12rem] text-center p-2 bg-primary/5 rounded-xl border border-primary/20">
          <CalendarIcon className="size-5 mx-auto mb-2 text-primary" />
          <div className="text-base font-sans font-bold text-foreground">
            {new Date().toLocaleDateString("en-US", { month: "long" })}
          </div>
          <div className="text-xs text-muted-foreground font-mono">Current Month</div>
        </div>

        <div className="min-w-[8rem] max-w-[14rem] text-center p-2 bg-danger/5 rounded-xl border border-secondary/20">
          <TargetIcon className="size-5 mx-auto mb-2 text-danger" />
          <div className="text-base font-sans font-bold text-foreground">
            {completed >= total ? 0 : total - completed}
          </div>
          <div className="text-xs text-muted-foreground font-mono">Remaining</div>
        </div>

        <div className="min-w-[8rem] max-w-[14rem] text-center p-2 bg-success/10 rounded-xl border border-success/30">
          <StarIcon className="size-5 mx-auto mb-2 text-success" />
          <div className="text-base font-sans font-bold text-foreground">
            {Math.round(percentage)}%
          </div>
          <div className="text-xs text-muted-foreground font-mono">Success Rate</div>
        </div>
      </div>
    </div>
  );
};

export default AuditionActivityChart;