import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ControlFacade } from "./control.facade";
import { PortalComponent } from "./portal.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [FormsModule, PortalComponent],
  template: `
    @if (loading()) {
      <main class="loading" role="status">Opening NeoLA Console…</main>
    } @else if (api.account() && recoveryMode() !== "reset") {
      <app-portal />
    } @else {
      <main class="login-layout">
        <section class="brand-story">
          <img
            src="/neola-woven-logo.png"
            alt="NeoLA woven thread logo"
            width="160"
            height="160"
          />
          <p class="eyebrow">NeoLA · Subscription Console</p>
          <h1>A new era of<br />Loom & Apparel.</h1>
          <p>
            Manage dedicated ERP installations, plans and access with clear
            approvals and a complete record of every decision.
          </p>
          <div class="story-line">
            Independent customer instances <span>·</span> Human-approved access
          </div>
        </section>
        <section class="login-card">
          <p class="eyebrow">
            {{ register() ? "Get started" : "Welcome back" }}
          </p>
          <h2>
            {{
              recoveryMode()
                ? recoveryMode() === "reset"
                  ? "Choose a new password"
                  : "Recover your account"
                : register()
                  ? "Create a customer account"
                  : "Sign in to your console"
            }}
          </h2>
          <p class="muted">
            For platform operators and customer owners. ERP employees use their
            organization’s ERP login.
          </p>
          @if (error()) {
            <p class="alert error" role="alert">{{ error() }}</p>
          }
          @if (notice()) {
            <p class="alert success" role="status">{{ notice() }}</p>
          }
          <form (ngSubmit)="submit()">
            @if (register()) {
              <label
                >Company name<input
                  name="company"
                  [(ngModel)]="company"
                  required
                  maxlength="180"
                  autocomplete="organization"
              /></label>
              <label
                >Your name<input
                  name="displayName"
                  [(ngModel)]="displayName"
                  required
                  maxlength="180"
                  autocomplete="name"
              /></label>
              <label
                >Contact email<input
                  name="email"
                  [(ngModel)]="email"
                  required
                  type="email"
                  autocomplete="email"
              /></label>
            }
            @if (recoveryMode() !== "reset") {
              <label
                >Username<input
                  name="username"
                  [(ngModel)]="username"
                  required
                  maxlength="180"
                  autocomplete="username"
              /></label>
            }
            @if (recoveryMode() !== "forgot") {
              <label
                >Password<span class="password-field"
                  ><input
                    name="password"
                    aria-label="Password"
                    [(ngModel)]="password"
                    [required]="recoveryMode() !== 'forgot'"
                    [minlength]="
                      register() || recoveryMode() === 'reset' ? 12 : 1
                    "
                    [type]="showPassword() ? 'text' : 'password'"
                    [autocomplete]="
                      register() ? 'new-password' : 'current-password'
                    "
                  /><button
                    class="quiet"
                    type="button"
                    (click)="showPassword.set(!showPassword())"
                    [attr.aria-pressed]="showPassword()"
                  >
                    {{ showPassword() ? "Hide" : "Show" }}
                  </button></span
                ></label
              >
              <label
                >Authenticator / recovery code (if enabled)<input
                  name="mfa_code"
                  [(ngModel)]="mfaCode"
                  autocomplete="one-time-code"
              /></label>
            }
            @if (register()) {
              <small>Use a password of at least 12 characters.</small>
            }
            <button class="primary full" [disabled]="busy()">
              {{
                busy()
                  ? "Please wait…"
                  : recoveryMode()
                    ? recoveryMode() === "reset"
                      ? "Set new password"
                      : "Send recovery instructions"
                    : register()
                      ? "Create account"
                      : "Sign in"
              }}
            </button>
          </form>
          <button
            class="quiet full"
            (click)="
              recoveryMode.set(recoveryMode() ? '' : 'forgot');
              register.set(false)
            "
          >
            {{ recoveryMode() ? "Back to sign in" : "Forgot your password?" }}
          </button>
          <button class="quiet full" (click)="switchMode()">
            {{
              register()
                ? "Already registered? Sign in"
                : "New customer? Create an account"
            }}
          </button>
        </section>
      </main>
    }
  `,
})
export class AppComponent {
  readonly api = inject(ControlFacade);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly register = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal("");
  readonly notice = signal("");
  readonly recoveryMode = signal("");
  mfaCode = "";
  private actionToken = "";
  username = "";
  password = "";
  company = "";
  displayName = "";
  email = "";
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.actionToken = params.get("token") || "";
    if (params.get("action") === "reset") this.recoveryMode.set("reset");
    if (params.get("action") === "verify")
      void this.api
        .security<{ message: string }>("verify-email", {
          token: this.actionToken,
        })
        .then((r) => this.notice.set(r.message))
        .catch((e) => this.error.set(this.api.message(e)));
    if (this.actionToken)
      window.history.replaceState({}, "", window.location.pathname);

    void this.api
      .restore()
      .catch((e) => this.error.set(this.api.message(e)))
      .finally(() => this.loading.set(false));
  }
  switchMode(): void {
    this.register.set(!this.register());
    this.password = "";
    this.error.set("");
    this.notice.set("");
    this.showPassword.set(false);
  }
  async submit(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.notice.set("");
    try {
      if (this.recoveryMode()) {
        const result = await this.api.security<{ message: string }>(
          this.recoveryMode() === "reset"
            ? "reset-password"
            : "forgot-password",
          {
            username: this.username,
            password: this.password,
            mfa_code: this.mfaCode,
            token: this.actionToken,
          },
        );
        this.notice.set(result.message);
        if (this.recoveryMode() === "reset") {
          this.recoveryMode.set("");
          this.api.account.set(null);
        }
      } else if (this.register()) {
        const result = await this.api.register({
          username: this.username,
          password: this.password,
          name: this.company,
          display_name: this.displayName,
          email: this.email,
        });
        this.register.set(false);
        this.notice.set(result.message);
      } else await this.api.login(this.username, this.password, this.mfaCode);
      this.password = "";
      this.showPassword.set(false);
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
