const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');

const filePath = path.join(__dirname, 'back-end-js/assets/7._DIABLO_ROJO-9334222.pdf');
const dataBuffer = fs.readFileSync(filePath);

pdfParse(dataBuffer).then(function(data) {
    fs.writeFileSync('tmp_diablo_text.txt', data.text);
    console.log('File written to tmp_diablo_text.txt');
}).catch(err => {
    console.error('Error:', err);
});
