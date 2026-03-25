import { supabase } from "./supabase.js";
import Dashboard from "./views/dashboard.js";
import Borrowers from "./views/borrowers.js";
import LoanForm from "./views/loanForm.js";
import Ledger from "./views/ledger.js";
import Outstanding from "./views/outstanding.js";
import Capital from "./views/capital.js";
import CashFlow from "./views/cashflow.js";

const { createApp } = Vue;

createApp({
  components: { Dashboard, Borrowers, LoanForm, Ledger, Outstanding, Capital, CashFlow },
  data() {
    return {
      user: null,
      email: "",
      password: "",
      currentView: "Dashboard",
      selectedBorrower: null,
      sidebarOpen: false
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
    },
    navigate(view) {
      this.currentView = view;
      this.sidebarOpen = false; // auto close on mobile
    }    
  },
template: `
  <div>

    <!-- LOGIN -->
    <div v-if="!user">
      <h2>Login</h2>
      <input v-model="email" placeholder="Email">
      <input v-model="password" type="password" placeholder="Password">
      <button @click="login">Login</button>
    </div>

    <!-- APP -->
    <div v-else>

      <!-- 🔥 MOBILE HEADER -->
      <div class="mobile-header">
        <button @click="sidebarOpen = !sidebarOpen">☰</button>
        <span>Rochelli Loan Tracker</span>
      </div>

      <div class="layout">

        <!-- SIDEBAR -->
        <div class="sidebar" :class="{ open: sidebarOpen }">

          <h2>Rochelli Loan Tracker</h2>

          <button @click="navigate('dashboard')">Dashboard</button>
          <button @click="navigate('Capital')">Capital</button>
          <button @click="navigate('CashFlow')">Cash Flow</button>
          <button @click="navigate('borrowers')">Borrowers</button>
          <button @click="navigate('Outstanding')">Outstanding Loans</button>

          <hr>
          <button @click="logout">Logout</button>
        </div>

        <!-- OVERLAY (for mobile) -->
        <div 
          v-if="sidebarOpen" 
          class="overlay" 
          @click="sidebarOpen = false">
        </div>

        <!-- MAIN -->
        <div class="main">
          <component 
            :is="currentView" 
            :user="user"
            :borrower="selectedBorrower"

            @open-loan-form="b => { selectedBorrower = b; currentView = 'LoanForm'; }"
            @open-ledger="b => { selectedBorrower = b; currentView = 'Ledger'; }"
            @pay-breakdown="b => {selectedBorrower = b.loans.borrowers; selectedBreakdown = b; currentView = 'Ledger'; }"            
          />      
        </div>

      </div>

    </div>
  </div>
  `
}).mount("#app");
