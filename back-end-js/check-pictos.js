require('dotenv').config({ path: 'c:/Users/Isaac Florez/Desktop/proyectoUP/back-end-js/.env' });
const mongoose = require('mongoose');
const Label = require('c:/Users/Isaac Florez/Desktop/proyectoUP/back-end-js/models/Label');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const labels = await Label.find({}, 'id_producto pictogramas');
    console.log('--- LABELS PICTOGRAMS DATA ---');
    console.log(JSON.stringify(labels, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
