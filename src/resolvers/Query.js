const { getUserId } = require('../utils')

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
  }
}

module.exports = Query
