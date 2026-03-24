const mongoose = require('mongoose');

const LabelSchema = new mongoose.Schema({
  id_etiqueta: { type: String, required: true, unique: true },
  p_advertencia: { type: String, required: true },
  inf_cas: { type: String },
  fecha: { type: Date, default: Date.now },
  id_producto: { type: String, required: true },
  frases_h: [String],
  frases_p: [String],
  pictogramas: [String],
  emergencia: { type: String, default: "En caso de emergencia llame al 123" }
}, { timestamps: true });

module.exports = mongoose.model('Label', LabelSchema);
