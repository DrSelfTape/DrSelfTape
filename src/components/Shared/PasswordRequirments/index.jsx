export default function PasswordRequirements({ passwordValidation }) {
  return (
    <div className='mt-1.5 w-full absolute max-w-[448px] z-30 top-9 rounded-md bg-gray-50  duration-300 ease-in-out border border-gray-200 px-4 py-3 text-sm text-gray-700'>
      <p className='mb-2 font-medium text-gray-800'>Password must include:</p>
      <ul className='list-disc pl-5 space-y-1'>
        <li
          className={
            passwordValidation.length ? 'text-green-600' : 'text-red-500'
          }
        >
          At least 8 characters
        </li>
        <li
          className={
            passwordValidation.upper ? 'text-green-600' : 'text-red-500'
          }
        >
          One uppercase letter
        </li>
        <li
          className={
            passwordValidation.number ? 'text-green-600' : 'text-red-500'
          }
        >
          One number
        </li>
        <li
          className={
            passwordValidation.specialChar ? 'text-green-600' : 'text-red-500'
          }
        >
          One Special Character
        </li>
      </ul>
    </div>
  );
}
