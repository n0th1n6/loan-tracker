import { supabase } from "../supabase.js";

export default {
  props: ["user"],
  data() {
    return {
      loans: [],
      totals: {
        lent: 0,
        collected: 0,
        outstanding: 0,
        overdue: 0
      }
    };
  },
  async mounted() {
    this.loadLoans();
    this.loadTotals();
  },
  methods: {
    async loadLoans() {
      const { data } = await supabase
        .from("loans")
        .select("id, amount, borrowers(firstname, lastname)");
      this.loans = data || [];
    },
    async loadTotals() {

      // Total Lent
      const { data: loans } = await supabase
        .from("loans")
        .select("total_amount");

      const totalLent = loans.reduce((s, l) => s + Number(l.total_amount || 0), 0);

      // Total Collected
      const { data: payments } = await supabase
        .from("payments")
        .select("amount");

      const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);

      // Outstanding
      const outstanding = totalLent - totalCollected;

      // Overdue
      const { data: overdue } = await supabase
        .from("breakdowns")
        .select("id")
        .eq("status", "overdue");

      this.totals = {
        lent: totalLent,
        collected: totalCollected,
        outstanding,
        overdue: overdue.length
      };
    }    
  },
  template: `
  <div>

    <h2>Dashboard</h2>

    <div class="card">
      <b>Total Lent:</b> {{ totals.lent }} <br>
      <b>Total Collected:</b> {{ totals.collected }} <br>
      <b>Outstanding:</b> {{ totals.outstanding }} <br>
      <b>Overdue:</b> {{ totals.overdue }}
    </div>

    <div v-for="l in loans" :key="l.id" class="card">
      {{ l.borrowers.firstname }} {{ l.borrowers.lastname }} - {{ l.amount }}
    </div>

  </div>
  `
};
