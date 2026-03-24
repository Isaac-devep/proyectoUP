const mongoose = require('mongoose');

const FDSSchema = new mongoose.Schema({
  id_fds: { type: String, required: true, unique: true },
  proveedor: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('FDS', FDSSchema);
