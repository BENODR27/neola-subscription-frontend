export interface ConsoleNavigationItem {
  key: string;
  label: string;
  icon: string;
}

/** Commercial console sections. ERP identity administration belongs only to IAM. */
export function consoleNavigation(role: string): ConsoleNavigationItem[] {
  const items = [
    { key: "guide", label: "Getting started", icon: "⌂" },
    { key: "plans", label: "Plans", icon: "▦" },
    { key: "requests", label: "Requests & approvals", icon: "✓" },
    { key: "subscriptions", label: "Subscriptions", icon: "◷" },
    { key: "instances", label: "ERP instances", icon: "◇" },
    { key: "customers", label: "Customers", icon: "◎" },
    { key: "audit", label: "Activity", icon: "≡" },
  ];
  if (["platform_owner", "platform_staff"].includes(role)) {
    items.push(
      { key: "applications", label: "Applications", icon: "▤" },
      { key: "permissions", label: "License permissions", icon: "⊞" },
      { key: "instance-tools", label: "Instance keys", icon: "◇" },
    );
  }
  if (role === "platform_owner")
    items.push({ key: "operators", label: "Console staff", icon: "♙" });
  items.push(
    { key: "account", label: "Account & security", icon: "⚿" },
    { key: "billing", label: "Invoices", icon: "▤" },
  );
  return items;
}
