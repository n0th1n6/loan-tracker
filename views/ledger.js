import { supabase } from "../supabase.js";

export default {
  props: ["borrower"],

  data() {
    return {
      loans: [],

      paymentForm: {
        breakdown_id: null,
        amount: "",
        payment_date: new Date().toISOString().split("T")[0]
      }
    };
  },

  async mounted() {
    await this.loadLedger();

    if (this.$root.selectedBreakdown) {
      this.paymentForm.breakdown_id = this.$root.selectedBreakdown.id;
    }    
  },

  methods: {

    async loadLedger() {
      const { data } = await supabase
        .from("loans")
        .select(`
          *,
          breakdowns (
            *,
            payments (*)
          )
        `)
        .eq("borrower_id", this.borrower.id)

        // ✅ ADDED: newest loans first
        .order("created_at", { ascending: false })

        .order("due_date", { foreignTable: "breakdowns", ascending: true });

      this.loans = data || [];
    },

    getPaid(b) {
      return (b.payments || []).reduce(
        (s, p) => s + Number(p.amount || 0),
        0
      );
    },

    formatMoney(v) {
      return Number(v || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2
      });
    },

    formatDate(d) {
      return new Date(d).toLocaleDateString();
    },

    payBreakdown(b) {
      this.paymentForm = {
        breakdown_id: b.id,
        amount: "",
        payment_date: new Date().toISOString().split("T")[0]
      };
    },

    async submitPayment() {

      const selectedId = this.paymentForm.breakdown_id;
      let remaining = parseFloat(this.paymentForm.amount);

      if (!remaining || isNaN(remaining)) {
        alert("Invalid amount");
        return;
      }

      const paymentDate = this.paymentForm.payment_date;

      const loan = this.loans.find(l =>
        l.breakdowns.some(b => b.id === selectedId)
      );

      const breakdowns = loan.breakdowns;

      for (let b of breakdowns) {

        if (remaining <= 0) break;

        const alreadyPaid = this.getPaid(b);
        const balance = b.amount - alreadyPaid;

        if (balance <= 0) continue;

        const payAmount = Math.min(balance, remaining);

        const ratio = payAmount / b.amount;

        const principal_amount = (b.principal_amount || 0) * ratio;
        const interest_amount = (b.interest_amount || 0) * ratio;

        const { error } = await supabase
          .from("payments")
          .insert({
            breakdown_id: b.id,
            amount: payAmount,
            payment_date: paymentDate,
            principal_amount,
            interest_amount
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

      this.paymentForm.breakdown_id = null;

      alert("Payment saved");

      this.loadLedger();
    }

  },

  template: `
  <div>

    <h2>Ledger</h2>

    <div v-for="loan in loans" :key="loan.id" class="card">

      <div class="loan-header">
        <div class="loan-title">
          Loan: ₱{{ formatMoney(loan.amount) }}
        </div>

        <!-- ✅ ADDED -->
        <div class="loan-meta">
          <div><strong>Purpose:</strong> {{ loan.loan_purpose || 'N/A' }}</div>
          <div><strong>Created:</strong> {{ formatDate(loan.created_at) }}</div>
        </div>
      </div>

      <table class="ledger-table">

        <thead>
          <tr>
            <th>Date</th>
            <th>Due</th>
            <th>Paid</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          <template v-for="b in loan.breakdowns" :key="b.id">

            <tr>
              <td>{{ formatDate(b.due_date) }}</td>

              <td class="right">₱{{ formatMoney(b.amount) }}</td>

              <td class="right">₱{{ formatMoney(getPaid(b)) }}</td>

              <td>{{ b.status }}</td>

              <td>
                <span 
                  v-if="(b.amount - getPaid(b)) > 0.01"
                  class="link" 
                  @click="payBreakdown(b)"
                >
                  Pay
                </span>
              </td>
            </tr>

            <tr v-if="paymentForm.breakdown_id === b.id">
              <td colspan="5">

                <div class="form">

                  <div class="form-group">
                    <label>Amount</label>
                    <input v-model="paymentForm.amount">
                  </div>

                  <div class="form-group">
                    <label>Payment Date</label>
                    <input type="date" v-model="paymentForm.payment_date">
                  </div>

                  <button @click="submitPayment">Save</button>
                  <button @click="paymentForm.breakdown_id = null">Cancel</button>

                </div>

              </td>
            </tr>

          </template>

        </tbody>

      </table>

    </div>

  </div>
  `
};