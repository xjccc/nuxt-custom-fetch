import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = query.page as number
  // if (+page === 3) {
  //   console.log(page, 1111111)

  //   throw new Error('error la')
  // }
  // await new Promise((resolve, reject) => {
  //   setTimeout(() => {
  //     resolve(1)
  //   }, 2000)
  // })

  return {
    nums: page,
    data: getNumbersForPage(page)
  }
})

function getNumbersForPage(page: number) {
  const itemsPerPage = 10
  const start = (page - 1) * itemsPerPage + 1
  const numbers = []

  for (let i = start; i < start + itemsPerPage; i++) {
    numbers.push(i)
  }

  return numbers
}
