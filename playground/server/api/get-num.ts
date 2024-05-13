import { defineEventHandler, getQuery } from 'h3'
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = query.page as number

  await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(1)
    }, 2000)
  })

  return { nums: page }
})
