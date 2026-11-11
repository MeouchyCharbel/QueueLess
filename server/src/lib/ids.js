// URL params always arrive as strings ("3"), but our ids are numbers.
// Returns the number, or null when the param is not a positive integer
// (so routes can answer 404 instead of crashing on "/api/services/abc").
export function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
