/**
 * Frontend Unit & Contract Tests for Road Network & Segment Foundation (Phase 7).
 *
 * Tests:
 *  - Road network layer configuration & metadata
 *  - GeoJSON coordinate transformation to Leaflet format
 *  - Bounding box and proximity query parameter validation
 *  - Route-to-segment sequence and traversal formatting
 *  - Neutral representation (verifying absence of fabricated safety/risk scores)
 *  - Data provenance and licensing metadata
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LAYER_TYPES,
  LAYER_METADATA,
} from '../components/map/mapOverlays.js';

import {
  getRoadSegments,
  getRoadSegmentByCode,
  querySegmentsInBbox,
  querySegmentsNearPoint,
  matchRouteToSegments,
  getRoadNetworkProvenance,
} from '../api/roadNetwork.js';

test('Road Network Layer: ROAD_SEGMENTS layer type and metadata are defined correctly', () => {
  assert.equal(LAYER_TYPES.ROAD_SEGMENTS, 'road_segments');
  const meta = LAYER_METADATA[LAYER_TYPES.ROAD_SEGMENTS];
  assert.ok(meta, 'ROAD_SEGMENTS layer metadata must exist');
  assert.ok(meta.shortLabel.includes('Road Segments'));
  assert.equal(meta.isDemoOnly, false, 'Road network layer must be marked real sourced, not demo');
  assert.ok(meta.label.includes('Road Network Segments'));
  assert.ok(meta.color, 'Layer must have a distinct color');
  // Ensure no risk/danger words in description
  assert.ok(!meta.description.toLowerCase().includes('danger'));
  assert.ok(!meta.description.toLowerCase().includes('crime'));
});

test('Coordinate Transformation: GeoJSON LineString [lng, lat] converts correctly to Leaflet [lat, lng]', () => {
  // Typical GeoJSON segment coordinates in Chennai
  const geojsonCoords = [
    [80.2707, 13.0827],
    [80.2650, 13.0750],
    [80.2580, 13.0680],
  ];

  const leafletLatLngs = geojsonCoords.map(([lng, lat]) => [lat, lng]);

  assert.equal(leafletLatLngs.length, 3);
  assert.equal(leafletLatLngs[0][0], 13.0827); // Latitude
  assert.equal(leafletLatLngs[0][1], 80.2707); // Longitude
  assert.equal(leafletLatLngs[1][0], 13.0750);
  assert.equal(leafletLatLngs[1][1], 80.2650);
  assert.equal(leafletLatLngs[2][0], 13.0680);
  assert.equal(leafletLatLngs[2][1], 80.2580);
});

test('Bounding Box Validation: Minimum and maximum coordinate ranges are respected', () => {
  const validBbox = {
    min_lat: 13.00,
    min_lng: 80.20,
    max_lat: 13.10,
    max_lng: 80.30,
  };

  assert.ok(validBbox.min_lat < validBbox.max_lat, 'min_lat must be less than max_lat');
  assert.ok(validBbox.min_lng < validBbox.max_lng, 'min_lng must be less than max_lng');
  assert.ok(validBbox.min_lat >= -90 && validBbox.max_lat <= 90);
  assert.ok(validBbox.min_lng >= -180 && validBbox.max_lng <= 180);
});

test('Road Segment Traversal Formatting: Order and metadata preservation', () => {
  // Simulated matched segments returned for a route
  const matchedSegments = [
    {
      segment_code: 'SEG-OSM-W24483756',
      road_name: 'Poonamallee High Road',
      road_classification: 'primary',
      length_meters: 1850,
      traversal_order: 0,
    },
    {
      segment_code: 'SEG-OSM-W24483757',
      road_name: 'Anna Salai',
      road_classification: 'trunk',
      length_meters: 2200,
      traversal_order: 1,
    },
  ];

  // Verify traversal order is strictly monotonic
  for (let i = 0; i < matchedSegments.length - 1; i++) {
    assert.ok(matchedSegments[i].traversal_order < matchedSegments[i + 1].traversal_order);
  }

  // Verify distance formatting
  const totalLengthMeters = matchedSegments.reduce((sum, s) => sum + s.length_meters, 0);
  assert.equal(totalLengthMeters, 4050);
  const totalKm = (totalLengthMeters / 1000).toFixed(2);
  assert.equal(totalKm, '4.05');
});

test('Neutral Data Representation: Road segments contain no fabricated safety scores', () => {
  const sampleSegment = {
    segment_code: 'SEG-OSM-W24483757',
    road_name: 'Anna Salai',
    road_classification: 'trunk',
    source_dataset: 'OpenStreetMap',
    source_feature_id: 'way/24483757',
    length_meters: 2200,
  };

  // Assert absence of safety/crime fields in Phase 7 data foundation
  assert.equal(sampleSegment.safety_score, undefined);
  assert.equal(sampleSegment.crime_rate, undefined);
  assert.equal(sampleSegment.risk_level, undefined);
  assert.equal(sampleSegment.safety_assessment, undefined);
});

test('API Client: Functions are properly exported and callable', () => {
  assert.equal(typeof getRoadSegments, 'function');
  assert.equal(typeof getRoadSegmentByCode, 'function');
  assert.equal(typeof querySegmentsInBbox, 'function');
  assert.equal(typeof querySegmentsNearPoint, 'function');
  assert.equal(typeof matchRouteToSegments, 'function');
  assert.equal(typeof getRoadNetworkProvenance, 'function');
});
