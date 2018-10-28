const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { forwardTo } = require('prisma-binding')

const mutations = {
  async signup(parent, args, ctx) {
    const password = await bcrypt.hash(args.password, 10)
    const result = await ctx.db.mutation.createUser({
      data: {
        ...args,
        password,
        responseRate: 0,
        responseTime: 0
      }
    })
    const token = jwt.sign({ userId: result.id }, process.env.APP_SECRET)

    return {
      token,
      user: ctx.db.query.user({ where: { id: result.id } })
    }
  },

  async login(parent, { email, password }, ctx) {
    const user = await ctx.db.query.user({ where: { email } })
    const valid = await bcrypt.compare(password, user ? user.password : '')

    if (!valid || !user) {
      throw new Error('Invalid credentials')
    }

    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)
    return {
      token,
      user
    }
  },

  async createProperty(parent, args, ctx, info) {
    const { data } = args
    const { amenities, pricing, location, host, ...rest } = data

    const result = await ctx.db.mutation.createPlace(
      {
        data: {
          ...rest,
          host: {
            connect: {
              id: host
            }
          },
          amenities: {
            create: {
              ...amenities
            }
          },
          pricing: {
            create: {
              ...pricing
            }
          },
          location: {
            create: {
              ...location
            }
          }
        }
      },
      info
    )
    return result
  },

  createPicture: forwardTo('db')
}

module.exports = mutations
