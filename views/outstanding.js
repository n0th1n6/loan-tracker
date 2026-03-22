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
        if (b.payments) {
          b.payments.forEach(p => {
            paid += Number(p.amount);
          });
        }
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

    async payLoan(loan) {

      // find next unpaid breakdown
      const next = loan.breakdowns
        .filter(b => b.status !== "paid")
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

      if (!next) {
        alert("No pending payments");
        return;
      }

      const amount = prompt("Enter payment amount:");

      if (!amount || isNaN(amount)) {
        alert("Invalid amount");
        return;
      }

      const value = parseFloat(amount);

      // insert payment
      const { error } = await supabase
        .from("payments")
        .insert({
          breakdown_id: next.id,
          amount: value
        });

      if (error) {
        console.error(error);
        alert("Payment failed");
        return;
      }

      // 🔥 update breakdown status (simple logic)
      const totalPaid = (next.payments || []).reduce((s, p) => s + Number(p.amount), 0) + value;

      if (totalPaid >= next.amount) {
        await supabase
          .from("breakdowns")
          .update({ status: "paid" })
          .eq("id", next.id);
      }

      alert("Payment recorded");

      this.load(); // refresh
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

            <td>
              <span class="link" @click="openLedger(loan)">
                {{ loan.borrowers.firstname }} {{ loan.borrowers.lastname }}
              </span>
            </td>

            <td class="right">₱{{ loan.amount }}</td>

            <td class="right">₱{{ getBalance(loan) }}</td>

            <td>{{ formatDate(getNextDue(loan)) }}</td>

            <td>
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