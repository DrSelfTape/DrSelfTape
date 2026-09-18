export default function StudioScript({ lines, userRole, currentLineIdx, panelRef }) {
  return (
<div
          ref={panelRef}
          className="dst-rehearsal-script lg:w-80 lg:h-auto lg:border-r lg:border-b-0 border-b border-[#1a1a2e] overflow-y-auto p-3 block"
        >
          <h3 className="text-[rgba(10,10,10,0.62)] text-xs font-bold uppercase tracking-wider mb-4">Script</h3>
          <div className="space-y-2">
            {lines.map((line, i) => {
              const isUser = line.character === userRole;
              const isCurrent = i === currentLineIdx;
              const isPast = i < currentLineIdx;
              // Contrast tiers: PAST lines fade (opacity 65%) but stay
              // legible; CURRENT line is full-strength ink with a tinted
              // background; UPCOMING lines are slightly muted so the
              // eye finds the current row instantly.
              return (
                <div
                  key={i}
                  data-line-idx={i}
                  data-current={isCurrent}
                  className={`rounded-lg p-2 lg:p-2.5 transition-all duration-300 ${
                    isCurrent
                      ? isUser
                        ? 'bg-[#D4A85F]/20 border-l-4 border-[#D4A85F]'
                        : 'bg-[#A7ECDA]/18 border-l-4 border-[#1AB680]'
                      : isPast
                        ? 'opacity-60'
                        : 'opacity-85'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${
                      isUser ? 'text-[#7A5A18]' : 'text-[rgba(10,10,10,0.78)]'
                    }`}
                  >
                    {line.character}
                  </span>
                  <p className={`text-sm leading-snug ${isCurrent ? 'text-[#0A0A0A] font-medium' : 'text-[rgba(10,10,10,0.82)]'}`}>
                    {line.dialogue}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
  );
}
