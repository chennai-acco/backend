const { getUserId } = require('../utils')
const { forwardTo } = require('prisma-binding')

const Query = {
  async viewer(parent, args, ctx) {
    const id = getUserId(ctx)
    const user = await ctx.db.query.user({
      where: {
        id
      }
    })
    const bookings = await ctx.db.query.bookings({
      where: {
        bookee: {
          id
        }
      }
    })
    return {
      me: user,
      bookings
    }
  },

  places: forwardTo('db'),

  place: forwardTo('db')
}

module.exports = Query
