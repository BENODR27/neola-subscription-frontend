const test = require("node:test");
const assert = require("node:assert/strict");
const { consoleNavigation } = require("../src/app/console-navigation.ts");

test("every console account keeps commercial workflows without duplicate ERP identity screens", () => {
  for (const role of [
    "platform_owner",
    "platform_staff",
    "approver",
    "customer_owner",
  ]) {
    const menu = consoleNavigation(role),
      keys = menu.map((item) => item.key);
    assert.equal(new Set(keys).size, keys.length);
    for (const key of [
      "plans",
      "requests",
      "subscriptions",
      "instances",
      "account",
      "billing",
    ])
      assert.ok(keys.includes(key), role + ": missing " + key);
    for (const key of [
      "erp-users",
      "customer-roles",
      "users",
      "roles",
      "access-scopes",
    ])
      assert.ok(
        !keys.includes(key),
        role + ": duplicate ERP management " + key,
      );
    assert.equal(keys.includes("operators"), role === "platform_owner");
    for (const key of ["applications", "permissions", "instance-tools"])
      assert.equal(
        keys.includes(key),
        ["platform_owner", "platform_staff"].includes(role),
      );
  }
});

test("console catalog and staff labels distinguish licensing from ERP access management", () => {
  const menu = consoleNavigation("platform_owner");
  assert.equal(
    menu.find((item) => item.key === "permissions").label,
    "License permissions",
  );
  assert.equal(
    menu.find((item) => item.key === "operators").label,
    "Console staff",
  );
  assert.equal(
    menu.find((item) => item.key === "instance-tools").label,
    "Instance keys",
  );
});
