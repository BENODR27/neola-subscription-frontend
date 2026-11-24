import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

export interface Account {
  id: string;
  username: string;
  display_name: string;
  role: "platform_owner" | "platform_staff" | "approver" | "customer_owner";
  customer_id: string | null;
}
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface Entitlements {
  applications: string[];
  permissions: string[];
}
export interface Plan {
  id: string;
  name: string;
  description: string;
  price_minor: string | number;
  currency: string;
  duration_months: number;
  trial_days: number;
  max_users: number;
  entitlements: Entitlements;
  published: boolean;
  version: number;
}
export interface Customer {
  id: string;
  name: string;
  contact_email: string;
  status: string;
}
export interface Instance {
  id: string;
  customer_id: string;
  name: string;
  api_origin: string | null;
  enabled: boolean;
}
export interface Application {
  code: string;
  name: string;
  description: string;
  icon: string;
  landing_route: string;
  required_permission: string;
  navigation: Navigation[];
  enabled: boolean;
}
export interface Navigation {
  label: string;
  link: string;
  icon: string;
  permission: string;
}
export interface Permission {
  code: string;
  application_code: string;
  description: string;
  enabled: boolean;
}
export interface PurchaseRequest {
  id: string;
  customer_id: string;
  instance_id: string;
  kind: string;
  status: string;
  plan_snapshot: Plan;
  created_at: string;
  review_note: string | null;
}
export interface Subscription {
  id: string;
  customer_id: string;
  instance_id: string;
  kind: string;
  effective_status: string;
  plan_snapshot: Plan;
  starts_at: string;
  ends_at: string;
}
export interface AuditEvent {
  id: string;
  action: string;
  target_id: string;
  created_at: string;
}
export interface Operator {
  id: string;
  username: string;
  display_name: string;
  role: string;
  enabled: boolean;
}
@Injectable({ providedIn: "root" })
export class ControlFacade {
  majorUnits(minor: string | number, currency: string): number {
    const digits =
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2;
    return Number(minor) / 10 ** digits;
  }

