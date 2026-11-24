import { Component, inject, signal } from "@angular/core";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { ControlFacade } from "./control.facade";
interface Invoice {
  id: string;
  invoice_number: string;
  currency: string;
  amount_minor: string;
  payment_reference: string;
  issued_at: string;
  customer_snapshot: { name: string; email: string };
  plan_snapshot: { name: string; description: string; duration_months: number };
}
@Component({
  selector: "app-billing",
  imports: [CurrencyPipe, DatePipe],
  template: `<section class="page-heading">
      <p class="eyebrow">Manual billing</p>
      <h1>Invoices & payment records</h1>
      <p>
        Immutable records from approved purchases. Prices and customer details
        reflect the approved request.
      </p>
    </section>
    @if (error()) {
      <p class="alert error" role="alert">{{ error() }}</p>
    }
    <section class="panel records">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Issued</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (i of invoices(); track i.id) {
              <tr>
                <td>{{ i.invoice_number }}</td>
                <td>{{ i.customer_snapshot.name }}</td>
                <td>
                  {{
                    api.majorUnits(i.amount_minor, i.currency)
                      | currency: i.currency
                  }}
                </td>
                <td>{{ i.issued_at | date: "mediumDate" }}</td>
                <td>
                  <button class="secondary" (click)="selected.set(i)">
                    View
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <footer class="pager">
        <span>{{ total() }} invoices</span>
        <div class="actions">
          <button
            class="secondary"
            [disabled]="page() <= 1 || busy()"
            (click)="load(page() - 1)"
          >
            Previous</button
          ><button
            class="secondary"
            [disabled]="page() >= pages() || busy()"
            (click)="load(page() + 1)"
          >
            Next
          </button>
        </div>
      </footer>
    </section>
    @if (selected(); as i) {
      <article class="panel invoice">
        <h2>NeoLA · Invoice</h2>
        <p class="mono wrap">{{ i.invoice_number }}</p>
        <p>
          {{ i.customer_snapshot.name }}<br />{{ i.customer_snapshot.email }}
        </p>
        <h3>{{ i.plan_snapshot.name }}</h3>
        <p>{{ i.plan_snapshot.description }}</p>
        <p>Term: {{ i.plan_snapshot.duration_months }} months</p>
        <p class="price">
          {{
            api.majorUnits(i.amount_minor, i.currency) | currency: i.currency
          }}
        </p>
        <p>
          Manual payment reference:
          {{ i.payment_reference || "No payment due" }}
        </p>
        <p>Issued {{ i.issued_at | date: "medium" }}</p>
        <small
          >Amounts are those of the approved manual purchase. No tax or
          automatic charge is calculated.</small
        ><button class="secondary" (click)="print()">Print / save PDF</button>
      </article>
    }`,
})
export class BillingComponent {
  readonly api = inject(ControlFacade);
  readonly invoices = signal<Invoice[]>([]);
  readonly selected = signal<Invoice | null>(null);
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly error = signal("");
  readonly busy = signal(false);
  constructor() {
    void this.load();
  }
  async load(page = 1) {
    this.busy.set(true);
    try {
      const r = await this.api.page<Invoice>("invoices", page);
      this.invoices.set(r.items);
      this.total.set(r.total);
      this.pages.set(r.totalPages);
      this.page.set(page);
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  print() {
    window.print();
  }
}
