const mongoose = require('mongoose');
const Label = require('./models/Label');
const Product = require('./models/Product');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://proyectoup:proyecto123@ac-ah07dtq-shard-00-00.3kjgn9u.mongodb.net:27017/proyecto?ssl=true&authSource=admin&retryWrites=true";

const inventory = [
  // Gases Inflamables (Clase 2.1)
  { nombre: "Propano", clase: "2.1", pictos: ["gas", "inflamable"], adv: "PELIGRO" },
  { nombre: "Gas Licuado de Petróleo (GLP)", clase: "2.1", pictos: ["gas", "inflamable"], adv: "PELIGRO" },
  { nombre: "Butano", clase: "2.1", pictos: ["gas", "inflamable"], adv: "PELIGRO" },

  // Gases No Inflamables (Clase 2.2)
  { nombre: "Refrigerante Freon-22 (R-22)", clase: "2.2", pictos: ["gas"], adv: "ATENCIÓN" },
  { nombre: "Gas Refrigerante 410A", clase: "2.2", pictos: ["gas"], adv: "ATENCIÓN" },

  // Líquidos Altamente Inflamables (Clase 3)
  { nombre: "Thinner (Kontakt Chemie)", clase: "3", pictos: ["inflamable", "exclamacion"], adv: "PELIGRO" },
  { nombre: "Soldadura PVC (Gerfor)", clase: "3", pictos: ["inflamable", "exclamacion"], adv: "PELIGRO" },
  { nombre: "Clean Pipe / Limpiador", clase: "3", pictos: ["inflamable"], adv: "PELIGRO" },
  { nombre: "Desengrasante Industrial No. 1", clase: "3", pictos: ["inflamable"], adv: "PELIGRO" },
  { nombre: "Pintura Epóxica Base Solvente", clase: "3", pictos: ["inflamable", "exclamacion"], adv: "PELIGRO" },
  { nombre: "Gasolina Regular", clase: "3", pictos: ["inflamable", "exclamacion"], adv: "PELIGRO" },
  { nombre: "Esmalte Sintético", clase: "3", pictos: ["inflamable"], adv: "PELIGRO" },
  { nombre: "Anticorrosivo", clase: "3", pictos: ["inflamable"], adv: "PELIGRO" },

  // Oxidantes (Clase 5.1)
  { nombre: "Hipoclorito de Sodio", clase: "5.1", pictos: ["comburente", "corrosivo"], adv: "PELIGRO" },

  // Corrosivos Básicos (Clase 8)
  { nombre: "Diablo Rojo (Potasa/Soda)", clase: "8", pictos: ["corrosivo"], adv: "PELIGRO" },
  { nombre: "Soda Cáustica (Trichem)", clase: "8", pictos: ["corrosivo"], adv: "PELIGRO" },
  { nombre: "Evap Clean", clase: "8", pictos: ["corrosivo"], adv: "PELIGRO" },
  { nombre: "Desengrasante HS-CC-308", clase: "8", pictos: ["corrosivo"], adv: "ATENCIÓN" },
  { nombre: "Neutral Disinfectant Cleaner", clase: "8", pictos: ["exclamacion"], adv: "ATENCIÓN" },

  // Bajo Riesgo (Clase 9)
  { nombre: "Jabón Líquido", clase: "9", pictos: [], adv: "N/A" },
  { nombre: "Cera Emulsionada", clase: "9", pictos: [], adv: "N/A" },
  { nombre: "Limpia Vidrios", clase: "9", pictos: [], adv: "N/A" },
  { nombre: "Detergente en Polvo (PQP)", clase: "9", pictos: [], adv: "N/A" },
  { nombre: "Aceite Dolyn", clase: "9", pictos: [], adv: "N/A" },
  { nombre: "Ambientador", clase: "9", pictos: [], adv: "N/A" }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado para subir productos...");

    for (const item of inventory) {
      const labelId = item.nombre.replace(/\s+/g, '-').toLowerCase() + "-" + Date.now();
      
      // Frases por defecto según el tipo de producto
      let defaultH = ["H225: Líquido y vapores muy inflamables"];
      let defaultP = ["P102: Mantener fuera del alcance de los niños.", "P210: Mantener alejado del calor y chispas."];

      if (item.clase === "2.1") {
        defaultH = ["H220: Gas extremadamente inflamable", "H280: Contiene gas a presión"];
      } else if (item.clase === "8") {
        defaultH = ["H314: Provoca quemaduras graves en la piel y lesiones oculares"];
      } else if (item.clase === "9") {
        defaultH = ["H315: Provoca irritación cutánea"];
      }

      await Label.create({
        id_etiqueta: labelId,
        p_advertencia: item.adv,
        inf_cas: "Inventario-SGA",
        id_producto: item.nombre,
        frases_h: defaultH,
        frases_p: defaultP,
        pictogramas: item.pictos,
        emergencia: "123 (Bomberos) / CISPROQUIM"
      });
      console.log(`Subido: ${item.nombre}`);
    }

    console.log("¡TODOS LOS PRODUCTOS SUBIDOS CON ÉXITO!");
    process.exit(0);
  } catch (err) {
    console.error("Error subiendo productos:", err);
    process.exit(1);
  }
}

seed();
