import 'server-only';

export function getFacebookPageUrl() {
  const value = process.env.FACEBOOK_PAGE_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
