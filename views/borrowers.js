import { supabase } from "../supabase.js";

export default {
  props: ["user"],
  data() {
    return {
      borrowers: [],
      form: { firstname: "", lastname: "", occupation: "", city: "" }
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
    }
  },
  template: `
    <div>
      <h2>Borrowers</h2>
      <input v-model="form.firstname" placeholder="First">
      <input v-model="form.lastname" placeholder="Last">
      <input v-model="form.occupation" placeholder="Occupation">
      <input v-model="form.city" placeholder="City">
      <button @click="add">Add</button>

      <div class="card" v-for="b in borrowers" :key="b.id">
        {{ b.firstname }} {{ b.lastname }} - {{ b.city }}
      </div>
    </div>
  `
};
