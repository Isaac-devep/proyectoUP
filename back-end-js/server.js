require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// REGISTRO DE TODAS LAS PETICIONES (DEBUG)
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('¡Conexión exitosa a MongoDB!'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));

// Routes
app.use('/', require('./routes/auth')); // This will handle /login
app.get('/', (req, res) => res.send('API de ProyectoUP (Node.js) funcionando'));
app.use('/productos', require('./routes/products'));
app.use('/fds', require('./routes/fds'));
app.use('/recipientes', require('./routes/recipients'));
app.use('/frasesh', require('./routes/phrasesh'));
app.use('/frasesp', require('./routes/phrasesp'));
app.use('/pictogramas', require('./routes/pictograms'));
app.use('/etiquetas', require('./routes/labels'));
app.use('/usuarios', require('./routes/users'));
app.use('/extract_pdf_data', require('./routes/pdf'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR:", err.stack);
  res.status(500).json({ 
    error: "Internal Server Error (Global)", 
    detail: err.message 
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Servidor Node.js corriendo en puerto ${PORT}`);
});
