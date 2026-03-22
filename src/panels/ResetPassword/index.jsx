import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomInput, Logo } from '../../components/Shared';

export default function ResetPassword() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [requirementsMet, setRequirementsMet] = useState({
    length: false,
    upper: false,
    number: false,
  });

  const checkPasswordRequirements = (password) => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'newPassword') {
      setRequirementsMet(checkPasswordRequirements(value));
    }

    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { newPassword, confirmPassword } = formData;
    const reqs = checkPasswordRequirements(newPassword);

    const newErrors = {};
    if (!newPassword.trim()) {
      newErrors.newPassword = 'New Password is required';
    } else if (!Object.values(reqs).every(Boolean)) {
      newErrors.newPassword = 'Password does not meet all requirements';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirm Password is required';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    console.log('Password successfully created:', newPassword);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md flex flex-col gap-y-6"
      >
        <Logo />

        <h2 className="text-2xl font-light text-center">Create New Password</h2>

        <div className="flex flex-col gap-y-5">
          <div>
            <CustomInput
              label="New Password"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter your new password"
              error={!!errors.newPassword}
              errorMsg={errors.newPassword}
            />
            {/* Add vertical space if error exists */}
            {!!errors.newPassword && <div className="h-2"></div>}
          </div>

          <div>
            <CustomInput
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your new password"
              error={!!errors.confirmPassword}
              errorMsg={errors.confirmPassword}
            />
            {!!errors.confirmPassword && <div className="h-2"></div>}
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>Password must include:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li className={requirementsMet.length ? 'text-green-600' : 'text-red-600'}>
              At least 8 characters
            </li>
            <li className={requirementsMet.upper ? 'text-green-600' : 'text-red-600'}>
              One uppercase letter
            </li>
            <li className={requirementsMet.number ? 'text-green-600' : 'text-red-600'}>
              One number
            </li>
          </ul>
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded hover:bg-primary-dark transition-all text-sm font-medium"
        >
          Set New Password
        </button>
      </form>
    </div>
  );
}
