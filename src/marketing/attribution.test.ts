import { describe, expect, it } from "vitest";
import { tagsFrom } from "./attribution";
import { readAttribution } from "../../functions/src/waitlistModel";

describe("which link brought the visitor", () => {
  it("reads the Instagram link-in-bio", () => {
    expect(tagsFrom("?utm_source=instagram")).toEqual({ source: "instagram" });
    expect(tagsFrom("?ref=Instagram")).toEqual({ source: "instagram" });
    expect(tagsFrom("?utm_source=instagram&utm_medium=social&utm_campaign=launch-1"))
      .toEqual({ source: "instagram", medium: "social", campaign: "launch-1" });
  });

  it("utm_source wins over ref, and no tags is null", () => {
    expect(tagsFrom("?ref=x&utm_source=instagram")).toEqual({ source: "instagram" });
    expect(tagsFrom("")).toBeNull();
    expect(tagsFrom("?fbclid=abc")).toBeNull();
  });

  it("the server narrows it again: known keys only, safe characters, bounded length", () => {
    expect(readAttribution({ source: "Instagram", extra: "x", medium: "<script>" }))
      .toEqual({ source: "instagram", medium: "script" });
    expect(readAttribution({ source: "a".repeat(500) })?.source).toHaveLength(60);
    expect(readAttribution({ source: "!!!" })).toBeNull();
    expect(readAttribution("instagram")).toBeNull();
    expect(readAttribution(["instagram"])).toBeNull();
    expect(readAttribution(null)).toBeNull();
  });

  it("the client and server agree on the cleaned value", () => {
    const fromUrl = tagsFrom("?utm_source=Insta%20Gram!&utm_campaign=Oct%2031");
    expect(readAttribution(fromUrl)).toEqual(fromUrl);
  });
});
