import Script from 'next/script'

/**
 * BookingWidget component
 * Embeds a Tally form via iframe with styling optimized for the DeeTwin chatbot.
 */
export const BookingWidget = ({ formUrl }: { formUrl: string }) => {
  // Convert standard /r/ links to /embed/ links automatically for iframe compatibility
  let safeUrl = formUrl
  if (safeUrl.includes('tally.so/r/')) {
    safeUrl = safeUrl.replace('tally.so/r/', 'tally.so/embed/')
  }

  // Ensure the URL has the necessary parameters for transparency and dynamic height
  const enhancedUrl = safeUrl.includes('?') 
    ? `${safeUrl}&transparentBackground=1&dynamicHeight=1`
    : `${safeUrl}?transparentBackground=1&dynamicHeight=1`;

  return (
    <>
      <Script src="https://tally.so/widgets/embed.js" strategy="afterInteractive" />
      <div className="w-full overflow-hidden rounded-2xl border border-[#1f2937] bg-[#0a0a0a] animate-in fade-in zoom-in duration-300">
        <iframe
          src={enhancedUrl}
          width="100%"
          height="500" // Default height, Tally script will override if successful
          frameBorder="0"
          title="DeeTwin Booking Form"
          className="w-full"
          data-tally-layout="inset"
        ></iframe>
      </div>
    </>
  );
};

export default BookingWidget;
