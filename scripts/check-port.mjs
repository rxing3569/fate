import { createServer } from 'node:net'

const port = Number(process.argv[2])

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Usage: node scripts/check-port.mjs <port>')
  process.exit(1)
}

const server = createServer()

server.once('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing process before starting Nuxt.`)
  } else {
    console.error(`Unable to use port ${port}: ${error.message}`)
  }
  process.exit(1)
})

server.listen(port, 'localhost', () => {
  server.close()
})
