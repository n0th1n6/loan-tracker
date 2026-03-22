import { supabase } from "../supabase.js";

export default {
  props: ["user"],
  data() {
    return { loans: [] };
  },
  async mounted() {
    this.loadLoans();
  },
  methods: {
    async loadLoans() {
      const { data } = await supabase
        .from("loans")
        .select("id, amount, borrowers(firstname, lastname)");
      this.loans = data || [];
    }
  },
  template: `
    <div>
      <h2>Dashboard</h2>
      <div class="card" v-for="l in loans" :key="l.id">
        {{ l.borrowers.firstname }} {{ l.borrowers.lastname }} - {{ l.amount }}
      </div>
    </div>
  `
};
