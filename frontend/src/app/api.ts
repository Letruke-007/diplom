import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

function getCookie(name: string): string | undefined {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  return m ? decodeURIComponent(m.pop()!) : undefined
}

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  credentials: 'include',
  prepareHeaders: (headers) => {
    const csrf = getCookie('csrftoken')
    if (csrf) headers.set('X-CSRFToken', csrf)
    headers.set('Accept', 'application/json')
    return headers
  },
})

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'Users', 'Files'],
  endpoints: () => ({}),
})