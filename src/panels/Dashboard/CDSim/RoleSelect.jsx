export default function RoleSelect({ characters, selectedRole, onSelectRole, onStart, onBack }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pick Your Role</h2>
        <p className="text-gray-500 text-sm mt-1">
          Select the character you'll be reading for — the AI will play all other roles as your Casting Director.
        </p>
      </div>

      {characters.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          No characters detected. Make sure your sides use the format{' '}
          <code className="bg-yellow-100 px-1 rounded">CHARACTER: dialogue</code>
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
                      ? 'border-[#ff6b35] bg-orange-50 text-[#ff6b35] shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className={`w-5 h-5 ${isSelected ? 'text-[#ff6b35]' : 'text-gray-400'}`}
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
                    <p className="text-[10px] mt-1 text-[#ff6b35] font-normal">Your role</p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedRole && (
            <div className="mt-6 bg-gray-50 rounded-xl border border-gray-100 p-4 text-sm text-gray-600">
              <span className="font-semibold text-gray-800">
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
          className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={onStart}
          disabled={!selectedRole}
          className="flex-1 bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-5 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Begin Session
        </button>
      </div>
    </div>
  );
}
