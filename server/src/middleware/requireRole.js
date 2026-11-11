// Authorization: "are you allowed?" Server-side role check, used after
// requireAuth. Example: requireRole('OWNER') lets only business owners in.
// A known user with the wrong role gets 403 Forbidden.
export const requireRole = (role) => (req, res, next) => {
  if (req.userRole !== role) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
