export function beatFirstRoutes(preview = false) {
  return preview
    ? { pagePath: '/beat-first/preview', progressPath: '/api/beatfirst-preview/progress' }
    : { pagePath: '/beat-first', progressPath: '/api/beatfirst/progress' }
}

export function progressApiEnabled(preview: boolean, environment: string | undefined) {
  return !preview || !environment || ['development', 'preview'].includes(environment)
}
