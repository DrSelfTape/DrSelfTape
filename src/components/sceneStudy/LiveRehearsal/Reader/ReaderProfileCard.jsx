import { StarIcon } from '../../../../assets/icons';
import { CustomAvatar, CustomButton } from '../../../Shared';

const ReaderProfileCard = ({
  id,
  name,
  rating,
  reviewCount,
  specialties = [],
  bio,
  headshot,
  isAvailable,
  hourlyRate,
  currency,
  yearsExperience,
  languages = [],
  totalSessions,
  meetingMethods = [],
  onRequestSession,
}) => {
  // Format rating display
  const displayRating = rating && parseFloat(rating) > 0 ? parseFloat(rating).toFixed(1) : null;
  
  // Format rate with currency
  const formatRate = () => {
    if (!hourlyRate) return null;
    const rate = parseFloat(hourlyRate).toFixed(0);
    const currencySymbol = currency === 'USD' ? '$' : currency || '$';
    return `${currencySymbol}${rate}/hr`;
  };

  // Format years of experience
  const formatExperience = () => {
    if (!yearsExperience) return null;
    return `${yearsExperience} ${yearsExperience === 1 ? 'year' : 'years'} exp.`;
  };

  return (
    <div className='card-section flex flex-col items-center text-center h-full min-h-[360px] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 w-full p-5 bg-white rounded-xl border border-gray-200 group'>
      {/* Avatar Section */}
      <div className='flex-shrink-0 relative mb-3'>
        <div className='relative'>
          <CustomAvatar
            userName={name}
            hideUsername={true}
            avatarClass='w-16 h-16 md:w-20 md:h-20 ring-3 ring-gray-50 group-hover:ring-primary/10 transition-all duration-300'
            noUrlNameClass='text-xl md:text-2xl leading-none font-bold text-primary'
            url={headshot}
            userNameClass='truncate max-w-[120px] font-medium'
          />
          {/* Availability Indicator */}
          {isAvailable && (
            <div className='absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md flex items-center justify-center'>
              <div className='w-1.5 h-1.5 bg-white rounded-full animate-pulse' />
            </div>
          )}
        </div>
      </div>

      {/* Name Section */}
      <div className='w-full mb-1.5'>
        <h3 className='text-lg md:text-xl font-bold text-gray-900 truncate w-full'>
          {name}
        </h3>
      </div>

      {/* Rating & Reviews Section */}
      {displayRating && reviewCount > 0 ? (
        <div className='flex items-center justify-center gap-1.5 mb-2'>
          <StarIcon className='h-4 w-4 fill-[#FCE072] text-[#FCE072]' />
          <span className='font-bold text-gray-900'>{displayRating}</span>
          <span className='text-gray-500 text-xs'>({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
        </div>
      ) : (
        <div className='h-6 mb-2' />
      )}

      {/* Status Badge */}
      <div className='mb-3'>
        {isAvailable ? (
          <div className='inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-[#A7ECDA]/20 text-[#059669] border-[#A7ECDA]'>
            <div className='w-1.5 h-1.5 bg-[#059669] rounded-full mr-1.5 animate-pulse' />
            Available Now
          </div>
        ) : (
          <div className='inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 border-gray-300'>
            Offline
          </div>
        )}
      </div>

      {/* Bio Section - Compact */}
      {bio && (
        <div className='w-full mb-2 px-2'>
          <p className='text-xs text-gray-600 line-clamp-2 leading-snug'>
            {bio}
          </p>
        </div>
      )}

      {/* Specialties Section - Compact */}
      {specialties && specialties.length > 0 && (
        <div className='w-full mb-3 px-2'>
          <div className='flex flex-wrap gap-1.5 justify-center'>
            {specialties.slice(0, 3).map((specialty, index) => (
              <div
                key={index}
                className='inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-50 border-gray-200'
              >
                {specialty}
              </div>
            ))}
            {specialties.length > 3 && (
              <div className='inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border-gray-300'>
                +{specialties.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Section - Fixed at bottom */}
      <div className='mt-auto w-full pt-3 border-t border-gray-200'>
        {/* Rate & Experience */}
        <div className='flex items-center justify-center gap-2 mb-2 flex-wrap'>
          {formatRate() && (
            <span className='font-semibold text-gray-900 text-sm'>{formatRate()}</span>
          )}
          {formatExperience() && formatRate() && (
            <span className='text-gray-300'>•</span>
          )}
          {formatExperience() && (
            <span className='text-gray-600 text-xs font-medium'>{formatExperience()}</span>
          )}
        </div>

        {/* Sessions Count */}
        {totalSessions !== undefined && totalSessions > 0 && (
          <p className='text-xs text-gray-500 mb-2'>
            {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'}
          </p>
        )}

        {/* Connect Button */}
        <CustomButton 
          className='w-full !bg-primary !text-white hover:!bg-primary-dark !font-semibold !py-2 !rounded-lg !transition-all !shadow-sm hover:!shadow-md disabled:!bg-gray-300 disabled:!cursor-not-allowed !text-sm'
          onClick={onRequestSession}
          disabled={!isAvailable}
        >
          {isAvailable ? 'Connect' : 'Not Available'}
        </CustomButton>
      </div>
    </div>
  );
};

export default ReaderProfileCard;
