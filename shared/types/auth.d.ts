// Shape of the user stored in the session cookie (nuxt-auth-utils).
declare module '#auth-utils' {
  interface User {
    id: number
    displayName: string
    role: 'user' | 'moderator' | 'admin'
    emailVerified: boolean
  }
  interface UserSession {
    loggedInAt: number
  }
}
export {}
