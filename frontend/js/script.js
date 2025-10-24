const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const formLogin = document.getElementById("form-login");
const formSignup = document.getElementById("form-signup");

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

document.querySelectorAll("button[data-toggle]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sel = btn.getAttribute("data-toggle");
    const inp = document.querySelector(sel);
    if (!inp) return;
    inp.type = inp.type === "password" ? "text" : "password";
    btn.textContent = inp.type === "password" ? "Show" : "Hide";
  });
});

function toast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.className =
    "fixed left-1/2 -translate-x-1/2 bottom-8 bg-white/90 text-black rounded-full px-4 py-2 shadow-lg";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

document.getElementById("form-login").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const pwd = document.getElementById("login-password").value;
  if (!email || !pwd) return toast("Please enter email and password.");
  toast("Logged in — welcome back!");
  console.log("Login:", { email, pwd });
});

document.getElementById("form-signup").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const pwd = document.getElementById("signup-password").value;
  if (!name || !email || pwd.length < 8)
    return toast("Please complete the form (8+ char password).");
  toast("Account created — welcome to ChatApp!");
  console.log("Signup:", { name, email, pwd });
});

window.addEventListener("keypress", (ev) => {
  if (ev.key.toLowerCase() === "l") setActiveTab("login");
  if (ev.key.toLowerCase() === "s") setActiveTab("signup");
});
