"use client";

function normalizeCoverLetterContent(content) {
  return String(content || "")
    .replace(/\r\n/g, "\n")
    .replace(/```(?:markdown)?\n?/gi, "")
    .replace(/```/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const CoverLetterPreview = ({ content }) => {
  const normalizedContent = normalizeCoverLetterContent(content);

  return (
    <div className="py-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010] p-4 md:p-6">
        <div className="mx-auto w-full max-w-5xl rounded-xl border border-slate-300 bg-white p-6 md:p-10">
          <div className="mx-auto max-w-[920px] overflow-x-auto">
            <div className="[font-family:Georgia,'Times_New_Roman',serif] text-[15px] leading-8 text-slate-900 whitespace-pre-wrap break-words">
              {normalizedContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterPreview;
