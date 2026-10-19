import axios from 'axios';

import { makeFacilities } from '../data.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const facilityTypes = {
  hotel: 'Hotel',
  guest_house: 'Hotel',
  hostel: 'Hotel',
  restaurant: 'Restaurant',
  cafe: 'Restaurant',
  fast_food: 'Restaurant',
  parking: 'Parking',
  toilets: 'Restroom',
  drinking_water: 'Drinking Water',
  hospital: 'First Aid',
  clinic: 'First Aid',
  pharmacy: 'First Aid',
  lifeguard: 'Lifeguard'
};

function distanceMeters(from, to) {
  const earthRadius = 6371000;
  const latitudeDelta = (to.lat - from.lat) * Math.PI / 180;
  const longitudeDelta = (to.lng - from.lng) * Math.PI / 180;
  const latitude = from.lat * Math.PI / 180;
  const targetLatitude = to.lat * Math.PI / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude) * Math.cos(targetLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function elementCoordinates(element) {
  return {
    lat: element.lat ?? element.center?.lat,
    lng: element.lon ?? element.center?.lon
  };
}

function mapElement(element, beach) {
  const tags = element.tags || {};
  const type = facilityTypes[tags.amenity] || facilityTypes[tags.tourism];
  const coordinates = elementCoordinates(element);

  if (!type || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
    return null;
  }

  return {
    _id: `osm-${element.type}-${element.id}`,
    name: tags.name || tags['name:en'] || `${type} nearby`,
    type,
    distanceMeters: distanceMeters(beach.coordinates, coordinates),
    address: tags['addr:street'] || tags['addr:city'] || 'Nearby location',
    coordinates,
    source: 'OpenStreetMap'
  };
}

export async function getNearbyFacilities(beach) {
  const fallbackFacilities = makeFacilities(beach, beach._id ?? beach.id ?? null);

  try {
    const { lat, lng } = beach.coordinates;
    const query = `[out:json][timeout:8];(nwr(around:3000,${lat},${lng})[amenity~"restaurant|cafe|fast_food|parking|toilets|drinking_water|hospital|clinic|pharmacy|lifeguard"];nwr(around:3000,${lat},${lng})[tourism~"hotel|guest_house|hostel"];);out center tags;`;
    const { data } = await axios.get(OVERPASS_URL, { params: { data: query }, timeout: 10000 });
    const seen = new Set();

    const mapped = (data.elements || [])
      .map((element) => mapElement(element, beach))
      .filter((facility) => {
        if (!facility || seen.has(facility.name)) return false;
        seen.add(facility.name);
        return true;
      })
      .sort((first, second) => first.distanceMeters - second.distanceMeters)
      .slice(0, 12);

    return mapped.length ? mapped : fallbackFacilities;
  } catch (error) {
    console.warn('Falling back to demo facilities for beach', beach?.name || 'unknown', error?.message || error);
    return fallbackFacilities;
  }
}
