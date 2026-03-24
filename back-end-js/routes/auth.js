const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login
router.post('/login', async (req, res) => {
  try {
    const { usu, contra } = req.body;
    const user = await User.findOne({ usu, contra });
    
    if (user) {
      if (user.estado !== 'activo' && user.estado !== 'active') {
        return res.json({ login: false, error: "Usuario inactivo" });
      }
      
      return res.json({
        login: true,
        usuario: {
          id_usuario: user.id_usuario,
          nombre: user.nombre,
          apellido: user.apellido,
          rol: user.id_rol, // The frontend expects 'rol' for the switch case
          id_rol: user.id_rol // And also uses id_rol for localStorage
        }
      });
    } else {
      return res.json({ login: false, error: "Credenciales incorrectas" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
