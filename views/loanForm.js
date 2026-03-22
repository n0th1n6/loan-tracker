import { supabase } from "../supabase.js";

export default {
  props: ["user", "borrower"],

  data() {
    return {
      settings: null,

      form: {
        amount: "",
        interest_rate: "",
        payment_terms: "",
        is_semi_monthly: false
      }
    };
  },

  async mounted() {
    await this.loadSettings();
  },

  methods: {
    async loadSettings() {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", this.user.id)
        .single();

      this.settings = data;

      // Apply defaults
      if (data) {
        this.form.interest_rate = data.default_interest;
        this.form.payment_terms = data.default_terms;
        this.form.is_semi_monthly = data.default_is_semi_monthly;
      }
    },

    async createLoan() {
      const { data: loan } = await supabase
        .from("loans")
        .insert({
          user_id: this.user.id,
          borrower_id: this.borrower.id,
          amount: this.form.amount,
          interest_rate: this.form.interest_rate,
          payment_terms: this.form.payment_terms,
          is_semi_monthly: this.form.is_semi_monthly,
          payment_start_date: new Date().toISOString()
        })
        .select()
        .single();

      await supabase.rpc("generate_breakdowns", {
        p_loan_id: loan.id
      });

      alert("Loan created");
    }
  },

  template: `
    <div>
      <h2>Create Loan</h2>

      <p><b>Borrower:</b> {{ borrower.firstname }} {{ borrower.lastname }}</p>

      <div class="form">

        <div class="form-group">
          <label>Amount</label>
          <input v-model="form.amount" placeholder="Loan amount">
        </div>

        <div class="form-group">
          <label>Interest (%)</label>
          <input v-model="form.interest_rate" placeholder="Interest rate">
        </div>

        <div class="form-group">
          <label>Terms</label>
          <input v-model="form.payment_terms" placeholder="Number of payments">
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" v-model="form.is_semi_monthly">
            Semi-monthly
          </label>
        </div>

        <button @click="createLoan">Create Loan</button>

      </div>
    </div>
  `
};