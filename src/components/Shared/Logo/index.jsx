import { logo } from "../../../assets/images";
export const Logo = () => {
  return (
    <div className="flex sm:justify-center items-center gap-1">
      <img src={logo} alt="Logo" className="w-14 h-14 text-black" />
      <span className="text-[28px] font-semibold text-black">Dr. Self Tape</span>
    </div>
  );
};
