const mongoose = require('mongoose');

const PhrasePSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  descripcion: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('PhraseP', PhrasePSchema);
