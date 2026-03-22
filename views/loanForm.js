import { supabase } from "../supabase.js";

export default {
  props: ["user", "borrower"],

  data() {
    return {
      form: {
        amount: "",
        interest_rate: "",
        payment_terms: "",
        bill_day_1: "",
        bill_day_2: "",
        loan_purpose: ""
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

      await supabase.rpc("recalc_loan", {
        p_loan_id: loan.id
      });

      await supabase.rpc("generate_breakdowns", {
        p_loan_id: loan.id
      });

      alert("Loan created");
    },
    computeLoan() {
      const amount = parseFloat(this.form.amount);
      const rate = parseFloat(this.form.interest_rate) / 100;
      const months = parseInt(this.form.payment_terms);

      const totalInterest = amount * rate * months;
      const totalAmount = amount + totalInterest;

      const totalPayments = months * 2;
      const installment = totalAmount / totalPayments;

      return {
        totalAmount,
        installment
      };
    },
    async createLoan() {

      const calc = this.computeLoan();

      const { data: loan } = await supabase
        .from("loans")
        .insert({
          user_id: this.user.id,
          borrower_id: this.borrower.id,

          amount: this.form.amount,
          interest_rate: this.form.interest_rate,
          payment_terms: this.form.payment_terms,

          bill_day_1: this.form.bill_day_1,
          bill_day_2: this.form.bill_day_2,

          loan_purpose: this.form.loan_purpose,

          total_amount: calc.totalAmount,
          installment_amount: calc.installment,

          payment_start_date: new Date().toISOString(),
          is_semi_monthly: true
        })
        .select()
        .single();

      await supabase.rpc("generate_breakdowns", {
        p_loan_id: loan.id
      });

      alert("Loan created successfully");
    }        
  },

  template: `
  <div>

    <h2>Create Loan</h2>

    <p><b>Borrower:</b> {{ borrower.firstname }} {{ borrower.lastname }}</p>

    <div class="form">

      <div class="form-group">
        <label>Loan Amount</label>
        <input v-model="form.amount" placeholder="e.g. 10000">
      </div>

      <div class="form-group">
        <label>Interest (% per month)</label>
        <input v-model="form.interest_rate" placeholder="e.g. 10">
      </div>

      <div class="form-group">
        <label>Terms (Months)</label>
        <input v-model="form.payment_terms" placeholder="e.g. 3">
      </div>

      <div class="form-group">
        <label>Billing Day 1 (1–15)</label>
        <input v-model="form.bill_day_1" placeholder="e.g. 5">
      </div>

      <div class="form-group">
        <label>Billing Day 2 (16–31)</label>
        <input v-model="form.bill_day_2" placeholder="e.g. 30">
      </div>

      <div class="form-group">
        <label>Purpose</label>
        <input v-model="form.loan_purpose" placeholder="e.g. Business">
      </div>

      <button @click="createLoan">Create Loan</button>

    </div>

  </div>
  `
};