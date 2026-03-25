import { supabase } from "../supabase.js";

export default {
  props: ["user"],

  data() {
    return {
      borrowers: [],
      overdueBorrowers: [],
      upcoming: [],
      upcomingGrouped: [], // ✅ NEW
      totals: {
        lent: 0,
        collected: 0,
        outstanding: 0,
        overdue: 0,
        cash: 0
      }
    };
  },

  async mounted() {
    await this.loadTotals();
    await this.loadBorrowers();
    await this.loadOverdue();
    await this.loadUpcoming();
  },

  methods: {

    // =====================
    // TOTALS
    // =====================
    async loadTotals() {

      const { data: loans } = await supabase
        .from("loans")
        .select("total_amount");

      const lent = (loans || []).reduce(
        (s, l) => s + Number(l.total_amount || 0), 0
      );

      const { data: payments } = await supabase
        .from("payments")
        .select("amount");

      const collected = (payments || []).reduce(
        (s, p) => s + Number(p.amount), 0
      );

      const outstanding = lent - collected;

      const { data: overdue } = await supabase
        .from("breakdowns")
        .select("id")
        .eq("status", "overdue");

      const cash = collected - lent;

      this.totals = {
        lent,
        collected,
        outstanding,
        overdue: (overdue || []).length,
        cash
      };
    },

    // =====================
    // BORROWERS
    // =====================
    async loadBorrowers() {

      const { data } = await supabase
        .from("borrowers")
        .select(`
          id,
          firstname,
          lastname,
          loans (
            total_amount,
            breakdowns (
              payments (amount)
            )
          )
        `);

      this.borrowers = (data || []).map(b => {

        let total = 0;

        (b.loans || []).forEach(loan => {

          let paid = 0;

          (loan.breakdowns || []).forEach(bd => {
            (bd.payments || []).forEach(p => {
              paid += Number(p.amount);
            });
          });

          total += Number(loan.total_amount || 0) - paid;

        });

        return { ...b, balance: total };

      }).sort((a, b) => b.balance - a.balance);
    },

    // =====================
    // OVERDUE
    // =====================
    async loadOverdue() {

      const { data } = await supabase
        .from("breakdowns")
        .select(`
          amount,
          payments (amount),
          loans (
            borrower_id,
            borrowers (
              id,
              firstname,
              lastname
            )
          )
        `)
        .eq("status", "overdue");

      const map = {};

      (data || []).forEach(b => {

        const borrower = b.loans.borrowers;

        const paid = (b.payments || []).reduce(
          (s, p) => s + Number(p.amount), 0
        );

        const remaining = Number(b.amount) - paid;

        if (remaining <= 0) return;

        if (!map[borrower.id]) {
          map[borrower.id] = {
            ...borrower,
            count: 0,
            amount: 0
          };
        }

        map[borrower.id].count++;
        map[borrower.id].amount += remaining;
      });

      this.overdueBorrowers = Object.values(map)
        .sort((a, b) => b.amount - a.amount);
    },

    // =====================
    // UPCOMING (UPDATED)
    // =====================
    async loadUpcoming() {

      const today = new Date();
      const next7 = new Date();
      next7.setDate(today.getDate() + 7);

      const { data } = await supabase
        .from("breakdowns")
        .select(`
          due_date,
          amount,
          loans (
            borrowers (
              id,
              firstname,
              lastname
            )
          )
        `)
        .gte("due_date", today.toISOString())
        .lte("due_date", next7.toISOString())
        .neq("status", "paid");

      const raw = data || [];

      // ✅ SORT
      raw.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      // ✅ GROUP + SUBTOTAL
      const map = {};

      raw.forEach(u => {
        const key = u.due_date;

        if (!map[key]) {
          map[key] = {
            date: key,
            items: [],
            subtotal: 0
          };
        }

        map[key].items.push(u);
        map[key].subtotal += Number(u.amount);
      });

      this.upcoming = raw; // keep original
      this.upcomingGrouped = Object.values(map);
    },

    formatMoney(v) {
      return Number(v || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2
      });
    },

    formatDate(d) {
      return new Date(d).toLocaleDateString();
    }

  },

  template: `
  <div>

    <h2>Rochelli Loan Dashboard</h2>

    <div class="dashboard-grid">
      <div class="dash-card">
        <h4>Total Lent</h4>
        <div class="amount">₱{{ formatMoney(totals.lent) }}</div>
      </div>

      <div class="dash-card">
        <h4>Collected</h4>
        <div class="amount">₱{{ formatMoney(totals.collected) }}</div>
      </div>

      <div class="dash-card">
        <h4>Outstanding</h4>
        <div class="amount">₱{{ formatMoney(totals.outstanding) }}</div>
      </div>

      <div class="dash-card">
        <h4>Overdue</h4>
        <div class="amount">{{ totals.overdue }}</div>
      </div>

      <div class="dash-card">
        <h4>Cash Flow</h4>
        <div class="amount">₱{{ formatMoney(totals.cash) }}</div>
      </div>
    </div>

    <!-- UPCOMING -->
    <div class="card">

      <h3>Upcoming (Next 7 Days)</h3>

      <table class="ledger-table">

        <thead>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th class="right">Amount</th>
          </tr>
        </thead>

        <tbody>

          <!-- GROUPED -->
          <template v-for="g in upcomingGrouped">

            <!-- DATE HEADER -->
            <tr>
              <td colspan="3"><b>{{ formatDate(g.date) }}</b></td>
            </tr>

            <!-- ITEMS -->
            <tr v-for="u in g.items" :key="u.due_date + u.amount">
              <td>
                {{ u.loans.borrowers.firstname }} 
                {{ u.loans.borrowers.lastname }}
              </td>
              <td>{{ formatDate(u.due_date) }}</td>
              <td class="right">₱{{ formatMoney(u.amount) }}</td>
            </tr>

            <!-- SUBTOTAL -->
            <tr>
              <td colspan="2"><b>Subtotal</b></td>
              <td class="right"><b>₱{{ formatMoney(g.subtotal) }}</b></td>
            </tr>

          </template>

          <tr v-if="upcoming.length === 0">
            <td colspan="3">No upcoming payments</td>
          </tr>

        </tbody>

      </table>

    </div>

  </div>
  `
};