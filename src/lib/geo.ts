// Środek ciężkości zbioru punktów — używany wszędzie tam, gdzie trzeba
// jeden reprezentatywny punkt z kilku (np. kilka wybranych typów regionu,
// albo kilka już pasujących miejsc kuratorskich). Pusty zbiór nie ma
// sensownego środka, więc zwracamy null zamiast (0, 0), które wyglądałoby
// jak realna, ale błędna współrzędna.
export function centroid<T extends { lat: number; lng: number }>(
  points: T[],
): { lat: number; lng: number } | null {
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
