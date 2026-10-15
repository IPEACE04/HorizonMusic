export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (
    !projectUrl ||
    path.length === 0 ||
    path.some((segment) => segment === "." || segment === "..")
  ) {
    return new Response("Asset not found", { status: 404 });
  }

  const objectPath = path.map(encodeURIComponent).join("/");
  const publicUrl = `${projectUrl}/storage/v1/object/public/room-images/${objectPath}`;
  return Response.redirect(publicUrl, 307);
}
