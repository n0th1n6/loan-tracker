import { supabase } from "../supabase.js";

export default {
  props: ["user", "borrower"],

  data() {
    return {
      loans: []
    };
  },

  async mounted() {
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
          breakdowns (
            id,
            amount,
            paid_amount,
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
        totalPaid += Number(b.paid_amount || 0);
      });

      return loan.total_amount - totalPaid;
    }
  },

  template: `
  <div>

    <h2>Ledger</h2>
    <p><b>{{ borrower.firstname }} {{ borrower.lastname }}</b></p>

    <div v-for="loan in loans" :key="loan.id" class="card">

      <h3>Loan: {{ loan.amount }}</h3>
      <p>Total: {{ loan.total_amount }}</p>
      <p>Balance: {{ calcLoanBalance(loan) }}</p>

      <table border="1" width="100%">
        <tr>
          <th>Due Date</th>
          <th>Amount</th>
          <th>Paid</th>
          <th>Status</th>
        </tr>

        <tr v-for="b in loan.breakdowns" :key="b.id">
          <td>{{ b.due_date }}</td>
          <td>{{ b.amount }}</td>
          <td>{{ b.paid_amount }}</td>
          <td>{{ b.status }}</td>
        </tr>

      </table>

      <button @click="exportCSV">Export CSV</button>

    </div>

  </div>
  `
};