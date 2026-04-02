const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, default: '' },
  participants: [{
    name: { type: String, default: '' },
    address: { type: String, required: true },
    _id: false
  }],
  emailIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
  lastActivity: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

threadSchema.index({ userId: 1, lastActivity: -1 });

module.exports = mongoose.model('Thread', threadSchema);
