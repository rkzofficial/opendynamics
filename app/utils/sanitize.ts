import DOMPurify from 'dompurify'

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'div', 'span', 'br', 'hr',
      'b', 'strong', 'i', 'em', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'blockquote', 'pre', 'code'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target',
      'src', 'alt', 'width', 'height',
      'class', 'style'
    ]
  })
}
