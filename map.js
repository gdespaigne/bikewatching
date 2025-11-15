import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

mapboxgl.accessToken = 'pk.eyJ1IjoiZ2Rlc3BhaWduZS11Y3NkIiwiYSI6ImNtaHpzbzB6bDB0MDQyam9pejdmYWVlN2cifQ.3kCscqIr4QQa4P6cYKncgg';

const INPUT_BLUEBIKES_JSON_URL =
  'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/gdespaigne-ucsd/cmhzvyt3a006i01r65lizawq7',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

let svg;

function getCoords(station) {
  const point = new mapboxgl.LngLat(station.lon, station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

map.on('load', async () => {
  svg = d3.select('#map').select('svg');
  if (svg.empty()) {
    svg = d3.select('#map').append('svg');
  }

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .style('position', 'absolute')
    .style('top', 0)
    .style('left', 0)
    .style('z-index', 1)
    .style('pointer-events', 'none');

  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': 'green',
      'line-width': 2,
      'line-opacity': 0.4,
    },
  });

  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  map.addLayer({
    id: 'cambridge-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': 'gold',
      'line-width': 2,
      'line-opacity': 0.4,
    },
  });

  let stations = [];
  try {
    const jsonData = await d3.json(INPUT_BLUEBIKES_JSON_URL);
    const rawStations = jsonData.data.stations || [];

    stations = rawStations
      .map((s) => {
        const lon = parseFloat(
          s.lon ?? s.Long ?? s.lng ?? s.longitude ?? s.Longitude
        );
        const lat = parseFloat(
          s.lat ?? s.Lat ?? s.latitude ?? s.Latitude
        );
        return { ...s, lon, lat };
      })
      .filter((s) => Number.isFinite(s.lon) && Number.isFinite(s.lat));

    console.log('Stations loaded (valid coords):', stations.length);
    if (stations[0]) {
      console.log('First station example:', stations[0]);
    }
  } catch (err) {
    console.error('Error loading stations JSON:', err);
  }

  const circles = svg
    .selectAll('circle')
    .data(stations)
    .enter()
    .append('circle')
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('opacity', 0.7);

  function updatePositions() {
    circles
      .attr('cx', (d) => getCoords(d).cx)
      .attr('cy', (d) => getCoords(d).cy);
  }

  updatePositions();

  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);
});
