// Business categories, mounted at /api/categories (public).
import express from 'express';
import { prisma } from '../db.js';

export const categoriesRouter = express.Router();

// GET /api/categories -> 200 [{ id, name }]
categoriesRouter.get('/', async (req, res) => {
  res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } }));
});
