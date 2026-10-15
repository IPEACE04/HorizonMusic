import assert from "node:assert/strict";
import test from "node:test";

import {
  parseLoginInput,
  parseProfileInput,
  parseRegistrationInput,
} from "../features/auth/contracts";

test("registration normalizes email and Thai phone for the auth/profile flow", () => {
  assert.deepEqual(
    parseRegistrationInput({
      confirmPassword: "password123",
      email: "  Artist@Example.com ",
      firstName: "  สมูท  ",
      lastName: "สตูดิโอ",
      password: "password123",
      phone: "081-234-5678",
    }),
    {
      email: "artist@example.com",
      firstName: "สมูท",
      lastName: "สตูดิโอ",
      password: "password123",
      phone: "+66812345678",
    },
  );
});

test("registration rejects mismatched passwords", () => {
  assert.throws(
    () =>
      parseRegistrationInput({
        confirmPassword: "password124",
        email: "artist@example.com",
        firstName: "สมูท",
        lastName: "สตูดิโอ",
        password: "password123",
        phone: "0812345678",
      }),
    /รหัสผ่านไม่ตรงกัน/,
  );
});

test("profile accepts an international E.164 phone", () => {
  assert.deepEqual(
    parseProfileInput({
      firstName: "Smooth",
      lastName: "Studio",
      phone: "+14155552671",
    }),
    { firstName: "Smooth", lastName: "Studio", phone: "+14155552671" },
  );
});

test("login returns one generic validation error", () => {
  assert.throws(
    () => parseLoginInput({ email: "invalid", password: "" }),
    /กรุณาตรวจสอบอีเมลและรหัสผ่าน/,
  );
});
