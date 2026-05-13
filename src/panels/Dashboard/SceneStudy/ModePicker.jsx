export default function ModePicker({ prePauseSeconds, setPrePauseSeconds, onPreTimed, onVoice, onBack }) {
  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Choose Your Mode</h2>
          <p className="text-[#888] text-sm">How do you want to run the scene?</p>
        </div>

        <div className="space-y-4">
          {/* Pre-Timed card */}
          <div
            onClick={onPreTimed}
            className="w-full bg-[#1A1A2E] border-2 border-[#FF8280]/40 hover:border-[#FF8280] rounded-2xl p-6 cursor-pointer transition-all"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FF8280]/15 flex items-center justify-center text-3xl shrink-0">
                ⏱️
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">Pre-Timed Reader</h3>
                <p className="text-[#888] text-sm leading-relaxed">
                  The AI reads each partner line automatically, then pauses so you can deliver yours — then auto-advances. No mic needed. Perfect for memorization.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <span className="text-xs text-[#FF8280] font-semibold">Pause after AI line:</span>
              {[2, 3, 5, 8].map((s) => (
                <span
                  key={s}
                  onClick={(e) => { e.stopPropagation(); setPrePauseSeconds(s); }}
                  className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                    prePauseSeconds === s
                      ? 'bg-[#FF8280] text-white'
                      : 'bg-[#2A2A2A] text-[#666] hover:text-white'
                  }`}
                >
                  {s}s
                </span>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-[#FF8280]/10 text-[#FF8280] px-2 py-1 rounded-full">No mic required</span>
              <span className="text-xs bg-[#FF8280]/10 text-[#FF8280] px-2 py-1 rounded-full">Auto-advances</span>
              <span className="text-xs bg-[#FF8280]/10 text-[#FF8280] px-2 py-1 rounded-full">Best for memorization</span>
            </div>
          </div>

          {/* Voice-Activated card */}
          <div
            onClick={onVoice}
            className="w-full bg-[#1A1A2E] border-2 border-[#2A2A4A] hover:border-[#A7ECDA]/50 rounded-2xl p-6 cursor-pointer transition-all"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#A7ECDA]/10 flex items-center justify-center text-3xl shrink-0">
                🎙️
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">Voice-Activated Reader</h3>
                <p className="text-[#888] text-sm leading-relaxed">
                  The AI listens for your cue. When you finish your line, it detects the silence and responds. Closest to a real live read.
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-[#A7ECDA]/10 text-[#A7ECDA] px-2 py-1 rounded-full">Mic required</span>
              <span className="text-xs bg-[#A7ECDA]/10 text-[#A7ECDA] px-2 py-1 rounded-full">Responds to your voice</span>
              <span className="text-xs bg-[#A7ECDA]/10 text-[#A7ECDA] px-2 py-1 rounded-full">Most realistic</span>
            </div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="w-full mt-6 text-[#555] hover:text-white text-sm py-3 transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
