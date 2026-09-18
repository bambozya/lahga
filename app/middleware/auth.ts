// Pages that need a logged-in user: send visitors to the login page and back afterwards.
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return navigateTo({ path: '/login', query: { next: to.fullPath } })
})
