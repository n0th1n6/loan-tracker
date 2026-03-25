import { supabase } from "../supabase.js";

export default {
  props: ["user"],

  data() {
    return {
      borrowers: [],
      overdueBorrowers: [],
      upcoming: [],
      upcomingSubtotal: {}, // ✅ ADDED
      totals: {
        lent: 0,
        collected: 0,
        outstanding: 0,
        overdue: 0,
        cash: 0,
        profit: 0
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
    // TOTALS (FIXED)
    // =====================
    async loadTotals() {

      // ✅ FIX: use amount (principal only)
      const { data: loans } = await supabase
        .from("loans")
        .select("amount");

      const lent = (loans || []).reduce(
        (s, l) => s + Number(l.amount || 0), 0
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

      // ✅ FIX: include capital in cash calculation
      const { data: capital } = await supabase
        .from("capital")
        .select("amount, type");

      const totalCapital = (capital || []).reduce((sum, c) => {
        return c.type === "in"
          ? sum + Number(c.amount)
          : sum - Number(c.amount);
      }, 0);

      const cash = totalCapital + collected - lent;
            // ✅ PROFIT CALCULATION (as of latest data)
      const principalRecovered = lent - outstanding;
      const profit = collected - principalRecovered;

      this.totals = {
        lent,
        collected,
        outstanding,
        overdue: (overdue || []).length,
        cash,
        profit
      };
    },

    // =====================
    // BORROWERS (TOP)
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
    // OVERDUE (WITH AMOUNT)
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
    // UPCOMING PAYMENTS (UNCHANGED)
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

      raw.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      const subtotal = {};
      raw.forEach(u => {
        if (!subtotal[u.due_date]) subtotal[u.due_date] = 0;
        subtotal[u.due_date] += Number(u.amount);
      });

      this.upcoming = raw;
      this.upcomingSubtotal = subtotal;
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

      <div class="dash-card">
        <h4>Profit</h4>
        <div class="amount">₱{{ formatMoney(totals.profit) }}</div>
      </div>      
    </div>

    <!-- OVERDUE -->
    <div class="card">
      <h3 style="color:#c0392b;">Overdue Borrowers</h3>
      <table class="ledger-table">
        <thead>
          <tr>
            <th>Name</th>
            <th class="right">Amount</th>
            <th class="right">Count</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in overdueBorrowers" :key="b.id" style="background:#fff5f5;">
            <td>
              <span class="link" @click="$emit('open-ledger', b)">
                {{ b.firstname }} {{ b.lastname }}
              </span>
            </td>
            <td class="right">₱{{ formatMoney(b.amount) }}</td>
            <td class="right">{{ b.count }}</td>
          </tr>
          <tr v-if="overdueBorrowers.length === 0">
            <td colspan="3">No overdue 🎉</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- TOP BORROWERS -->
    <div class="card">
      <h3>Top Outstanding Borrowers</h3>
      <table class="ledger-table">
        <thead>
          <tr>
            <th>Name</th>
            <th class="right">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in borrowers.slice(0, 10)" :key="b.id">
            <td>
              <span class="link" @click="$emit('open-ledger', b)">
                {{ b.firstname }} {{ b.lastname }}
              </span>
            </td>
            <td class="right">₱{{ formatMoney(b.balance) }}</td>
          </tr>
        </tbody>
      </table>
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

          <template v-for="(u, index) in upcoming" :key="u.due_date + index">

            <tr>
              <td>
                {{ u.loans.borrowers.firstname }} 
                {{ u.loans.borrowers.lastname }}
              </td>

              <td>{{ formatDate(u.due_date) }}</td>

              <td class="right">
                ₱{{ formatMoney(u.amount) }}
                <br>
                <span class="link" @click="$emit('pay-breakdown', u)">
                  Pay
                </span>
              </td>              
            </tr>

            <tr v-if="index === upcoming.length - 1 || u.due_date !== upcoming[index + 1].due_date">
              <td colspan="2"><b>Subtotal</b></td>
              <td class="right">
                <b>₱{{ formatMoney(upcomingSubtotal[u.due_date]) }}</b>
              </td>
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