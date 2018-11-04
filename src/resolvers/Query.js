const { forwardTo } = require('prisma-binding')
const { getUserId } = require('../utils')

const { hasPermission } = require('../utils')

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

  place: forwardTo('db'),

  me(parent, args, ctx, info) {
    // check if there is a current user id
    if (!ctx.request.userId) {
      return null
    }

    return ctx.db.query.user(
      {
        where: {
          id: ctx.request.userId
        }
      },
      info
    )
  },

  async users(parent, args, ctx, info) {
    // 1. check if the user is logged in
    if (!ctx.request.userId) {
      throw new Error('You must be logged in!')
    }
    // 2. check if the user has the permission to query all users
    hasPermission(ctx.request.user, ['ADMIN'])

    // 3. if they do, query all the users
    return await ctx.db.query.users({}, info)
  }
}

module.exports = Query
