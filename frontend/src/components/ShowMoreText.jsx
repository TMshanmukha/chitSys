import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Reusable ShowMoreText Component
 * Gracefully truncates long paragraphs/notes with an inline/block Show More/Show Less toggle.
 */
export default function ShowMoreText({
  text = '',
  maxChars = 75,
  className = '',
  asBlock = false,
}) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;
  if (text.length <= maxChars) {
    return <span className={className}>{text}</span>;
  }

  const displayText = expanded ? text : `${text.slice(0, maxChars)}...`;

  return (
    <span className={`${asBlock ? 'block' : 'inline'} ${className}`}>
      <span>{displayText} </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold cursor-pointer underline text-[11px] ml-1 transition-colors"
      >
        {expanded ? (
          <>
            <span>Show less</span>
            <ChevronUp className="w-3 h-3" />
          </>
        ) : (
          <>
            <span>Show more</span>
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>
    </span>
  );
}
