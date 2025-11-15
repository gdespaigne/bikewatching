// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1IjoiZ2Rlc3BhaWduZS11Y3NkIiwiYSI6ImNtaHpzbzB6bDB0MDQyam9pejdmYWVlN2cifQ.3kCscqIr4QQa4P6cYKncgg';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/gdespaigne-ucsd/cmhzvyt3a006i01r65lizawq7',
    center: [-71.09415, 42.36027],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18
  });
  