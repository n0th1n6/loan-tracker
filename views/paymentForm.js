
import { supabase } from "../supabase.js";

export default {
  props: ["loan", "breakdown"],

  data() {
    return {
      form: {
        amount: "",
        payment_date: new Date().toISOString().split("T")[0]
      }
    };
  },

  methods: {

    async submitPayment() {

      const amount = Number(this.form.amount);
      if (!amount) {
        alert("Enter amount");
        return;
      }

      // 🔥 get loan details
      const { data: loan } = await supabase
        .from("loans")
        .select("*")
        .eq("id", this.loan.id)
        .single();

      const totalPayments = loan.is_semi_monthly
        ? loan.payment_terms * 2
        : loan.payment_terms;

      const principalPer = loan.amount / totalPayments;
      const interestPer = (loan.total_amount - loan.amount) / totalPayments;

      // proportional split
      const ratio = amount / loan.installment_amount;

      const principal_amount = principalPer * ratio;
      const interest_amount = interestPer * ratio;

      // ✅ insert payment
      const { error } = await supabase
        .from("payments")
        .insert({
          breakdown_id: this.breakdown.id,
          amount,
          principal_amount,
          interest_amount,
          payment_date: this.form.payment_date
        });

      if (error) {
        console.error(error);
        alert("Payment failed");
        return;
      }

      alert("Payment recorded");

      // go back to ledger
      this.$emit("back");
    }

  },

  template: `
    <div>

      <h2>Add Payment</h2>

      <div class="form">

        <div class="form-group">
          <label>Amount</label>
          <input v-model="form.amount">
        </div>

        <div class="form-group">
          <label>Payment Date</label>
          <input type="date" v-model="form.payment_date">
        </div>

        <button @click="submitPayment">Save Payment</button>
        <button @click="$emit('back')">Cancel</button>

      </div>

    </div>
  `
};