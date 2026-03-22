import { StarIcon } from '../../../../assets/icons';
import { CustomAvatar, CustomButton } from '../../../Shared';

const ReaderCommunity = ({
  name,
  rating,
  reviews,
  status,
  skills,
  rate,
  lastActive,
  isAvailable,
  user_image,
  image,
  headshot,
}) => {
  return (
    <div className='card-section flex flex-col items-center text-center space-y-3 transition hover:shadow-md  w-full p-4 bg-white rounded-lg'>
      {/* Avatar */}
      <div className='flex-shrink-0'>
        <CustomAvatar
          userName={name}
          hideUsername={true}
          avatarClass='w-12 h-12 md:w-14 md:h-14'
          noUrlNameClass='text-lg xs:text-xl md:text-2xl leading-none'
          url={headshot}
          userNameClass='truncate max-w-[120px] font-medium'
        />
      </div>

      {/* Name */}
      <h3 className='md:text-[20px] md:leading-none font-medium truncate w-full'>
        {name}
      </h3>

      {/* Rating */}
      <div className='flex items-center gap-1 flex-shrink-0'>
        <StarIcon className='h-4 w-4 fill-[#FCE072] text-[#FCE072]' />
        <span className='font-medium'>{rating}</span>
        <span className='text-muted-foreground text-sm'>({reviews})</span>
      </div>

      {/* Status */}
      <div className='h-6 flex items-center'>
        {isAvailable ? (
          <div className='inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-[#A7ECDA]/20 text-black border-[#A7ECDA]'>
            {status}
          </div>
        ) : (
          <div className='h-6' />
        )}
      </div>

      {/* Skills */}
      <div className='flex flex-wrap gap-2 justify-center '>
        {skills.map((skill, index) => (
          <div
            key={index}
            className='inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold text-foreground'
          >
            {skill}
          </div>
        ))}
      </div>

      {/* Rate + Last Active */}
      <div className='mt-auto flex flex-col gap-2 w-full'>
        <p className='text-sm text-muted-foreground'>
          {' '}
          {rate} • {lastActive}
        </p>
        {/* Button */}
        <CustomButton className='w-full mt-auto'>
          Request a Session
        </CustomButton>
      </div>
    </div>
  );
};

export default ReaderCommunity;
