export interface Article {
  slug: string
  title: string
  excerpt: string
  category: string
  date: string
  readingTime: string
  content: string
}

const files = import.meta.glob('../data/articles/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function parseArticle(path: string, raw: string): Article {
  const slug = path.split('/').pop()?.replace(/\.md$/, '') || ''
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  const metadata: Record<string, string> = {}
  for (const line of (match?.[1] || '').split('\n')) {
    const separator = line.indexOf(':')
    if (separator > 0) metadata[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  const title = metadata.title || slug
  const markdown = (match?.[2] || raw).trim()
  const leadingHeading = markdown.match(/^#\s+(.+)\r?\n+/)
  const content = leadingHeading?.[1]?.trim() === title
    ? markdown.slice(leadingHeading[0].length).trim()
    : markdown
  return { slug, title, excerpt:metadata.excerpt || '', category:metadata.category || '紫微入門', date:metadata.date || '', readingTime:metadata.readingTime || '5 分鐘', content }
}

export const articles = Object.entries(files).map(([path, raw]) => parseArticle(path, raw)).sort((a, b) => b.date.localeCompare(a.date))
export function getArticle(slug: string) { return articles.find(article => article.slug === slug) }
