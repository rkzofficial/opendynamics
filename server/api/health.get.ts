export default defineCachedEventHandler(() => {
  return { status: 'ok', timestamp: Date.now() }
}, {
  maxAge: 60 * 5, // Cache for 5 minutes
  getKey: () => 'health-check',
})
