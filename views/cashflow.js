import { supabase } from "../supabase.js";

export default {
  props: ["user"],

  data() {
    return {
      entries: []
    };
  },

  async mounted() {
    await this.load();
  },

  methods: {

    async load() {

      let all = [];

      // =====================
      // CAPITAL
      // =====================
      const { data: capital } = await supabase
        .from("capital")
        .select("*");

      (capital || []).forEach(c => {
        all.push({
          date: c.entry_date,
          type: c.type === "in" ? "CAPITAL IN" : "CAPITAL OUT",
          description: c.notes || "",
          amount: c.type === "in"
            ? Number(c.amount)
            : -Number(c.amount)
        });
      });

      // =====================
      // LOAN RELEASE
      // =====================
      const { data: loans } = await supabase
        .from("loans")
        .select(`
          amount,
          created_at,
          borrowers (firstname, lastname)
        `);

      (loans || []).forEach(l => {
        all.push({
          date: l.created_at,
          type: "LOAN RELEASE",
          description: l.borrowers.firstname + " " + l.borrowers.lastname,
          amount: -Number(l.amount)
        });
      });

      // =====================
      // PAYMENTS
      // =====================
      const { data: payments } = await supabase
        .from("payments")
        .select(`
          amount,
          payment_date,
          breakdowns (
            loans (
              borrowers (firstname, lastname)
            )
          )
        `);

      (payments || []).forEach(p => {
        const borrower = p.breakdowns?.loans?.borrowers;

        all.push({
          date: p.payment_date,
          type: "PAYMENT",
          description: borrower
            ? borrower.firstname + " " + borrower.lastname
            : "",
          amount: Number(p.amount)
        });
      });

      // =====================
      // SORT + BALANCE
      // =====================
      all.sort((a, b) => new Date(a.date) - new Date(b.date));

      let balance = 0;

      all.forEach(e => {
        balance += e.amount;
        e.balance = balance;
      });

      this.entries = all.reverse(); // latest first
    },

    formatMoney(v) {
      return Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2
      });
    },

    formatDate(d) {
      return new Date(d).toLocaleDateString();
    }

  },

  template: `
    <div>

      <h2>Cash Flow Ledger</h2>

      <table class="ledger-table">

        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Description</th>
            <th class="right">Amount</th>
            <th class="right">Balance</th>
          </tr>
        </thead>

        <tbody>

          <tr v-for="e in entries" :key="e.id || e.date + '-' + e.amount">

            <td data-label="Date">
              {{ formatDate(e.date) }}
            </td>

            <td data-label="Type">
              <span class="status"
                :class="{
                  paid: e.amount > 0,
                  overdue: e.amount < 0
                }"
              >
                {{ e.type }}
              </span>
            </td>

            <td data-label="Description">
              {{ e.description }}
            </td>

            <td data-label="Amount" class="right">
              {{ e.amount > 0 ? '+' : '' }}₱{{ formatMoney(e.amount) }}
            </td>

            <td data-label="Balance" class="right">
              ₱{{ formatMoney(e.balance) }}
            </td>

          </tr>

        </tbody>

      </table>

    </div>
  `
};