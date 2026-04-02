import { createContext, useContext, useReducer, useCallback } from 'react'
import { emailAPI } from '../api'

const EmailContext = createContext(null)

const initialState = {
  emails: [],
  activeEmail: null,
  activeAccount: 'all',
  total: 0,
  page: 1,
  pages: 1,
  loading: false,
  unreadCount: 0,
  folder: 'inbox',
  composeOpen: false,
  composeDraft: { to: [], cc: [], bcc: [], subject: '', bodyHtml: '', bodyText: '', attachments: [] },
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload }
    case 'SET_EMAILS': return { ...state, emails: action.payload.emails, total: action.payload.total, pages: action.payload.pages, unreadCount: action.payload.unreadCount ?? state.unreadCount, loading: false }
    case 'SET_FOLDER': return { ...state, folder: action.payload, activeEmail: null, page: 1 }
    case 'SET_ACCOUNT': return { ...state, activeAccount: action.payload, activeEmail: null }
    case 'SET_PAGE': return { ...state, page: action.payload }
    case 'SET_ACTIVE': return { ...state, activeEmail: action.payload }
    case 'UPDATE_EMAIL': return { ...state, emails: state.emails.map(e => e._id === action.payload._id ? action.payload : e), activeEmail: state.activeEmail?._id === action.payload._id ? action.payload : state.activeEmail }
    case 'REMOVE_EMAIL': return { ...state, emails: state.emails.filter(e => e._id !== action.payload), activeEmail: state.activeEmail?._id === action.payload ? null : state.activeEmail }
    case 'OPEN_COMPOSE': return { ...state, composeOpen: true, composeDraft: action.payload ?? state.composeDraft }
    case 'CLOSE_COMPOSE': return { ...state, composeOpen: false, composeDraft: initialState.composeDraft }
    case 'SET_DRAFT': return { ...state, composeDraft: { ...state.composeDraft, ...action.payload } }
    case 'SET_UNREAD': return { ...state, unreadCount: action.payload }
    default: return state
  }
}

export function EmailProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const fetchEmails = useCallback(async (folder, page = 1) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const res = await emailAPI.list({ folder, page, limit: 20 })
      dispatch({ type: 'SET_EMAILS', payload: res.data })
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const openEmail = useCallback(async (email) => {
    dispatch({ type: 'SET_ACTIVE', payload: email })
    if (!email.isRead) {
      try {
        const res = await emailAPI.update(email._id, { isRead: true })
        dispatch({ type: 'UPDATE_EMAIL', payload: res.data.email })
        dispatch({ type: 'SET_UNREAD', payload: Math.max(0, state.unreadCount - 1) })
      } catch (_) {}
    }
  }, [state.unreadCount])

  const starEmail = useCallback(async (id, isStarred) => {
    try {
      const res = await emailAPI.update(id, { isStarred })
      dispatch({ type: 'UPDATE_EMAIL', payload: res.data.email })
    } catch (_) {}
  }, [])

  const moveEmail = useCallback(async (id, folder) => {
    try {
      const res = await emailAPI.update(id, { folder })
      dispatch({ type: 'REMOVE_EMAIL', payload: id })
    } catch (_) {}
  }, [])

  const deleteEmail = useCallback(async (id) => {
    try {
      await emailAPI.delete(id)
      dispatch({ type: 'REMOVE_EMAIL', payload: id })
    } catch (_) {}
  }, [])

  return (
    <EmailContext.Provider value={{ ...state, dispatch, fetchEmails, openEmail, starEmail, moveEmail, deleteEmail }}>
      {children}
    </EmailContext.Provider>
  )
}

export const useEmail = () => useContext(EmailContext)
