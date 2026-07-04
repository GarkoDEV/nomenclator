const assert = require('assert');

const fs = require('fs');
const path = require('path');

const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

assert(script.includes('updateThemeButton'), 'Falta la función para actualizar el botón de tema');
assert(script.includes('document.documentElement.setAttribute("data-theme", normalizedTheme)'), 'No se está aplicando el atributo de tema al documento');
assert(script.includes('this.themeButton.setAttribute("aria-pressed"'), 'No se actualiza el estado accesible del botón');

console.log('Prueba de tema: OK');
