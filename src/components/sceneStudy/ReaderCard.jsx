import { CustomAvatar, CustomButton } from '../Shared';

const ReaderCard = ({
  name,
  type = [],
  rating,
  count,
  countLabel = 'reviews',
  status = '',
  image,
  user_image,
  headshot,
  onConnect,
  isOffline = false,
  showButton = true,
}) => {
  let roleString = '';
  if (rating !== undefined) {
    roleString = `★ ${rating} (${count}${countLabel ? ` ${countLabel}` : ''})`;
  } else if (type.length > 0) {
    roleString =
      type[0] +
      type
        .slice(1)
        .map((item) => ` . ${item}`)
        .join('');
  }

  return (
    <div className='flex flex-col xs:flex-row xs:items-center gap-3 p-3 border border-style rounded-md bg-card text-card-foreground shadow-sm min-w-[170px]'>
      {/* Profile Image */}
      <CustomAvatar
        userName={name}
        role={roleString}
        avatarClass='md:w-[40px] md:h-[40px]'
        noUrlNameClass='md:text-[20px] md:leading-none'
        url={headshot}
        userNameClass='truncate md:max-w-[90px] font-medium'
      />

      {/* Status Badge */}
      {status && (
        <div
          className={`inline-flex items-center justify-center rounded-full text-nowrap text-center border px-2.5 py-0.5 text-xs font-semibold ${
            isOffline
              ? 'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground border-gray-300 bg-transparent'
              : 'bg-[#A7ECDA]/20 text-black border-[#A7ECDA]'
          }`}
        >
          {status}
        </div>
      )}

      {/* Connect Button */}
      {showButton && (
        <CustomButton
          onClick={onConnect}
          variant='outlined'
          className='!text-sm !font-medium !border !border-input !h-fit !rounded-md !px-3'
        >
          <span className='text-[12px]'>Connect</span>
        </CustomButton>
      )}
    </div>
  );
};

export default ReaderCard;
