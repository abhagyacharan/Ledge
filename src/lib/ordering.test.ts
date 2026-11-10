import { describe, expect, it } from "vitest";
import {
  positionAtEnd,
  positionBetween,
  positionForIndex,
  positionForStep,
  sortByPosition,
} from "./ordering";

function seed(n: number) {
  const items: { id: string; position: string }[] = [];
  let last: string | null = null;
  for (let i = 0; i < n; i++) {
    last = positionAtEnd(last);
    items.push({ id: `item-${i}`, position: last });
  }
  return items;
}

const order = (items: { id: string; position: string }[]) => sortByPosition(items).map((i) => i.id);

describe("positions", () => {
  it("positionAtEnd keeps growing", () => {
    const items = seed(30);
    expect(order(items)).toEqual(items.map((i) => i.id));
  });

  it("positionBetween sorts between its neighbours", () => {
    const [a, b] = seed(2);
    const mid = positionBetween(a.position, b.position);
    expect(mid > a.position && mid < b.position).toBe(true);
  });

  it("positionBetween works at either end and when empty", () => {
    const [a] = seed(1);
    expect(positionBetween(null, a.position) < a.position).toBe(true);
    expect(positionBetween(a.position, null) > a.position).toBe(true);
    expect(typeof positionBetween(null, null)).toBe("string");
  });

  it("can insert between the same two neighbours many times", () => {
    const [a, b] = seed(2);
    let upper = b.position;
    for (let i = 0; i < 50; i++) {
      const next = positionBetween(a.position, upper);
      expect(next > a.position && next < upper).toBe(true);
      upper = next;
    }
  });
});

describe("sortByPosition", () => {
  it("compares as plain strings and does not mutate the input", () => {
    const input = [
      { position: "b0" },
      { position: "a0" },
      { position: "Zz" }, // uppercase sorts before lowercase in the fractional-index alphabet
    ];
    const copy = [...input];
    expect(sortByPosition(input).map((i) => i.position)).toEqual(["Zz", "a0", "b0"]);
    expect(input).toEqual(copy);
  });
});

describe("positionForStep", () => {
  it("moves an item up one place", () => {
    const items = seed(4);
    const next = positionForStep(items, "item-2", "up");
    expect(next).not.toBeNull();
    const moved = items.map((i) => (i.id === "item-2" ? { ...i, position: next! } : i)); // checked above
    expect(order(moved)).toEqual(["item-0", "item-2", "item-1", "item-3"]);
  });

  it("moves an item down one place", () => {
    const items = seed(4);
    const next = positionForStep(items, "item-1", "down");
    const moved = items.map((i) => (i.id === "item-1" ? { ...i, position: next! } : i)); // not null: not last
    expect(order(moved)).toEqual(["item-0", "item-2", "item-1", "item-3"]);
  });

  it("moves to the very top and very bottom", () => {
    const items = seed(3);
    const up = positionForStep(items, "item-1", "up");
    const down = positionForStep(items, "item-1", "down");
    expect(order(items.map((i) => (i.id === "item-1" ? { ...i, position: up! } : i)))[0]).toBe(
      "item-1",
    ); // not first
    expect(
      order(items.map((i) => (i.id === "item-1" ? { ...i, position: down! } : i))).at(-1),
    ).toBe("item-1"); // not last
  });

  it("returns null at the edges and for an unknown id", () => {
    const items = seed(3);
    expect(positionForStep(items, "item-0", "up")).toBeNull();
    expect(positionForStep(items, "item-2", "down")).toBeNull();
    expect(positionForStep(items, "nope", "up")).toBeNull();
    expect(positionForStep(seed(1), "item-0", "down")).toBeNull();
  });

  it("works on unsorted input", () => {
    const items = seed(3).reverse();
    const next = positionForStep(items, "item-1", "up");
    const moved = items.map((i) => (i.id === "item-1" ? { ...i, position: next! } : i)); // not first
    expect(order(moved)).toEqual(["item-1", "item-0", "item-2"]);
  });
});

describe("positionForIndex", () => {
  it.each([0, 1, 2, 3, 4])("places an item at index %i among the others", (target) => {
    const items = seed(5);
    const moving = items[2];
    const position = positionForIndex(items, moving.id, target);
    const moved = items.map((i) => (i.id === moving.id ? { ...i, position } : i));
    const others = items.filter((i) => i.id !== moving.id).map((i) => i.id);
    const expected = [...others.slice(0, target), moving.id, ...others.slice(target)];
    expect(order(moved)).toEqual(expected);
  });

  it("clamps an out-of-range index", () => {
    const items = seed(3);
    const position = positionForIndex(items, "item-0", 99);
    const moved = items.map((i) => (i.id === "item-0" ? { ...i, position } : i));
    expect(order(moved).at(-1)).toBe("item-0");
    expect(
      order(
        items.map((i) =>
          i.id === "item-1" ? { ...i, position: positionForIndex(items, "item-1", -5) } : i,
        ),
      )[0],
    ).toBe("item-1");
  });
});
