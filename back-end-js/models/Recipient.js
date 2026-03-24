const mongoose = require('mongoose');

const RecipientSchema = new mongoose.Schema({
  id_recipiente: { type: String, required: true, unique: true },
  tipo: { type: String, required: true },
  tamaño: { type: Number, required: true },
  id_etiqueta: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Recipient', RecipientSchema);
