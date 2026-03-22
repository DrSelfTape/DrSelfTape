import { CircleCheckIcon } from '../../../../assets/icons';
import { CustomButton } from '../../../Shared';

const benefitsList = [
  'Earn money while helping others',
  'Improve your own acting skills',
  'Build your network in the industry',
  'Earn badges and recognition',
];

const stepsList = [
  'Create your reader profile',
  'Set your availability and rates',
  'Accept session requests',
  'Get paid and earn badges',
];

export const ReaderOnboardingSection = ({ onCreateProfile }) => {
  return (
    <section className='pt-[10px] space-y-6 max-w-xl mx-auto'>
      {/* Benefits Section */}
      <div className='space-y-3'>
        <h2 className='text-lg font-semibold'>Benefits of Being a Reader</h2>
        <ul className='space-y-2'>
          {benefitsList.map((benefit, index) => (
            <li key={index} className='flex items-start gap-[10px]'>
              <CircleCheckIcon className='h-5 w-5 text-primary' />
              <span className='text-sm leading-snug'>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Steps Section */}
      <div className='space-y-3'>
        <h2 className='text-lg font-semibold'>How It Works</h2>
        <ol className='space-y-2'>
          {stepsList.map((step, index) => (
            <li key={index} className='flex items-start gap-[10px]'>
              <div className='h-5 w-5 rounded-full bg-primary/20 text-center text-sm flex items-center justify-center'>
                {index + 1}
              </div>
              <span className='text-sm leading-snug'>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Action Button */}
      <CustomButton 
        className={'w-full'} 
        onClick={onCreateProfile}
      >
        Create Reader Profile
      </CustomButton>
    </section>
  );
};
