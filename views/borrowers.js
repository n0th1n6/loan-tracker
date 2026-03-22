import { supabase } from "../supabase.js";

export default {
  props: ["user"],

  data() {
    return {
      borrowers: [],
      showForm: false,
      selectedBorrower: null,

      form: {
        firstname: "",
        lastname: "",
        occupation: "",
        address1: "",
        address2: "",
        barangay: "",
        city: "",
        province: "",
        country: ""
      }
    };
  },

  async mounted() {
    this.load();
  },

  methods: {

    async load() {

      const { data, error } = await supabase
        .from("borrowers")
        .select(`
          *,
          loans (
            id,
            status,
            total_amount,
            breakdowns (
              amount,
              payments (amount)
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      this.borrowers = data || [];
    },

    resetForm() {
      this.form = {
        firstname: "",
        lastname: "",
        occupation: "",
        address1: "",
        address2: "",
        barangay: "",
        city: "",
        province: "",
        country: ""
      };
    },

    async add() {

      if (!this.form.firstname || !this.form.lastname) {
        alert("First and Last name are required");
        return;
      }

      const { error } = await supabase
        .from("borrowers")
        .insert({
          ...this.form,
          user_id: this.user.id
        });

      if (error) {
        console.error(error);
        alert("Failed to add borrower");
        return;
      }

      this.resetForm();
      this.showForm = false;
      this.load();
    },

    openBorrower(b) {
      this.selectedBorrower = { ...b };
      this.showForm = false;
    },

    async updateBorrower() {

      const { error } = await supabase
        .from("borrowers")
        .update(this.selectedBorrower)
        .eq("id", this.selectedBorrower.id);

      if (error) {
        console.error(error);
        alert("Update failed");
        return;
      }

      alert("Updated successfully");
      this.selectedBorrower = null;
      this.load();
    },

    goToAddLoan() {
      if (!this.selectedBorrower) return;
      this.$emit("open-loan-form", this.selectedBorrower);
    },

    async addLoanFromBorrower(b) {

      const hasActive = (b.loans || []).some(l => l.status === "active");

      if (hasActive) {
        alert("Borrower still has an active loan");
        return;
      }

      this.$emit("open-loan-form", b);
    },

    hasActiveLoan(b) {
      return (b.loans || []).some(l => l.status === "active");
    },

    getBalance(b) {

      let total = 0;

      (b.loans || []).forEach(loan => {

        let paid = 0;

        (loan.breakdowns || []).forEach(bd => {
          (bd.payments || []).forEach(p => {
            paid += Number(p.amount);
          });
        });

        total += (loan.total_amount || 0) - paid;

      });

      return total;
    }

  },

  template: `
  <div>

    <h2>Borrowers</h2>

    <!-- ADD BUTTON -->
    <button @click="showForm = !showForm">
      {{ showForm ? 'Cancel' : 'Add Borrower' }}
    </button>

    <!-- ===================== -->
    <!-- ADD FORM -->
    <!-- ===================== -->
    <div v-if="showForm && !selectedBorrower" class="form">

      <h3>Add Borrower</h3>

      <div class="form-group">
        <label>First Name</label>
        <input v-model="form.firstname">
      </div>

      <div class="form-group">
        <label>Last Name</label>
        <input v-model="form.lastname">
      </div>

      <div class="form-group">
        <label>Occupation</label>
        <input v-model="form.occupation">
      </div>

      <div class="form-group">
        <label>Address 1</label>
        <input v-model="form.address1">
      </div>

      <div class="form-group">
        <label>Address 2</label>
        <input v-model="form.address2">
      </div>

      <div class="form-group">
        <label>Barangay</label>
        <input v-model="form.barangay">
      </div>

      <div class="form-group">
        <label>City</label>
        <input v-model="form.city">
      </div>

      <div class="form-group">
        <label>Province</label>
        <input v-model="form.province">
      </div>

      <div class="form-group">
        <label>Country</label>
        <input v-model="form.country">
      </div>

      <button @click="add">Save Borrower</button>

    </div>

    <!-- ===================== -->
    <!-- LIST VIEW -->
    <!-- ===================== -->
    <div v-if="!selectedBorrower">

      <h3>Borrowers</h3>

      <table class="ledger-table">

        <thead>
          <tr>
            <th>Name</th>
            <th>City</th>
            <th>Status</th>
            <th class="right">Balance</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          <tr v-for="b in borrowers" :key="b.id">

            <td>
              <span class="link" @click="openBorrower(b)">
                {{ b.firstname }} {{ b.lastname }}
              </span>
            </td>

            <td>{{ b.city || '-' }}</td>

            <td>
              <span 
                class="status"
                :class="hasActiveLoan(b) ? 'pending' : 'paid'"
              >
                {{ hasActiveLoan(b) ? 'Active Loan' : 'No Loan' }}
              </span>
            </td>

            <td class="right">
              ₱{{ getBalance(b).toFixed(2) }}
            </td>

            <td>
              <span class="link" @click="addLoanFromBorrower(b)">
                Add Loan
              </span>
              &nbsp;|&nbsp;
              <span class="link" @click="$emit('open-ledger', b)">
                Ledger
              </span>
            </td>

          </tr>

        </tbody>

      </table>

    </div>

    <!-- ===================== -->
    <!-- EDIT VIEW -->
    <div v-if="selectedBorrower">

      <button @click="selectedBorrower = null">← Back</button>

      <h3>Edit Borrower</h3>

      <div class="form">

        <input v-model="selectedBorrower.firstname">
        <input v-model="selectedBorrower.lastname">
        <input v-model="selectedBorrower.occupation">
        <input v-model="selectedBorrower.city">

        <button @click="updateBorrower">Save Changes</button>

      </div>

      <h3>Actions</h3>
      <button @click="goToAddLoan">Add Loan</button>

    </div>

  </div>
  `
};