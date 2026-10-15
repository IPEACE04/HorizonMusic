import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { File } from "node:buffer";
import ts from "typescript";
import { InputValidationError } from "../features/auth/contracts";
import * as contract from "../features/auth/profile-image-contract";

test("profile upload rejects oversized, empty, unsupported and spoofed image files", () => {
  assert.throws(() => contract.validateProfileImage({ size: 1, type: "image/svg+xml" }));
  assert.throws(() => contract.validateProfileImage({ size: 0, type: "image/png" }));
  assert.throws(() => contract.validateProfileImage({ size: contract.maxProfileImageSize + 1, type: "image/png" }));
  assert.throws(() => contract.profileImageExtension(new Uint8Array([1, 2, 3]), "image/png"));
  assert.equal(contract.profileImageExtension(new Uint8Array([255, 216, 255, 0]), "image/jpeg"), "jpg");
});

function routeHarness({ authenticated = true, updateFails = false } = {}) {
  const uploads: string[] = [];
  const removed: string[] = [];
  const updates: string[] = [];
  const source = readFileSync(new URL("../app/api/v1/profile/image/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  runInNewContext(compiled, {
    exports, File, Uint8Array, URL,
    require: (id: string) => {
      if (id === "node:crypto") return { randomUUID: () => "generated-id" };
      if (id === "@/features/auth/contracts") return { InputValidationError };
      if (id === "@/features/auth/profile-image-contract") return contract;
      if (id === "@/server/auth/session") return { getAppSession: async () => authenticated ? { user: { id: "owner-user" } } : null };
      if (id === "@/server/http") return {
        apiError: (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status }),
        apiSuccess: (data: unknown) => Response.json({ data }),
      };
      if (id === "@/lib/supabase-admin") return { supabaseAdmin: { storage: { from: (bucket: string) => {
        assert.equal(bucket, "profile-images");
        return {
          upload: async (path: string) => { uploads.push(path); return { error: null }; },
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example/${path}` } }),
          remove: async (paths: string[]) => { removed.push(...paths); return { error: null }; },
        };
      } } } };
      if (id === "@/lib/auth") return { auth: { api: { updateUser: async ({ body }: { body: { image: string } }) => {
        updates.push(body.image);
        return new Response(null, { status: updateFails ? 500 : 200, headers: { "set-cookie": "session=refreshed; HttpOnly" } });
      } } } };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])], "avatar.png", { type: "image/png" });
  function request(origin = "http://localhost:3000") {
    return {
      url: "http://localhost:3000/api/v1/profile/image",
      headers: new Headers({ origin }),
      formData: async () => ({ get: (name: string) => name === "image" ? png : "someone-else" }),
    } as unknown as Request;
  }
  return { post: exports.POST!, uploads, removed, updates, request };
}

test("anonymous and cross-origin requests cannot upload profile images", async () => {
  const anonymous = routeHarness({ authenticated: false });
  assert.equal((await anonymous.post(anonymous.request())).status, 401);
  assert.equal(anonymous.uploads.length, 0);
  const authenticated = routeHarness();
  assert.equal((await authenticated.post(authenticated.request("https://another.example"))).status, 403);
  assert.equal(authenticated.uploads.length, 0);
});

test("avatar uses the session owner, persists through auth and forwards updated session cookies", async () => {
  const h = routeHarness();
  const response = await h.post(h.request());
  assert.equal(response.status, 200);
  assert.equal(h.uploads[0], "owner-user/generated-id.png");
  assert.equal(h.updates[0], "https://storage.example/owner-user/generated-id.png");
  assert.match(response.headers.get("set-cookie")!, /session=refreshed/);
});

test("failed profile persistence cleans up the newly uploaded object", async () => {
  const h = routeHarness({ updateFails: true });
  assert.equal((await h.post(h.request())).status, 500);
  assert.equal(h.removed[0], h.uploads[0]);
});
