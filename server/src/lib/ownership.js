// "Is it yours?" checks for owners. Every lookup includes the logged-in
// owner's id, so an owner can never read or change another owner's data.
// Someone else's record is answered exactly like a missing one (null -> 404).
import { prisma } from '../db.js';
import { parseId } from './ids.js';

export function findOwnedBusiness(businessIdParam, ownerId) {
  const id = parseId(businessIdParam);
  if (!id) return null;
  return prisma.business.findFirst({ where: { id, ownerId } });
}

export function findOwnedService(serviceIdParam, ownerId) {
  const id = parseId(serviceIdParam);
  if (!id) return null;
  return prisma.service.findFirst({ where: { id, business: { ownerId } } });
}

export function findOwnedStaff(staffIdParam, ownerId) {
  const id = parseId(staffIdParam);
  if (!id) return null;
  return prisma.staff.findFirst({ where: { id, business: { ownerId } } });
}
