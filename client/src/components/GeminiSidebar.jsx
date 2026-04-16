import { useUI } from '../context/UIContext'
import './GeminiSidebar.css'

export default function GeminiSidebar() {
  const { geminiSidebarOpen, setGeminiSidebarOpen } = useUI()

  if (!geminiSidebarOpen) return null

  return (
    <div className="gemini-sidebar">
      <div className="gemini-header">
        <button className="gemini-hamburger btn-icon" onClick={() => setGeminiSidebarOpen(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <span className="gemini-title">Gemini</span>
        <button className="gemini-close btn-icon" onClick={() => setGeminiSidebarOpen(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="gemini-content">
        <div className="gemini-greeting">
          Find information
        </div>
      </div>

      <div className="gemini-footer">
        <div className="gemini-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>What can Gemini do in Gmail</span>
        </div>
        <div className="gemini-input-wrapper">
          <button className="gemini-input-action">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <input type="text" className="gemini-input" placeholder="Ask Gemini" />
          <button className="gemini-input-submit disabled">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-8 8h6v8h4v-8h6z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
