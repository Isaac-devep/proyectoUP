const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  id_usuario: { type: String, required: true, unique: true },
  usu: { type: String, required: true },
  contra: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  id_rol: { type: String, required: true, enum: ['Super administrador', 'Administrador', 'Empleado'] },
  estado: { type: String, default: 'activo' }
}, { timestamps: true });

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('contra')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.contra = await bcrypt.hash(this.contra, salt);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('User', UserSchema);
