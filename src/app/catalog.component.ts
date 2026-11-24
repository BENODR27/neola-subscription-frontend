import { Component, effect, inject, input, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  ControlFacade,
  Application,
  Permission,
  Plan,
  Operator,
  Navigation,
} from "./control.facade";
@Component({
  selector: "app-catalog",
  imports: [FormsModule],
  template: `
    <section class="page-heading">
      <p class="eyebrow">Platform configuration</p>
      <h1>{{ title() }}</h1>
      @if (section() === "operators") {
        <p>
          These staff accounts sign in only to the Subscription Console. Manage
          ERP employees, roles and data access in ERP → IAM.
        </p>
      } @else if (section() === "permissions") {
        <p>
          Define the application capabilities available for licensing. Assign
          these permissions to ERP users and roles in IAM.
        </p>
      }
      <p>
        {{
          section() === "plans"
            ? "Publish explicit app and permission limits. Existing approvals retain their original plan snapshot."
            : "Use stable ERP codes so configuration stays connected across installations."
        }}
      </p>
    </section>
    @if (error()) {
      <p class="alert error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert success" role="status">{{ notice() }}</p>
    }
    <form class="panel form-grid" (ngSubmit)="save()">
      <h2 class="span-all">
        {{ editingId ? "Edit configuration" : "New configuration" }}
      </h2>
      @switch (section()) {
        @case ("applications") {
          <label
            >Application code<input
              name="code"
              [(ngModel)]="code"
              placeholder="MMMS"
              required
              [disabled]="!!editingId" /></label
          ><label>Name<input name="name" [(ngModel)]="name" required /></label
          ><label
            >Entry permission<input
              name="entryPermission"
              [(ngModel)]="entryPermission"
              placeholder="MMMS-APP"
              required /></label
          ><label
            >Landing route<input
              name="route"
              [(ngModel)]="route"
              placeholder="/mmms"
              required /></label
          ><label
            >Bootstrap icon class<input
              name="icon"
              [(ngModel)]="icon"
              placeholder="bi-tools"
              required /></label
          ><label class="span-all"
            >Description<textarea
              name="description"
              [(ngModel)]="description"
            ></textarea></label
          ><label class="span-all"
            >Navigation (JSON)<textarea
              class="code-editor"
              name="navigation"
              [(ngModel)]="navigationJson"
              rows="6"
            ></textarea
            ><small
              >List of label, link, icon and permission. Permissions must use
              the same stable codes as IAM.</small
            ></label
          ><label class="check"
            ><input
              type="checkbox"
              name="enabled"
              [(ngModel)]="enabled"
            />Application enabled</label
          >
        }
        @case ("permissions") {
          <label
            >Permission code<input
              name="code"
              [(ngModel)]="code"
              placeholder="MMMS-MACHINES-VIEW"
              required
              [disabled]="!!editingId" /></label
          ><label
            >Application<select name="appCode" [(ngModel)]="appCode" required>
              <option value="">Choose application</option>
              @for (a of appOptions(); track a.code) {
                <option [value]="a.code">{{ a.name }} · {{ a.code }}</option>
              }
            </select></label
          ><label class="span-all"
            >Description<textarea
              name="description"
              [(ngModel)]="description"
            ></textarea></label
          ><label class="check"
            ><input
              type="checkbox"
              name="enabled"
              [(ngModel)]="enabled"
            />Permission enabled</label
          >
        }
        @case ("plans") {
          <label
            >Plan name<input
              name="planName"
              [(ngModel)]="name"
              required /></label
          ><label
            >Currency<input
              name="currency"
              [(ngModel)]="currency"
              pattern="[A-Z]{3}"
              maxlength="3"
              required /></label
          ><label
            >Price in minor units<input
              name="price"
              [(ngModel)]="price"
              type="number"
              min="0"
              step="1"
              required
            /><small>For USD, 10000 = $100.00</small></label
          ><label
            >Duration (months)<input
              name="months"
              [(ngModel)]="months"
              type="number"
              min="1"
              max="36"
              required /></label
          ><label
            >Trial days<input
              name="trialDays"
              [(ngModel)]="trialDays"
              type="number"
              min="0"
              max="90"
              required /></label
          ><label
            >Maximum ERP users<input
              name="maxUsers"
              [(ngModel)]="maxUsers"
              type="number"
              min="1"
              max="100000"
              required /></label
          ><label class="span-all"
            >Description<textarea
              name="description"
              [(ngModel)]="description"
            ></textarea>
          </label>
          <fieldset class="span-all">
            <legend>Included applications</legend>
            <div class="checks">
              @for (a of appOptions(); track a.code) {
                <label
                  ><input
                    type="checkbox"
                    [name]="'app-' + a.code"
                    [checked]="selectedApps.includes(a.code)"
                    (change)="toggleApp(a.code)"
                  />{{ a.name }}</label
                >
              }
            </div>
          </fieldset>
          <fieldset class="span-all">
            <legend>Allowed permissions</legend>
            <div class="checks">
              @for (p of permissionOptions(); track p.code) {
                @if (selectedApps.includes(p.application_code)) {
                  <label
                    ><input
                      type="checkbox"
                      [name]="'permission-' + p.code"
                      [checked]="selectedPermissions.includes(p.code)"
                      (change)="togglePermission(p.code)"
                    />{{ p.code }}</label
                  >
                }
              }
            </div>
          </fieldset>
          <label class="check"
            ><input
              type="checkbox"
              name="published"
              [(ngModel)]="published"
            />Published for customers</label
          >
        }
        @case ("operators") {
          <label
            >Username<input
              name="username"
              [disabled]="!!editingId"
              [(ngModel)]="code"
              autocomplete="off"
              required /></label
          ><label
            >Display name<input
              name="displayName"
              [(ngModel)]="name"
              required /></label
          ><label
            >{{ editingId ? "New password (optional)" : "Initial password"
            }}<input
              name="password"
              [(ngModel)]="password"
              type="password"
              autocomplete="new-password"
              minlength="12"
              [required]="!editingId" /></label
          ><label
            >Console role<select name="operatorRole" [(ngModel)]="operatorRole">
              <option value="platform_staff">
                Platform staff · configure catalog & customers
              </option>
              <option value="approver">Approver · review requests</option>
              <option value="platform_owner">
                Platform owner · full control
              </option>
            </select></label
          >
        }
      }
      <div class="actions span-all">
        <button class="primary" [disabled]="busy()">
          {{ busy() ? "Saving…" : "Save configuration" }}</button
        ><button class="secondary" type="button" (click)="reset()">
          Clear form
        </button>
      </div>
    </form>
    <section class="panel records" [attr.aria-busy]="busy()">
      @if (total() === 0 && !busy()) {
        <div class="empty">
          <h2>No configuration yet</h2>
          <p>Use the form above to create the first record.</p>
        </div>
      }
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name / code</th>
              <th>Details</th>
              <th>Status</th>
              <th><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            @switch (section()) {
              @case ("applications") {
                @for (a of applications(); track a.code) {
                  <tr>
                    <td>
                      {{ a.name }}<small>{{ a.code }}</small>
                    </td>
                    <td>
                      {{ a.landing_route
                      }}<small
                        >{{ a.navigation.length }} navigation items</small
                      >
                    </td>
                    <td>{{ a.enabled ? "Enabled" : "Disabled" }}</td>
                    <td>
                      <button class="secondary" (click)="editApplication(a)">
                        Edit
                      </button>
                    </td>
                  </tr>
                }
              }
              @case ("permissions") {
                @for (p of permissions(); track p.code) {
                  <tr>
                    <td>{{ p.code }}</td>
                    <td>{{ p.application_code }}</td>
                    <td>{{ p.enabled ? "Enabled" : "Disabled" }}</td>
                    <td>
                      <button class="secondary" (click)="editPermission(p)">
                        Edit
                      </button>
                    </td>
                  </tr>
                }
              }
              @case ("plans") {
                @for (p of plans(); track p.id) {
                  <tr>
                    <td>
                      {{ p.name }}<small>Version {{ p.version }}</small>
                    </td>
                    <td>
                      {{ p.currency }}
                      {{ api.majorUnits(p.price_minor, p.currency) }} ·
                      {{ p.max_users }} users
                    </td>
                    <td>{{ p.published ? "Published" : "Draft" }}</td>
                    <td>
                      <button class="secondary" (click)="editPlan(p)">
                        Edit
                      </button>
                    </td>
                  </tr>
                }
              }
              @case ("operators") {
                @for (o of operators(); track o.id) {
                  <tr>
                    <td>
                      {{ o.display_name }}<small>{{ o.username }}</small>
                    </td>
                    <td>{{ o.role }}</td>
                    <td>{{ o.enabled ? "Enabled" : "Disabled" }}</td>
                    <td>
                      <button class="secondary" (click)="editOperator(o)">
                        Edit
                      </button>
                      @if (o.id !== api.account()?.id) {
                        <button
                          class="secondary"
                          [disabled]="busy()"
                          (click)="disableOperator(o)"
                        >
                          {{ o.enabled ? "Disable" : "Enable" }}
                        </button>
                      }
                    </td>
                  </tr>
                }
              }
            }
          </tbody>
        </table>
      </div>
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
export class CatalogComponent {
  readonly api = inject(ControlFacade);
  readonly section = input.required<string>();
  readonly busy = signal(false);
  readonly error = signal("");
  readonly notice = signal("");
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly applications = signal<Application[]>([]);
  readonly permissions = signal<Permission[]>([]);
  readonly plans = signal<Plan[]>([]);
  readonly operators = signal<Operator[]>([]);
  readonly appOptions = signal<Application[]>([]);
  readonly permissionOptions = signal<Permission[]>([]);
  editingId = "";
  code = "";
  name = "";
  description = "";
  appCode = "";
  icon = "bi-grid";
  route = "";
  entryPermission = "";
  navigationJson = "[]";
  enabled = true;
  published = false;
  currency = "USD";
  price = 0;
  months = 12;
  trialDays = 14;
  maxUsers = 10;
  selectedApps: string[] = [];
  selectedPermissions: string[] = [];
  password = "";
  operatorRole = "platform_staff";
  private generation = 0;
  constructor() {
    effect(() => {
      const section = this.section();
      this.reset();
      void this.load(1, section);
      void this.options();
    });
  }
  title(): string {
    return (
      (
        {
          applications: "Application catalog",
          permissions: "License permission catalog",
          plans: "Subscription plans",
          operators: "Console staff",
        } as Record<string, string>
      )[this.section()] || ""
    );
  }
  async options(): Promise<void> {
    try {
      const [apps, permissions] = await Promise.all([
        this.api.options<Application>("applications"),
        this.api.options<Permission>("permissions"),
      ]);
      this.appOptions.set(apps);
      this.permissionOptions.set(permissions);
    } catch (e) {
      this.error.set(this.api.message(e));
    }
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
        case "applications":
          result = await read(this.applications);
          break;
        case "permissions":
          result = await read(this.permissions);
          break;
        case "plans":
          result = await read(this.plans);
          break;
        case "operators":
          result = await read(this.operators);
          break;
        default:
          throw new Error("Unknown console section");
      }
      if (generation !== this.generation) return;
      this.page.set(result.page);
      this.pages.set(result.totalPages);
      this.total.set(result.total);
    } catch (e) {
      if (generation === this.generation) this.error.set(this.api.message(e));
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  reset(): void {
    this.editingId = "";
    this.code = "";
    this.name = "";
    this.description = "";
    this.route = "";
    this.entryPermission = "";
    this.appCode = "";
    this.operatorRole = "platform_staff";
    this.navigationJson = "[]";
    this.icon = "bi-grid";
    this.enabled = true;
    this.published = false;
    this.price = 0;
    this.currency = "USD";
    this.months = 12;
    this.trialDays = 14;
    this.maxUsers = 10;
    this.selectedApps = [];
    this.selectedPermissions = [];
    this.password = "";
    this.error.set("");
  }
  toggleApp(code: string): void {
    this.selectedApps = this.selectedApps.includes(code)
      ? this.selectedApps.filter((a) => a !== code)
      : [...this.selectedApps, code];
    this.selectedPermissions = this.selectedPermissions.filter((p) =>
      this.permissionOptions().some(
        (option) =>
          option.code === p &&
          this.selectedApps.includes(option.application_code),
      ),
    );
  }
  togglePermission(code: string): void {
    this.selectedPermissions = this.selectedPermissions.includes(code)
      ? this.selectedPermissions.filter((p) => p !== code)
      : [...this.selectedPermissions, code];
  }
  editApplication(a: Application): void {
    this.editingId = a.code;
    this.code = a.code;
    this.name = a.name;
    this.description = a.description;
    this.route = a.landing_route;
    this.entryPermission = a.required_permission;
    this.icon = a.icon;
    this.enabled = a.enabled;
    this.navigationJson = JSON.stringify(a.navigation, null, 2);
  }
  editPermission(p: Permission): void {
    this.editingId = p.code;
    this.code = p.code;
    this.appCode = p.application_code;
    this.description = p.description;
    this.enabled = p.enabled;
  }
  editPlan(p: Plan): void {
    this.editingId = p.id;
    this.name = p.name;
    this.description = p.description;
    this.price = Number(p.price_minor);
    this.currency = p.currency;
    this.months = p.duration_months;
    this.trialDays = p.trial_days;
    this.maxUsers = p.max_users;
    this.published = p.published;
    this.selectedApps = [...p.entitlements.applications];
    this.selectedPermissions = [...p.entitlements.permissions];
  }
  async save(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.notice.set("");
    try {
      switch (this.section()) {
        case "applications": {
          const navigation: Navigation[] = JSON.parse(this.navigationJson);
          await this.api.saveApplication(this.code, {
            name: this.name,
            description: this.description,
            landing_route: this.route,
            required_permission: this.entryPermission,
            icon: this.icon,
            navigation,
            enabled: this.enabled,
          });
          break;
        }
        case "permissions":
          await this.api.savePermission(this.code, {
            application_code: this.appCode,
            description: this.description,
            enabled: this.enabled,
          });
          break;
        case "plans":
          await this.api.savePlan(this.editingId, {
            name: this.name,
            description: this.description,
            price_minor: this.price,
            currency: this.currency,
            duration_months: this.months,
            trial_days: this.trialDays,
            max_users: this.maxUsers,
            published: this.published,
            entitlements: {
              applications: this.selectedApps,
              permissions: this.selectedPermissions,
            },
          });
          break;
        case "operators":
          await this.api.saveOperator(this.editingId, {
            username: this.code,
            display_name: this.name,
            password: this.password,
            role: this.operatorRole,
          });
          if (this.editingId === this.api.account()?.id) {
            this.api.account.set(null);
            return;
          }
          break;
      }
      this.reset();
      this.notice.set("Configuration saved.");
      await this.load(this.page());
      await this.options();
    } catch (e) {
      this.error.set(
        e instanceof SyntaxError
          ? "Navigation must contain valid JSON"
          : this.api.message(e),
      );
    } finally {
      this.busy.set(false);
    }
  }
  editOperator(o: Operator): void {
    this.editingId = o.id;
    this.code = o.username;
    this.name = o.display_name;
    this.operatorRole = o.role;
    this.password = "";
  }
  async disableOperator(operator: Operator): Promise<void> {
    this.busy.set(true);
    this.error.set("");
    try {
      if (operator.enabled) await this.api.disableOperator(operator.id);
      else await this.api.enableOperator(operator.id);
      this.notice.set("Operator status updated.");
      await this.load(this.page());
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
