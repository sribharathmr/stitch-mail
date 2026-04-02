const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String }, // Optional for Google users
  googleId: { type: String, unique: true, sparse: true },
  googleTokens: {
    accessToken: String,
    refreshToken: String,
    expiryDate: Number
  },
  avatar: { type: String, default: '' },
  signature: {
    text: { type: String, default: '' },
    name: { type: String, default: '' },
    title: { type: String, default: '' }
  },
  preferences: {
    theme: { type: String, enum: ['light', 'deep-space', 'system'], default: 'light' },
    smartNotifications: { type: Boolean, default: true },
    threadGrouping: { type: Boolean, default: false },
    compactView: { type: Boolean, default: true }
  },
  imapConfig: {
    host: String,
    port: { type: Number, default: 993 },
    user: String,
    pass: String,
    tls: { type: Boolean, default: true }
  },
  smtpConfig: {
    host: String,
    port: { type: Number, default: 587 },
    user: String,
    pass: String
  }
}, { timestamps: true });

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.imapConfig;
  delete obj.smtpConfig;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
