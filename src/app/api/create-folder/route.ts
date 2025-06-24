import { type NextRequest, NextResponse } from "next/server"
import { createFolder } from "@/lib/google-drive"

export async function POST(request: NextRequest) {
  try {
    const { name, parentId } = await request.json()

    console.log("Create folder request:", { name, parentId })

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 })
    }

    // Use parentId if provided, otherwise use the root folder ID from env
    let actualParentId = parentId
    if (!actualParentId) {
      actualParentId = process.env.GOOGLE_DRIVE_FOLDER_ID
    }

    console.log("Using parent ID:", actualParentId)

    const folder = await createFolder(name.trim(), actualParentId)

    console.log("Folder created successfully:", folder)

    return NextResponse.json({
      message: "Folder created successfully",
      folder: {
        id: folder.id,
        name: folder.name,
        mimeType: "application/vnd.google-apps.folder",
        createdTime: folder.createdTime,
        modifiedTime: folder.modifiedTime,
        isFolder: true,
      },
    })
  } catch (error) {
    console.error("Create folder error:", error)
    return NextResponse.json(
      {
        error: "Failed to create folder",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
