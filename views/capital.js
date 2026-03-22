import { supabase } from "../supabase.js";

export default {
  props: ["user"],

  data() {
    return {
      records: [],
      form: {
        amount: "",
        type: "in",
        notes: ""
      }
    };
  },

  async mounted() {
    this.load();
  },

  methods: {

    async load() {

      const { data, error } = await supabase
        .from("capital")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      this.records = data || [];
    },

    async add() {

      if (!this.form.amount || isNaN(this.form.amount)) {
        alert("Invalid amount");
        return;
      }

      const { error } = await supabase
        .from("capital")
        .insert({
          user_id: this.user.id,
          amount: Number(this.form.amount),
          type: this.form.type,
          notes: this.form.notes
        });

      if (error) {
        console.error(error);
        alert("Failed to save");
        return;
      }

      this.form = { amount: "", type: "in", notes: "" };

      this.load();
    },

    getBalance() {

      let total = 0;

      this.records.forEach(r => {
        total += r.type === "in"
          ? Number(r.amount)
          : -Number(r.amount);
      });

      return total;
    },

    formatDate(d) {
      return new Date(d).toLocaleDateString();
    }

  },

  template: `
  <div>

    <h2>Capital Management</h2>

    <!-- SUMMARY -->
    <div class="dashboard-grid">

      <div class="dash-card">
        <h4>Total Capital</h4>
        <div class="amount">₱{{ getBalance().toFixed(2) }}</div>
      </div>

    </div>

    <!-- FORM -->
    <div class="card">

      <h3>Add Capital Movement</h3>

      <div class="form">

        <div class="form-group">
          <label>Amount</label>
          <input v-model="form.amount">
        </div>

        <div class="form-group">
          <label>Type</label>
          <select v-model="form.type">
            <option value="in">Add Capital</option>
            <option value="out">Withdraw</option>
          </select>
        </div>

        <div class="form-group">
          <label>Notes</label>
          <input v-model="form.notes">
        </div>

        <button @click="add">Save</button>

      </div>

    </div>

    <!-- LEDGER -->
    <div class="card">

      <h3>Capital Ledger</h3>

      <table class="ledger-table">

        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th class="right">Amount</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>

          <tr v-for="r in records" :key="r.id">

            <td>{{ formatDate(r.created_at) }}</td>

            <td>
              <span 
                class="status"
                :class="r.type === 'in' ? 'paid' : 'overdue'"
              >
                {{ r.type === 'in' ? 'IN' : 'OUT' }}
              </span>
            </td>

            <td class="right">
              <span v-if="r.type === 'in'">+₱{{ r.amount }}</span>
              <span v-else>-₱{{ r.amount }}</span>
            </td>

            <td>{{ r.notes || '-' }}</td>

          </tr>

        </tbody>

      </table>

    </div>

  </div>
  `
};