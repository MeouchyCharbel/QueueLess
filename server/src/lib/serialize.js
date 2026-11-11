// Prisma returns Decimal prices as special objects; the API sends plain numbers.
export function serializeService(service) {
  return { ...service, price: Number(service.price) };
}
