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

  // Safely normalize any input (string, Buffer, array, number) to clean string
  let safeText = '';
  if (typeof text === 'string') {
    safeText = text;
  } else if (text && typeof text === 'object') {
    if (text.type === 'Buffer' && Array.isArray(text.data)) {
      try {
        safeText = new TextDecoder().decode(new Uint8Array(text.data));
      } catch {
        safeText = String.fromCharCode(...text.data);
      }
    } else if (Array.isArray(text)) {
      safeText = text.filter(Boolean).join(', ');
    } else {
      safeText = String(text);
    }
  } else if (text !== null && text !== undefined) {
    safeText = String(text);
  }

  safeText = safeText.trim();
  if (!safeText) return null;

  if (safeText.length <= maxChars) {
    return <span className={className}>{safeText}</span>;
  }

  const displayText = expanded ? safeText : `${safeText.slice(0, maxChars)}...`;

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
