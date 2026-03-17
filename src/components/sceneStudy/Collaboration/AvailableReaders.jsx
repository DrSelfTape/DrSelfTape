import { useState } from 'react';
import { CircularProgress } from '@mui/material';
import ReaderCard from '../ReaderCard';
import InviteCoachModal from '../InviteCoachModal';

const AvailableReaders = ({ readers = [], loading = false, error = null }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReader, setSelectedReader] = useState(null);

  const handleConnect = (reader) => {
    setSelectedReader(reader);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReader(null);
  };

  return (
    <>
      <div className='card-section md:min-w-[300px]'>
        <div className='flex flex-col gap-10'>
          <div>
            <h1 className='text-xl font-semibold'>Available Readers</h1>
            <p className='text-sm text-input-title max-w-md'>
              Connect with readers who are online now
            </p>
          </div>
          
          <div className='flex flex-col gap-4'>
            {loading ? (
              <div className='flex items-center justify-center py-12'>
                <div className='flex flex-col items-center gap-3'>
                  <CircularProgress size={40} className='!text-primary' />
                  <p className='text-sm text-muted-foreground'>Loading available readers...</p>
                </div>
              </div>
            ) : error ? (
              <div className='flex items-center justify-center py-12'>
                <div className='flex flex-col items-center gap-3 text-center'>
                  <p className='text-lg font-semibold text-destructive'>Error loading readers</p>
                  <p className='text-sm text-muted-foreground'>
                    {error || 'Something went wrong. Please try again later.'}
                  </p>
                </div>
              </div>
            ) : readers.length === 0 ? (
              <div className='flex items-center justify-center py-12'>
                <div className='flex flex-col items-center gap-3 text-center'>
                  <p className='text-lg font-semibold'>No Available Readers</p>
                  <p className='text-sm text-muted-foreground max-w-sm'>
                    There are no readers available at the moment. Please check back later.
                  </p>
                </div>
              </div>
            ) : (
              readers.map((reader) => (
                <ReaderCard
                  key={reader.id}
                  name={reader.name}
                  type={reader.type}
                  rating={reader.rating}
                  count={reader.count}
                  countLabel={reader.countLabel}
                  status={reader.status}
                  image={reader.image}
                  user_image={reader.user_image}
                  headshot={reader.headshot}
                  isOffline={reader.isOffline}
                  onConnect={() => handleConnect(reader)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {selectedReader && (
        <InviteCoachModal
          open={isModalOpen}
          onClose={handleCloseModal}
          coachId={selectedReader.id}
          coachName={selectedReader.name}
          coachEmail={selectedReader.email || selectedReader.user_email || ''}
        />
      )}
    </>
  );
};

export default AvailableReaders;