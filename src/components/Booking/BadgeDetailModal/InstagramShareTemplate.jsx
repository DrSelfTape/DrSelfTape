/**
 * Instagram Story Share Template
 * Dimensions: 1080x1920 (9:16 aspect ratio)
 * Optimized for html2canvas export - avoids backdrop-filter and heavy blur
 */
export const InstagramShareTemplate = ({ badge, unlockInfo, templateRef }) => {
  if (!badge || !unlockInfo) return null;

  return (
    <div
      ref={templateRef}
      id="instagram-share-template"
      data-html2canvas-ignore="false"
      className="fixed -left-[9999px] -top-[9999px] w-[1080px] h-[1920px] flex flex-col justify-between items-center overflow-hidden pointer-events-none invisible opacity-0 -z-[9999]"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        padding: '140px 100px 100px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        boxSizing: 'border-box',
        color: '#ffffff',
      }}
    >
      {/* Decorative background circles - using solid colors instead of blur for better export */}
      <div
        className="absolute -top-[200px] -right-[200px] w-[800px] h-[800px] rounded-full"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          // Removed blur filter - html2canvas renders it poorly
        }}
      />
      <div
        className="absolute -bottom-[300px] -left-[300px] w-[900px] h-[900px] rounded-full"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          // Removed blur filter - html2canvas renders it poorly
        }}
      />

      {/* Content Container */}
      <div
        id="share-content"
        className="flex flex-col items-center justify-center z-[1] w-full h-full gap-[50px] px-20 box-border"
        style={{
          paddingTop: '60px',
          paddingBottom: '80px',
        }}
      >
        {/* Badge Icon/Emoji - Professional spacing */}
        <div
          className="text-[160px]"
          style={{
            filter: 'drop-shadow(0 0 40px rgba(255, 255, 255, 0.6))',
            marginBottom: '20px',
          }}
        >
          🎉
        </div>

        {/* Achievement Text */}
        <h1
          className="text-[72px] font-extrabold text-center leading-[1.1] m-0 px-5 break-words w-full box-border"
          style={{
            color: '#ffffff',
            letterSpacing: '-2px',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          Achievement Unlocked!
        </h1>

        {/* Badge Name */}
        <h2
          className="text-[64px] font-bold text-center leading-[1.2] m-0 px-5 break-words w-full box-border"
          style={{
            color: '#ffffff',
            letterSpacing: '-1px',
            textShadow: '0 2px 15px rgba(0, 0, 0, 0.2)',
          }}
        >
          {badge.name}
        </h2>

        {/* Description */}
        <p
          className="text-[40px] text-center m-0 px-5 break-words w-full box-border font-normal"
          style={{
            color: '#ffffff',
            opacity: 0.95,
            lineHeight: '1.5',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          }}
        >
          {badge.description}
        </p>

        {/* Unlock Info Card - Professional design */}
        <div
          className="text-center rounded-[40px] px-24 py-[70px] border-2 max-w-[920px] w-full box-border"
          style={{
            background: 'rgba(255, 255, 255, 0.28)', // More opaque for better readability and professional look
            borderColor: 'rgba(255, 255, 255, 0.45)',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
          }}
        >
          <p
            className="text-[36px] mb-[30px] font-medium m-0 px-5 break-words w-full box-border"
            style={{
              color: '#ffffff',
              opacity: 0.95,
              letterSpacing: '0.5px',
            }}
          >
            Earned by completing:
          </p>
          <p
            className="text-[52px] font-bold mb-[25px] leading-[1.3] m-0 px-5 break-words w-full box-border"
            style={{
              color: '#ffffff',
              letterSpacing: '-1px',
            }}
          >
            {unlockInfo.project}
          </p>
          <p
            className="text-[38px] font-medium m-0 px-5 break-words w-full box-border"
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
          className="text-[32px] font-semibold"
          style={{
            color: '#ffffff',
            opacity: 0.9,
            letterSpacing: '2px',
            textShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
            marginTop: 'auto',
            paddingTop: '40px',
            paddingBottom: '20px',
          }}
        >
          DR Self Tapes
        </div>
      </div>
    </div>
  );
};
