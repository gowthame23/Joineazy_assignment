import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issue = err.errors[0];
      const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation error';
      return res.status(400).json({ error: message });
    }
    return res.status(400).json({ error: 'Invalid request body' });
  }
};

export const validateUuidParam = (paramName) => (req, res, next) => {
  const value = req.params[paramName];
  if (!value || !UUID_REGEX.test(value)) {
    return res.status(400).json({ error: `Invalid ${paramName} parameter. Must be a valid UUID.` });
  }
  next();
};
