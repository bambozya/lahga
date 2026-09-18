// Admin pages: login first, then the admin role.
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value) return navigateTo({ path: '/login', query: { next: to.fullPath } })
  if (user.value?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'هذه الصفحة للمديرين فقط', fatal: true })
})
