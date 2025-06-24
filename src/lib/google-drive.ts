import { google } from "googleapis"
import { Readable } from "stream"

function getGoogleDriveClient() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!serviceAccountEmail || !privateKey) {
    throw new Error("Google service account credentials not configured")
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  })

  return google.drive({ version: "v3", auth })
}

export async function createFolder(name: string, parentId?: string) {
  const drive = getGoogleDriveClient()

  console.log("Creating folder:", { name, parentId })

  const fileMetadata = {
    name: name,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentId ? [parentId] : undefined,
  }

  console.log("File metadata:", fileMetadata)

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id,name,createdTime,modifiedTime",
    })

    console.log("Google Drive API response:", response.data)
    return response.data
  } catch (error) {
    console.error("Google Drive API error:", error)
    throw error
  }
}

export async function uploadFile(fileName: string, buffer: Buffer, mimeType: string, parentId?: string) {
  const drive = getGoogleDriveClient()

  const fileMetadata = {
    name: fileName,
    parents: parentId ? [parentId] : undefined,
  }

  const media = {
    mimeType: mimeType,
    body: Readable.from(buffer), // <-- wrap buffer in a stream
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id,name,webViewLink,size,createdTime,modifiedTime,mimeType",
  })

  return response.data
}

export async function listFiles(folderId?: string) {
  const drive = getGoogleDriveClient()

  const rootFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID
  const query = rootFolderId ? `'${rootFolderId}' in parents and trashed=false` : "trashed=false"

  const response = await drive.files.list({
    q: query,
    fields: "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents)",
    orderBy: "folder,name",
  })

  return response.data.files || []
}

export async function deleteFile(fileId: string) {
  const drive = getGoogleDriveClient()

  await drive.files.delete({
    fileId: fileId,
  })
}

export async function findOrCreateFolder(folderName: string, parentId?: string) {
  const drive = getGoogleDriveClient()

  const rootFolderId = parentId || process.env.GOOGLE_DRIVE_FOLDER_ID

  // Search for existing folder
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${rootFolderId ? ` and '${rootFolderId}' in parents` : ""}`

  const searchResponse = await drive.files.list({
    q: query,
    fields: "files(id,name)",
  })

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0]
  }

  // Create new folder if not found
  return await createFolder(folderName, rootFolderId)
}

export async function downloadFile(fileId: string): Promise<any> {
  const drive = getGoogleDriveClient()

  const response = await drive.files.get({ fileId: fileId, alt: "media" }, { responseType: "stream" })
  return response.data
}

export async function getFileMetadata(fileId: string): Promise<any> {
  const drive = getGoogleDriveClient()

  const response = await drive.files.get({
    fileId: fileId,
    fields: "id,name,mimeType",
  })
  return response.data
}
