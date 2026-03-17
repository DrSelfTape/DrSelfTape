import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AvailableReaders from '../../../../../components/sceneStudy/Collaboration/AvailableReaders';
import ConnectReaders from '../../../../../components/sceneStudy/Collaboration/ConnectReaders';
import Feature from '../../../../../components/sceneStudy/Collaboration/Feature';
import { getReaders } from '../../../../../redux/features/sceneStudyScripts/readersSlice';
import { filterAvailableReaders } from '../../../../../utils/utils';
import { useStoreData } from '../../../../../hooks/useStoreData';

export const Collaboration = () => {
  const dispatch = useDispatch();
  const {
    readers: readersListing,
    getReadersLoading,
    getReadersError,
  } = useSelector((state) => state.readers);
  const { email: currentUserEmail } = useStoreData();

  useEffect(() => {
    dispatch(getReaders());
  }, [dispatch]);

  // Transform reader data to match ReaderCard component format
  const transformReaderData = (reader) => {
    return {
      id: reader?.id,
      name: reader?.display_name || 'Reader',
      email: reader?.email || reader?.user_email || null,
      rating:
        reader?.average_rating && parseFloat(reader.average_rating) > 0
          ? parseFloat(reader.average_rating).toFixed(1)
          : undefined,
      count: reader?.review_count || 0,
      countLabel: 'reviews',
      status: '', // No status badge needed since we're already showing only available readers
      type:
        Array.isArray(reader?.specialties) && reader.specialties.length > 0
          ? reader.specialties
          : [],
      image: reader?.image || null,
      user_image: reader?.user_image || null,
      headshot: reader?.headshot || null,
      isOffline: false, // All readers shown are available
    };
  };

  // Filter and transform readers - exclude unavailable and current user
  const availableReaders = useMemo(() => {
    if (
      !readersListing ||
      !Array.isArray(readersListing) ||
      readersListing.length === 0
    ) {
      return [];
    }
    // Filter out unavailable readers and current user
    const filteredReaders = filterAvailableReaders(readersListing, currentUserEmail);
    return filteredReaders.map(transformReaderData);
  }, [readersListing, currentUserEmail]);

  return (
    <div className='m-[10px] flex flex-col gap-[10px]'>
      <ConnectReaders />
      <div className='flex flex-col md:flex-row gap-[10px]'>
        <AvailableReaders
          readers={availableReaders}
          loading={getReadersLoading}
          error={getReadersError}
        />
        <Feature />
      </div>
    </div>
  );
};
