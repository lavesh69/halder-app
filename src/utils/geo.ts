export interface Coordinates {
  lat: number;
  lng: number;
}

export const cityCoordinatesMap: Record<string, Coordinates> = {
  Dehradun: { lat: 30.3165, lng: 78.0322 },
  Rishikesh: { lat: 30.0869, lng: 78.2676 },
  Haridwar: { lat: 29.9457, lng: 78.1642 },
  Mussoorie: { lat: 30.4598, lng: 78.0644 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
};

// Haversine formula to calculate distance in km between two GPS coordinates
export const calculateHaversineDistanceKm = (
  coord1: Coordinates,
  coord2: Coordinates
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
};
