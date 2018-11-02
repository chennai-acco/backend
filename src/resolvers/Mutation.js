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

  async signin(parent, { email, password }, ctx) {
    const user = await ctx.db.query.user({ where: { email } })
    if (!user) {
      throw new Error(`No such user found for email ${email}`)
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw new Error('Invalid password')
    }

    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    })
    return user
  },

  async signout(parent, args, ctx, info) {
    ctx.response.clearCookie('token')
    return {
      message: 'Goodbye!'
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
