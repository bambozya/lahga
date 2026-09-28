// Staff pages (admins and moderators): login first, then one of the two roles.
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value) return navigateTo({ path: '/login', query: { next: to.fullPath } })
  if (user.value?.role !== 'admin' && user.value?.role !== 'moderator') throw createError({ statusCode: 403, statusMessage: 'هذه الصفحة للمشرفين فقط', fatal: true })
})
