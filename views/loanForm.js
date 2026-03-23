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

        payment_type: "semi-monthly",

        bill_day_1: "",
        bill_day_2: "",

        start_date: "",

        loan_purpose: ""
      }
    };
  },

  async mounted() {
    await this.loadSettings();

    // default start date = today
    this.form.start_date = new Date().toISOString().split("T")[0];
  },

  methods: {

    async loadSettings() {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", this.user.id)
        .single();

      this.settings = data;

      if (data) {
        this.form.interest_rate = data.default_interest;
        this.form.payment_terms = data.default_terms;

        this.form.payment_type = data.default_is_semi_monthly
          ? "semi-monthly"
          : "monthly";
      }
    },

    computeLoan() {
      const amount = parseFloat(this.form.amount);
      const rate = parseFloat(this.form.interest_rate) / 100;
      const months = parseInt(this.form.payment_terms);

      const totalInterest = amount * rate * months;
      const totalAmount = amount + totalInterest;

      const totalPayments = this.form.payment_type === "semi-monthly"
        ? months * 2
        : months;

      const installment = totalAmount / totalPayments;

      return {
        totalAmount,
        installment
      };
    },

    validateForm() {

      if (!this.form.start_date) {
        alert("Start date is required");
        return false;
      }

      if (!this.form.amount || !this.form.payment_terms) {
        alert("Amount and terms are required");
        return false;
      }

      if (this.form.payment_type === "semi-monthly") {

        const d1 = parseInt(this.form.bill_day_1);
        const d2 = parseInt(this.form.bill_day_2);

        if (!d1 || !d2) {
          alert("Bill days are required");
          return false;
        }

        if (d1 >= d2) {
          alert("Bill Day 1 must be less than Bill Day 2");
          return false;
        }

        if (d1 < 1 || d1 > 31 || d2 < 1 || d2 > 31) {
          alert("Bill days must be between 1 and 31");
          return false;
        }
      }

      return true;
    },

    async createLoan() {

      if (!this.validateForm()) return;

      const calc = this.computeLoan();

      const { data: loan, error } = await supabase
        .from("loans")
        .insert({
          user_id: this.user.id,
          borrower_id: this.borrower.id,

          amount: parseFloat(this.form.amount),
          interest_rate: parseFloat(this.form.interest_rate),
          payment_terms: parseInt(this.form.payment_terms),

          bill_day_1: this.form.payment_type === "semi-monthly"
            ? parseInt(this.form.bill_day_1)
            : null,

          bill_day_2: this.form.payment_type === "semi-monthly"
            ? parseInt(this.form.bill_day_2)
            : null,

          loan_purpose: this.form.loan_purpose,

          total_amount: calc.totalAmount,
          installment_amount: calc.installment,

          payment_start_date: this.form.start_date,

          is_semi_monthly: this.form.payment_type === "semi-monthly"
        })
        .select()
        .single();

      if (error) {
        console.error("LOAN INSERT ERROR:", error);
        alert("Failed to create loan");
        return;
      }

      console.log("LOAN CREATED:", loan);

      // 🔥 MUST DO THIS FIRST
      const { error: recalcError } = await supabase.rpc("recalc_loan", {
        p_loan_id: loan.id
      });

      if (recalcError) {
        console.error("RECALC ERROR:", recalcError);
      }

      // 🔥 THEN GENERATE SCHEDULE
      const { error: breakdownError } = await supabase.rpc("generate_breakdowns", {
        p_loan_id: loan.id
      });

      if (breakdownError) {
        console.error("BREAKDOWN ERROR:", breakdownError);
        alert("Breakdown generation failed");
        return;
      }

      alert("Loan created successfully");

    }
  },

  template: `
    <div>

      <h2>Create Loan</h2>

      <p><b>{{ borrower.firstname }} {{ borrower.lastname }}</b></p>

      <div class="form">

        <div class="form-group">
          <label>Loan Amount</label>
          <input 
            v-model="form.amount" 
            placeholder="e.g. 10000"
            inputmode="numeric"
          >
        </div>

        <div class="form-group">
          <label>Interest (% per month)</label>
          <input 
            v-model="form.interest_rate" 
            placeholder="e.g. 10"
            inputmode="numeric"
          >
        </div>

        <div class="form-group">
          <label>Terms (Months)</label>
          <input 
            v-model="form.payment_terms" 
            placeholder="e.g. 3"
            inputmode="numeric"
          >
        </div>

        <div class="form-group">
          <label>Payment Type</label>
          <select v-model="form.payment_type">
            <option value="semi-monthly">Semi-Monthly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div v-if="form.payment_type === 'semi-monthly'">

          <div class="form-group">
            <label>Bill Day 1</label>
            <input 
              v-model="form.bill_day_1" 
              placeholder="1–15"
              inputmode="numeric"
            >
          </div>

          <div class="form-group">
            <label>Bill Day 2</label>
            <input 
              v-model="form.bill_day_2" 
              placeholder="16–31"
              inputmode="numeric"
            >
          </div>

        </div>

        <div class="form-group">
          <label>Start Date</label>
          <input type="date" v-model="form.start_date">
        </div>

        <div class="form-group">
          <label>Purpose</label>
          <input v-model="form.loan_purpose" placeholder="e.g. Business">
        </div>

        <button @click="createLoan">
          Create Loan
        </button>

      </div>

    </div>
  `
};