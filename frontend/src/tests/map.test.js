import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CHENNAI_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  CHENNAI_METRO_BOUNDS,
  BASEMAP_PROVIDERS,
  getActiveBasemap,
  isValidCoordinate,
  formatCoordinates,
  haversineDistanceKm,
} from '../components/map/mapConfig.js';

import {
  LAYER_TYPES,
  LAYER_METADATA,
  CHENNAI_INFRASTRUCTURE_POINTS,
} from '../components/map/mapOverlays.js';

import {
  resolveLocationQuery,
  searchChennaiLocations,
  swapLocations,
  CHENNAI_LOCATION_CATALOG,
} from '../services/locationService.js';

test('Map Configuration: Default Chennai viewport matches CMA center and zoom', () => {
  assert.equal(DEFAULT_CHENNAI_CENTER[0], 13.0827);
  assert.equal(DEFAULT_CHENNAI_CENTER[1], 80.2707);
  assert.equal(DEFAULT_ZOOM, 12);
  assert.equal(MIN_ZOOM, 9);
  assert.equal(MAX_ZOOM, 18);

  // Check bounds envelop Chennai Metropolitan Area
  assert.ok(CHENNAI_METRO_BOUNDS[0][0] < DEFAULT_CHENNAI_CENTER[0]); // South boundary
  assert.ok(CHENNAI_METRO_BOUNDS[1][0] > DEFAULT_CHENNAI_CENTER[0]); // North boundary
  assert.ok(CHENNAI_METRO_BOUNDS[0][1] < DEFAULT_CHENNAI_CENTER[1]); // West boundary
  assert.ok(CHENNAI_METRO_BOUNDS[1][1] > DEFAULT_CHENNAI_CENTER[1]); // East boundary
});

test('Map Configuration: Basemap providers include Dark Matter, Voyager, and OSM with attribution', () => {
  const defaultBasemap = getActiveBasemap('DARK_MATTER');
  assert.equal(defaultBasemap.id, 'DARK_MATTER');
  assert.ok(defaultBasemap.url.includes('cartocdn.com'));
  assert.ok(defaultBasemap.attribution.includes('OpenStreetMap'));
  assert.ok(defaultBasemap.attribution.includes('CARTO'));

  const voyager = getActiveBasemap('VOYAGER');
  assert.equal(voyager.id, 'VOYAGER');
  assert.ok(voyager.url.includes('rastertiles/voyager'));

  const osm = getActiveBasemap('OSM_STANDARD');
  assert.equal(osm.id, 'OSM_STANDARD');
  assert.ok(osm.url.includes('tile.openstreetmap.org'));
});

test('Map Configuration: Mapbox basemap styles are defined with high-DPI scaling and attribution', () => {
  assert.ok(BASEMAP_PROVIDERS.MAPBOX_OUTDOORS);
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_OUTDOORS.id, 'MAPBOX_OUTDOORS');
  assert.ok(BASEMAP_PROVIDERS.MAPBOX_OUTDOORS.url.includes('api.mapbox.com'));
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_OUTDOORS.tileSize, 512);
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_OUTDOORS.zoomOffset, -1);
  assert.ok(BASEMAP_PROVIDERS.MAPBOX_OUTDOORS.attribution.includes('Mapbox'));

  assert.ok(BASEMAP_PROVIDERS.MAPBOX_SATELLITE);
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_SATELLITE.id, 'MAPBOX_SATELLITE');
  assert.ok(BASEMAP_PROVIDERS.MAPBOX_SATELLITE.url.includes('api.mapbox.com'));
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_SATELLITE.tileSize, 512);
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_SATELLITE.zoomOffset, -1);
  assert.ok(BASEMAP_PROVIDERS.MAPBOX_SATELLITE.attribution.includes('Mapbox'));

  assert.ok(BASEMAP_PROVIDERS.MAPBOX_DARK);
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_DARK.id, 'MAPBOX_DARK');
  assert.ok(BASEMAP_PROVIDERS.MAPBOX_DARK.url.includes('api.mapbox.com'));
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_DARK.tileSize, 512);
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_DARK.zoomOffset, -1);
  assert.ok(BASEMAP_PROVIDERS.MAPBOX_DARK.attribution.includes('Mapbox'));

  assert.ok(BASEMAP_PROVIDERS.MAPBOX_STREETS);
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_STREETS.id, 'MAPBOX_STREETS');
  assert.ok(BASEMAP_PROVIDERS.MAPBOX_STREETS.url.includes('api.mapbox.com'));
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_STREETS.tileSize, 512);
  assert.equal(BASEMAP_PROVIDERS.MAPBOX_STREETS.zoomOffset, -1);
  assert.ok(BASEMAP_PROVIDERS.MAPBOX_STREETS.attribution.includes('Mapbox'));
});

