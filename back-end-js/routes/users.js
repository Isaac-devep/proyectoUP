const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json({ usuarios: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user state
router.patch('/:id_usuario/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    await User.findOneAndUpdate({ id_usuario: req.params.id_usuario }, { estado });
    res.json({ mensaje: "Estado actualizado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user (insertarusuarios)
router.post('/insertarusuarios', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.json({ mensaje: "Usuario registrado correctamente" });
  } catch (err) {
    console.error("Error creando usuario:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update full user profile
router.put('/:id_usuario', async (req, res) => {
  try {
    const { contra, ...updateData } = req.body;
    
    // If password is provided, we need to find the user first to trigger the pre-save hook 
    // or manually hash it. Using findOne + save is safest for the bcrypt hook.
    const user = await User.findOne({ id_usuario: req.params.id_usuario });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // Update fields
    Object.keys(updateData).forEach(key => {
        user[key] = updateData[key];
    });

    if (contra && contra.trim() !== "") {
        user.contra = contra;
    }

    await user.save();
    res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (err) {
    console.error("Error actualizando usuario:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    await User.findOneAndDelete({ id_usuario: req.params.id });
    res.json({ mensaje: "Usuario eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
