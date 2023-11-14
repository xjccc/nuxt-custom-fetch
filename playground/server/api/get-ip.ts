import { defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  const { req } = event
  // console.log(req,'请求')
  const ip = req.socket.remoteAddress || req.connection.remoteAddress || req.headers['x-forwarded-for']
  return {
    ip
  }
})
