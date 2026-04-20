import React from 'react'
import './Loaders.css'

/** 
 * Skeleton loader for inbox layout.
 * Shows an avatar and two lines of text mimicking email rows.
 */
export const SkeletonInboxLoader = ({ count = 8 }) => {
  return (
    <div className="skeleton-inbox-loader">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="skeleton-avatar" />
          <div className="skeleton-content">
            <div className="skeleton-line-top" />
            <div className="skeleton-line-bottom" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Three bouncing, glass-blurred pills for contextual loading states.
 */
export const GlassPulseLoader = ({ message = "Loading..." }) => {
  return (
    <div className="glass-pulse-loader-container">
      <div className="glass-pulse-loader">
        <div className="glass-pill" />
        <div className="glass-pill" />
        <div className="glass-pill" />
      </div>
      {message && <span className="glass-pulse-message">{message}</span>}
    </div>
  )
}

/**
 * A highly branded initial startup sequence loader.
 * Employs animated SVG drawing (stitching) of an envelope.
 */
export const BrandedStitchLoader = ({ message = "Stitching your inbox..." }) => {
  return (
    <div className="branded-stitch-loader">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stitch-envelope-svg"
      >
        <path d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" className="stitch-path" />
        <rect x="3" y="5" width="18" height="14" rx="2" className="stitch-path" />
      </svg>
      {message && <div className="stitch-loader-message">{message}</div>}
    </div>
  )
}
