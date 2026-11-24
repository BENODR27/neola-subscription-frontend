import { Component, effect, inject, input, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DatePipe, CurrencyPipe } from "@angular/common";
import {
  ControlFacade,
  Customer,
  Instance,
  Plan,
  PurchaseRequest,
  Subscription,
  AuditEvent,
} from "./control.facade";

@Component({
  selector: "app-commerce",
  imports: [FormsModule, DatePipe, CurrencyPipe],
  template: `
    <section class="page-heading">
      <p class="eyebrow">Subscription management</p>
      <h1>{{ title() }}</h1>
      <p>{{ description() }}</p>
    </section>
    @if (error()) {
      <p class="alert error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert success" role="status">{{ notice() }}</p>
    }
    @if (activationKey()) {
      <section class="panel secret">
        <h2>Save the activation key now</h2>
        <p>
          This is the only time the key is displayed. Store it in your ERP
          server’s secret configuration.
        </p>
        <code>{{ activationKey() }}</code
        ><button class="secondary" (click)="activationKey.set('')">
          I have saved the key
        </button>
      </section>
    }
    @if (section() === "plans") {
      <div class="plan-grid">
        @for (plan of plans(); track plan.id) {
          <article class="panel plan-card">
            <p class="eyebrow">Version {{ plan.version }}</p>
            <h2>{{ plan.name }}</h2>
            <p>{{ plan.description }}</p>
            <p class="price">
              {{
                api.majorUnits(plan.price_minor, plan.currency)
                  | currency: plan.currency
              }}<small> / {{ plan.duration_months }} month(s)</small>
            </p>
            <p>
              {{ plan.max_users }} ERP users · {{ plan.trial_days }} trial days
            </p>
            <p>{{ plan.entitlements.applications.join(", ") }}</p>
            <button class="primary" (click)="selectPlan(plan)">
              Select plan
            </button>
          </article>
        }
      </div>
    }
    @if (section() === "requests" && canRequest()) {
      <form class="panel form-grid" (ngSubmit)="request()">
        <h2 class="span-all">Request a plan</h2>
        <label
          >ERP instance<select
            name="requestInstance"
            [(ngModel)]="instanceId"
            required
          >
            <option value="">Choose instance</option>
            @for (i of instanceOptions(); track i.id) {
              <option [value]="i.id">{{ i.name }}</option>
            }
          </select></label
        >
        <label
          >Published plan<select
            name="requestPlan"
            [(ngModel)]="planId"
            required
          >
            <option value="">Choose plan</option>
            @for (p of planOptions(); track p.id) {
              <option [value]="p.id">
                {{ p.name }} · {{ p.currency }}
                {{ api.majorUnits(p.price_minor, p.currency) }}
              </option>
            }
          </select></label
        >
        <label
          >Request type<select name="kind" [(ngModel)]="kind">
            <option value="purchase">Purchase</option>
            <option value="trial">Trial</option>
          </select></label
        >
        <label
          >Activation<select name="renewalMode" [(ngModel)]="renewalMode">
            <option value="immediate">Activate after approval</option>
            <option value="after_current_term">
              Renew after the current term
            </option>
          </select></label
        >
        <div class="form-action">
          <button class="primary" [disabled]="busy()">
            Submit for approval
          </button>
        </div>
      </form>
    }
    @if (section() === "instances" && staff()) {
      <form class="panel form-grid" (ngSubmit)="createInstance()">
        <h2 class="span-all">Provision an ERP instance</h2>
        <label
          >Customer<select name="customer" [(ngModel)]="customerId" required>
            <option value="">Choose customer</option>
            @for (c of customerOptions(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select></label
        ><label
          >Instance name<input
            name="instanceName"
            [(ngModel)]="name"
            required /></label
        ><label
          >IAM API origin<input
            name="origin"
            [(ngModel)]="origin"
            placeholder="https://erp-api.customer.example"
        /></label>
        <div class="form-action">
          <button class="primary" [disabled]="busy()">Create instance</button>
        </div>
        <small class="span-all"
          >The origin must be allowed in the subscription backend
          configuration.</small
        >
      </form>
    }
    @if (reviewing()) {
      <section class="panel">
        <form class="form-grid" (ngSubmit)="review()">
          <h2 class="span-all">
            Review {{ reviewing()?.plan_snapshot?.name }}
          </h2>
          <p class="span-all">
            {{ reviewing()?.kind }} request · Current status:
            {{ reviewing()?.status }}
          </p>
          <label
            >Decision<select name="decision" [(ngModel)]="decision">
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
            </select></label
          ><label
            >Manual payment reference<input
              name="payment"
              [(ngModel)]="paymentReference"
              maxlength="255" /></label
          ><label class="span-all"
            >Review note<textarea
              name="note"
              [(ngModel)]="note"
              required
              maxlength="4000"
            ></textarea>
          </label>
          <div class="actions span-all">
            <button class="primary" [disabled]="busy()">Record decision</button
            ><button
              type="button"
              class="secondary"
              (click)="reviewing.set(null)"
            >
              Close
            </button>
          </div>
        </form>
      </section>
    }
    @if (statusSubscription()) {
      <form class="panel form-grid" (ngSubmit)="changeSubscription()">
        <h2 class="span-all">Change subscription status</h2>
        <label
          >Status<select name="subStatus" [(ngModel)]="subscriptionStatus">
            <option value="suspended">Suspend</option>
            <option value="active">Resume</option>
            <option value="cancelled">Cancel permanently</option>
          </select></label
        ><label
          >Reason<textarea
            name="statusNote"
            [(ngModel)]="note"
            required
          ></textarea>
        </label>
        <div class="actions">
          <button class="primary" [disabled]="busy()">Save status</button
          ><button
            class="secondary"
            type="button"
            (click)="statusSubscription.set(null)"
          >
            Close
          </button>
        </div>
      </form>
    }
    <section class="panel records" [attr.aria-busy]="busy()">
      @if (busy()) {
        <p role="status">Loading…</p>
      }
      @if (!busy() && total() === 0) {
        <div class="empty">
          <h2>No records yet</h2>
          <p>{{ emptyText() }}</p>
        </div>
      }
      @if (section() !== "plans" && total() > 0) {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{{ section() === "audit" ? "Action" : "Name / plan" }}</th>
                <th>Details</th>
                <th>Status / date</th>
                <th><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @switch (section()) {
                @case ("customers") {
                  @for (c of customers(); track c.id) {
                    <tr>
                      <td>{{ c.name }}</td>
                      <td>{{ c.contact_email }}</td>
                      <td>
                        <span class="badge">{{ c.status }}</span>
                      </td>
                      <td>
                        @if (staff()) {
                          <div class="actions">
                            <button
                              class="secondary"
                              [disabled]="busy()"
                              (click)="
                                customerStatus(
                                  c,
                                  c.status === 'suspended'
                                    ? 'active'
                                    : 'suspended'
                                )
                              "
                            >
                              {{
                                c.status === "suspended"
                                  ? "Activate"
                                  : "Suspend"
                              }}
                            </button>
                          </div>
                        }
                      </td>
                    </tr>
                  }
                }
                @case ("instances") {
                  @for (i of instances(); track i.id) {
                    <tr>
                      <td>
                        {{ i.name }}<small class="mono">{{ i.id }}</small>
                      </td>
                      <td>{{ i.api_origin || "Not connected" }}</td>
                      <td>
                        <span class="badge">{{
                          i.enabled ? "Enabled" : "Disabled"
                        }}</span>
                      </td>
                      <td>
                        @if (staff()) {
                          <button
                            class="secondary"
                            [disabled]="busy()"
                            (click)="importCatalog(i)"
                          >
                            Import catalog</button
                          ><button
                            class="secondary"
                            [disabled]="busy()"
                            (click)="toggleInstance(i)"
                          >
                            {{ i.enabled ? "Disable" : "Enable" }}
                          </button>
                        }
                      </td>
                    </tr>
                  }
                }
                @case ("requests") {
                  @for (r of requests(); track r.id) {
                    <tr>
                      <td>
                        {{ r.plan_snapshot.name
                        }}<small
                          >{{ r.kind }} · v{{ r.plan_snapshot.version }}</small
                        >
                      </td>
                      <td>
                        {{ r.created_at | date: "mediumDate"
                        }}<small>{{ r.review_note }}</small>
                      </td>
                      <td>
                        <span class="badge">{{ r.status }}</span>
                      </td>
                      <td>
                        @if (r.status === "pending") {
                          @if (canReview()) {
                            <button class="secondary" (click)="openReview(r)">
                              Review
                            </button>
                          }
                          @if (canRequest()) {
                            <button
                              class="quiet"
                              [disabled]="busy()"
                              (click)="cancel(r)"
                            >
                              Cancel request
                            </button>
                          }
                        }
                      </td>
                    </tr>
                  }
                }
                @case ("subscriptions") {
                  @for (sub of subscriptions(); track sub.id) {
                    <tr>
                      <td>
                        {{ sub.plan_snapshot.name
                        }}<small
                          >{{ sub.kind }} ·
                          {{ sub.plan_snapshot.max_users }} users</small
                        >
                      </td>
                      <td>
                        {{ sub.starts_at | date: "mediumDate" }} –
                        {{ sub.ends_at | date: "mediumDate" }}
                      </td>
                      <td>
                        <span class="badge">{{ sub.effective_status }}</span>
                      </td>
                      <td>
                        @if (
                          canReview() &&
                          ["active", "suspended", "scheduled"].includes(
                            sub.effective_status
                          )
                        ) {
                          <button class="secondary" (click)="openStatus(sub)">
                            Change status
                          </button>
                        }
                      </td>
                    </tr>
                  }
                }
                @case ("audit") {
                  @for (e of events(); track e.id) {
                    <tr>
                      <td>{{ e.action }}</td>
                      <td class="mono wrap">{{ e.target_id }}</td>
                      <td>{{ e.created_at | date: "medium" }}</td>
                      <td></td>
                    </tr>
                  }
                }
              }
            </tbody>
          </table>
        </div>
      }
      <footer class="pager">
        <span
          >{{ total() }} records · Page {{ page() }} of {{ pages() || 1 }}</span
        >
        <div class="actions">
          <button
            class="secondary"
            [disabled]="busy() || page() <= 1"
            (click)="load(page() - 1)"
          >
            Previous</button
          ><button
            class="secondary"
            [disabled]="busy() || page() >= pages()"
            (click)="load(page() + 1)"
          >
            Next
          </button>
        </div>
      </footer>
    </section>
  `,
})
export class CommerceComponent {
  readonly api = inject(ControlFacade);
  readonly section = input.required<string>();
  readonly customers = signal<Customer[]>([]);
  readonly instances = signal<Instance[]>([]);
  readonly plans = signal<Plan[]>([]);
  readonly requests = signal<PurchaseRequest[]>([]);
  readonly subscriptions = signal<Subscription[]>([]);
  readonly events = signal<AuditEvent[]>([]);
  readonly customerOptions = signal<Customer[]>([]);
  readonly instanceOptions = signal<Instance[]>([]);
  readonly planOptions = signal<Plan[]>([]);
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly busy = signal(false);
  readonly error = signal("");
  readonly notice = signal("");
  readonly activationKey = signal("");
  readonly reviewing = signal<PurchaseRequest | null>(null);
  readonly statusSubscription = signal<Subscription | null>(null);
  customerId = "";
  instanceId = "";
  planId = this.api.selectedPlan();
  kind = "purchase";
  renewalMode = "immediate";
  name = "";
  origin = "";
  decision = "approved";
  note = "";
  paymentReference = "";
  subscriptionStatus = "suspended";
  private generation = 0;
  constructor() {
    effect(() => {
      const section = this.section();
      this.reviewing.set(null);
      this.statusSubscription.set(null);
      this.error.set("");
      this.notice.set("");
      this.activationKey.set("");
      void this.load(1, section);
      void this.options(section);
    });
  }
  staff(): boolean {
    return ["platform_owner", "platform_staff"].includes(
      this.api.account()?.role || "",
    );
  }
  canRequest(): boolean {
    return this.api.account()?.role !== "approver";
  }
  canReview(): boolean {
    return ["platform_owner", "approver"].includes(
      this.api.account()?.role || "",
    );
  }
  title(): string {
    return (
      (
        {
          requests: "Requests & approvals",
          subscriptions: "Subscriptions",
          instances: "ERP instances",
          customers: "Customers",
          plans: "Choose your plan",
          audit: "Activity history",
        } as Record<string, string>
      )[this.section()] || ""
    );
  }
  description(): string {
    return this.section() === "plans"
      ? "Select the applications and access your organization needs. Purchases and trials require manual approval."
      : "Review current records and track every change.";
  }
  emptyText(): string {
    return this.section() === "instances"
      ? "A platform operator must provision your dedicated ERP instance before you can request access."
      : "Records appear here after a request or configuration is saved.";
  }
  async load(page: number, resource = this.section()): Promise<void> {
    const generation = ++this.generation;
    this.busy.set(true);
    this.error.set("");
    try {
      const read = async <T>(target: { set(items: T[]): void }) => {
        const result = await this.api.page<T>(resource, page);
        if (generation === this.generation) target.set(result.items);
        return result;
      };
      let result: { page: number; total: number; totalPages: number };
      switch (resource) {
        case "customers":
          result = await read(this.customers);
          break;
        case "instances":
          result = await read(this.instances);
          break;
        case "plans":
          result = await read(this.plans);
          break;
        case "requests":
          result = await read(this.requests);
          break;
        case "subscriptions":
          result = await read(this.subscriptions);
          break;
        case "audit":
          result = await read(this.events);
          break;
        default:
          throw new Error("Unknown console section");
      }
      if (generation !== this.generation) return;
      this.page.set(result.page);
      this.total.set(result.total);
      this.pages.set(result.totalPages);
    } catch (e) {
      if (generation === this.generation) this.error.set(this.api.message(e));
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  async options(section: string): Promise<void> {
    try {
      if (section === "requests") {
        const [i, p] = await Promise.all([
          this.api.options<Instance>("instances"),
          this.api.options<Plan>("plans"),
        ]);
        this.instanceOptions.set(i.filter((r) => r.enabled));
        this.planOptions.set(p.filter((r) => r.published));
      }
      if (section === "instances" && this.staff())
        this.customerOptions.set(await this.api.options<Customer>("customers"));
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
  async perform(work: () => Promise<unknown>, message: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.notice.set("");
    try {
      await work();
      this.notice.set(message);
      await this.load(this.page());
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  selectPlan(plan: Plan): void {
    this.planId = plan.id;
    this.api.selectedPlan.set(plan.id);
    this.notice.set(
      `${plan.name} selected. Open Requests & approvals to submit your request.`,
    );
  }
  importCatalog(instance: Instance): Promise<void> {
    return this.perform(
      () => this.api.importCatalog(instance.id),
      "Missing catalog definitions imported. Existing definitions were preserved.",
    );
  }
  request(): Promise<void> {
    return this.perform(
      () =>
        this.api.createRequest({
          instance_id: this.instanceId,
          plan_id: this.planId,
          kind: this.kind,
          renewal_mode: this.renewalMode,
        }),
      "Request submitted for manual approval.",
    );
  }
  createInstance(): Promise<void> {
    return this.perform(async () => {
      const result = await this.api.createInstance({
        customer_id: this.customerId,
        name: this.name,
        api_origin: this.origin,
      });
      this.activationKey.set(result.activation_key);
      this.name = "";
    }, "ERP instance created.");
  }
  customerStatus(customer: Customer, status: string): Promise<void> {
    return this.perform(
      () => this.api.setCustomerStatus(customer.id, status),
      "Customer status updated.",
    );
  }
  toggleInstance(instance: Instance): Promise<void> {
    return this.perform(
      () =>
        this.api.updateInstance(instance.id, {
          ...instance,
          enabled: !instance.enabled,
        }),
      "Instance updated.",
    );
  }
  openReview(request: PurchaseRequest): void {
    this.reviewing.set(request);
    this.note = "";
    this.paymentReference = "";
    this.decision = "approved";
  }
  review(): Promise<void> {
    return this.perform(async () => {
      await this.api.reviewRequest(this.reviewing()!.id, {
        decision: this.decision,
        note: this.note,
        payment_reference: this.paymentReference,
      });
      this.reviewing.set(null);
    }, "Review recorded.");
  }
  cancel(request: PurchaseRequest): Promise<void> {
    return this.perform(
      () => this.api.cancelRequest(request.id),
      "Request cancelled.",
    );
  }
  openStatus(sub: Subscription): void {
    this.statusSubscription.set(sub);
    this.note = "";
    this.subscriptionStatus =
      sub.effective_status === "active" ? "suspended" : "active";
  }
  changeSubscription(): Promise<void> {
    return this.perform(async () => {
      await this.api.setSubscriptionStatus(this.statusSubscription()!.id, {
        status: this.subscriptionStatus,
        note: this.note,
      });
      this.statusSubscription.set(null);
    }, "Subscription status updated.");
  }
}
