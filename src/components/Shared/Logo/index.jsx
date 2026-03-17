import { logo } from "../../../assets/images";

export const Logo = ({ showText = true }) => {
  const imgClass = showText
    ? "w-12 h-12 sm:w-16 sm:h-16 text-black"
    : "w-20 h-20 sm:w-32 sm:h-32 text-black";

  return (
    <div className={`flex justify-center items-center ${showText ? "gap-1" : ""}`}>
      <img src={logo} alt="Logo" className={imgClass} />
      {showText && (
        <span className="text-[18px] sm:text-[28px] font-semibold font-jetbrains text-black tracking-tighter">
          Dr. Self Tape
        </span>
      )}
    </div>
  );
};
