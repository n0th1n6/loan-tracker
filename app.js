import { supabase } from "./supabase.js";
import Dashboard from "./views/dashboard.js";
import Borrowers from "./views/borrowers.js";

const { createApp } = Vue;

createApp({
  components: { Dashboard, Borrowers },
  data() {
    return {
      user: null,
      email: "",
      password: "",
      currentView: "dashboard"
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

          <hr>
          <button @click="logout">Logout</button>
        </div>

        <!-- MAIN CONTENT -->
        <div class="main">
          <component :is="currentView" :user="user" />
        </div>

      </div>

    </div>
  `
}).mount("#app");
