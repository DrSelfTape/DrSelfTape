/**
 * LinkedIn Post Share Template
 * Dimensions: 1200x627 (native LinkedIn post size)
 * Optimized for html2canvas export - horizontal layout, avoids backdrop-filter
 */
export const LinkedInShareTemplate = ({ badge, unlockInfo, templateRef }) => {
  if (!badge || !unlockInfo) return null;

  return (
    <div
      ref={templateRef}
      id="linkedin-share-template"
      data-html2canvas-ignore="false"
      className="fixed -left-[9999px] -top-[9999px] w-[1200px] h-[627px] flex flex-row justify-between items-center overflow-hidden pointer-events-none invisible opacity-0 -z-[9999]"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        padding: '70px 90px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        boxSizing: 'border-box',
        color: '#ffffff',
      }}
    >
      {/* Decorative background circles - using solid colors instead of blur */}
      <div
        className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] rounded-full"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
        }}
      />
      <div
        className="absolute -bottom-[100px] -left-[100px] w-[450px] h-[450px] rounded-full"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
        }}
      />

      {/* Content Container - Horizontal Layout */}
      <div
        id="share-content"
        className="flex flex-row items-center justify-center z-[1] w-full h-full gap-12 px-12 box-border"
        style={{
          paddingTop: '20px',
          paddingBottom: '20px',
        }}
      >
        {/* Left Side - Icon and Achievement */}
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          {/* Badge Icon/Emoji */}
          <div
            className="text-[80px]"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))',
            }}
          >
            🎉
          </div>

          {/* Achievement Text */}
          <h1
            className="text-[42px] font-extrabold text-center leading-[1.1] m-0 px-3 break-words w-full box-border"
            style={{
              color: '#ffffff',
              letterSpacing: '-1px',
              textShadow: '0 3px 15px rgba(0, 0, 0, 0.3)',
            }}
          >
            Achievement Unlocked!
          </h1>

          {/* Badge Name */}
          <h2
            className="text-[36px] font-bold text-center leading-[1.2] m-0 px-3 break-words w-full box-border"
            style={{
              color: '#ffffff',
              letterSpacing: '-0.5px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            }}
          >
            {badge.name}
          </h2>
        </div>

        {/* Right Side - Description and Unlock Info */}
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          {/* Description */}
          <p
            className="text-[24px] text-center m-0 px-3 break-words w-full box-border font-normal"
            style={{
              color: '#ffffff',
              opacity: 0.95,
              lineHeight: '1.4',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            {badge.description}
          </p>

          {/* Unlock Info Card - Professional design */}
          <div
            className="text-center rounded-[24px] px-10 py-8 border-2 w-full box-border"
            style={{
              background: 'rgba(255, 255, 255, 0.28)', // More opaque for better readability and professional look
              borderColor: 'rgba(255, 255, 255, 0.45)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            }}
          >
            <p
              className="text-[20px] mb-3 font-medium m-0 px-2 break-words w-full box-border"
              style={{
                color: '#ffffff',
                opacity: 0.95,
                letterSpacing: '0.3px',
              }}
            >
              Earned by completing:
            </p>
            <p
              className="text-[28px] font-bold mb-2 leading-[1.3] m-0 px-2 break-words w-full box-border"
              style={{
                color: '#ffffff',
                letterSpacing: '-0.5px',
              }}
            >
              {unlockInfo.project}
            </p>
            <p
              className="text-[20px] font-medium m-0 px-2 break-words w-full box-border"
              style={{
                color: '#ffffff',
                opacity: 0.9,
              }}
            >
              on {unlockInfo.date}
            </p>
          </div>

          {/* App Branding - Professional spacing */}
          <div
            className="text-[20px] font-semibold"
            style={{
              color: '#ffffff',
              opacity: 0.9,
              letterSpacing: '1.5px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              marginTop: '20px',
            }}
          >
            DR Self Tapes
          </div>
        </div>
      </div>
    </div>
  );
};
