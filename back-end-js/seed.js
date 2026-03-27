require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB para el sembrado...');

    const users = [
      { id_usuario: '1014152276', usu: 'Gaby.', contra: 'saramajo', correo: 'gaby@gmail.com', nombre: 'Gabriela', apellido: 'Yela', id_rol: 'Colaborador', estado: 'activo' },
      { id_usuario: '123123123', usu: 'admin', contra: 'admin', correo: 'admin@admin.com', nombre: 'cristian', apellido: 'albor', id_rol: 'Administrador', estado: 'activo' },
      { id_usuario: '12317777', usu: 'emp', contra: 'emp', correo: 'empleado@gmail.com', nombre: 'hola', apellido: 'hola', id_rol: 'Colaborador', estado: 'activo' },
      { id_usuario: '12345', usu: 'cralbor', contra: 'imthebest', correo: 'calborparra@gmail.com', nombre: 'Cristian', apellido: 'Albor', id_rol: 'Super administrador', estado: 'active' },
      { id_usuario: '23123213213', usu: 'ejemplo', contra: 'ejemplo', correo: 'ejemplo@gmail.com', nombre: 'ejemplo', apellido: 'hola', id_rol: 'Administrador', estado: 'activo' }
    ];

    for (const u of users) {
      await User.findOneAndUpdate({ id_usuario: u.id_usuario }, u, { upsert: true, new: true });
    }

    console.log('Usuarios sembrados correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error sembrando usuarios:', err);
    process.exit(1);
  }
};

seedUsers();
