export const ERRORS = {
  UNIQUE_VIOLATION: 'P2002',
} as const;

export const EVENTS = {
  LINK_VISITED: 'link.visited',
} as const;

export const BASE62_ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' as const;

export const REGEX = {
  LINK: /^[a-zA-Z0-9_-]+$/,
  CODE: /^[a-zA-Z0-9_-]{3,30}$/,
} as const;
