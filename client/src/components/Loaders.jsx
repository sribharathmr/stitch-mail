import React from 'react'
import './Loaders.css'

/** 
 * Skeleton loader for inbox layout.
 * Rows shimmer with a dramatic purple gradient sweep and stagger in.
 */
export const SkeletonInboxLoader = ({ count = 10 }) => {
  return (
    <div className="skeleton-inbox-loader">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row">
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
 * Three animated glow pillars for contextual loading states.
 */
export const GlassPulseLoader = ({ message = 'Loading...' }) => {
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
 * Full-screen premium startup loader.
 * A spinning conic gradient halo orbits around a glowing envelope SVG.
 */
export const BrandedStitchLoader = ({ message = 'Stitching your inbox...' }) => {
  return (
    <div className="branded-stitch-loader">
      <div className="stitch-glow-ring">
        <svg
          width="52"
          height="52"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stitch-envelope-svg"
        >
          {/* SVG gradient definition */}
          <defs>
            <linearGradient id="stitchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#c4b5fd" />
              <stop offset="50%"  stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6C67C7" />
            </linearGradient>
          </defs>
          {/* Envelope body */}
          <rect x="2" y="4" width="20" height="16" rx="2" className="stitch-path" />
          {/* Envelope flap/V line */}
          <path d="M2 7l10 7 10-7" className="stitch-path" />
        </svg>
      </div>

      <div className="stitch-loader-brand">
        <div className="stitch-loader-title">Stitch Mail</div>
        <div className="stitch-loader-message">{message}</div>
      </div>
    </div>
  )
}
