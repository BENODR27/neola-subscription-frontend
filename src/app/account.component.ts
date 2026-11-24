import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ControlFacade } from "./control.facade";
@Component({
  selector: "app-account",
  imports: [FormsModule],
  template: `<section class="page-heading">
      <p class="eyebrow">Personal security</p>
      <h1>Account & authentication</h1>
      <p>
        Verify your email and protect your console login with an authenticator.
      </p>
    </section>
    @if (error()) {
      <p class="alert error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert success" role="status">{{ notice() }}</p>
    }
    <form class="panel form-grid" (ngSubmit)="saveEmail()">
      <h2 class="span-all">Email address</h2>
      <label
        >Email<input
          name="email"
          type="email"
          [(ngModel)]="email"
          required /></label
      ><label
        >Current password<input
          name="password"
          type="password"
          [(ngModel)]="password"
          required
          autocomplete="current-password" /></label
      ><label
        >Authenticator code (if enabled)<input
          name="code"
          [(ngModel)]="code"
          autocomplete="one-time-code"
      /></label>
      <div class="actions span-all">
        <span class="badge">{{ verified() ? "Verified" : "Not verified" }}</span
        ><button class="primary" [disabled]="busy()">Save & verify email</button
        ><button
          class="secondary"
          type="button"
          [disabled]="busy()"
          (click)="resend()"
        >
          Resend verification
        </button>
      </div>
    </form>
    <section class="panel">
      <h2>Authenticator protection</h2>
      <p>
        {{
          mfa()
            ? "Enabled. Login requires a code or a single-use recovery code."
            : "Add a TOTP authenticator for a second login factor."
        }}
      </p>
      <label
        >Current password<input
          type="password"
          [(ngModel)]="password"
          autocomplete="current-password"
      /></label>
      @if (!mfa()) {
        <button class="primary" [disabled]="busy()" (click)="setup()">
          Set up authenticator
        </button>
      } @else {
        <label
          >Authenticator / recovery code<input
            [(ngModel)]="code"
            autocomplete="one-time-code" /></label
        ><button class="secondary" [disabled]="busy()" (click)="disable()">
          Disable authenticator
        </button>
      }
      @if (secret()) {
        <p>
          Add this setup key to your authenticator, then enter its current code.
        </p>
        <code class="wrap">{{ secret() }}</code
        ><label
          >Authenticator code<input
            [(ngModel)]="code"
            inputmode="numeric"
            autocomplete="one-time-code" /></label
        ><button class="primary" [disabled]="busy()" (click)="confirm()">
          Confirm authenticator
        </button>
      }
      @if (recovery().length) {
        <p class="alert">
          Save these recovery codes securely. Each works once and they will not
          be shown again.
        </p>
        <div class="checks">
          @for (c of recovery(); track c) {
            <code>{{ c }}</code>
          }
        </div>
        <button class="secondary" (click)="recovery.set([])">
          I have saved the codes
        </button>
      }
    </section>
    @if (local()) {
      <section class="panel">
        <h2>Local development inbox</h2>
        <p>
          This inbox exists only in local development. Production delivery uses
          the configured mail provider.
        </p>
        <button class="secondary" (click)="inbox()">Refresh local inbox</button>
        @for (mail of messages(); track mail.id) {
          <p>
            <a [href]="mail.url">{{
              mail.kind === "verify_email" ? "Verify email" : "Reset password"
            }}</a>
          </p>
        }
      </section>
    }`,
})
export class AccountComponent {
  readonly api = inject(ControlFacade);
  readonly error = signal("");
  readonly notice = signal("");
  readonly busy = signal(false);
  readonly verified = signal(false);
  readonly mfa = signal(false);
  readonly secret = signal("");
  readonly recovery = signal<string[]>([]);
  readonly local = signal(false);
  readonly messages = signal<{ id: string; kind: string; url: string }[]>([]);
  email = "";
  password = "";
  code = "";
  constructor() {
    void this.load();
  }
  async load() {
    try {
      const s = await this.api.securityStatus();
      this.email = s.email || "";
      this.verified.set(s.email_verified);
      this.mfa.set(s.mfa_enabled);
      this.local.set(s.development_outbox);
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
  async run(work: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.notice.set("");
    try {
      await work();
      await this.load();
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
      this.password = "";
      this.code = "";
    }
  }
  saveEmail() {
    return this.run(async () => {
      const r = await this.api.security<{ message: string }>("email", {
        email: this.email,
        password: this.password,
        mfa_code: this.code,
      });
      this.notice.set(r.message);
    });
  }
  resend() {
    return this.run(async () => {
      await this.api.security("resend-verification");
      this.notice.set("Verification queued for delivery.");
    });
  }
  setup() {
    return this.run(async () => {
      const r = await this.api.security<{ secret: string }>("mfa/setup", {
        password: this.password,
      });
      this.secret.set(r.secret);
    });
  }
  confirm() {
    return this.run(async () => {
      const r = await this.api.security<{ recovery_codes: string[] }>(
        "mfa/confirm",
        { code: this.code },
      );
      this.secret.set("");
      this.recovery.set(r.recovery_codes);
    });
  }
  disable() {
    return this.run(async () => {
      await this.api.security("mfa/disable", {
        password: this.password,
        code: this.code,
      });
      this.notice.set("Authenticator disabled.");
    });
  }
  async inbox() {
    try {
      this.messages.set((await this.api.localInbox()).items);
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
}
