/** Returns the link only when it is an absolute http(s) URL, so stored links can never run script as an href. */
export function safeHref(url: string | null | undefined): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}
