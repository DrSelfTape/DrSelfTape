import { ArrowHeadIcon } from "../../../../../assets/icons";
import { CustomButton } from "../../../../Shared";

const SessionHistory = ({ sessions }) => {
  return (
    <div >
      <h3 className="font-medium mb-[10px]">Session History</h3>
      <div className="space-y-[10px]">
        {sessions.map(({ title, date, reader, duration }, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 border border-style rounded-md"
          >
            <div className="flex-1">
              <div className="font-medium">{title}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{date}</span>
                <span>•</span>
                <span>with {reader}</span>
              </div>
            </div>
            <div className="text-sm font-medium">{duration}</div>
            <button
              className="inline-flex items-center justify-center h-10 w-10 rounded-md text-sm font-medium
                         hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer text-primary"
            >
              <ArrowHeadIcon className="h-4 w-4 -rotate-90" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionHistory;
