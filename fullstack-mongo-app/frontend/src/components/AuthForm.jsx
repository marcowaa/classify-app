import { useState } from "react";

export default function AuthForm({ mode, onSubmit, loading }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isRegister = mode === "register";

  const submit = (event) => {
    event.preventDefault();
    onSubmit({ name, email, password });
  };

  return (
    <form onSubmit={submit} className="card">
      <h2>{isRegister ? "Create Account" : "Sign In"}</h2>

      {isRegister && (
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
      )}

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>

      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </label>

      <button disabled={loading}>{loading ? "Please wait..." : isRegister ? "Register" : "Login"}</button>
    </form>
  );
}
