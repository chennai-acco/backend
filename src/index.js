const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: 'variables.env' })
const createServer = require('./createServer')
// const db = require('./db')

const server = createServer()
server.express.use(cookieParser())

// decode the jwt so we can get the user id on each request
server.express.use((req, res, next) => {
  const { token } = req.cookies
  if (token) {
    const { userId } = jwt.verify(token, process.env.APP_SECRET)
    // Put the user id onto the req for further requests to access
    req.userId = userId
  }

  next()
})
// TODO: use express middleware to populate current user

server.start(
  {
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_URL
    }
  },
  deets => console.log(`Server running on http://localhost:${deets.port}`)
)
