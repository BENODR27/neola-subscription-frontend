import { AccountComponent } from "./account.component";
import { InstanceToolsComponent } from "./instance-tools.component";
import { BillingComponent } from "./billing.component";
import { Component, inject, signal } from "@angular/core";
import { ControlFacade } from "./control.facade";
import { CommerceComponent } from "./commerce.component";
import { CatalogComponent } from "./catalog.component";
import { consoleNavigation } from "./console-navigation";
@Component({
  selector: "app-portal",
  imports: [
    CommerceComponent,
    CatalogComponent,
    AccountComponent,
    InstanceToolsComponent,
    BillingComponent,
  ],
  template: ` <header class="shell-header">
      <a class="brand" href="/" aria-label="NeoLA console home"
        ><img src="/neola-woven-logo.png" alt="" width="44" height="44" /><span
          >NeoLA<small>Subscription Console</small></span
        ></a
      >
      <div class="account">
        <span
          >{{ api.account()?.display_name
          }}<small>{{ roleLabel() }}</small></span
        ><button class="secondary" (click)="logout()">Sign out</button>
      </div>
    </header>
    <div class="workspace">
      <aside>
        <p class="eyebrow">Workspace</p>
        <nav aria-label="Console navigation">
          @for (item of navigation(); track item.key) {
            <button
              [class.active]="section() === item.key"
              (click)="section.set(item.key)"
              [attr.aria-current]="section() === item.key ? 'page' : null"
            >
              <span aria-hidden="true">{{ item.icon }}</span
              >{{ item.label }}
            </button>
          }
        </nav>
        <p class="aside-note">
          Dedicated ERP instances.<br />Clear ownership. Controlled access.
        </p>
      </aside>
      <main class="content">
        @if (error()) {
          <p class="alert error" role="alert">{{ error() }}</p>
        }
        @if (section() === "guide") {
          <section class="page-heading">
            <p class="eyebrow">Getting started</p>
            <h1>Your NeoLA control center</h1>
            <p>
              Manage the commercial access to each customer’s independent ERP
              installation.
            </p>
          </section>
          <div class="guide-grid">
            <article class="panel">
              <span class="step">01</span>
              <h2>Set up your catalog</h2>
              <p>
                Platform staff define application codes, navigation and
                permissions, then publish plans with explicit access limits. Use
                the same stable codes as the ERP.
              </p>
            </article>
            <article class="panel">
              <span class="step">02</span>
              <h2>Provision a customer</h2>
              <p>
                Customer owners register here. Platform staff create a dedicated
                instance and save its one-time activation key securely in that
                installation’s server configuration.
              </p>
            </article>
            <article class="panel">
              <span class="step">03</span>
              <h2>Request and approve</h2>
              <p>
                Owners select a plan and request a purchase or trial. A
                different authorized operator reviews the request. Paid
                purchases require a recorded manual payment reference.
              </p>
            </article>
            <article class="panel">
              <span class="step">04</span>
              <h2>Manage ERP access in IAM</h2>
              <p>
                Open your ERP → Applications → IAM to manage employees, roles
                and company/factory access. IAM enforces purchased permissions
                and seat limits. Plans, subscriptions and approvals stay in this
                console.
              </p>
            </article>
          </div>
          <p class="alert">
            Before enabling subscription enforcement on an ERP instance,
            complete the integration checklist in the deployment guide. Existing
            ERP instances keep their current behavior until that cutover.
          </p>
        } @else if (section() === "account") {
          <app-account />
        } @else if (section() === "instance-tools") {
          <app-instance-tools />
        } @else if (section() === "billing") {
          <app-billing />
        } @else if (isCatalog()) {
          <app-catalog [section]="section()" />
        } @else {
          <app-commerce [section]="section()" />
        }
      </main>
    </div>`,
})
export class PortalComponent {
  readonly api = inject(ControlFacade);
  readonly section = signal("guide");
  readonly error = signal("");
  roleLabel(): string {
    return (this.api.account()?.role || "").replaceAll("_", " ");
  }
  navigation() {
    return consoleNavigation(this.api.account()?.role || "");
  }
  isCatalog(): boolean {
    return (
      ["applications", "permissions", "operators"].includes(this.section()) ||
      (this.section() === "plans" &&
        ["platform_owner", "platform_staff"].includes(
          this.api.account()?.role || "",
        ))
    );
  }
  async logout(): Promise<void> {
    try {
      await this.api.logout();
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
}
