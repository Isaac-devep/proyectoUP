const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  id_producto: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  id_fds: { type: String, required: true },
  clase_ghs: { type: String, default: 'ND' }, // Clase GHS para matriz de compatibilidad
  peligrosidad: {
    inflamabilidad: Number,
    salud: Number,
    reactividad: Number,
    especifico: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
