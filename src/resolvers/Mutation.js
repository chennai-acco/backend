const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { forwardTo } = require('prisma-binding')

const mutations = {
  async signup(parent, args, ctx, info) {
    args.email = args.email.toLowerCase()
    const password = await bcrypt.hash(args.password, 10)
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          responseRate: 0,
          responseTime: 0,
          permission: { set: ['USER'] }
        }
      },
      info
    )
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)

    // Set the cookie as the response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year cookie
    })

    return user
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
