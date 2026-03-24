require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

console.log('Intentando conectar a:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI, { 
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000 
})
  .then(() => {
    console.log('¡CONEXIÓN EXITOSA!');
    process.exit(0);
  })
  .catch(err => {
    console.error('ERROR DE CONEXIÓN:', err.message);
    if (err.reason) console.error('Razon:', err.reason);
    process.exit(1);
  });
