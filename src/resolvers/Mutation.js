const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { forwardTo } = require('prisma-binding')
const { randomBytes } = require('crypto')
const { promisify } = require('util')
const { transport, makeNiceEmail } = require('../mail')

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

  async signout(parent, args, ctx) {
    ctx.response.clearCookie('token')
    return {
      message: 'Goodbye!'
    }
  },

  async createProperty(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to do that!')
    }

    const { data } = args
    const { amenities, pricing, location, ...rest } = data

    const result = await ctx.db.mutation.createPlace(
      {
        data: {
          ...rest,
          host: {
            connect: {
              id: ctx.request.userId
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

  createPicture: forwardTo('db'),

  async requestReset(parent, args, ctx) {
    const user = await ctx.db.query.user({ where: { email: args.email } })
    if (!user) {
      throw new Error(`No such user found for email ${args.email}`)
    }

    const randomBytesPromisified = promisify(randomBytes)
    const resetToken = (await randomBytesPromisified(20)).toString('hex')
    const resetTokenExpiry = Date.now() + 3600000 // 1 hour from now
    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    })

    // Email the reset token
    const mailRes = await transport.sendMail({
      from: 'no-reply@chennaiacco.com',
      to: user.email,
      subject: 'Your password reset token',
      html: makeNiceEmail(
        `You password reset token is here! \n\n <a href="${
          process.env.FRONTEND_URL
        }/reset?resetToken=${resetToken}">Click here to reset</a>`
      )
    })

    return { message: 'Thanks!' }
  },

  async resetPassword(parent, args, ctx, info) {
    // 1. check if the passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error("Yo! Passwords don't match")
    }

    // 2. check if its a legit reset token
    // 3. check if its expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    })

    if (!user) {
      throw new Error('This token is either invalid or expired!')
    }

    // 4. hash their new password
    const password = await bcrypt.hash(args.password, 10)

    // 5. save the new password to the user and remove old resetToken fields
    const updatedUser = ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    })

    // 6. generate jwt
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET)

    // 7. set the jwt cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    })

    // 8. return the updated user
    return updatedUser
  }
}

module.exports = mutations
