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
    }    
  },
  template: `
    <div>

      <h2>Borrowers</h2>

      <!-- LIST VIEW -->
      <div v-if="!selectedBorrower">

        <h3>Add Borrower</h3>
        <div class="form">
          <input v-model="form.firstname" placeholder="First Name">
          <input v-model="form.lastname" placeholder="Last Name">
          <input v-model="form.occupation" placeholder="Occupation">

          <input v-model="form.address1" placeholder="Address 1">
          <input v-model="form.address2" placeholder="Address 2">
          <input v-model="form.barangay" placeholder="Barangay">
          <input v-model="form.city" placeholder="City">
          <input v-model="form.province" placeholder="Province">
          <input v-model="form.country" placeholder="Country">

          <button @click="add">Add Borrower</button>
        </div>

        <h3>List</h3>
        <div class="card" v-for="b in borrowers" :key="b.id">
          <span class="link" @click="openBorrower(b)">
            {{ b.firstname }} {{ b.lastname }}
          </span><br>
          {{ b.city }}
        </div>

      </div>

      <!-- DETAIL VIEW -->
      <div v-else>

        <button @click="selectedBorrower = null">← Back</button>

        <h3>Edit Borrower</h3>

        <div class="form">
          <input v-model="selectedBorrower.firstname">
          <input v-model="selectedBorrower.lastname">
          <input v-model="selectedBorrower.occupation">

          <input v-model="selectedBorrower.address1">
          <input v-model="selectedBorrower.address2">
          <input v-model="selectedBorrower.barangay">
          <input v-model="selectedBorrower.city">
          <input v-model="selectedBorrower.province">
          <input v-model="selectedBorrower.country">

          <button @click="updateBorrower">Save</button>
        </div>

        <h3>Actions</h3>
        <button @click="goToAddLoan">Add Loan</button>

      </div>

    </div>
  `
};
