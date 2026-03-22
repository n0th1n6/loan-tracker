import { supabase } from "./supabase.js";
import Dashboard from "./views/dashboard.js";
import Borrowers from "./views/borrowers.js";
import LoanForm from "./views/loanForm.js";
import Ledger from "./views/ledger.js";
import Outstanding from "./views/outstanding.js";
import Capital from "./views/capital.js";

const { createApp } = Vue;

createApp({
  components: { Dashboard, Borrowers, LoanForm, Ledger, Outstanding, Capital },
  data() {
    return {
      user: null,
      email: "",
      password: "",
      currentView: "dashboard",
      selectedBorrower: null
    };
  },
  async mounted() {
    const { data } = await supabase.auth.getUser();
    this.user = data.user;
  },
  methods: {
    async login() {
      const { error } = await supabase.auth.signInWithPassword({
        email: this.email,
        password: this.password
      });
      if (!error) {
        const { data } = await supabase.auth.getUser();
        this.user = data.user;
      } else alert(error.message);
    },
    async logout() {
      await supabase.auth.signOut();
      this.user = null;
    }
  },
  template: `
    <div>

      <div v-if="!user">
        <h2>Login</h2>
        <input v-model="email" placeholder="Email">
        <input v-model="password" type="password" placeholder="Password">
        <button @click="login">Login</button>
      </div>

      <div v-else class="layout">

        <!-- SIDEBAR -->
        <div class="sidebar">
          <h2>Loan App</h2>

          <button @click="currentView='dashboard'">Dashboard</button>
          <button @click="currentView='borrowers'">Borrowers</button>
          <button @click="currentView='Outstanding'">Outstanding Loans</button>
          <button @click="currentView='Capital'">Capital</button>

          <hr>
          <button @click="logout">Logout</button>
        </div>

        <!-- MAIN CONTENT -->
        <div class="main">
          <component 
            :is="currentView" 
            :user="user"
            :borrower="selectedBorrower"

            @open-loan-form="b => { selectedBorrower = b; currentView = 'LoanForm'; }"
            @open-ledger="b => { selectedBorrower = b; currentView = 'Ledger'; }"
          />      
        </div>

      </div>

    </div>
  `
}).mount("#app");
