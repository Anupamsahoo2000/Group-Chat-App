/* chatWindow.js - merged final version (Groups + Socket.IO + UI) */

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const logoutBtn = document.getElementById("logout-btn");
const sidebar = document.getElementById("sidebar");
const chatArea = document.getElementById("chat-area");
const backBtn = document.getElementById("back-btn");
const chatName = document.getElementById("chat-name");
const chatSub = document.getElementById("chat-sub");

const contactsEl = document.getElementById("contacts");
const groupsEl = document.getElementById("groups");

const createGroupBtn = document.getElementById("create-group-btn");
const createGroupModal = document.getElementById("create-group-modal");
const cancelCreateGroup = document.getElementById("cancel-create-group");
const confirmCreateGroup = document.getElementById("confirm-create-group");
const groupNameInput = document.getElementById("group-name");
const groupDescInput = document.getElementById("group-desc");

const addMemberBtn = document.getElementById("add-member-btn");
const addMemberModal = document.getElementById("add-member-modal");
const cancelAddMember = document.getElementById("cancel-add-member");
const confirmAddMember = document.getElementById("confirm-add-member");
const userListEl = document.getElementById("user-list");

const leaveGroupBtn = document.getElementById("leave-group-btn");
const deleteGroupBtn = document.getElementById("delete-group-btn");

const typingIndicator = document.getElementById("typing-indicator");
const aiSuggestionsEl = document.getElementById("ai-suggestions");
const aiSmartRepliesEl = document.getElementById("ai-smart-replies");

const BASE_URL = "http://localhost:5000";

let selectedUserId = null; // for 1:1
let selectedGroupId = null; // for groups
let loggedInUserId = null;
let joinedGroupIds = JSON.parse(localStorage.getItem("joinedGroupIds") || "[]");
let suggestionDebounce;

// check token
const token = localStorage.getItem("token");
if (!token) {
  alert("Please log in first!");
  window.location.href = "./index.html";
}

// decode logged in id
function getLoggedInUserId() {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id;
  } catch {
    return null;
  }
}
loggedInUserId = getLoggedInUserId();

// Socket.IO
const socket = io(BASE_URL, { transports: ["websocket", "polling"] });

socket.on("connect", () => {
  console.log("Socket connected");
  socket.emit("authenticate", token);

  // rejoin previously joined groups (if any)
  if (joinedGroupIds && joinedGroupIds.length) {
    socket.emit("rejoinGroups", joinedGroupIds);
  }
});

socket.on("disconnect", () => {
  console.log("Socket disconnected");
});

// presence updates (update status dot)
socket.on("userOnline", (userId) => {
  const el = document.getElementById(`status-${userId}`);
  if (el) {
    el.classList.remove("bg-gray-500");
    el.classList.add("bg-green-500");
  }
});
socket.on("userOffline", (userId) => {
  const el = document.getElementById(`status-${userId}`);
  if (el) {
    el.classList.remove("bg-green-500");
    el.classList.add("bg-gray-500");
  }
});

// receive 1:1 message
socket.on("receiveMessage", (msg) => {
  console.log("SOCKET MESSAGE RECEIVED:", msg);

  // ✅ Group Message Handling
  if (msg.groupId) {
    if (selectedGroupId && msg.groupId === selectedGroupId) {
      displayMessage(msg);
      if (msg.sender.id !== loggedInUserId) {
        getSmartReplySuggestions(msg.content);
      }
      // Show if inside the group chat
    } else {
      console.log("New group message in another group:", msg.groupId);
    }
    return;
  }

  // ✅ Private (P2P) Message Handling
  if (
    selectedUserId &&
    (msg.sender.id === selectedUserId ||
      (msg.sender.id === loggedInUserId && msg.recipientId === selectedUserId))
  ) {
    displayMessage(msg);
  } else {
    console.log("New private message not in active chat", msg);
  }
});

// receive group message
socket.on("receiveGroupMessage", (msg) => {
  // msg should include groupId and sender
  if (selectedGroupId && msg.groupId === selectedGroupId) {
    displayMessage(msg);
    if (msg.sender.id !== loggedInUserId) {
      getSmartReplySuggestions(msg.content);
    }
  } else {
    // increment unread badge for group
    const badge = document.getElementById(`badge-group-${msg.groupId}`);
    if (badge) {
      badge.textContent = (parseInt(badge.textContent || "0") + 1).toString();
      badge.classList.remove("hidden");
    }
  }
});
// receive media message (1:1 or group)
socket.on("receiveMediaMessage", (msg) => {
  if (msg.groupId) {
    if (selectedGroupId && msg.groupId === selectedGroupId) displayMessage(msg);
    else {
      /* show unread badge */
    }
  } else if (
    msg.recipientId &&
    selectedUserId &&
    msg.sender.id === selectedUserId
  ) {
    displayMessage(msg);
  } else {
    // if this is the sender, you might have already appended optimistically
    if (msg.sender.id === loggedInUserId) displayMessage(msg);
  }
});

