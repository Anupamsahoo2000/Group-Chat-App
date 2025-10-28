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

// ✅ JWT token check
const token = localStorage.getItem("token");
if (!token) {
  alert("Please log in first!");
  window.location.href = "./index.html";
}

// ✅ Decode token to get logged-in user ID
function getLoggedInUserId() {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.id;
}
const loggedInUserId = getLoggedInUserId();

// ⚡ Initialize Socket.IO
const socket = io(BASE_URL, { transports: ["websocket"] });

// 🔐 Authenticate with token when connected
socket.on("connect", () => {
  console.log("🟢 Connected to Socket.IO");
  socket.emit("authenticate", token);
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected from Socket.IO");
});

// 👂 Listen for real-time incoming messages
socket.on("receiveMessage", (msg) => {
  if (msg.sender.id === selectedUserId || msg.recipient.id === selectedUserId) {
    displayMessage(msg);
  }
});

// 👤 Online/offline status updates
socket.on("userOnline", (userId) => {
  const contact = document.querySelector(`[data-id='${userId}']`);
  if (contact) contact.classList.add("border-l-4", "border-green-500");
});

socket.on("userOffline", (userId) => {
  const contact = document.querySelector(`[data-id='${userId}']`);
  if (contact) contact.classList.remove("border-l-4", "border-green-500");
});

// ✍️ Typing indicator
messageInput.addEventListener("input", () => {
  if (selectedUserId) socket.emit("typing", { recipientId: selectedUserId });
});

socket.on("userTyping", ({ senderId }) => {
  if (senderId === selectedUserId) {
    const typing = document.getElementById("typing-indicator");
    if (typing) {
      typing.style.display = "block";
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        typing.style.display = "none";
      }, 1500);
    }
  }
});

// 👤 Load all users in sidebar
async function loadUsers() {
  try {
    const res = await axios.get(`${BASE_URL}/user/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const users = res.data.filter((u) => u.id !== loggedInUserId);

    contactsEl.innerHTML = "";

    users.forEach((user) => {
      const div = document.createElement("div");
      div.className =
        "p-4 hover:bg-gray-600 cursor-pointer border-b border-gray-700 flex justify-between items-center";
      div.innerHTML = `
        <span>${user.name}</span>
        <span class="w-3 h-3 rounded-full bg-gray-500" id="status-${user.id}"></span>
      `;
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

// 🎨 Highlight selected contact
function highlightSelectedContact(userId) {
  document.querySelectorAll("#contacts > div").forEach((contact) => {
    const isSelected = parseInt(contact.dataset.id) === userId;
    contact.classList.toggle("bg-gray-700", isSelected);
    contact.classList.toggle("hover:bg-gray-600", !isSelected);
  });
}

// 🧠 Load previous chat messages
async function loadMessages() {
  if (!selectedUserId) return;
  try {
    const res = await axios.get(`${BASE_URL}/chat/with/${selectedUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    chatBox.innerHTML = "";
    res.data.forEach(displayMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    console.error(err);
  }
}

// 💬 Send a message (real-time)
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const content = messageInput.value.trim();
  if (!content || !selectedUserId) return;

  socket.emit("sendMessage", { content, recipientId: selectedUserId });
  messageInput.value = "";
});

// 🧩 Helper to display a message in chatBox
function displayMessage(msg) {
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
      ${new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </div>
  `;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 👋 Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "./index.html";
});

// 📱 Back button (mobile)
backBtn.addEventListener("click", () => {
  if (window.innerWidth < 768) {
    sidebar.classList.remove("-translate-x-full");
    chatArea.classList.add("translate-x-full");
  }
});

// 🚀 Load all users on page load
loadUsers();
