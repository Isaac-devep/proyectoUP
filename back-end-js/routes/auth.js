const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Login
router.post('/login', async (req, res) => {
  try {
    const { usu, contra } = req.body;
    const user = await User.findOne({ usu });
    
    if (user) {
      // First try bcrypt compare (for hashed passwords)
      let isMatch = await bcrypt.compare(contra, user.contra);
      
      // Fallback for legacy plain-text passwords (only for initial migration)
      if (!isMatch && contra === user.contra) {
        isMatch = true;
      }

      if (isMatch) {
        if (user.estado !== 'activo' && user.estado !== 'active') {
          return res.json({ login: false, error: "Usuario inactivo" });
        }
        
        return res.json({
          login: true,
          usuario: {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            rol: user.id_rol,
            id_rol: user.id_rol
          }
        });
      }
    }
    
    return res.json({ login: false, error: "Credenciales incorrectas" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
