import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ControlFacade, Instance } from "./control.facade";
@Component({
  selector: "app-instance-tools",
  imports: [FormsModule],
  template: `<section class="page-heading">
      <p class="eyebrow">Installation administration</p>
      <h1>Instance activation keys</h1>
      <p>
        Rotate dedicated installation keys without interrupting application
        licensing.
      </p>
    </section>
    @if (error()) {
      <p class="alert error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert success" role="status">{{ notice() }}</p>
    }
    <section class="panel">
      <label
        >ERP instance<select
          [(ngModel)]="instanceId"
          (ngModelChange)="key.set('')"
        >
          <option value="">Choose instance</option>
          @for (i of instances(); track i.id) {
            <option [value]="i.id">{{ i.name }}</option>
          }
        </select></label
      >
      <div class="actions">
        @if (owner()) {
          <button
            class="secondary"
            [disabled]="busy() || !instanceId"
            (click)="rotate('stage')"
          >
            Stage new activation key</button
          ><button
            class="secondary"
            [disabled]="busy() || !instanceId"
            (click)="rotate('commit')"
          >
            Commit key rotation</button
          ><button
            class="quiet"
            [disabled]="busy() || !instanceId"
            (click)="rotate('cancel')"
          >
            Cancel pending key
          </button>
        }
      </div>
    </section>
    @if (key()) {
      <section class="panel">
        <h2>Save the pending key securely</h2>
        <code class="wrap">{{ key() }}</code>
        <p>
          Update this instance’s IAM server configuration to this key. Then
          commit the rotation; the previous key is revoked only after IAM
          confirms the new key.
        </p>
        <button class="secondary" (click)="key.set('')">I saved the key</button>
      </section>
    } `,
})
export class InstanceToolsComponent {
  readonly api = inject(ControlFacade);
  readonly instances = signal<Instance[]>([]);
  readonly error = signal("");
  readonly notice = signal("");
  readonly busy = signal(false);
  readonly key = signal("");
  instanceId = "";
  constructor() {
    void this.api
      .options<Instance>("instances")
      .then((r) => this.instances.set(r))
      .catch((e) => this.error.set(this.api.message(e)));
  }
  owner() {
    return this.api.account()?.role === "platform_owner";
  }
  async run(work: () => Promise<void>) {
    this.busy.set(true);
    this.error.set("");
    try {
      await work();
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  rotate(action: "stage" | "commit" | "cancel") {
    return this.run(async () => {
      const r = await this.api.rotateKey(this.instanceId, action);
      this.notice.set(r.message);
      this.key.set(r.activation_key || "");
    });
  }
}
