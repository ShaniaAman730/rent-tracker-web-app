/**
 * Convert Google Drive sharing URLs to embeddable format
 * Supports formats:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/uc?id=FILE_ID
 */
export function convertGoogleDriveUrlToEmbeddable(url: string | null): string | null {
  if (!url) return null

  try {
    const sourceUrl = extractUrlFromGoogleDriveInput(url)
    if (!sourceUrl) return url

    const urlObj = new URL(sourceUrl)
    const pathname = urlObj.pathname

    // Extract FILE_ID from /file/d/FILE_ID/view format
    const fileMatch = pathname.match(/\/file\/d\/([^/]+)/)
    if (fileMatch) {
      const fileId = fileMatch[1]
      // Use export=view for better image display in HTML
      const convertedUrl = `https://drive.google.com/uc?id=${fileId}&export=view`
      console.log(`[Google Drive] Converted URL ending in: ...${fileId}`)
      return convertedUrl
    }

    // Already in uc format or similar
    if (url.includes('drive.google.com/uc?id=')) {
      console.log(`[Google Drive] URL already in uc format`)
      return url
    }

    // Return original if we can't parse it
    console.warn(`[Google Drive] Could not parse URL`)
    return url
  } catch {
    // If URL parsing fails, return original
    console.error(`[Google Drive] URL parsing error`)
    return url
  }
}

/**
 * Extract Google Drive file ID from embed code or URL
 * Supports:
 * - Embed code: <iframe src="...drive.google.com/file/d/FILE_ID/preview..."></iframe>
 * - Share link: https://drive.google.com/file/d/FILE_ID/view
 * - Direct: https://drive.google.com/uc?id=FILE_ID
 */
export function extractGoogleDriveFileId(urlOrEmbed: string | null): string | null {
  if (!urlOrEmbed) return null

  try {
    const sourceUrl = extractUrlFromGoogleDriveInput(urlOrEmbed)
    if (!sourceUrl) return null

    const urlObj = new URL(sourceUrl)
    const pathname = urlObj.pathname

    // Format: /file/d/FILE_ID/view or /file/d/FILE_ID/preview
    const fileMatch = pathname.match(/\/file\/d\/([^/]+)/)
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

function extractUrlFromGoogleDriveInput(input: string): string | null {
  const trimmed = input.trim()

  const iframeMatch = trimmed.match(/src=(['"])(.*?)\1/i)
  if (iframeMatch?.[2]) {
    return iframeMatch[2]
  }

  return trimmed
}

export function isGoogleDriveInput(input: string | null): boolean {
  if (!input) return false

  const sourceUrl = extractUrlFromGoogleDriveInput(input)
  return Boolean(sourceUrl && sourceUrl.includes('drive.google.com'))
}

export function getGoogleDrivePreviewUrl(input: string | null): string | null {
  const fileId = extractGoogleDriveFileId(input)
  if (!fileId) return null

  return `https://drive.google.com/file/d/${fileId}/preview`
}

export function getGoogleDriveOpenUrl(input: string | null): string | null {
  const fileId = extractGoogleDriveFileId(input)
  if (!fileId) return null

  return `https://drive.google.com/file/d/${fileId}/view`
}
