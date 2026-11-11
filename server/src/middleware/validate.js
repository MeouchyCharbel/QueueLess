// Validates req.body against a zod schema before the route runs.
// Wrong types or missing fields -> 400 with a readable message.
// On success req.body is replaced by the cleaned data: strings trimmed,
// unknown keys dropped, so a client cannot sneak in extra fields.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.');
    return res.status(400).json({ error: field ? `${field}: ${issue.message}` : issue.message });
  }
  req.body = result.data;
  next();
};
