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
    // Local helper for the carousel maker: saves a slide picture into assets/weekly/<post>/<n>.png. Only from this computer.
    if (req.method === 'POST' && url.pathname === '/__save') {
      const to = url.searchParams.get('to') || ''
      const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
      if (!local || !to.startsWith('assets/weekly/') || to.includes('..') || !to.endsWith('.png') || to.split('/').length !== 4) return res.writeHead(403).end('Not allowed')
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        const buf = Buffer.concat(chunks)
        if (buf.length < 8 || buf.length > 8e6 || buf.readUInt32BE(0) !== 0x89504e47) return res.writeHead(400).end('Not a PNG')
        const out = path.join(root, to)
        fs.mkdirSync(path.dirname(out), { recursive: true })
        fs.writeFileSync(out, buf)
        res.writeHead(200).end('saved')
      })
      return
    }
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
