'use client'

/**
 * BookingWidget component
 * Embeds a Tally form via iframe with styling optimized for the DeeTwin chatbot.
 */
export const BookingWidget = ({ formUrl }: { formUrl: string }) => {
  // Ensure the URL has the necessary parameters for transparency and dynamic height
  const enhancedUrl = formUrl.includes('?') 
    ? `${formUrl}&transparentBackground=1&dynamicHeight=1`
    : `${formUrl}?transparentBackground=1&dynamicHeight=1`;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#1f2937] bg-[#0a0a0a] animate-in fade-in zoom-in duration-300">
      <iframe
        src={enhancedUrl}
        width="100%"
        height="500" // Default height, Tally script can handle dynamic height if included
        frameBorder="0"
        title="DeeTwin Booking Form"
        className="w-full"
      ></iframe>
    </div>
  );
};

export default BookingWidget;
