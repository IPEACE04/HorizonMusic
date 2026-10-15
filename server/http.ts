import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    { data, meta: { requestId: crypto.randomUUID() } },
    { status },
  );
}

export function apiError(
  code: string,
  message: string,
  status: number,
  fieldErrors: Readonly<Record<string, string>> = {},
) {
  return NextResponse.json(
    { error: { code, message, fieldErrors, requestId: crypto.randomUUID() } },
    { status },
  );
}
