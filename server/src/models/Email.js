const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  address: { type: String, required: true }
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  filename: String,
  mimetype: String,
  size: Number,
  path: String
}, { _id: false });

const emailSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  messageId: { type: String, default: '' },
  folder: {
    type: String,
    enum: ['inbox', 'sent', 'drafts', 'spam', 'trash', 'archive', 'starred'],
    default: 'inbox',
    index: true
  },
  from: { type: addressSchema, required: true },
  to: { type: [addressSchema], default: [] },
  cc: { type: [addressSchema], default: [] },
  bcc: { type: [addressSchema], default: [] },
  subject: { type: String, default: '(No Subject)' },
  bodyHtml: { type: String, default: '' },
  bodyText: { type: String, default: '' },
  attachments: { type: [attachmentSchema], default: [] },
  labels: { type: [String], default: [] },
  isRead: { type: Boolean, default: false, index: true },
  isStarred: { type: Boolean, default: false },
  isScheduled: { type: Boolean, default: false },
  scheduledAt: { type: Date, default: null },
  threadId: { type: String, default: '' },
  receivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Full-text search index
emailSchema.index({ subject: 'text', bodyText: 'text', 'from.address': 'text', 'from.name': 'text' });
// Compound index for common queries
emailSchema.index({ userId: 1, folder: 1, createdAt: -1 });
emailSchema.index({ userId: 1, isStarred: 1 });
emailSchema.index({ userId: 1, threadId: 1 });

module.exports = mongoose.model('Email', emailSchema);
