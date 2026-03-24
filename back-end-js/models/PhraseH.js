const mongoose = require('mongoose');

const PhraseHSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  descripcion: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('PhraseH', PhraseHSchema);
