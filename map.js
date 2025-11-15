import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

mapboxgl.accessToken =
  'pk.eyJ1IjoiZ2Rlc3BhaWduZS11Y3NkIiwiYSI6ImNtaHpzbzB6bDB0MDQyam9pejdmYWVlN2cifQ.3kCscqIr4QQa4P6cYKncgg';

const STATIONS_URL =
  'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

const TRAFFIC_URL =
  'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/gdespaigne-ucsd/cmhzvyt3a006i01r65lizawq7',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

let svg;

// ---- helper functions (Step 5.2 + 5.3) ----

function formatTime(minutes) {
  if (minutes < 0) return '';
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterTripsByTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips
    : trips.filter((trip) => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id
  );

  return stations.map((station) => {
    const id = station.short_name;
    const arr = arrivals.get(id) ?? 0;
    const dep = departures.get(id) ?? 0;
    const total = arr + dep;
    return {
      ...station,
      arrivals: arr,
      departures: dep,
      totalTraffic: total,
    };
  });
}

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
  let trips = [];

  try {
    const stationsJson = await d3.json(STATIONS_URL);
    const rawStations = stationsJson.data.stations || [];

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
  } catch (err) {
    console.error('Error loading stations JSON:', err);
  }

  try {
    trips = await d3.csv(TRAFFIC_URL, (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    });
  } catch (err) {
    console.error('Error loading traffic CSV:', err);
  }

  stations = computeStationTraffic(stations, trips);

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);

  const circles = svg
    .selectAll('circle')
    .data(stations, (d) => d.short_name)
    .enter()
    .append('circle')
    .attr('fill', 'steelblue')
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('fill-opacity', 0.6)
    .attr('pointer-events', 'auto')
    .attr('r', (d) => radiusScale(d.totalTraffic))
    .each(function (d) {
      d3
        .select(this)
        .append('title')
        .text(
          `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
        );
    });

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

  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTimeLabel = document.getElementById('any-time');

  function updateScatterPlot(timeFilter) {
    const filteredTrips = filterTripsByTime(trips, timeFilter);
    const filteredStations = computeStationTraffic(stations, filteredTrips);

    if (timeFilter === -1) {
      radiusScale.range([0, 25]);
    } else {
      radiusScale.range([3, 50]);
    }

    circles
      .data(filteredStations, (d) => d.short_name)
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .each(function (d) {
        d3
          .select(this)
          .select('title')
          .text(
            `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
          );
      });
  }

  function updateTimeDisplay() {
    const timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      selectedTime.textContent = '';
      anyTimeLabel.style.display = 'block';
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = 'none';
    }

    updateScatterPlot(timeFilter);
  }

  timeSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();
});
