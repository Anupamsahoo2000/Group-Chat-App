const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const logoutBtn = document.getElementById("logout-btn");
const sidebar = document.getElementById("sidebar");
const chatArea = document.getElementById("chat-area");
const backBtn = document.getElementById("back-btn");
const chatName = document.getElementById("chat-name");
const contactsEl = document.getElementById("contacts");

const BASE_URL = "http://localhost:5000";
let selectedUserId = null;

// ✅ Check if logged in
const token = localStorage.getItem("token");
if (!token) {
  alert("Please log in first!");
  window.location.href = "./index.html";
}

// Get logged-in user ID from JWT
function getLoggedInUserId() {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.id;
}
const loggedInUserId = getLoggedInUserId();

// 👤 Load all users for sidebar
async function loadUsers() {
  try {
    const res = await axios.get(`${BASE_URL}/user/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const users = res.data.filter((u) => u.id !== loggedInUserId); // exclude self

    contactsEl.innerHTML = "";

    users.forEach((user) => {
      const div = document.createElement("div");
      div.className =
        "p-4 hover:bg-gray-600 cursor-pointer border-b border-gray-700";
      div.textContent = user.name;
      div.dataset.id = user.id;

      div.addEventListener("click", () => openChat(user));
      contactsEl.appendChild(div);
    });
    const storedId = parseInt(localStorage.getItem("selectedContactId"));
    if (storedId) {
      const storedUser = users.find((u) => u.id === storedId);
      if (storedUser) openChat(storedUser);
    }
  } catch (err) {
    console.error(err);
  }
}

// 🧭 Open chat with selected user
function openChat(user) {
  selectedUserId = user.id;
  chatName.textContent = user.name;

  localStorage.setItem("selectedContactId", user.id);

  loadMessages();
  highlightSelectedContact(user.id);

  if (window.innerWidth < 768) {
    sidebar.classList.add("-translate-x-full");
    chatArea.classList.remove("translate-x-full");
  }
}
function highlightSelectedContact(userId) {
  document.querySelectorAll("#contacts > div").forEach((contact) => {
    const isSelected = parseInt(contact.dataset.id) === userId;
    contact.classList.toggle("bg-gray-700", isSelected);
    contact.classList.toggle("hover:bg-gray-600", !isSelected);
  });
}

// 🧠 Load messages with selected user
async function loadMessages() {
  if (!selectedUserId) return;

  try {
    const res = await axios.get(`${BASE_URL}/chat/with/${selectedUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const messages = res.data;

    chatBox.innerHTML = "";

    messages.forEach((msg) => {
      const isMine = msg.sender.id === loggedInUserId;

      const div = document.createElement("div");
      div.className = `flex ${isMine ? "justify-end" : "justify-start"} mb-2`;

      div.innerHTML = `
        <div class="${
          isMine ? "bg-green-500 text-white" : "bg-gray-700 text-white"
        } px-3 py-2 rounded-xl max-w-[70%] break-words">
          ${msg.content}
        </div>
        <div class="text-xs text-gray-400 ml-2 self-end">
          ${new Date(msg.createdAt).toLocaleTimeString()}
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
  if (!content || !selectedUserId) return;

  try {
    await axios.post(
      `${BASE_URL}/chat/send`,
      { content, recipientId: selectedUserId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    messageInput.value = "";
    loadMessages();
  } catch (err) {
    console.error(err);
  }
});

// 🔁 Refresh messages every 5 seconds
setInterval(loadMessages, 5000);

// 👋 Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "./index.html";
});

// 🧭 Mobile back button
backBtn.addEventListener("click", () => {
  if (window.innerWidth < 768) {
    sidebar.classList.remove("-translate-x-full");
    chatArea.classList.add("translate-x-full");
  }
});

// Load users on page load
loadUsers();
