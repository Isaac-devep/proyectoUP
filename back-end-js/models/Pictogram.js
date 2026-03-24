const mongoose = require('mongoose');

const PictogramSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  imagen: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Pictogram', PictogramSchema);
