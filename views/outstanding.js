import { supabase } from "../supabase.js";

export default {
  props: ["user"],

  data() {
    return {
      loans: []
    };
  },

  async mounted() {
    this.load();
  },

  methods: {

    async load() {

      const { data, error } = await supabase
        .from("loans")
        .select(`
          id,
          amount,
          total_amount,
          borrower_id,
          borrowers (firstname, lastname),
          breakdowns (
            id,
            amount,
            due_date,
            status,
            payments (amount)
          )
        `)
        .eq("status", "active");

      if (error) {
        console.error(error);
        return;
      }

      this.loans = data || [];
    },

    getBalance(loan) {
      let paid = 0;

      loan.breakdowns.forEach(b => {
        (b.payments || []).forEach(p => {
          paid += Number(p.amount);
        });
      });

      return loan.total_amount - paid;
    },

    getNextDue(loan) {
      const pending = loan.breakdowns
        .filter(b => b.status !== "paid")
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      return pending.length ? pending[0].due_date : "-";
    },

    openLedger(loan) {
      this.$emit("open-ledger", {
        id: loan.borrower_id,
        firstname: loan.borrowers.firstname,
        lastname: loan.borrowers.lastname
      });
    },

    formatDate(d) {
      if (!d || d === "-") return "-";
      return new Date(d).toLocaleDateString();
    },

    // 🔥 NEW PROPER PAYMENT ENGINE
    async payLoan(loan) {

      const amount = prompt("Enter payment amount:");

      if (!amount || isNaN(amount)) {
        alert("Invalid amount");
        return;
      }

      let remaining = parseFloat(amount);

      // sort breakdowns by due date
      const breakdowns = loan.breakdowns
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      for (let b of breakdowns) {

        if (remaining <= 0) break;

        const alreadyPaid = (b.payments || []).reduce((s, p) => s + Number(p.amount), 0);
        const balance = b.amount - alreadyPaid;

        if (balance <= 0) continue;

        const payAmount = Math.min(balance, remaining);

        // insert payment
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

        // update status
        await supabase
          .from("breakdowns")
          .update({
            status: newPaid >= b.amount ? "paid" : "pending"
          })
          .eq("id", b.id);

        remaining -= payAmount;
      }

      if (remaining > 0) {
        alert("Payment exceeds total due. Excess ignored.");
      }

      alert("Payment applied successfully");

      this.load();
    }

  },

  template: `
    <div>

      <h2>Outstanding Loans</h2>

      <table class="ledger-table">

        <thead>
          <tr>
            <th>Borrower</th>
            <th>Loan</th>
            <th>Balance</th>
            <th>Next Due</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          <tr v-for="loan in loans" :key="loan.id">

            <td data-label="Borrower">
              <span class="link" @click="openLedger(loan)">
                {{ loan.borrowers.firstname }} {{ loan.borrowers.lastname }}
              </span>
            </td>

            <td data-label="Loan" class="right">
              ₱{{ loan.amount }}
            </td>

            <td data-label="Balance" class="right">
              ₱{{ getBalance(loan) }}
            </td>

            <td data-label="Next Due">
              {{ formatDate(getNextDue(loan)) }}
            </td>

            <td data-label="Action">
              <span class="link" @click="payLoan(loan)">
                Pay
              </span>
            </td>

          </tr>

        </tbody>

      </table>

    </div>
  `
};