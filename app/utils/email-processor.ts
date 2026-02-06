import type { ActivityAttachmentItem } from '~/types'

/**
 * Process email HTML to replace cid: references with base64 data URLs
 * This resolves inline images in email content
 */
export function processEmailHtml(html: string, attachments: ActivityAttachmentItem[] | undefined): string {
  if (!html || !attachments || attachments.length === 0) {
    return html || ''
  }

  let processedHtml = html

  // Replace cid: references with data URLs
  for (const attachment of attachments) {
    if (!attachment.body) continue

    // Create data URL from base64 body
    const dataUrl = `data:${attachment.mimeType};base64,${attachment.body}`

    // Replace various cid reference patterns
    const cidPatterns = [
      // cid:filename
      new RegExp(`cid:${attachment.filename}`, 'gi'),
      // cid:filename.ext
      new RegExp(`cid:${attachment.filename.replace(/\\.[^/.]+$/, '')}`, 'gi'),
      // Handle cid with special characters
      new RegExp(`cid:[^"'\\s]*${attachment.filename.replace(/\\.[^/.]+$/, '')}[^"'\\s]*`, 'gi'),
    ]

    for (const pattern of cidPatterns) {
      processedHtml = processedHtml.replace(pattern, dataUrl)
    }
  }

  return processedHtml
}