  security<T>(
    action:
      | "forgot-password"
      | "reset-password"
      | "verify-email"
      | "email"
      | "resend-verification"
      | "mfa/setup"
      | "mfa/confirm"
      | "mfa/disable",
    values: unknown = {},
  ): Promise<T> {
    return this.write(
      `/account/${action}`,
      values,
      action === "email" ? "PUT" : "POST",
    );
  }
  securityStatus(): Promise<{
    email: string | null;
    email_verified: boolean;
    mfa_enabled: boolean;
    development_outbox: boolean;
  }> {
    return this.get("/account/security");
  }
  localInbox(): Promise<{
    items: { id: string; kind: string; url: string }[];
  }> {
    return this.get("/account/development-inbox");
  }
  rotateKey(
    id: string,
    action: "stage" | "commit" | "cancel",
  ): Promise<{ message: string; activation_key?: string }> {
    return this.write(
      `/instances/${id}/key-rotation${action === "stage" ? "" : "/" + action}`,
      {},
    );
  }
  private readonly http = inject(HttpClient);
  private csrf = "";
  readonly account = signal<Account | null>(null);
  readonly selectedPlan = signal("");
  private readonly base = "/api/control";
  async restore(): Promise<void> {
    try {
      this.accept(
        await this.get<{ user: Account; csrfToken: string }>("/auth/session"),
      );
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && error.status === 401))
        throw error;
    }
  }
  private accept(session: { user: Account; csrfToken: string }): void {
    this.account.set(session.user);
    this.csrf = session.csrfToken;
  }
  async login(
    username: string,
    password: string,
    mfa_code = "",
  ): Promise<void> {
    this.accept(
      await this.write<{ user: Account; csrfToken: string }>("/auth/login", {
        username,
        password,
        mfa_code,
      }),
    );
  }
  async logout(): Promise<void> {
    await this.write("/auth/logout", {});
    this.account.set(null);
    this.csrf = "";
  }
  register(values: {
    username: string;
    password: string;
    name: string;
    display_name: string;
    email: string;
  }): Promise<{ message: string }> {
    return this.write("/auth/register", values);
  }
  saveApplication(
    code: string,
    values: Omit<Application, "code">,
  ): Promise<{ message: string }> {
    return this.write(
      `/applications/${encodeURIComponent(code)}`,
      values,
      "PUT",
    );
  }
  savePermission(
    code: string,
    values: Omit<Permission, "code">,
  ): Promise<{ message: string }> {
    return this.write(
      `/permissions/${encodeURIComponent(code)}`,
      values,
      "PUT",
    );
  }
  savePlan(
    id: string,
    values: Omit<Plan, "id" | "version">,
  ): Promise<{ id: string }> {
    return this.write(
      `/plans${id ? "/" + id : ""}`,
      values,
      id ? "PUT" : "POST",
    );
  }
  createOperator(values: {
    username: string;
    display_name: string;
    password: string;
    role: string;
  }): Promise<{ id: string }> {
    return this.write("/operators", values);
  }
  enableOperator(id: string): Promise<{ message: string }> {
    return this.write("/operators/" + id + "/enable", {});
  }
  saveOperator(
    id: string,
    values: {
      username: string;
      display_name: string;
      password: string;
      role: string;
    },
  ): Promise<unknown> {
    return id
      ? this.write("/operators/" + id, values, "PUT")
      : this.createOperator(values);
  }
  disableOperator(id: string): Promise<{ message: string }> {
    return this.write(`/operators/${id}/disable`, {});
  }
  createRequest(values: {
    instance_id: string;
    plan_id: string;
    kind: string;
    renewal_mode?: string;
  }): Promise<{ id: string }> {
    return this.write("/requests", values);
  }
  createInstance(values: {
    customer_id: string;
    name: string;
    api_origin: string;
  }): Promise<{ id: string; activation_key: string }> {
    return this.write("/instances", values);
  }
  updateInstance(id: string, values: Instance): Promise<{ message: string }> {
    return this.write(`/instances/${id}`, values, "PATCH");
  }
  setCustomerStatus(id: string, status: string): Promise<{ message: string }> {
    return this.write(`/customers/${id}`, { status }, "PATCH");
  }
  importCatalog(id: string): Promise<{ message: string }> {
    return this.write(`/instances/${id}/import-catalog`, {});
  }
  reviewRequest(
    id: string,
    values: { decision: string; note: string; payment_reference: string },
  ): Promise<{ message: string }> {
    return this.write(`/requests/${id}/review`, values);
  }
  cancelRequest(id: string): Promise<{ message: string }> {
    return this.write(`/requests/${id}/cancel`, {});
  }
  setSubscriptionStatus(
    id: string,
    values: { status: string; note: string },
  ): Promise<{ message: string }> {
    return this.write(`/subscriptions/${id}/status`, values);
  }
  private get<T>(path: string): Promise<T> {
    return firstValueFrom(
      this.http.get<T>(this.base + path, { withCredentials: true }),
    );
  }
  private write<T = { message: string }>(
    path: string,
    body: unknown,
    method: "POST" | "PUT" | "PATCH" = "POST",
  ): Promise<T> {
    return firstValueFrom(
      this.http.request<T>(method, this.base + path, {
        body,
        withCredentials: true,
        headers: this.csrf ? { "X-CSRF-Token": this.csrf } : {},
      }),
    );
  }
  page<T>(resource: string, page = 1): Promise<Page<T>> {
    return this.get(`/${resource}?page=${page}&pageSize=12`);
  }
  async options<T>(resource: string): Promise<T[]> {
    const records: T[] = [];
    for (let page = 1; ; page++) {
      const result = await this.get<Page<T>>(
        `/${resource}?page=${page}&pageSize=100`,
      );
      records.push(...result.items);
      if (page >= result.totalPages) return records;
    }
  }
  message(error: unknown): string {
    return error instanceof HttpErrorResponse
      ? error.error?.message || "The service is unavailable. Please try again."
      : error instanceof Error
        ? error.message
        : "The request could not be completed";
  }
}