// group join/leave notices
socket.on("groupUserJoined", ({ groupId, userId }) => {
  if (groupId === selectedGroupId)
    displaySystemMessage(`${userId} joined the group`);
});
socket.on("groupUserLeft", ({ groupId, userId }) => {
  if (groupId === selectedGroupId)
    displaySystemMessage(`${userId} left the group`);
});

// admin notifications
socket.on("groupMemberAdded", ({ groupId }) => {
  // if current user added to group, reload groups
  loadGroups();
});
socket.on("groupDeleted", ({ groupId }) => {
  if (selectedGroupId === groupId) {
    alert("This group was deleted");
    selectedGroupId = null;
    chatBox.innerHTML = "";
    chatName.textContent = "Select a Contact or Group";
  }
  loadGroups();
});

// typing indicator (group and p2p)
socket.on("userTyping", (data) => {
  if (data.groupId) {
    if (data.groupId === selectedGroupId) showTyping();
  } else {
    if (data.senderId === selectedUserId) showTyping();
  }
});

// show typing briefly
function showTyping() {
  typingIndicator.classList.remove("hidden");
  clearTimeout(window.typingTimeout);
  window.typingTimeout = setTimeout(
    () => typingIndicator.classList.add("hidden"),
    1500
  );
}

// typing emit on input
messageInput.addEventListener("input", () => {
  if (selectedGroupId) socket.emit("typing", { groupId: selectedGroupId });
  else if (selectedUserId)
    socket.emit("typing", { recipientId: selectedUserId });
  clearTimeout(suggestionDebounce);
  suggestionDebounce = setTimeout(getPredictiveSuggestions, 500);
});

// ---------------- AI Integration ----------------
async function getPredictiveSuggestions() {
  const text = messageInput.value.trim();
  if (!text) {
    aiSuggestionsEl.innerHTML = "";
    return;
  }

  try {
    const res = await axios.post(`${BASE_URL}/ai/predictive`, { text });
    const suggestions = res.data.suggestions || [];

    aiSuggestionsEl.innerHTML = "";
    suggestions.slice(0, 3).forEach((s) => {
      const chip = document.createElement("button");
      chip.className =
        "bg-gray-700 text-white px-3 py-1 rounded-full hover:bg-gray-600 text-sm";
      chip.textContent = s;
      chip.onclick = () => {
        messageInput.value = text + " " + s;
        aiSuggestionsEl.innerHTML = "";
      };
      aiSuggestionsEl.appendChild(chip);
    });
  } catch (err) {
    console.log("AI predictive error:", err);
  }
}

async function getSmartReplySuggestions(text) {
  try {
    const res = await axios.post(`${BASE_URL}/ai/smart-replies`, {
      message: text,
    });
    const replies = res.data.replies || [];

    aiSmartRepliesEl.innerHTML = "";
    replies.slice(0, 3).forEach((r) => {
      const btn = document.createElement("button");
      btn.className =
        "bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-xl text-white text-sm transition";
      btn.textContent = r;
      btn.onclick = () => {
        messageInput.value = r;
        aiSmartRepliesEl.innerHTML = "";
        chatForm.requestSubmit(); // auto send reply ✅ clean UX
      };
      aiSmartRepliesEl.appendChild(btn);
    });
  } catch (err) {
    console.log("AI smart reply error:", err);
  }
}

// Load users
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
      div.dataset.id = user.id;
      div.innerHTML = `
        <span>${user.name}</span>
        <span class="w-3 h-3 rounded-full bg-gray-500" id="status-${user.id}"></span>
      `;
      div.addEventListener("click", () => openUserChat(user));
      contactsEl.appendChild(div);
    });

    // restore last selected contact if any (only if it exists)
    const storedContact = parseInt(localStorage.getItem("selectedContactId"));
    if (storedContact) {
      const found = users.find((u) => u.id === storedContact);
      if (found) openUserChat(found);
    }
  } catch (err) {
    console.error("Error loading users:", err);
  }
}

