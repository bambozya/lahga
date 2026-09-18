// Login and registration make no sense for someone already logged in.
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()
  if (loggedIn.value) return navigateTo('/')
})
