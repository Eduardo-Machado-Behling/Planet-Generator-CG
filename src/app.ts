import {calculateArea} from './utils.js';

const appDiv = document.getElementById('app');

if (appDiv) {
  const radius = 20;
  const area = calculateArea(radius);

  appDiv.innerHTML = `
        <p>The area of a circle with radius ${radius} is 
        <strong>${area.toFixed(2)}</strong></p>
    `;
}