// Load groups (groups that user belongs to)
async function loadGroups() {
  try {
    const res = await axios.get(`${BASE_URL}/group/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const groups = res.data || [];

    groupsEl.innerHTML = "";
    groups.forEach((g) => {
      const div = document.createElement("div");
      div.className =
        "p-3 hover:bg-gray-700 cursor-pointer flex justify-between items-center border-b border-gray-700";
      div.dataset.groupId = g.id;

      div.innerHTML = `<span>${g.name}</span><span id="badge-group-${g.id}" class="hidden bg-red-500 text-xs text-white rounded-full px-2">0</span>`;

      div.addEventListener("click", async () => {
        selectedGroupId = g.id;
        selectedUserId = null;
        chatName.textContent = g.name;
        chatSub.textContent = g.description || "";
        // join room
        socket.emit("joinGroup", { groupId: g.id });
        // store joined groups
        if (!joinedGroupIds.includes(g.id)) {
          joinedGroupIds.push(g.id);
          localStorage.setItem(
            "joinedGroupIds",
            JSON.stringify(joinedGroupIds)
          );
        }
        // clear badge
        const badge = document.getElementById(`badge-group-${g.id}`);
        if (badge) {
          badge.textContent = "";
          badge.classList.add("hidden");
        }
        // show admin controls? we show buttons anyway; server will enforce admin-only actions
        addMemberBtn.classList.remove("hidden");
        leaveGroupBtn.classList.remove("hidden");
        deleteGroupBtn.classList.remove("hidden"); // server will reject non-admin delete
        await loadGroupMessages(g.id);
      });

      groupsEl.appendChild(div);
    });

    // restore previously selected group open on load
    const storedGroup = parseInt(localStorage.getItem("selectedGroupId"));
    if (storedGroup) {
      const found = groups.find((x) => x.id === storedGroup);
      if (found) {
        // simulate click:
        found &&
          document.querySelector(`[data-group-id='${found.id}']`)?.click();
      }
    }
  } catch (err) {
    console.error("Error loading groups:", err);
  }
}

// open 1:1 chat
function openUserChat(user) {
  selectedUserId = user.id;
  selectedGroupId = null;
  chatName.textContent = user.name;
  chatSub.textContent = "";
  localStorage.setItem("selectedContactId", user.id);

  addMemberBtn.classList.add("hidden");
  leaveGroupBtn.classList.add("hidden");
  deleteGroupBtn.classList.add("hidden");

  loadMessages();
  highlightSelectedContact(user.id);
}

// highlight contact (and remove highlight from groups)
function highlightSelectedContact(userId) {
  document.querySelectorAll("#contacts > div").forEach((contact) => {
    const isSelected = parseInt(contact.dataset.id) === userId;
    contact.classList.toggle("bg-gray-700", isSelected);
    contact.classList.toggle("hover:bg-gray-600", !isSelected);
  });
}

// load 1:1 messages via REST
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
    console.error("Error loading messages:", err);
  }
}

// load group messages
async function loadGroupMessages(groupId) {
  if (!groupId) return;
  try {
    const res = await axios.get(`${BASE_URL}/group/${groupId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    chatBox.innerHTML = "";
    res.data.forEach(displayMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
    // remember selected group
    localStorage.setItem("selectedGroupId", groupId);
  } catch (err) {
    console.error("Error loading group messages:", err);
  }
}

// send message (group or p2p)
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const content = messageInput.value.trim();
  if (!content) return;

  if (selectedGroupId) {
    socket.emit("sendGroupMessage", { groupId: selectedGroupId, content });
  } else if (selectedUserId) {
    socket.emit("sendMessage", { content, recipientId: selectedUserId });
  } else {
    // no target selected
    alert("Select a contact or group to send message.");
  }

  messageInput.value = "";
  aiSuggestionsEl.innerHTML = "";
  aiSmartRepliesEl.innerHTML = "";
});

// safe displayMessage: supports p2p and group messages (msg.sender should exist)
function displayMessage(msg) {
  const isMine = msg.sender.id === loggedInUserId;
  const isGroupChat = selectedGroupId !== null && selectedGroupId !== undefined;

  const div = document.createElement("div");
  div.className = `flex ${isMine ? "justify-end" : "justify-start"} mb-2`;

  // ✅ Wrapper for bubble content (text or media)
  let bubbleContent = "";

  // ✅ Media message logic
  if (msg.messageType === "media" && msg.mediaUrl) {
    if ((msg.mediaType || "").startsWith("image/")) {
      bubbleContent = `
        <img src="${msg.mediaUrl}"
          class="rounded-xl max-w-[200px] max-h-[200px] object-cover" />
      `;
    } else if ((msg.mediaType || "").startsWith("video/")) {
      bubbleContent = `
        <video controls
          class="rounded-xl max-w-[200px] max-h-[200px] object-cover">
          <source src="${msg.mediaUrl}" type="${msg.mediaType}">
          Your browser does not support video playback.
        </video>
      `;
    } else {
      bubbleContent = `
        <a href="${msg.mediaUrl}" target="_blank"
          class="underline text-blue-300 break-words">
          📎 Download File
        </a>
      `;
    }
  } else {
    // ✅ Text message fallback
    bubbleContent = msg.content.replace(/\n/g, "<br>");
  }

  // ✅ Sender name for group chat (not for your own msg)
  let nameLabel = "";
  if (isGroupChat && !isMine) {
    nameLabel = `
      <div class="text-xs font-semibold text-blue-300 mb-1 ml-1">
        ${msg.sender.name}
      </div>
    `;
  }

  div.innerHTML = `
    <div class="flex flex-col ${isMine ? "items-end" : "items-start"} 
      ${isGroupChat ? "max-w-[75%]" : "max-w-[70%]"} break-words">
      
      ${nameLabel}

      <div class="${
        isMine ? "bg-green-500 text-white" : "bg-gray-700 text-white"
      } px-3 py-1 rounded-xl whitespace-pre-line text-left leading-relaxed">
        ${bubbleContent}
      </div>

      <div class="text-xs text-gray-400 mt-[2px]">
        ${new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// small system message (join/leave)
function displaySystemMessage(text) {
  const el = document.createElement("div");
  el.className = "text-center text-xs text-gray-400 my-2";
  el.textContent = text;
  chatBox.appendChild(el);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// LOGOUT
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("joinedGroupIds");
  window.location.href = "./index.html";
});

// mobile back button
backBtn.addEventListener("click", () => {
  if (window.innerWidth < 768) {
    sidebar.classList.remove("-translate-x-full");
    chatArea.classList.add("translate-x-full");
  }
});

/* ---------- Create Group Modal handling ---------- */
createGroupBtn.addEventListener("click", () =>
  createGroupModal.classList.remove("hidden")
);
cancelCreateGroup.addEventListener("click", () => {
  createGroupModal.classList.add("hidden");
  groupNameInput.value = "";
  groupDescInput.value = "";
});
confirmCreateGroup.addEventListener("click", async () => {
  const name = groupNameInput.value.trim();
  const description = groupDescInput.value.trim();
  if (!name) return alert("Group name required");
  try {
    const res = await axios.post(
      `${BASE_URL}/group`,
      { name, description },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    createGroupModal.classList.add("hidden");
    groupNameInput.value = "";
    groupDescInput.value = "";
    // notify server via REST created; reload groups
    await loadGroups();
    // notify via socket if you want (server-side controller can also notify)
    socket.emit("notifyAddMember", {
      groupId: res.data.group.id,
      userId: loggedInUserId,
    });
  } catch (err) {
    console.error("Create group error:", err);
    alert(err.response?.data?.message || "Failed to create group");
  }
});

/* ---------- Add Member Modal ---------- */
let candidateMembers = []; // loaded users to add
let selectedMembersToAdd = new Set();
addMemberBtn.addEventListener("click", async () => {
  // load users (exclude self and existing members ideally)
  try {
    const res = await axios.get(`${BASE_URL}/user/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    candidateMembers = res.data.filter((u) => u.id !== loggedInUserId);
    userListEl.innerHTML = "";
    candidateMembers.forEach((u) => {
      const row = document.createElement("div");
      row.className =
        "flex items-center justify-between p-2 border-b border-gray-700";
      row.innerHTML = `<span>${u.name} (${
        u.email || ""
      })</span><input type="checkbox" data-id="${u.id}" />`;
      userListEl.appendChild(row);
      row.querySelector("input").addEventListener("change", (ev) => {
        const id = parseInt(ev.target.dataset.id);
        if (ev.target.checked) selectedMembersToAdd.add(id);
        else selectedMembersToAdd.delete(id);
      });
    });
    addMemberModal.classList.remove("hidden");
  } catch (err) {
    console.error("Error loading users for add:", err);
  }
});
cancelAddMember.addEventListener("click", () => {
  addMemberModal.classList.add("hidden");
  selectedMembersToAdd.clear();
});
confirmAddMember.addEventListener("click", async () => {
  if (!selectedGroupId) return alert("No group selected");
  if (selectedMembersToAdd.size === 0) {
    addMemberModal.classList.add("hidden");
    return;
  }
  try {
    // add each member via REST (server will enforce creator-only)
    for (const userId of selectedMembersToAdd) {
      await axios.post(
        `${BASE_URL}/group/${selectedGroupId}/add-member`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // notify added user via socket optional
      socket.emit("notifyAddMember", { groupId: selectedGroupId, userId });
    }
    addMemberModal.classList.add("hidden");
    selectedMembersToAdd.clear();
    loadGroups();
    alert("Members added (if you are the group creator).");
  } catch (err) {
    console.error("Add member error:", err);
    alert(err.response?.data?.message || "Failed to add members");
  }
});

const viewMembersBtn = document.getElementById("viewMembersBtn");

viewMembersBtn.addEventListener("click", async () => {
  if (!selectedGroupId) return alert("No group selected!");

  try {
    const res = await fetch(
      `${BASE_URL}/chat/group/${selectedGroupId}/members`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Raw Response:", res);

    let text = await res.text();
    console.log("Raw Body:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("JSON Parse Error:", parseErr);
      alert("❌ Server did not return valid JSON");
      return;
    }

    console.log("Parsed JSON:", data);

    let members = Array.isArray(data) ? data : data.members || [];

    if (!members.length) {
      alert("No members found for this group");
      return;
    }

    let list = members.map((m) => `• ${m.name}`).join("\n");
    alert(`Group Members:\n\n${list}`);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
});

/* ---------- Delete / Leave group ---------- */
deleteGroupBtn.addEventListener("click", async () => {
  if (!selectedGroupId) return;
  if (!confirm("Delete this group? (Admin only)")) return;
  try {
    await axios.delete(`${BASE_URL}/group/${selectedGroupId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // notify via socket
    socket.emit("notifyDeleteGroup", { groupId: selectedGroupId });
    selectedGroupId = null;
    chatBox.innerHTML = "";
    chatName.textContent = "Select a Contact or Group";
    loadGroups();
  } catch (err) {
    console.error("Delete group err:", err);
    alert(
      err.response?.data?.message || "Failed to delete group (admin only)."
    );
  }
});

leaveGroupBtn.addEventListener("click", async () => {
  if (!selectedGroupId) return;
  if (!confirm("Leave this group?")) return;
  try {
    await axios.delete(`${BASE_URL}/group/${selectedGroupId}/exit`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    socket.emit("leaveGroup", { groupId: selectedGroupId });
    // remove from joined groups and reload
    joinedGroupIds = joinedGroupIds.filter((id) => id !== selectedGroupId);
    localStorage.setItem("joinedGroupIds", JSON.stringify(joinedGroupIds));
    selectedGroupId = null;
    chatBox.innerHTML = "";
    chatName.textContent = "Select a Contact or Group";
    loadGroups();
  } catch (err) {
    console.error("Leave group err:", err);
    alert(err.response?.data?.message || "Failed to leave group");
  }
});

// when socket tells us a user was added or group deleted, we handle above events

// highlight selected group contact? optional: remove contact highlight when group selected
function highlightSelectedGroup(groupId) {
  document.querySelectorAll("#groups > div").forEach((g) => {
    const isSelected = parseInt(g.dataset.groupId) === groupId;
    g.classList.toggle("bg-gray-700", isSelected);
    g.classList.toggle("hover:bg-gray-600", !isSelected);
  });
}

// media upload handling can be added here similarly

const fileInput = document.getElementById("file-input");
const attachBtn = document.getElementById("attach-btn");
attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  // optional: restrict types/sizes here
  try {
    const form = new FormData();
    form.append("file", file);
    if (selectedGroupId) form.append("groupId", selectedGroupId);
    else if (selectedUserId) form.append("recipientId", selectedUserId);
    // show upload progress with axios
    const res = await axios.post(`${BASE_URL}/media/upload`, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (p) => {
        const pct = Math.round((p.loaded / p.total) * 100);
        console.log("Upload progress:", pct);
        // you can show progress UI
      },
    });
    console.log("Upload success:", res.data);
    // server will emit receiveMediaMessage — you may get that via socket and display
    // but you can optimistically display the message too using res.data.data
    const media = res.data.payload;
  } catch (err) {
    console.error("Upload failed", err);
    alert(err.response?.data?.message || "Upload failed");
  } finally {
    fileInput.value = ""; // reset
  }
});

// Auto-load users+groups on page load
loadUsers();
loadGroups();
