export default function RoleSelect({ characters, selectedRole, onSelectRole, onStart, onBack }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0A0A0A]">Pick Your Role</h2>
        <p className="text-[rgba(10,10,10,0.62)] text-sm mt-1">
          Select the character you'll be reading for — the AI will play all other roles as your Casting Director.
        </p>
      </div>

      {characters.length === 0 ? (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-3 rounded-lg text-sm">
          No characters detected. Make sure your sides use the format{' '}
          <code className="bg-yellow-500/20 px-1 rounded">CHARACTER: dialogue</code>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {characters.map((name) => {
              const isSelected = selectedRole === name;
              return (
                <button
                  key={name}
                  onClick={() => onSelectRole(name)}
                  className={`p-4 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#FF8280] bg-[#FF8280]/5 text-[#FF8280] shadow-sm'
                      : 'border-[rgba(10,10,10,0.14)] bg-[#1E1E1E] text-[rgba(10,10,10,0.62)] hover:border-[#FF8280]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className={`w-5 h-5 ${isSelected ? 'text-[#FF8280]' : 'text-[rgba(10,10,10,0.4)]'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                    {name}
                  </div>
                  {isSelected && (
                    <p className="text-[10px] mt-1 text-[#FF8280] font-normal">Your role</p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedRole && (
            <div className="mt-6 bg-[#1E1E1E] rounded-xl border border-[rgba(10,10,10,0.08)] p-4 text-sm text-[rgba(10,10,10,0.62)]">
              <span className="font-semibold text-[#0A0A0A]">
                I will be reading all other roles as your Casting Director today.
              </span>{' '}
              When you're ready, hit Begin Session and we'll start from the top.
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-3 text-sm font-semibold text-[rgba(10,10,10,0.62)] bg-[#F4F4EE] hover:bg-[#3A3A3A] rounded-lg transition-colors cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={onStart}
          disabled={!selectedRole}
          className="flex-1 bg-[#FF8280] hover:bg-[#A040C8] text-[#0A0A0A] px-5 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Begin Session
        </button>
      </div>
    </div>
  );
}
