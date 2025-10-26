// Base API URL
const BASE_URL = "http://localhost:5000";

// Tab & form references
const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const formLogin = document.getElementById("form-login");
const formSignup = document.getElementById("form-signup");

// 🧭 Tab switcher
function setActiveTab(tab) {
  if (tab === "login") {
    formLogin.classList.remove("hidden");
    formSignup.classList.add("hidden");
    tabLogin.classList.add("bg-white/12", "text-white");
    tabSignup.classList.remove("bg-white/12", "text-white");
  } else {
    formSignup.classList.remove("hidden");
    formLogin.classList.add("hidden");
    tabSignup.classList.add("bg-white/12", "text-white");
    tabLogin.classList.remove("bg-white/12", "text-white");
  }
}
tabLogin.addEventListener("click", () => setActiveTab("login"));
tabSignup.addEventListener("click", () => setActiveTab("signup"));
setActiveTab("login");

// 👁️ Toggle password visibility
document.querySelectorAll("button[data-toggle]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sel = btn.getAttribute("data-toggle");
    const inp = document.querySelector(sel);
    if (!inp) return;
    inp.type = inp.type === "password" ? "text" : "password";
    btn.textContent = inp.type === "password" ? "Show" : "Hide";
  });
});

// 🧈 Toast notification
function toast(msg, success = false) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = `fixed left-1/2 -translate-x-1/2 bottom-8 ${
    success ? "bg-green-500" : "bg-red-500"
  } text-white rounded-full px-4 py-2 shadow-lg transition-all duration-300`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// 🔐 LOGIN
formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  const emailOrPhone = document.getElementById("login-email").value.trim();
  const pwd = document.getElementById("login-password").value;

  if (!emailOrPhone || !pwd)
    return toast("Please enter email/phone and password.");

  try {
    const res = await axios.post(`${BASE_URL}/user/login`, {
      identifier: emailOrPhone,
      password: pwd,
    });

    toast("Logged in — welcome back!", true);
    formLogin.reset();

    // ✅ Save token
    localStorage.setItem("token", res.data.token);

    window.location.href = "./chatWindow.html";
  } catch (err) {
    console.error(err);
    toast(err.response?.data?.message || "Login failed");
  }
});

// 📝 SIGNUP
formSignup.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const phone = document.getElementById("signup-phone").value.trim();
  const password = document.getElementById("signup-password").value;

  if (!name || !email || !phone || !password)
    return toast("Please complete the form.");

  try {
    const res = await axios.post(`${BASE_URL}/user/signup`, {
      name,
      email,
      phone,
      password,
    });

    toast("Account created successfully!", true);
    formSignup.reset();
    console.log("Signup Success:", res.data);
    setActiveTab("login");
  } catch (err) {
    console.error(err);
    toast(err.response?.data?.message || "Signup failed");
  }
});
