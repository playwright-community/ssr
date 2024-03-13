// @ts-check
import http from "http";

const server = http.createServer(async (req, res) => {
  console.log('(server.mjs): received request', req.url)
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`
      <button id=fetch-fruits>Fetch Fruits</button>
      <ul id=fruits></ul>
      <script>
        document.getElementById('fetch-fruits').addEventListener('click', async () => {
          const response = await fetch('/api/v1/fruits')
          const data = await response.json()
          const list = document.getElementById('fruits')
          list.innerHTML = data.map(fruit => '<li>' + fruit.name + '</li>').join('')
        })
      </script>
    `)
    return
  }
  if (req.url === '/api/v1/fruits') {
    const response = await fetch('https://demo.playwright.dev/api-mocking/api/v1/fruits', {
      headers: {
        'Authorization': 'Bearer very-secure-token',
      }
    })
    res.writeHead(response.status, {
      'Content-Type': 'application/json',
    })
    res.end(Buffer.from(await response.arrayBuffer()))
    return
  }
  res.writeHead(404)
  res.end("Not found")
})

server.listen(3000)
console.log('(server.mjs): Listening on http://localhost:3000')
process.on('SIGINT', () => server.close());
