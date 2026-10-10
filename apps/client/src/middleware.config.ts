export default {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    String.raw`/((?!api|_next|_vercel|.*\..*).*)`,
    // However, match all pathnames within `/users`, optionally with a locale prefix
    String.raw`/([\w-]+)?/users/(.+)`,
  ],
};
