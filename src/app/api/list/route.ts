import { type NextRequest, NextResponse } from "next/server"
import { listFiles } from "@/lib/google-drive"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId")

    const files = await listFiles(folderId || undefined)

    const formattedFiles = files.map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size ? Number.parseInt(file.size) : 0,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      isFolder: file.mimeType === "application/vnd.google-apps.folder",
    }))

    return NextResponse.json({ files: formattedFiles })
  } catch (error) {
    console.error("List error:", error)
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 })
  }
}
