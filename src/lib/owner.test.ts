import { test, expect } from "bun:test";
import { ownsIt, namesIn } from "./owner";

test("Everyone matches everything, including nobody's work", () => {
  expect(ownsIt("Jaco", "Everyone")).toBe(true);
  expect(ownsIt("Unassigned", "Everyone")).toBe(true);
});

test("a shared task belongs to both of them", () => {
  // The whole reason this file exists: filtering to Jaco used to hide this row.
  expect(ownsIt("JoJo + Jaco", "Jaco")).toBe(true);
  expect(ownsIt("JoJo + Jaco", "JoJo")).toBe(true);
});

test("other separators count too", () => {
  expect(ownsIt("Jaco & JoJo", "JoJo")).toBe(true);
  expect(ownsIt("Jaco, JoJo", "Jaco")).toBe(true);
  expect(ownsIt("Jaco and JoJo", "JoJo")).toBe(true);
});

test("someone else's task is not yours", () => {
  expect(ownsIt("JoJo", "Jaco")).toBe(false);
  expect(ownsIt("Unassigned", "Jaco")).toBe(false);
});

test("a name inside another name does not match", () => {
  expect(ownsIt("JoJo", "Jo")).toBe(false);
  expect(ownsIt("Jocelyn", "Jo")).toBe(false);
});

test("case does not matter", () => {
  expect(ownsIt("jojo + jaco", "JoJo")).toBe(true);
});

test("a name with regex characters is matched literally, not compiled", () => {
  expect(ownsIt("A+B", "A+B")).toBe(true);
  expect(() => ownsIt("Jaco", "(")).not.toThrow();
});

test("names are split out of a shared owner", () => {
  expect(namesIn("JoJo + Jaco")).toEqual(["JoJo", "Jaco"]);
  expect(namesIn("Jaco")).toEqual(["Jaco"]);
});
