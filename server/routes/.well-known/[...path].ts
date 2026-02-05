// Catch-all for unmatched .well-known paths
// Returns 404 JSON instead of falling through to Vue Router
export default defineEventHandler((event) => {
  setResponseStatus(event, 404)
  return {
    error: 'not_found',
    error_description: 'Unknown .well-known endpoint',
  }
})
