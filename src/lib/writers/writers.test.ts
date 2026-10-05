import { test } from "node:test";
import assert from "node:assert/strict";
import { FORM_WRITERS } from "./forms.ts";
import { ask, offer, person, reason, request, toYou } from "./phrase.ts";

const texts = (slug: string, values: Record<string, string>) => FORM_WRITERS[slug].run(values, 0).map((piece) => piece.text);

test("splits names from roles the way people type them", () => {
  assert.deepEqual(person("Eunice. I am a videographer"), { name: "Eunice", role: "videographer", roleIsClause: false });
  assert.deepEqual(person("Ruth event planner"), { name: "Ruth", role: "event planner", roleIsClause: false });
  assert.deepEqual(person("Mrs Ade, owner of Crust & Co"), { name: "Mrs Ade", role: "owner of Crust & Co", roleIsClause: false });
  assert.deepEqual(person("Tolu, I run a bakery supply business"), { name: "Tolu", role: "I run a bakery supply business", roleIsClause: true });
  assert.equal(person("the manager at Shoprite").name, "");
  assert.equal(person("chidi").name, "Chidi");
});

test("rewrites about-them phrasing to talk to them", () => {
  assert.equal(reason("Because they are an event planner and might need a videographer"), "you're an event planner and might need a videographer");
  assert.equal(toYou("shooting their videos for them"), "shooting your videos");
  assert.deepEqual(offer("I want to be shooting their videos for them after an event"), { kind: "verb", text: "shoot your videos after an event" });
  assert.deepEqual(offer("cleaning services for your store"), { kind: "noun", text: "cleaning services for your store" });
  assert.deepEqual(ask("I'd like to have a quick call"), { kind: "noun", text: "a quick call" });
  assert.deepEqual(ask("meet next week"), { kind: "verb", text: "meet next week" });
  assert.equal(request("I want them to refund my 200k deposit"), "refund my 200k deposit");
});

test("the outreach email from the user test reads cleanly", () => {
  const emails = texts("cold-email", {
    me: "Eunice. I am a videographer",
    them: "Ruth event planner",
    why: "Because they are an event planner and might need a videographer",
    ask: "I want to be shooting their videos for them after an event",
    proof: "I'm very good and I edit well and deliver exceptional work",
  });
  for (const email of emails) {
    assert.doesNotMatch(email, /because because|open to I want|arrange I want|Eunice\. I am/i);
    assert.doesNotMatch(email, /\bthey are\b|\btheir\b/i);
    assert.match(email, /Ruth,/);
    assert.match(email, /\nEunice$/);
  }
  assert.match(emails[0], /I'm Eunice, a videographer\./);
  assert.match(emails[0], /shoot your videos after an event/);
});

test("other writers no longer paste raw answers into sentences", () => {
  assert.doesNotMatch(texts("ad-copy", { product: "I sell hair products", benefit: "it makes your hair grow fast" }).join("\n"), /I sell|means it/);
  assert.match(texts("letters", { to: "The Manager", subject: "deposit", request: "I want them to refund my deposit" })[0], /request that you refund my deposit/);
  const remarks = texts("remarks", { name: "Tunde", strength: "he is good at maths", next: "he needs to stop talking in class" }).join("\n");
  assert.match(remarks, /Tunde is good at maths/);
  assert.doesNotMatch(remarks, /he is|needs to/);
  assert.doesNotMatch(texts("captions", { product: "Ankara dresses", feel: "you will look like a queen" }).join("\n"), /Made for you|That's what/);
});
