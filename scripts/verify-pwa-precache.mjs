import { readFile, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const publicDir = join(process.cwd(), '.output', 'public')
const serviceWorkerPath = join(publicDir, 'sw.js')

async function findIndexFiles(directory) {
  const indexFiles = []

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      indexFiles.push(...await findIndexFiles(path))
    }
    else if (entry.isFile() && entry.name === 'index.html') {
      indexFiles.push(path)
    }
  }

  return indexFiles
}

const serviceWorker = await readFile(serviceWorkerPath, 'utf8')
const precacheUrls = new Set(
  [...serviceWorker.matchAll(/\burl:\s*["']([^"']+)["']/g)].map(match => match[1]),
)

const routeUrls = (await findIndexFiles(publicDir)).map((file) => {
  const directory = relative(publicDir, join(file, '..')).split(sep).join('/')
  return directory ? `${directory}/` : '/'
})

const missingCanonicalUrls = routeUrls.filter(url => !precacheUrls.has(url))
const nonCanonicalUrls = routeUrls
  .filter(url => url !== '/')
  .map(url => url.slice(0, -1))
  .filter(url => precacheUrls.has(url))

if (missingCanonicalUrls.length || nonCanonicalUrls.length) {
  if (missingCanonicalUrls.length) {
    console.error(`Missing canonical precache URLs: ${missingCanonicalUrls.join(', ')}`)
  }
  if (nonCanonicalUrls.length) {
    console.error(`Non-canonical precache URLs: ${nonCanonicalUrls.join(', ')}`)
  }
  process.exitCode = 1
}
else {
  console.log(`Verified ${routeUrls.length} canonical page URLs in the PWA precache.`)
}
