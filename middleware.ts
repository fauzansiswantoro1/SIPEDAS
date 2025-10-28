// The middleware was causing session updates on every request which triggered constant reloads
// Auth checking is now handled only on the client side in individual pages

export const config = {
  matcher: [],
}
