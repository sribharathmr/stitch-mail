import React, { useState, useMemo } from 'react';
import { getToken } from '../api';

const EmailBodyRenderer = ({ bodyHtml, bodyText }) => {
  const [showQuote, setShowQuote] = useState(false);

  // Transform HTML to inject auth token into inline attachment image URLs
  const processedHtml = useMemo(() => {
    if (!bodyHtml) return '';
    const token = getToken();
    if (!token) return bodyHtml;
    // Add ?token= to /api/emails/.../attachments/... URLs that don't already have it
    return bodyHtml.replace(
      /(src=["'])(\/api\/emails\/[^"']*\/attachments\/[^"'?]*)(["'])/gi,
      (match, prefix, url, suffix) => `${prefix}${url}?token=${token}${suffix}`
    );
  }, [bodyHtml]);

  if (processedHtml) {
    return (
      <div className="email-body-renderer html-mode" dangerouslySetInnerHTML={{ __html: processedHtml }} />
    );
  }

  if (!bodyText) return null;

  // Process plain text to handle `> ` quotes and `--- Forwarded Message ---` blocks
  const lines = bodyText.split('\n');
  const renderedElements = [];
  
  let currentParagraph = [];
  let currentQuote = [];
  
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      renderedElements.push(
        <p key={renderedElements.length} className="body-text-p">
          {currentParagraph.join('\n')}
        </p>
      );
      currentParagraph = [];
    }
  };

  const flushQuote = () => {
    if (currentQuote.length > 0) {
      renderedElements.push(
        <div key={renderedElements.length} className="body-quote-block">
          <div className="quote-indicator"></div>
          <div className="quote-content">
            {currentQuote.map((line, idx) => <p key={idx}>{line}</p>)}
          </div>
        </div>
      );
      currentQuote = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for forwarded message headers
    const forwardedMatch = line.match(/--- Forwarded Message ---|-+ Forwarded message -+/i);
    if (forwardedMatch) {
      flushParagraph();
      flushQuote();
      renderedElements.push(
        <div key={renderedElements.length} className="forwarded-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 014-4h12"/>
          </svg>
          <span>Forwarded Message</span>
        </div>
      );
      continue;
    }

    // Check for quoted lines
    if (line.trim().startsWith('>')) {
      flushParagraph();
      currentQuote.push(line.replace(/^>\s*/, ''));
    } else if (line.trim().match(/On .* wrote:/i)) {
      // "On Date, Name wrote:" standard reply header
      flushParagraph();
      flushQuote();
      renderedElements.push(
        <div key={renderedElements.length} className="reply-header-meta">
          {line.trim()}
        </div>
      );
    } else {
      flushQuote();
      currentParagraph.push(line);
    }
  }

  flushParagraph();
  flushQuote();

  // If there are many elements (e.g. long threads), maybe we can hide some behind a 'Show More' toggle.
  // Actually, wait, let's look at the rendered elements, if there's a big trail of quotes, we map them.
  // We can group all trailing quotes into a collapsible section if desired, but for now we'll just render it beautifully.

  return (
    <div className="email-body-renderer text-mode pre-wrap">
      {renderedElements}
    </div>
  );
};

export default EmailBodyRenderer;
