import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = await getQuery(event)
  return `hello world ${query.userId}`
})
