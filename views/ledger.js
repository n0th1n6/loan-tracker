import { supabase } from "../supabase.js";

export default {
  props: ["user", "borrower"],

  data() {
    return {
      loans: [],
      expanded: {} // 🔥 NEW
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

      // sort breakdowns
      (data || []).forEach(loan => {
        loan.breakdowns = (loan.breakdowns || [])
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      });

      this.loans = data || [];
    },

    calcLoanBalance(loan) {
      let totalPaid = 0;

      loan.breakdowns.forEach(b => {
        totalPaid += this.getPaid(b);
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
            this.getPaid(b),
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
      (b.payments || []).forEach(p => total += Number(p.amount));
      return total;
    },

    formatDate(d) {
      if (!d) return "-";
      return new Date(d).toLocaleDateString();
    },

    getRunningBalances(loan) {
      let balance = loan.total_amount;
      const result = {};

      loan.breakdowns.forEach(b => {
        const paid = this.getPaid(b);
        balance -= paid;
        result[b.id] = balance;
      });

      return result;
    },

    getStatus(b) {
      if (b.status === "paid") return "paid";

      const today = new Date();
      const due = new Date(b.due_date);

      if (due < today) return "overdue";

      return "pending";
    },

    // 🔥 NEW: toggle payment history
    togglePayments(b) {
      this.expanded[b.id] = !this.expanded[b.id];
    },

    async payBreakdown(selectedBreakdown) {

      const amount = prompt(
        "Enter payment amount starting from: " + this.formatDate(selectedBreakdown.due_date)
      );

      if (!amount || isNaN(amount)) {
        alert("Invalid amount");
        return;
      }

      let remaining = parseFloat(amount);

      const loan = this.loans.find(l =>
        l.breakdowns.some(b => b.id === selectedBreakdown.id)
      );

      const breakdowns = loan.breakdowns;

      for (let b of breakdowns) {

        if (remaining <= 0) break;

        const alreadyPaid = this.getPaid(b);
        const balance = b.amount - alreadyPaid;

        if (balance <= 0) continue;

        const payAmount = Math.min(balance, remaining);

        const { error } = await supabase
          .from("payments")
          .insert({
            breakdown_id: b.id,
            amount: payAmount
          });

        if (error) {
          console.error(error);
          alert("Payment failed");
          return;
        }

        const newPaid = alreadyPaid + payAmount;

        await supabase
          .from("breakdowns")
          .update({
            status: newPaid >= b.amount ? "paid" : "pending"
          })
          .eq("id", b.id);

        remaining -= payAmount;
      }

      if (remaining > 0) {
        alert("Excess payment ignored");
      }

      alert("Payment applied");

      this.loadLedger();
    }

  },

  template: `
  <div>

    <h2>Ledger</h2>

    <p v-if="borrower">
      <b>{{ borrower.firstname }} {{ borrower.lastname }}</b>
    </p>

    <div v-for="loan in loans" :key="loan.id" class="card">

      <div v-if="!loan._balances">
        {{ loan._balances = getRunningBalances(loan) }}
      </div>

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
            <th>Balance</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          <template v-for="b in loan.breakdowns" :key="b.id">

            <!-- MAIN ROW -->
            <tr @click="togglePayments(b)" style="cursor:pointer">

              <td>{{ formatDate(b.due_date) }}</td>

              <td class="right">₱{{ b.amount }}</td>

              <td class="right">₱{{ getPaid(b) }}</td>

              <td class="right">
                ₱{{ loan._balances[b.id]?.toFixed(2) }}
              </td>

              <td>
                <span :class="'status ' + getStatus(b)">
                  {{ getStatus(b) }}
                </span>
              </td>

              <td>
                <span 
                  v-if="getPaid(b) < b.amount"
                  class="link"
                  @click.stop="payBreakdown(b)"
                >
                  Pay
                </span>

                <span v-else style="color:#999;">
                  Paid
                </span>
              </td>

            </tr>

            <!-- EXPANDED PAYMENT HISTORY -->
            <tr v-if="expanded[b.id]">

              <td colspan="6">

                <div style="padding:10px; background:#f9fafb; border-radius:6px;">

                  <b>Payments:</b>

                  <div v-if="!b.payments || b.payments.length === 0">
                    No payments yet
                  </div>

                  <div v-else>

                    <div 
                      v-for="(p, i) in b.payments" 
                      :key="i"
                      style="display:flex; justify-content:space-between; padding:4px 0;"
                    >
                      <span>{{ formatDate(p.payment_date) }}</span>
                      <span>₱{{ p.amount }}</span>
                    </div>

                  </div>

                </div>

              </td>

            </tr>

          </template>

        </tbody>

      </table>

      <button @click="exportCSV">Export CSV</button>

    </div>

  </div>
  `
};