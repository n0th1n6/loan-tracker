import { supabase } from "../supabase.js";

export default {
  props: ["user"],

  data() {
    return {
      records: [],
      selected: null,

      filterMonth: "",

      form: {
        amount: "",
        type: "in",
        notes: "",
        entry_date: new Date().toISOString().slice(0, 10)
      },

      totals: {
        capital: 0,
        lent: 0,
        available: 0
      }
    };
  },

  async mounted() {
    await this.load();
    await this.loadLoanTotals();
  },

  methods: {

    // =====================
    // LOAD DATA
    // =====================
    async load() {

      const { data } = await supabase
        .from("capital")
        .select("*")
        .order("entry_date", { ascending: false });

      this.records = data || [];
    },

    async loadLoanTotals() {

      const { data: loans } = await supabase
        .from("loans")
        .select("amount");

      let lent = 0;

      (loans || []).forEach(l => {
        lent += Number(l.amount);
      });

      this.totals.lent = lent;
    },

    // =====================
    // ADD
    // =====================
    async add() {

      if (!this.user || !this.user.id) {
        alert("User not authenticated");
        return;
      }

      if (!this.form.amount || isNaN(this.form.amount)) {
        alert("Invalid amount");
        return;
      }

      const payload = {
        user_id: this.user.id,
        amount: Number(this.form.amount),
        type: this.form.type,
        notes: this.form.notes || null,
        entry_date: this.form.entry_date
      };

      const { error } = await supabase
        .from("capital")
        .insert(payload);

      if (error) {
        alert(error.message);
        return;
      }

      this.resetForm();
      this.load();
    },

    // =====================
    // EDIT
    // =====================
    edit(r) {
      this.selected = { ...r };
    },

    async update() {

      const { error } = await supabase
        .from("capital")
        .update({
          amount: this.selected.amount,
          type: this.selected.type,
          notes: this.selected.notes,
          entry_date: this.selected.entry_date
        })
        .eq("id", this.selected.id);

      if (error) {
        alert(error.message);
        return;
      }

      this.selected = null;
      this.load();
    },

    // =====================
    // DELETE
    // =====================
    async remove(r) {

      if (!confirm("Delete this entry?")) return;

      const { error } = await supabase
        .from("capital")
        .delete()
        .eq("id", r.id);

      if (error) {
        alert(error.message);
        return;
      }

      this.load();
    },

    // =====================
    // HELPERS
    // =====================
    resetForm() {
      this.form = {
        amount: "",
        type: "in",
        notes: "",
        entry_date: new Date().toISOString().slice(0, 10)
      };
    },

    formatDate(d) {
      return new Date(d).toLocaleDateString();
    },

    formatMoney(v) {
      return Number(v || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2
      });
    },

    // =====================
    // FILTER
    // =====================
    filteredRecords() {

      if (!this.filterMonth) return this.records;

      return this.records.filter(r =>
        r.entry_date?.startsWith(this.filterMonth)
      );
    },

    // =====================
    // BALANCE
    // =====================
    getBalance() {

      let total = 0;

      this.records.forEach(r => {
        total += r.type === "in"
          ? Number(r.amount)
          : -Number(r.amount);
      });

      this.totals.capital = total;
      this.totals.available = total - this.totals.lent;

      return total;
    },

    // =====================
    // RUNNING BALANCE
    // =====================
    getRunningBalances(list) {

      let balance = 0;
      const result = {};

      const sorted = [...list].sort(
        (a, b) => new Date(a.entry_date) - new Date(b.entry_date)
      );

      sorted.forEach(r => {

        balance += r.type === "in"
          ? Number(r.amount)
          : -Number(r.amount);

        result[r.id] = balance;
      });

      return result;
    },

    // =====================
    // MONTHLY SUMMARY
    // =====================
    getMonthlySummary() {

      const map = {};

      this.records.forEach(r => {

        const key = r.entry_date?.slice(0, 7);

        if (!map[key]) {
          map[key] = { in: 0, out: 0 };
        }

        if (r.type === "in") {
          map[key].in += Number(r.amount);
        } else {
          map[key].out += Number(r.amount);
        }
      });

      return Object.entries(map).map(([month, v]) => ({
        month,
        ...v,
        net: v.in - v.out
      }));
    }

  },

  template: `
  <div>

    <h2>Capital Management</h2>

    <!-- ===================== -->
    <!-- SUMMARY -->
    <!-- ===================== -->
    <div class="dashboard-grid">

      <div class="dash-card">
        <h4>Total Capital</h4>
        <div class="amount">₱{{ formatMoney(getBalance()) }}</div>
      </div>

      <div class="dash-card">
        <h4>Total Lent</h4>
        <div class="amount">₱{{ formatMoney(totals.lent) }}</div>
      </div>

      <div class="dash-card">
        <h4>Available Cash</h4>
        <div class="amount">₱{{ formatMoney(totals.available) }}</div>
      </div>

    </div>

    <!-- ===================== -->
    <!-- FILTER -->
    <!-- ===================== -->
    <div class="card">
      <label>Filter Month</label>
      <input type="month" v-model="filterMonth">
    </div>

    <!-- ===================== -->
    <!-- FORM -->
    <!-- ===================== -->
    <div class="card">

      <h3>Add Capital</h3>

      <div class="form">

        <input type="date" v-model="form.entry_date">
        <input v-model="form.amount" placeholder="Amount">

        <select v-model="form.type">
          <option value="in">Add</option>
          <option value="out">Withdraw</option>
        </select>

        <input v-model="form.notes" placeholder="Notes">

        <button @click="add">Save</button>

      </div>

    </div>

    <!-- ===================== -->
    <!-- EDIT -->
    <!-- ===================== -->
    <div v-if="selected" class="card">

      <h3>Edit Entry</h3>

      <div class="form">

        <input type="date" v-model="selected.entry_date">
        <input v-model="selected.amount">

        <select v-model="selected.type">
          <option value="in">Add</option>
          <option value="out">Withdraw</option>
        </select>

        <input v-model="selected.notes">

        <button @click="update">Update</button>
        <button @click="selected=null">Cancel</button>

      </div>

    </div>

    <!-- ===================== -->
    <!-- LEDGER -->
    <!-- ===================== -->
    <div class="card">

      <h3>Ledger</h3>

      <div v-if="!_balances">
        {{ _balances = getRunningBalances(filteredRecords()) }}
      </div>

      <table class="ledger-table">

        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th class="right">Amount</th>
            <th class="right">Balance</th>
            <th>Notes</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          <tr v-for="r in filteredRecords()" :key="r.id">

            <td>{{ formatDate(r.entry_date) }}</td>

            <td>{{ r.type }}</td>

            <td class="right">
              {{ r.type === 'in' ? '+' : '-' }}₱{{ formatMoney(r.amount) }}
            </td>

            <td class="right">
              ₱{{ _balances[r.id]?.toFixed(2) }}
            </td>

            <td>{{ r.notes }}</td>

            <td>
              <span class="link" @click="edit(r)">Edit</span> |
              <span class="link" @click="remove(r)">Delete</span>
            </td>

          </tr>

        </tbody>

      </table>

    </div>

    <!-- ===================== -->
    <!-- MONTHLY -->
    <!-- ===================== -->
    <div class="card">

      <h3>Monthly Summary</h3>

      <table class="ledger-table">

        <thead>
          <tr>
            <th>Month</th>
            <th class="right">In</th>
            <th class="right">Out</th>
            <th class="right">Net</th>
          </tr>
        </thead>

        <tbody>

          <tr v-for="m in getMonthlySummary()" :key="m.month">

            <td>{{ m.month }}</td>
            <td class="right">₱{{ formatMoney(m.in) }}</td>
            <td class="right">₱{{ formatMoney(m.out) }}</td>
            <td class="right">₱{{ formatMoney(m.net) }}</td>

          </tr>

        </tbody>

      </table>

    </div>

  </div>
  `
};