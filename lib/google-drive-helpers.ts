/**
 * Convert Google Drive sharing URLs to embeddable format
 * Supports formats:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/uc?id=FILE_ID
 */
export function convertGoogleDriveUrlToEmbeddable(url: string | null): string | null {
  if (!url) return null

  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname

    // Extract FILE_ID from /file/d/FILE_ID/view format
    const fileMatch = pathname.match(/\/file\/d\/([^/]+)/)
    if (fileMatch) {
      const fileId = fileMatch[1]
      return `https://drive.google.com/uc?id=${fileId}&export=download`
    }

    // Already in uc format or similar
    if (url.includes('drive.google.com/uc?id=')) {
      return url
    }

    // Return original if we can't parse it
    return url
  } catch {
    // If URL parsing fails, return original
    return url
  }
}

/**
 * Extract Google Drive file ID from various URL formats
 */
export function extractGoogleDriveFileId(url: string | null): string | null {
  if (!url) return null

  try {
    const urlObj = new URL(url)
    
    // Format: /file/d/FILE_ID/view
    const fileMatch = urlObj.pathname.match(/\/file\/d\/([^/]+)/)
    if (fileMatch) {
      return fileMatch[1]
    }

    // Format: ?id=FILE_ID
    const params = new URLSearchParams(urlObj.search)
    const id = params.get('id')
    if (id) {
      return id
    }

    return null
  } catch {
    return null
  }
}
