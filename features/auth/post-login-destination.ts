type UserRole = string | null | undefined;

export function postLoginDestination(
  role: UserRole,
  callbackUrl: string | undefined,
) {
  const isAdmin = role === "admin";
  const isSafePath =
    typeof callbackUrl === "string" &&
    callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//");
  const isAdminPath = isSafePath && callbackUrl.startsWith("/admin");

  if (isAdmin) return "/admin";
  return isSafePath && !isAdminPath ? callbackUrl : "/profile";
}
