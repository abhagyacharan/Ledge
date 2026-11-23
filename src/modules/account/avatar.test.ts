import { describe, expect, it } from "vitest";
import {
  checkPicked,
  cropSquare,
  initials,
  PICK_MAX_BYTES,
  shownAvatar,
  sniffImage,
  TOO_LARGE,
  WRONG_TYPE,
} from "./avatar";

describe("checkPicked", () => {
  it("accepts JPEG, PNG and WebP up to 5 MB", () => {
    expect(checkPicked({ type: "image/jpeg", size: 2_000_000 })).toBeNull();
    expect(checkPicked({ type: "image/webp", size: PICK_MAX_BYTES })).toBeNull();
  });
  it("refuses other types and anything bigger", () => {
    expect(checkPicked({ type: "image/gif", size: 10 })).toBe(WRONG_TYPE);
    expect(checkPicked({ type: "", size: 10 })).toBe(WRONG_TYPE);
    expect(checkPicked({ type: "image/png", size: PICK_MAX_BYTES + 1 })).toBe(TOO_LARGE);
  });
});

describe("sniffImage", () => {
  it("reads the real type from the first bytes", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "image/png",
    );
    const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
    expect(sniffImage(webp)).toBe("image/webp");
  });
  it("refuses anything else, whatever it claims to be", () => {
    expect(sniffImage(new Uint8Array(Buffer.from("<svg onload=alert(1)>")))).toBeNull();
    expect(sniffImage(new Uint8Array([]))).toBeNull();
    expect(
      sniffImage(new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WAVE")])),
    ).toBeNull();
  });
});

describe("shownAvatar", () => {
  it("shows only Ledge's own photo address", () => {
    expect(shownAvatar("/api/avatar?v=3")).toBe("/api/avatar?v=3");
    expect(shownAvatar("https://lh3.googleusercontent.com/a/abc")).toBeNull();
    expect(shownAvatar(null)).toBeNull();
  });
});

describe("initials", () => {
  it("takes the first and last word", () => {
    expect(initials("Sam Rao")).toBe("SR");
    expect(initials("  maya  ")).toBe("M");
    expect(initials("Anil Kumar Reddy")).toBe("AR");
    expect(initials("")).toBe("?");
  });
});

describe("cropSquare", () => {
  it("centres the short side at zoom 1", () => {
    expect(cropSquare(400, 200, 1, 0, 0)).toEqual({ x: 100, y: 0, side: 200 });
  });
  it("shrinks the square as you zoom and slides it within the photo", () => {
    expect(cropSquare(400, 400, 2, 0, 0)).toEqual({ x: 100, y: 100, side: 200 });
    expect(cropSquare(400, 400, 2, -1, 1)).toEqual({ x: 0, y: 200, side: 200 });
    // Offsets past the edge stop at it.
    expect(cropSquare(400, 400, 2, 5, -5)).toEqual({ x: 200, y: 0, side: 200 });
  });
});
