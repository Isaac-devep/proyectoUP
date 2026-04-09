require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB...');

    const janeris = {
      id_usuario: '999888777',
      usu: 'janeris',
      contra: 'janeris2024', // Contraseña provisional
      correo: 'janeris@example.com',
      nombre: 'Janeris',
      apellido: 'Admin',
      id_rol: 'Administrador',
      estado: 'activo'
    };

    const existing = await User.findOne({ usu: 'janeris' });
    if (existing) {
      console.log('El usuario janeris ya existe.');
    } else {
      await User.create(janeris);
      console.log('Usuario janeris (Admin) creado con éxito.');
      console.log('Usuario: janeris');
      console.log('Contraseña: janeris2024');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error creando el usuario:', err);
    process.exit(1);
  }
};

createAdmin();
