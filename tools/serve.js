// A tiny static server for trying the site on your own computer: `npm start`, then open http://localhost:8090
// (Opening index.html straight from the folder works too; this just behaves like the real web host, including video seeking.)
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const port = Number(process.env.PORT) || 8090
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.json': 'application/json',
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    let file = path.join(root, decodeURIComponent(url.pathname))
    if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end('Forbidden')
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file)) return res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found')
    const size = fs.statSync(file).size
    const type = types[path.extname(file)] || 'application/octet-stream'
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '')
    if (range) {
      const start = range[1] ? Number(range[1]) : 0
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 })
      return fs.createReadStream(file, { start, end }).pipe(res)
    }
    res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(port, () => console.log(`Project HealthBridge: http://localhost:${port}`))
