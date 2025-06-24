import { type NextRequest, NextResponse } from "next/server"
import { deleteFile } from "@/lib/google-drive"

export async function DELETE(request: NextRequest) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    await deleteFile(fileId)

    return NextResponse.json({
      message: "File deleted successfully",
      fileId,
    })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
  }
}
