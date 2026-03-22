import { supabase } from "../supabase.js";

export default {
  props: ["user", "borrower"],

  data() {
    return {
      loans: []
    };
  },

  async mounted() {
    if (!this.borrower) {
      console.error("No borrower passed to ledger");
      return;
    }    
    
    this.loadLedger();
  },

  methods: {
    async loadLedger() {

      const { data } = await supabase
        .from("loans")
        .select(`
          id,
          amount,
          total_amount,
          payment_start_date,
          payment_terms,
          loan_purpose,
          is_semi_monthly,
          bill_day_1,
          bill_day_2,
          breakdowns (
            id,
            amount,
            due_date,
            status,
            payments (
              amount,
              payment_date
            )
          )
        `)
        .eq("borrower_id", this.borrower.id);

      this.loans = data || [];
    },

    calcLoanBalance(loan) {
      let totalPaid = 0;

      loan.breakdowns.forEach(b => {
        let paid = 0;

        if (b.payments) {
          b.payments.forEach(p => {
            paid += Number(p.amount);
          });
        }

        totalPaid += paid;
      });

      return loan.total_amount - totalPaid;
    },
    exportCSV() {
      let rows = ["Loan,Due Date,Amount,Paid,Status"];

      this.loans.forEach(loan => {
        loan.breakdowns.forEach(b => {
          rows.push([
            loan.id,
            b.due_date,
            b.amount,
            b.paid_amount,
            b.status
          ].join(","));
        });
      });

      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "ledger.csv";
      a.click();
    },
    getPaid(b) {
      let total = 0;
      if (b.payments) {
        b.payments.forEach(p => total += Number(p.amount));
      }
      return total;
    },
    formatDate(d) {
      return new Date(d).toLocaleDateString();
    }    
  },

  template: `
  <div>

    <h2>Ledger</h2>
    <p v-if="borrower">
      <b>{{ borrower.firstname }} {{ borrower.lastname }}</b>
    </p>

    <div v-for="loan in loans" :key="loan.id" class="card">

      <div class="loan-header">

        <div class="loan-title">
          Loan Amount: ₱{{ loan.amount }}
        </div>

        <div class="loan-grid">

          <div><b>Total:</b> ₱{{ loan.total_amount }}</div>
          <div><b>Balance:</b> ₱{{ calcLoanBalance(loan) }}</div>

          <div><b>Start Date:</b> {{ formatDate(loan.payment_start_date) }}</div>
          <div><b>Terms:</b> {{ loan.payment_terms }} months</div>

          <div><b>Payment Type:</b>
            {{ loan.is_semi_monthly ? 'Semi-Monthly' : 'Monthly' }}
          </div>

          <div v-if="loan.is_semi_monthly">
            <b>Bill Days:</b> {{ loan.bill_day_1 }} / {{ loan.bill_day_2 }}
          </div>

          <div><b>Purpose:</b> {{ loan.loan_purpose || '-' }}</div>

        </div>

      </div>

      <table class="ledger-table">

        <thead>
          <tr>
            <th>Due Date</th>
            <th>Amount</th>
            <th>Paid</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="b in loan.breakdowns" :key="b.id">

            <td>{{ formatDate(b.due_date) }}</td>

            <td class="right">
              ₱{{ b.amount }}
            </td>

            <td class="right">
              ₱{{ getPaid(b) }}
            </td>

            <td>
              <span :class="'status ' + (b.status || 'pending')">
                {{ b.status || 'pending' }}
              </span>
            </td>

          </tr>
        </tbody>

      </table>

      <button @click="exportCSV">Export CSV</button>

    </div>

  </div>
  `
};