test('Coordinate Validation: Accurately validates geographic boundaries', () => {
  // Valid points in Chennai
  assert.equal(isValidCoordinate(13.0827, 80.2707), true);
  assert.equal(isValidCoordinate(12.9897, 80.2486), true);

  // Invalid points
  assert.equal(isValidCoordinate(95, 80), false); // Latitude > 90
  assert.equal(isValidCoordinate(-95, 80), false); // Latitude < -90
  assert.equal(isValidCoordinate(13, 190), false); // Longitude > 180
  assert.equal(isValidCoordinate(null, 80), false);
  assert.equal(isValidCoordinate(13, undefined), false);
  assert.equal(isValidCoordinate('invalid', 'coord'), false);
});

test('Coordinate Formatting: Formats human-readable N/S/E/W strings', () => {
  const formatted = formatCoordinates(13.0827, 80.2707);
  assert.equal(formatted, '13.0827° N, 80.2707° E');

  const southernWestern = formatCoordinates(-33.8688, -151.2093);
  assert.equal(southernWestern, '33.8688° S, 151.2093° W');

  const invalid = formatCoordinates('not', 'valid');
  assert.equal(invalid, 'Coordinates Unavailable');
});

test('Distance Calculation: Accurately calculates straight-line distance in km', () => {
  // Chennai Central to T. Nagar Bus Terminus (~6.0 km)
  const dist = haversineDistanceKm(13.0827, 80.2707, 13.0418, 80.2341);
  assert.ok(dist >= 5.5 && dist <= 6.5, `Distance was ${dist}`);

  // Distance to self is 0
  assert.equal(haversineDistanceKm(13.0827, 80.2707, 13.0827, 80.2707), 0);

  // Invalid coordinates return 0 safely
  assert.equal(haversineDistanceKm(null, null, 13.0418, 80.2341), 0);
});

test('Map Overlays: Infrastructure layers have required metadata and demo flags', () => {
  assert.ok(LAYER_METADATA[LAYER_TYPES.LIGHTING]);
  assert.ok(LAYER_METADATA[LAYER_TYPES.POLICE]);
  assert.ok(LAYER_METADATA[LAYER_TYPES.CCTV]);
  assert.ok(LAYER_METADATA[LAYER_TYPES.CROWD]);

  assert.ok(CHENNAI_INFRASTRUCTURE_POINTS.length >= 5);
  for (const point of CHENNAI_INFRASTRUCTURE_POINTS) {
    assert.equal(point.isDemonstrationData, true, 'All reference points must be marked demo data');
    assert.ok(isValidCoordinate(point.lat, point.lng), `Point ${point.name} has invalid coords`);
    assert.ok(point.name && point.name.length > 0);
  }
});

test('Location Resolution: Correctly resolves catalog entries and handles unknown places without fabricating coordinates', () => {
  // Exact match
  const central = resolveLocationQuery('Chennai Central Railway Station');
  assert.equal(central.isResolved, true);
  assert.equal(central.lat, 13.0827);
  assert.equal(central.lng, 80.2707);

  // Partial match
  const tnagar = resolveLocationQuery('T. Nagar Bus');
  assert.equal(tnagar.isResolved, true);
  assert.equal(tnagar.lat, 13.0418);

  // Unknown custom input: does NOT fabricate coordinates
  const custom = resolveLocationQuery('123 Unknown Alleyway');
  assert.equal(custom.isResolved, false);
  assert.equal(custom.lat, null);
  assert.equal(custom.lng, null);
  assert.ok(custom.source.includes('Pending Geocoding'));
});

test('Location Swap: Successfully inverts origin and destination', () => {
  const result = swapLocations('Chennai Central', 'Guindy Metro');
  assert.equal(result.swappedOrigin, 'Guindy Metro');
  assert.equal(result.swappedDestination, 'Chennai Central');
});

test('Catalog Search: Finds matching locations in Chennai', () => {
  assert.ok(CHENNAI_LOCATION_CATALOG.length >= 5);
  const results = searchChennaiLocations('Metro');
  assert.ok(results.length >= 1);
  assert.ok(results.some((r) => r.name.includes('Metro')));
});
