const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const logoutBtn = document.getElementById("logout-btn");
const sidebar = document.getElementById("sidebar");
const chatArea = document.getElementById("chat-area");
const backBtn = document.getElementById("back-btn");
const chatName = document.getElementById("chat-name");

const BASE_URL = "http://localhost:5000";

// ✅ Check if logged in
const token = localStorage.getItem("token");
if (!token) {
  alert("Please log in first!");
  window.location.href = "/login.html";
}

// 🧠 Load messages
async function loadMessages() {
  try {
    const res = await axios.get(`${BASE_URL}/chat/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const messages = res.data;
    chatBox.innerHTML = "";

    messages.forEach((msg) => {
      const div = document.createElement("div");
      div.className = "flex flex-col";
      div.innerHTML = `
        <div class="text-sm text-gray-400 mb-1">${msg.User.name} • ${new Date(
        msg.createdAt
      ).toLocaleTimeString()}</div>
        <div class="bg-gray-700 px-3 py-2 rounded-xl inline-block max-w-[70%]">
          ${msg.content}
        </div>
      `;
      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    console.error(err);
  }
}

// 💬 Send a message
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = messageInput.value.trim();
  if (!content) return;

  try {
    await axios.post(
      `${BASE_URL}/chat/send`,
      { content },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    messageInput.value = "";
    await loadMessages();
  } catch (err) {
    console.error(err);
  }
});

// 🔁 Refresh messages every 5 seconds
setInterval(loadMessages, 5000);
loadMessages();

// 👋 Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

// 🧭 Mobile behavior
document.querySelectorAll("#contacts > div").forEach((contact) => {
  contact.addEventListener("click", () => {
    const name = contact.getAttribute("data-name");
    chatName.textContent = name;
    if (window.innerWidth < 768) {
      sidebar.classList.add("-translate-x-full");
      chatArea.classList.remove("translate-x-full");
    }
  });
});

backBtn.addEventListener("click", () => {
  if (window.innerWidth < 768) {
    sidebar.classList.remove("-translate-x-full");
    chatArea.classList.add("translate-x-full");
  }
});
