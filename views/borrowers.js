import { supabase } from "../supabase.js";

export default {
  props: ["user"],
  data() {
    return {
      borrowers: [],
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
      const { data } = await supabase.from("borrowers").select("*");
      this.borrowers = data || [];
    },
    async add() {
      await supabase.from("borrowers").insert({
        ...this.form,
        user_id: this.user.id
      });
      this.form = { firstname: "", lastname: "", occupation: "", city: "" };
      this.load();
    },
    openBorrower(b) {
      this.selectedBorrower = { ...b };
    },

    async updateBorrower() {
      await supabase
        .from("borrowers")
        .update(this.selectedBorrower)
        .eq("id", this.selectedBorrower.id);

      alert("Updated");
      this.selectedBorrower = null;
      this.load();
    },

    goToAddLoan() {
      alert("Next step: link this to loan creation");
    },
    addLoanFromBorrower(b) {
      this.$emit("open-loan-form", b);
    }
  },
  template: `
    <div>

      <h2>Borrowers</h2>

      <!-- LIST VIEW -->
      <div v-if="!selectedBorrower">

        <h3>Add Borrower</h3>
        <div class="form">

          <div class="form-group">
            <label>First Name</label>
            <input v-model="form.firstname" placeholder="e.g. Juan">
          </div>

          <div class="form-group">
            <label>Last Name</label>
            <input v-model="form.lastname" placeholder="e.g. Dela Cruz">
          </div>

          <div class="form-group">
            <label>Occupation</label>
            <input v-model="form.occupation" placeholder="e.g. Driver">
          </div>

          <div class="form-group">
            <label>Address 1</label>
            <input v-model="form.address1" placeholder="Street / House No.">
          </div>

          <div class="form-group">
            <label>Address 2</label>
            <input v-model="form.address2" placeholder="Subdivision / Building">
          </div>

          <div class="form-group">
            <label>Barangay</label>
            <input v-model="form.barangay" placeholder="Barangay name">
          </div>

          <div class="form-group">
            <label>City</label>
            <input v-model="form.city" placeholder="City / Municipality">
          </div>

          <div class="form-group">
            <label>Province</label>
            <input v-model="form.province" placeholder="Province">
          </div>

          <div class="form-group">
            <label>Country</label>
            <input v-model="form.country" placeholder="Country">
          </div>

          <button @click="add">Add Borrower</button>

        </div>

        <h3>List</h3>
        <div class="card" v-for="b in borrowers" :key="b.id">

          <b>{{ b.firstname }} {{ b.lastname }}</b><br>
          {{ b.city }}<br><br>

          <button @click="openBorrower(b)">Edit</button>
          <button @click="addLoanFromBorrower(b)">Add Loan</button>

        </div>

      </div>

      <!-- DETAIL VIEW -->
      <div v-else>

        <button @click="selectedBorrower = null">← Back</button>

        <h3>Edit Borrower</h3>

        <div class="form">

          <div class="form-group">
            <label>First Name</label>
            <input v-model="selectedBorrower.firstname" placeholder="First name">
          </div>

          <div class="form-group">
            <label>Last Name</label>
            <input v-model="selectedBorrower.lastname" placeholder="Last name">
          </div>

          <div class="form-group">
            <label>Occupation</label>
            <input v-model="selectedBorrower.occupation" placeholder="Occupation">
          </div>

          <div class="form-group">
            <label>Address 1</label>
            <input v-model="selectedBorrower.address1" placeholder="Street / House No.">
          </div>

          <div class="form-group">
            <label>Address 2</label>
            <input v-model="selectedBorrower.address2" placeholder="Subdivision / Building">
          </div>

          <div class="form-group">
            <label>Barangay</label>
            <input v-model="selectedBorrower.barangay" placeholder="Barangay">
          </div>

          <div class="form-group">
            <label>City</label>
            <input v-model="selectedBorrower.city" placeholder="City">
          </div>

          <div class="form-group">
            <label>Province</label>
            <input v-model="selectedBorrower.province" placeholder="Province">
          </div>

          <div class="form-group">
            <label>Country</label>
            <input v-model="selectedBorrower.country" placeholder="Country">
          </div>

          <button @click="updateBorrower">Save Changes</button>

        </div>

        <h3>Actions</h3>
        <button @click="goToAddLoan">Add Loan</button>
        <button @click="$emit('open-ledger', b)">Ledger</button>

      </div>

    </div>
  `
};
